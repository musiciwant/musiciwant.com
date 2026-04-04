const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const RESEND_KEY = process.env.RESEND_KEY || '';
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Database
const db = new Database(path.join(__dirname, 'musiciwant.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT DEFAULT '',
    year INTEGER,
    slug TEXT UNIQUE NOT NULL,

    -- Sensory profile
    sensory_level TEXT CHECK(sensory_level IN ('safe','moderate','intense')) NOT NULL,
    dynamic_range INTEGER CHECK(dynamic_range BETWEEN 1 AND 10) NOT NULL,
    sudden_changes TEXT CHECK(sudden_changes IN ('none','mild','moderate','frequent','extreme')) NOT NULL,
    texture TEXT CHECK(texture IN ('smooth','layered','complex','harsh','abrasive')) NOT NULL,
    predictability TEXT CHECK(predictability IN ('high','medium','low')) NOT NULL,
    vocal_style TEXT CHECK(vocal_style IN ('instrumental','soft vocals','spoken word','dynamic vocals','screaming')) NOT NULL,
    sensory_notes TEXT DEFAULT '',

    -- Discovery
    bpm INTEGER,
    description TEXT DEFAULT '',
    cultural_context TEXT DEFAULT '',
    listening_prompt TEXT DEFAULT '',
    arc_description TEXT DEFAULT '',

    -- Embeds
    spotify_id TEXT DEFAULT '',
    youtube_id TEXT DEFAULT '',
    spotify_url TEXT DEFAULT '',
    youtube_url TEXT DEFAULT '',
    apple_music_url TEXT DEFAULT '',
    bandcamp_url TEXT DEFAULT '',
    amazon_url TEXT DEFAULT '',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS song_moods (
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    mood TEXT NOT NULL,
    PRIMARY KEY (song_id, mood)
  );

  CREATE TABLE IF NOT EXISTS song_traditions (
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    tradition TEXT NOT NULL,
    PRIMARY KEY (song_id, tradition)
  );

  CREATE TABLE IF NOT EXISTS song_recommended_for (
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    use_case TEXT NOT NULL,
    PRIMARY KEY (song_id, use_case)
  );

  CREATE INDEX IF NOT EXISTS idx_songs_sensory ON songs(sensory_level);
  CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
  CREATE INDEX IF NOT EXISTS idx_songs_slug ON songs(slug);

  -- User playlist persistence
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_playlist_songs (
    playlist_id INTEGER REFERENCES saved_playlists(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    sensory_level TEXT DEFAULT '',
    position INTEGER DEFAULT 0,
    PRIMARY KEY (playlist_id, slug)
  );

  CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Admin API (simple key auth) ---
const ADMIN_KEY = process.env.ADMIN_KEY || 'hive-tuning-2026';

app.post('/api/admin/import', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const songs = req.body;
  if (!Array.isArray(songs)) return res.status(400).json({ error: 'Expected array of songs' });

  const insertSong = db.prepare(`
    INSERT OR IGNORE INTO songs (title, artist, album, year, slug, sensory_level, dynamic_range, sudden_changes, texture, predictability, vocal_style, sensory_notes, bpm, description, cultural_context, listening_prompt, arc_description, spotify_id, youtube_id, spotify_url, youtube_url, apple_music_url, bandcamp_url, amazon_url)
    VALUES (@title, @artist, @album, @year, @slug, @sensory_level, @dynamic_range, @sudden_changes, @texture, @predictability, @vocal_style, @sensory_notes, @bpm, @description, @cultural_context, @listening_prompt, @arc_description, @spotify_id, @youtube_id, @spotify_url, @youtube_url, @apple_music_url, @bandcamp_url, @amazon_url)
  `);
  const insertMood = db.prepare('INSERT OR IGNORE INTO song_moods (song_id, mood) VALUES (?, ?)');
  const insertTradition = db.prepare('INSERT OR IGNORE INTO song_traditions (song_id, tradition) VALUES (?, ?)');
  const insertRec = db.prepare('INSERT OR IGNORE INTO song_recommended_for (song_id, use_case) VALUES (?, ?)');

  let imported = 0;
  const importAll = db.transaction((songs) => {
    for (const song of songs) {
      const { moods = [], traditions = [], recommended_for = [], ...data } = song;
      data.apple_music_url = data.apple_music_url || '';
      data.bandcamp_url = data.bandcamp_url || '';
      data.amazon_url = data.amazon_url || '';
      data.spotify_id = data.spotify_id || '';
      data.youtube_id = data.youtube_id || '';
      data.spotify_url = data.spotify_url || '';
      data.youtube_url = data.youtube_url || '';
      data.sensory_notes = data.sensory_notes || '';
      data.cultural_context = data.cultural_context || '';
      data.listening_prompt = data.listening_prompt || '';
      data.arc_description = data.arc_description || '';
      data.description = data.description || '';
      data.album = data.album || '';

      try {
        const result = insertSong.run(data);
        const id = result.lastInsertRowid || db.prepare('SELECT id FROM songs WHERE slug = ?').get(data.slug)?.id;
        if (id) {
          for (const m of moods) insertMood.run(id, m);
          for (const t of traditions) insertTradition.run(id, t);
          for (const r of recommended_for) insertRec.run(id, r);
          imported++;
        }
      } catch (e) {
        console.error(`Failed to import ${data.slug}: ${e.message}`);
      }
    }
  });

  importAll(songs);
  res.json({ imported, total: songs.length });
});

// Update embed IDs for existing songs
app.post('/api/admin/update-embeds', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const updates = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'Expected array' });

  const stmt = db.prepare(`
    UPDATE songs SET
      spotify_id = CASE WHEN ? != '' THEN ? ELSE spotify_id END,
      spotify_url = CASE WHEN ? != '' THEN ? ELSE spotify_url END,
      youtube_id = CASE WHEN ? != '' THEN ? ELSE youtube_id END,
      youtube_url = CASE WHEN ? != '' THEN ? ELSE youtube_url END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let updated = 0;
  const updateAll = db.transaction((updates) => {
    for (const u of updates) {
      const r = stmt.run(
        u.spotify_id, u.spotify_id,
        u.spotify_url, u.spotify_url,
        u.youtube_id, u.youtube_id,
        u.youtube_url, u.youtube_url,
        u.id
      );
      updated += r.changes;
    }
  });

  updateAll(updates);
  res.json({ updated, total: updates.length });
});

// Delete songs by ID
app.post('/api/admin/delete', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Expected {ids: [...]}' });

  let deleted = 0;
  const deleteAll = db.transaction((ids) => {
    for (const id of ids) {
      db.prepare('DELETE FROM song_moods WHERE song_id = ?').run(id);
      db.prepare('DELETE FROM song_traditions WHERE song_id = ?').run(id);
      db.prepare('DELETE FROM song_recommended_for WHERE song_id = ?').run(id);
      deleted += db.prepare('DELETE FROM songs WHERE id = ?').run(id).changes;
    }
  });

  deleteAll(ids);
  res.json({ deleted, total: ids.length });
});

// --- Playlist Persistence API ---

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Save playlists — creates or updates user, saves all playlists
app.post('/api/playlists/save', async (req, res) => {
  const { email, playlists } = req.body;
  if (!email || !playlists) return res.status(400).json({ error: 'Email and playlists required' });

  // Find or create user
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const token = generateToken();
    db.prepare('INSERT INTO users (email, token) VALUES (?, ?)').run(email, token);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  // Clear existing playlists for this user and re-save
  const existingPls = db.prepare('SELECT id FROM saved_playlists WHERE user_id = ?').all(user.id);
  for (const pl of existingPls) {
    db.prepare('DELETE FROM saved_playlist_songs WHERE playlist_id = ?').run(pl.id);
  }
  db.prepare('DELETE FROM saved_playlists WHERE user_id = ?').run(user.id);

  // Save new playlists
  const insertPl = db.prepare('INSERT INTO saved_playlists (user_id, name) VALUES (?, ?)');
  const insertSong = db.prepare('INSERT INTO saved_playlist_songs (playlist_id, slug, title, artist, sensory_level, position) VALUES (?, ?, ?, ?, ?, ?)');

  for (const pl of playlists) {
    const result = insertPl.run(user.id, pl.name);
    const plId = result.lastInsertRowid;
    if (pl.songs) {
      pl.songs.forEach((s, i) => {
        insertSong.run(plId, s.slug, s.title, s.artist, s.sensory_level || '', i);
      });
    }
  }

  // Send magic link email
  if (resend) {
    const restoreUrl = `https://musiciwant.com/restore/${user.token}`;
    const totalSongs = playlists.reduce((sum, pl) => sum + (pl.songs ? pl.songs.length : 0), 0);
    const playlistNames = playlists.map(pl => pl.name).join(', ');

    try {
      await resend.emails.send({
        from: 'Music I Want <noreply@musiciwant.com>',
        to: email,
        subject: 'Your Music I Want playlists are saved',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#0f0f18;color:#e8e4df;border-radius:12px">
            <h1 style="font-family:Georgia,serif;color:#d4956a;font-size:1.5rem;margin-bottom:0.5rem">Your playlists are saved</h1>
            <p style="color:#8a8580;font-size:0.95rem">You have ${playlists.length} playlist${playlists.length !== 1 ? 's' : ''} with ${totalSongs} song${totalSongs !== 1 ? 's' : ''}:</p>
            <p style="color:#e8e4df;font-size:0.95rem;margin-bottom:1.5rem"><strong>${playlistNames}</strong></p>
            <p style="color:#8a8580;font-size:0.9rem;margin-bottom:1rem">Click the button below to restore your playlists on any device — phone, laptop, anywhere.</p>
            <a href="${restoreUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#d4956a;color:#0a0a10;font-weight:600;border-radius:8px;text-decoration:none;font-size:1rem">Restore My Playlists</a>
            <p style="color:#5a5550;font-size:0.75rem;margin-top:2rem">This is your private link. Don't share it if your playlists are personal.</p>
            <p style="color:#5a5550;font-size:0.75rem">— Music I Want · <a href="https://musiciwant.com" style="color:#d4956a">musiciwant.com</a></p>
          </div>
        `
      });
    } catch (e) {
      console.error('Email send error:', e.message);
    }
  }

  res.json({ ok: true, token: user.token, playlistCount: playlists.length });
});

// Load playlists by token (magic link)
app.get('/api/playlists/load/:token', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(req.params.token);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const playlists = db.prepare('SELECT * FROM saved_playlists WHERE user_id = ? ORDER BY created_at').all(user.id);
  for (const pl of playlists) {
    pl.songs = db.prepare('SELECT * FROM saved_playlist_songs WHERE playlist_id = ? ORDER BY position').all(pl.id);
  }

  res.json({ email: user.email, playlists });
});

// Recover playlists — sends magic link to email, never exposes data directly
app.post('/api/playlists/recover', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ ok: true, message: 'If we have your playlists, a recovery link has been sent.' });

  // Regenerate token for security
  const newToken = generateToken();
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(newToken, user.id);

  if (resend) {
    const restoreUrl = `https://musiciwant.com/restore/${newToken}`;
    const playlists = db.prepare('SELECT * FROM saved_playlists WHERE user_id = ?').all(user.id);

    try {
      await resend.emails.send({
        from: 'Music I Want <noreply@musiciwant.com>',
        to: email,
        subject: 'Restore your Music I Want playlists',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#0f0f18;color:#e8e4df;border-radius:12px">
            <h1 style="font-family:Georgia,serif;color:#d4956a;font-size:1.5rem;margin-bottom:0.5rem">Welcome back</h1>
            <p style="color:#8a8580;font-size:0.95rem">Someone requested to restore ${playlists.length} playlist${playlists.length !== 1 ? 's' : ''} linked to this email.</p>
            <p style="color:#8a8580;font-size:0.9rem;margin-bottom:1rem">If this was you, click below to restore them on your current device.</p>
            <a href="${restoreUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#d4956a;color:#0a0a10;font-weight:600;border-radius:8px;text-decoration:none;font-size:1rem">Restore My Playlists</a>
            <p style="color:#5a5550;font-size:0.75rem;margin-top:2rem">If you didn't request this, you can ignore this email. Your playlists are safe.</p>
            <p style="color:#5a5550;font-size:0.75rem">— Music I Want · <a href="https://musiciwant.com" style="color:#d4956a">musiciwant.com</a></p>
          </div>
        `
      });
    } catch (e) {
      console.error('Recovery email error:', e.message);
    }
  }

  // Always return the same message — don't reveal whether the email exists
  res.json({ ok: true, message: 'If we have your playlists, a recovery link has been sent.' });
});

// Magic link restore route
app.get('/restore/:token', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(req.params.token);
  if (!user) return res.sendFile(path.join(__dirname, 'public', 'index.html'));

  // Serve a page that loads playlists into localStorage and redirects
  res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Restoring your playlists...</title>
<link rel="stylesheet" href="/css/style.css">
</head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column">
<div class="make-spinner"></div>
<h2 style="margin-top:1rem">Restoring your playlists...</h2>
<script>
fetch('/api/playlists/load/${req.params.token}')
  .then(r => r.json())
  .then(data => {
    if (data.playlists) {
      const converted = data.playlists.map(pl => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        name: pl.name,
        songs: pl.songs.map(s => ({ slug: s.slug, title: s.title, artist: s.artist, sensory_level: s.sensory_level })),
        created: pl.created_at
      }));
      localStorage.setItem('miw_playlists', JSON.stringify(converted));
      localStorage.setItem('miw_user_email', data.email);
      localStorage.setItem('miw_user_token', '${req.params.token}');
    }
    window.location.href = '/playlists';
  })
  .catch(() => { window.location.href = '/'; });
</script>
</body></html>`);
});

// --- API Routes ---

// Get all songs with filters
app.get('/api/songs', (req, res) => {
  const { sensory_level, mood, tradition, recommended_for, search, sort } = req.query;

  let query = 'SELECT DISTINCT s.* FROM songs s';
  const joins = [];
  const conditions = [];
  const params = [];

  if (mood) {
    joins.push('JOIN song_moods sm ON s.id = sm.song_id');
    conditions.push('sm.mood = ?');
    params.push(mood);
  }

  if (tradition) {
    joins.push('JOIN song_traditions st ON s.id = st.song_id');
    conditions.push('st.tradition = ?');
    params.push(tradition);
  }

  if (recommended_for) {
    joins.push('JOIN song_recommended_for sr ON s.id = sr.song_id');
    conditions.push('sr.use_case = ?');
    params.push(recommended_for);
  }

  if (sensory_level) {
    conditions.push('s.sensory_level = ?');
    params.push(sensory_level);
  }

  if (search) {
    conditions.push('(s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ' + joins.join(' ');
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

  if (sort === 'dynamic_range_asc') query += ' ORDER BY s.dynamic_range ASC';
  else if (sort === 'dynamic_range_desc') query += ' ORDER BY s.dynamic_range DESC';
  else if (sort === 'artist') query += ' ORDER BY s.artist ASC';
  else query += ' ORDER BY s.created_at DESC';

  const songs = db.prepare(query).all(...params);

  // Attach tags to each song
  const moodStmt = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?');
  const tradStmt = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?');
  const recStmt = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?');

  for (const song of songs) {
    song.moods = moodStmt.all(song.id).map(r => r.mood);
    song.traditions = tradStmt.all(song.id).map(r => r.tradition);
    song.recommended_for = recStmt.all(song.id).map(r => r.use_case);
  }

  res.json(songs);
});

// Get single song by slug
app.get('/api/songs/:slug', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE slug = ?').get(req.params.slug);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  song.moods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(song.id).map(r => r.mood);
  song.traditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(song.id).map(r => r.tradition);
  song.recommended_for = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?').all(song.id).map(r => r.use_case);

  res.json(song);
});

// Get filter options (for populating dropdowns)
app.get('/api/filters', (req, res) => {
  const moods = db.prepare('SELECT DISTINCT mood FROM song_moods ORDER BY mood').all().map(r => r.mood);
  const traditions = db.prepare('SELECT DISTINCT tradition FROM song_traditions ORDER BY tradition').all().map(r => r.tradition);
  const useCases = db.prepare('SELECT DISTINCT use_case FROM song_recommended_for ORDER BY use_case').all().map(r => r.use_case);
  const artists = db.prepare('SELECT DISTINCT artist FROM songs ORDER BY artist').all().map(r => r.artist);

  res.json({ moods, traditions, use_cases: useCases, artists, sensory_levels: ['safe', 'moderate', 'intense'] });
});

// Frequency Finder — recommend based on state, with progressive fallback
app.post('/api/finder', (req, res) => {
  const { feeling, need, vocal_preference } = req.body;

  // Map inputs to filters
  let sensoryLevel = 'safe';
  if (need === 'release' || need === 'energy') sensoryLevel = 'moderate';
  if (need === 'feel') sensoryLevel = null; // any level

  let recFilter = null;
  if (feeling === 'anxious' || feeling === 'heavy') recFilter = 'anxiety relief';
  else if (feeling === 'scattered') recFilter = 'focus';
  else if (feeling === 'numb') recFilter = 'emotional release';
  else if (feeling === 'restless') recFilter = 'energy';
  if (need === 'calm') recFilter = 'sleep';
  else if (need === 'focus') recFilter = 'focus';
  else if (need === 'release') recFilter = 'emotional release';
  else if (need === 'energy') recFilter = 'energy';

  const moodStmt = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?');
  const tradStmt = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?');
  const recStmt = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?');

  function attachTags(songs) {
    for (const song of songs) {
      song.moods = moodStmt.all(song.id).map(r => r.mood);
      song.traditions = tradStmt.all(song.id).map(r => r.tradition);
      song.recommended_for = recStmt.all(song.id).map(r => r.use_case);
    }
    return songs;
  }

  // Try progressively looser queries until we get results
  const attempts = [
    // Attempt 1: all filters
    () => {
      let q = 'SELECT DISTINCT s.* FROM songs s';
      const j = [], c = [], p = [];
      if (sensoryLevel) { c.push('s.sensory_level = ?'); p.push(sensoryLevel); }
      if (recFilter) { j.push('JOIN song_recommended_for sr ON s.id = sr.song_id'); c.push('sr.use_case = ?'); p.push(recFilter); }
      if (vocal_preference === 'instrumental') c.push("s.vocal_style = 'instrumental'");
      else if (vocal_preference === 'vocals') c.push("s.vocal_style IN ('soft vocals', 'dynamic vocals')");
      q += ' ' + j.join(' ');
      if (c.length) q += ' WHERE ' + c.join(' AND ');
      q += ' ORDER BY RANDOM() LIMIT 3';
      return db.prepare(q).all(...p);
    },
    // Attempt 2: drop vocal preference
    () => {
      let q = 'SELECT DISTINCT s.* FROM songs s';
      const j = [], c = [], p = [];
      if (sensoryLevel) { c.push('s.sensory_level = ?'); p.push(sensoryLevel); }
      if (recFilter) { j.push('JOIN song_recommended_for sr ON s.id = sr.song_id'); c.push('sr.use_case = ?'); p.push(recFilter); }
      q += ' ' + j.join(' ');
      if (c.length) q += ' WHERE ' + c.join(' AND ');
      q += ' ORDER BY RANDOM() LIMIT 3';
      return db.prepare(q).all(...p);
    },
    // Attempt 3: drop recommended_for, keep sensory level
    () => {
      let q = 'SELECT * FROM songs';
      const c = [], p = [];
      if (sensoryLevel) { c.push('sensory_level = ?'); p.push(sensoryLevel); }
      if (c.length) q += ' WHERE ' + c.join(' AND ');
      q += ' ORDER BY RANDOM() LIMIT 3';
      return db.prepare(q).all(...p);
    },
    // Attempt 4: just give 3 random songs
    () => db.prepare('SELECT * FROM songs ORDER BY RANDOM() LIMIT 3').all(),
  ];

  for (const attempt of attempts) {
    const songs = attempt();
    if (songs.length > 0) {
      res.json(attachTags(songs));
      return;
    }
  }

  res.json([]);
});

// --- Guide Articles (server-rendered for SEO) ---

db.exec(`
  CREATE TABLE IF NOT EXISTS guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.get('/guide/:slug', (req, res) => {
  const guide = db.prepare('SELECT * FROM guides WHERE slug = ?').get(req.params.slug);
  if (!guide) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  res.send(renderGuidePage(guide));
});

function renderGuidePage(guide) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${guide.title} | Music I Want</title>
  <meta name="description" content="${guide.meta_description}">
  <meta property="og:title" content="${guide.title}">
  <meta property="og:description" content="${guide.meta_description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://musiciwant.com/guide/${guide.slug}">
  <link rel="canonical" href="https://musiciwant.com/guide/${guide.slug}">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"${guide.title}","description":"${guide.meta_description}","url":"https://musiciwant.com/guide/${guide.slug}","author":{"@type":"Person","name":"The Architect"}}
  </script>
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8335376690790226" crossorigin="anonymous"></script>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header"><a href="/" class="sidebar-logo">Music I Want</a></div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">Menu</div>
      <a href="/" class="sidebar-link"><span class="sidebar-icon">&#9750;</span> Home</a>
      <a href="/library" class="sidebar-link"><span class="sidebar-icon">&#9835;</span> Library</a>
      <a href="/finder" class="sidebar-link"><span class="sidebar-icon">&#10026;</span> Find Music</a>
      <a href="/about" class="sidebar-link"><span class="sidebar-icon">&#9432;</span> About</a>
    </nav>
  </aside>
  <main class="main-content">
    <article class="guide-content" style="max-width:720px">
      <h1>${guide.title}</h1>
      ${guide.content}
      <div class="affiliate-section" style="margin-top:2rem">
        <span class="affiliate-disclosure">affiliate links</span>
        <h3>Recommended for sensory-sensitive listening</h3>
        <div class="affiliate-links">
          <a href="https://www.ebay.com/sch/i.html?_nkw=noise+cancelling+headphones+comfortable&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Noise-Canceling Headphones</a>
          <a href="https://www.ebay.com/sch/i.html?_nkw=weighted+blanket&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Weighted Blankets</a>
          <a href="https://www.ebay.com/sch/i.html?_nkw=sensory+fidget+tools&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Sensory Tools</a>
        </div>
      </div>
      <div style="margin-top:2rem"><a href="/library" style="color:var(--accent)">&larr; Browse Library</a></div>
    </article>
    <footer class="site-footer">
      <p>Built by <a href="https://linkedin.com/in/build-ai-for-good" rel="noopener" target="_blank">The Architect</a> &middot; A project of The Hive</p>
    </footer>
  </main>
</body>
</html>`;
}

// Admin: import guide
app.post('/api/admin/import-guide', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { slug, title, meta_description, content } = req.body;
  if (!slug || !title || !content) return res.status(400).json({ error: 'Missing fields' });
  try {
    db.prepare('INSERT OR REPLACE INTO guides (slug, title, meta_description, content) VALUES (?, ?, ?, ?)').run(slug, title, meta_description, content);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SEO Routes ---

// Sitemap
app.get('/sitemap.xml', (req, res) => {
  const songs = db.prepare('SELECT slug, updated_at FROM songs ORDER BY updated_at DESC').all();
  const base = 'https://musiciwant.com';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
  xml += `  <url><loc>${base}/library</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
  xml += `  <url><loc>${base}/finder</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${base}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
  const guides = db.prepare('SELECT slug, created_at FROM guides ORDER BY created_at DESC').all();
  for (const guide of guides) {
    xml += `  <url><loc>${base}/guide/${guide.slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  }
  for (const song of songs) {
    const date = song.updated_at ? song.updated_at.split(' ')[0] : '2026-04-03';
    xml += `  <url><loc>${base}/song/${song.slug}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
  }
  xml += '</urlset>';
  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: https://musiciwant.com/sitemap.xml\n`);
});

// --- HTML Routes (SPA with server-rendered SEO pages) ---

// Song pages with SEO meta tags
app.get('/song/:slug', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE slug = ?').get(req.params.slug);
  if (song) return res.send(renderSongPage(song));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// All other routes — serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function renderSongPage(song) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${song.title} by ${song.artist} — Sensory Rating | Music I Want</title>
  <meta name="description" content="${song.description}">
  <meta property="og:title" content="${song.title} by ${song.artist} — Sensory Rating">
  <meta property="og:description" content="${song.description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://musiciwant.com/song/${song.slug}">
  <link rel="canonical" href="https://musiciwant.com/song/${song.slug}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": "${song.title}",
    "byArtist": {"@type": "MusicGroup", "name": "${song.artist}"},
    "inAlbum": {"@type": "MusicAlbum", "name": "${song.album}"},
    "description": "${song.description}"
  }
  </script>
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8335376690790226" crossorigin="anonymous"></script>
</head>
<body>
  <div id="app"></div>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Music I Want running on port ${PORT}`);
});

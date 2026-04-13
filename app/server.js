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
    source TEXT DEFAULT 'curated',
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

  -- Verification tracking
  CREATE TABLE IF NOT EXISTS song_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    song_slug TEXT NOT NULL,
    verification_type TEXT NOT NULL,
    ai_source TEXT NOT NULL,
    field_checked TEXT NOT NULL,
    original_value TEXT DEFAULT '',
    verified_value TEXT DEFAULT '',
    status TEXT CHECK(status IN ('confirmed','corrected','flagged','unverified')) NOT NULL,
    notes TEXT DEFAULT '',
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_verifications_song ON song_verifications(song_id);
  CREATE INDEX IF NOT EXISTS idx_verifications_status ON song_verifications(status);
`);

// Migration: add source column if it doesn't exist
try { db.exec(`ALTER TABLE songs ADD COLUMN source TEXT DEFAULT 'curated'`); } catch (e) { /* column already exists */ }

// Migration: add misophonia trigger columns
try { db.exec(`ALTER TABLE songs ADD COLUMN miso_mouth TEXT DEFAULT 'unknown'`); } catch (e) {}
try { db.exec(`ALTER TABLE songs ADD COLUMN miso_clicks TEXT DEFAULT 'unknown'`); } catch (e) {}
try { db.exec(`ALTER TABLE songs ADD COLUMN miso_breathing TEXT DEFAULT 'unknown'`); } catch (e) {}
try { db.exec(`ALTER TABLE songs ADD COLUMN miso_repetitive TEXT DEFAULT 'unknown'`); } catch (e) {}

// Fan stories table
db.exec(`
  CREATE TABLE IF NOT EXISTS fan_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT DEFAULT '',
    story TEXT NOT NULL,
    lyric TEXT DEFAULT '',
    approved INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_fan_stories_slug ON fan_stories(song_slug);
`);

// Rate limiting store for song checker
const checkLimits = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = checkLimits.get(ip);
  if (!entry) { checkLimits.set(ip, { count: 1, reset: now + 3600000 }); return true; }
  if (now > entry.reset) { checkLimits.set(ip, { count: 1, reset: now + 3600000 }); return true; }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Middleware
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
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

// --- Verification API ---

// Record verification results
app.post('/api/admin/verify', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const results = req.body;
  if (!Array.isArray(results)) return res.status(400).json({ error: 'Expected array' });

  const stmt = db.prepare(`INSERT INTO song_verifications (song_id, song_slug, verification_type, ai_source, field_checked, original_value, verified_value, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let recorded = 0;
  for (const r of results) {
    try {
      stmt.run(r.song_id, r.song_slug, r.verification_type, r.ai_source, r.field_checked, r.original_value || '', r.verified_value || '', r.status, r.notes || '');
      recorded++;
    } catch (e) { /* skip duplicates */ }
  }

  res.json({ recorded, total: results.length });
});

// Get verification status
app.get('/api/admin/verification-status', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const total = db.prepare('SELECT COUNT(*) as c FROM songs').get().c;
  const verified = db.prepare('SELECT COUNT(DISTINCT song_id) as c FROM song_verifications').get().c;
  const confirmed = db.prepare("SELECT COUNT(DISTINCT song_id) as c FROM song_verifications WHERE status = 'confirmed'").get().c;
  const corrected = db.prepare("SELECT COUNT(DISTINCT song_id) as c FROM song_verifications WHERE status = 'corrected'").get().c;
  const flagged = db.prepare("SELECT COUNT(DISTINCT song_id) as c FROM song_verifications WHERE status = 'flagged'").get().c;

  const byType = db.prepare("SELECT verification_type, COUNT(*) as c FROM song_verifications GROUP BY verification_type").all();
  const bySource = db.prepare("SELECT ai_source, COUNT(*) as c FROM song_verifications GROUP BY ai_source").all();

  res.json({ total_songs: total, songs_verified: verified, confirmed, corrected, flagged, unverified: total - verified, by_type: byType, by_source: bySource });
});

// Apply corrections from verification
app.post('/api/admin/apply-corrections', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const corrections = db.prepare("SELECT * FROM song_verifications WHERE status = 'corrected'").all();
  let applied = 0;

  for (const c of corrections) {
    if (['sensory_level', 'dynamic_range', 'sudden_changes', 'texture', 'predictability', 'vocal_style', 'album', 'year', 'bpm'].includes(c.field_checked)) {
      try {
        db.prepare(`UPDATE songs SET ${c.field_checked} = ? WHERE id = ?`).run(c.verified_value, c.song_id);
        applied++;
      } catch (e) { /* constraint violation */ }
    }
  }

  res.json({ applied, total: corrections.length });
});

// --- API Routes ---

// Get all songs with filters
app.get('/api/songs', (req, res) => {
  const { sensory_level, mood, tradition, recommended_for, search, sort, miso_safe } = req.query;

  let query = 'SELECT DISTINCT s.* FROM songs s';
  const joins = [];
  const conditions = [];
  const params = [];

  // Misophonia-safe filter: only songs where all miso triggers are 'none'
  if (miso_safe === 'true') {
    conditions.push("(s.miso_mouth = 'none' OR s.miso_mouth = 'unknown')");
    conditions.push("(s.miso_clicks = 'none' OR s.miso_clicks = 'unknown')");
    conditions.push("(s.miso_breathing = 'none' OR s.miso_breathing = 'unknown')");
    conditions.push("(s.miso_repetitive = 'none' OR s.miso_repetitive = 'unknown')");
  }

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

// --- Song Checker: "Is This Song Safe?" ---

const OPENAI_KEY = process.env.OPENAI_KEY || '';

app.post('/api/check', async (req, res) => {
  const { title, artist } = req.body;
  if (!title || !artist) return res.status(400).json({ error: 'Title and artist required' });

  // Rate limit
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many checks. Try again in an hour.' });

  // Step 1: Check existing database
  const existing = db.prepare(
    'SELECT * FROM songs WHERE LOWER(title) LIKE ? AND LOWER(artist) LIKE ? LIMIT 1'
  ).get(`%${title.toLowerCase()}%`, `%${artist.toLowerCase()}%`);

  if (existing) {
    existing.moods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(existing.id).map(r => r.mood);
    existing.traditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(existing.id).map(r => r.tradition);
    existing.recommended_for = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?').all(existing.id).map(r => r.use_case);
    return res.json({ found: true, song: existing });
  }

  // Step 2: AI analysis
  if (!OPENAI_KEY) {
    return res.status(503).json({ error: 'AI analysis is not configured. Song not found in our database.' });
  }

  const slug = (title + '-' + artist).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

  // Check if we already analyzed this slug
  const cached = db.prepare('SELECT * FROM songs WHERE slug = ?').get(slug);
  if (cached) {
    cached.moods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(cached.id).map(r => r.mood);
    cached.traditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(cached.id).map(r => r.tradition);
    cached.recommended_for = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?').all(cached.id).map(r => r.use_case);
    return res.json({ found: true, song: cached });
  }

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'system',
          content: `You are a music sensory analyst. Given a song title and artist, analyze the song for sensory sensitivity. You must be accurate based on your knowledge of the actual song. If you do not know the song, set "unknown" to true. Return JSON with these exact fields:
{
  "unknown": false,
  "title": "exact song title",
  "artist": "exact artist name",
  "album": "album name or empty string",
  "year": year_number_or_null,
  "sensory_level": "safe" | "moderate" | "intense",
  "dynamic_range": 1-10,
  "sudden_changes": "none" | "mild" | "moderate" | "frequent" | "extreme",
  "texture": "smooth" | "layered" | "complex" | "harsh" | "abrasive",
  "predictability": "high" | "medium" | "low",
  "vocal_style": "instrumental" | "soft vocals" | "spoken word" | "dynamic vocals" | "screaming",
  "sensory_notes": "1-2 sentence sensory description",
  "bpm": estimated_bpm_number,
  "description": "1 sentence song description",
  "miso_mouth": "none" | "mild" | "present",
  "miso_clicks": "none" | "mild" | "present",
  "miso_breathing": "none" | "mild" | "present",
  "miso_repetitive": "none" | "mild" | "present",
  "moods": ["mood1", "mood2"],
  "traditions": ["genre1"],
  "recommended_for": ["use_case1"]
}
Misophonia fields: miso_mouth = lip sounds, tongue clicks, saliva. miso_clicks = hi-hat ticks, rimshots, snaps. miso_breathing = audible breaths between phrases. miso_repetitive = pick scratches, vinyl crackle, tape hiss.
Valid moods: calm, contemplative, warm, joyful, melancholy, energetic, spacious, intimate, transcendent, heavy, cathartic, nostalgic, playful, dreamy, serene, uplifting, emotional, reflective, introspective, romantic, confident, rebellious, aggressive, intense
Valid recommended_for: sleep, focus, anxiety relief, meltdown recovery, deep listening, meditation, movement, energy, emotional release, study, relaxation, workout, yoga`
        }, {
          role: 'user',
          content: `Analyze: "${title}" by ${artist}`
        }]
      })
    });

    const aiData = await aiRes.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    if (analysis.unknown) {
      return res.json({ found: false, error: 'Song not recognized. We can only analyze songs in our knowledge base.' });
    }

    // Save to database
    const insertSong = db.prepare(`
      INSERT OR IGNORE INTO songs (title, artist, album, year, slug, sensory_level, dynamic_range, sudden_changes, texture, predictability, vocal_style, sensory_notes, bpm, description, source, miso_mouth, miso_clicks, miso_breathing, miso_repetitive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai-checked', ?, ?, ?, ?)
    `);

    const result = insertSong.run(
      analysis.title, analysis.artist, analysis.album || '', analysis.year,
      slug, analysis.sensory_level, analysis.dynamic_range, analysis.sudden_changes,
      analysis.texture, analysis.predictability, analysis.vocal_style,
      analysis.sensory_notes || '', analysis.bpm, analysis.description || '',
      analysis.miso_mouth || 'unknown', analysis.miso_clicks || 'unknown',
      analysis.miso_breathing || 'unknown', analysis.miso_repetitive || 'unknown'
    );

    const songId = result.lastInsertRowid || db.prepare('SELECT id FROM songs WHERE slug = ?').get(slug)?.id;

    if (songId && analysis.moods) {
      const insertMood = db.prepare('INSERT OR IGNORE INTO song_moods (song_id, mood) VALUES (?, ?)');
      for (const m of analysis.moods) insertMood.run(songId, m);
    }
    if (songId && analysis.traditions) {
      const insertTrad = db.prepare('INSERT OR IGNORE INTO song_traditions (song_id, tradition) VALUES (?, ?)');
      for (const t of analysis.traditions) insertTrad.run(songId, t);
    }
    if (songId && analysis.recommended_for) {
      const insertRec = db.prepare('INSERT OR IGNORE INTO song_recommended_for (song_id, use_case) VALUES (?, ?)');
      for (const r of analysis.recommended_for) insertRec.run(songId, r);
    }

    analysis.slug = slug;
    analysis.source = 'ai-checked';
    res.json({ found: true, generated: true, song: analysis });

  } catch (e) {
    console.error('AI check error:', e.message);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

// --- Safe Alternatives Recommendation Engine ---

app.get('/api/songs/:slug/alternatives', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE slug = ?').get(req.params.slug);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  // Only show alternatives for moderate/intense songs
  if (song.sensory_level === 'safe') return res.json([]);

  const songMoods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(song.id).map(r => r.mood);
  const songTraditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(song.id).map(r => r.tradition);

  // Target level: safe preferred, moderate acceptable for intense songs
  const targetLevels = song.sensory_level === 'intense' ? ['safe', 'moderate'] : ['safe'];

  // Find candidates with overlapping moods or traditions and lower sensory level
  let candidates = [];

  if (songMoods.length > 0) {
    const moodPlaceholders = songMoods.map(() => '?').join(',');
    const moodCandidates = db.prepare(`
      SELECT DISTINCT s.*, COUNT(DISTINCT sm.mood) as mood_overlap
      FROM songs s
      JOIN song_moods sm ON s.id = sm.song_id
      WHERE sm.mood IN (${moodPlaceholders})
        AND s.id != ?
        AND s.sensory_level IN (${targetLevels.map(() => '?').join(',')})
      GROUP BY s.id
      ORDER BY mood_overlap DESC
      LIMIT 20
    `).all(...songMoods, song.id, ...targetLevels);
    candidates.push(...moodCandidates);
  }

  if (songTraditions.length > 0) {
    const tradPlaceholders = songTraditions.map(() => '?').join(',');
    const tradCandidates = db.prepare(`
      SELECT DISTINCT s.*, COUNT(DISTINCT st.tradition) as trad_overlap
      FROM songs s
      JOIN song_traditions st ON s.id = st.song_id
      WHERE st.tradition IN (${tradPlaceholders})
        AND s.id != ?
        AND s.sensory_level IN (${targetLevels.map(() => '?').join(',')})
      GROUP BY s.id
      ORDER BY trad_overlap DESC
      LIMIT 20
    `).all(...songTraditions, song.id, ...targetLevels);

    // Merge: boost songs that appear in both mood and tradition results
    for (const tc of tradCandidates) {
      const existing = candidates.find(c => c.id === tc.id);
      if (existing) {
        existing.score = (existing.mood_overlap || 0) + (tc.trad_overlap || 0);
      } else {
        tc.score = tc.trad_overlap || 0;
        candidates.push(tc);
      }
    }
  }

  // Score by overlap + BPM proximity
  for (const c of candidates) {
    if (!c.score) c.score = c.mood_overlap || 0;
    if (song.bpm && c.bpm) {
      const bpmDiff = Math.abs(song.bpm - c.bpm);
      if (bpmDiff <= 15) c.score += 2;
      else if (bpmDiff <= 30) c.score += 1;
    }
    // Prefer safe over moderate
    if (c.sensory_level === 'safe') c.score += 1;
  }

  // Deduplicate and sort
  const seen = new Set();
  const unique = candidates.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  unique.sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = unique.slice(0, 5);

  // Attach tags
  const moodStmt = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?');
  const tradStmt = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?');
  const recStmt = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?');
  for (const s of top) {
    s.moods = moodStmt.all(s.id).map(r => r.mood);
    s.traditions = tradStmt.all(s.id).map(r => r.tradition);
    s.recommended_for = recStmt.all(s.id).map(r => r.use_case);
  }

  res.json(top);
});

// --- Fan Stories ---

// Get stories for a song
app.get('/api/stories/:slug', (req, res) => {
  const stories = db.prepare(
    'SELECT id, name, city, story, lyric, created_at FROM fan_stories WHERE song_slug = ? AND approved = 1 ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.slug);
  res.json(stories);
});

// Submit a story
const storyLimits = new Map();
app.post('/api/stories', (req, res) => {
  const { song_slug, name, city, story, lyric } = req.body;
  if (!song_slug || !name || !story) return res.status(400).json({ error: 'Name and story required' });
  if (story.length > 1000) return res.status(400).json({ error: 'Story must be under 1000 characters' });
  if (story.length < 10) return res.status(400).json({ error: 'Tell us a little more' });

  // Rate limit: 5 stories per IP per hour
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = storyLimits.get(ip);
  if (entry && now < entry.reset && entry.count >= 5) return res.status(429).json({ error: 'Too many stories. Try again later.' });
  if (!entry || now > (entry?.reset || 0)) storyLimits.set(ip, { count: 1, reset: now + 3600000 });
  else entry.count++;

  db.prepare(
    'INSERT INTO fan_stories (song_slug, name, city, story, lyric) VALUES (?, ?, ?, ?, ?)'
  ).run(song_slug, name.slice(0, 50), (city || '').slice(0, 50), story.slice(0, 1000), (lyric || '').slice(0, 200));

  res.json({ ok: true });
});

// --- Artist Pages ---

app.get('/api/artist/:name', (req, res) => {
  const artistName = decodeURIComponent(req.params.name);
  const songs = db.prepare(
    'SELECT * FROM songs WHERE LOWER(artist) LIKE ? ORDER BY year ASC, title ASC'
  ).all(`%${artistName.toLowerCase()}%`);

  if (songs.length === 0) return res.status(404).json({ error: 'No songs found for this artist' });

  const moodStmt = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?');
  const tradStmt = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?');
  const recStmt = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?');

  for (const song of songs) {
    song.moods = moodStmt.all(song.id).map(r => r.mood);
    song.traditions = tradStmt.all(song.id).map(r => r.tradition);
    song.recommended_for = recStmt.all(song.id).map(r => r.use_case);
  }

  // Compute artist stats
  const levels = { safe: 0, moderate: 0, intense: 0 };
  let totalDR = 0;
  for (const s of songs) { levels[s.sensory_level]++; totalDR += s.dynamic_range; }

  res.json({
    artist: songs[0].artist,
    song_count: songs.length,
    levels,
    avg_dynamic_range: Math.round((totalDR / songs.length) * 10) / 10,
    songs
  });
});

// Get all artists (for browse)
app.get('/api/artists', (req, res) => {
  const artists = db.prepare(`
    SELECT artist, COUNT(*) as song_count,
      SUM(CASE WHEN sensory_level = 'safe' THEN 1 ELSE 0 END) as safe_count,
      SUM(CASE WHEN sensory_level = 'moderate' THEN 1 ELSE 0 END) as moderate_count,
      SUM(CASE WHEN sensory_level = 'intense' THEN 1 ELSE 0 END) as intense_count
    FROM songs GROUP BY artist HAVING song_count >= 3 ORDER BY song_count DESC
  `).all();
  res.json(artists);
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
      <a href="/check" class="sidebar-link"><span class="sidebar-icon">&#10003;</span> Check a Song</a>
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
  xml += `  <url><loc>${base}/check</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
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
// Song page — full server-rendered content for SEO
app.get('/song/:slug', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE slug = ?').get(req.params.slug);
  if (!song) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  song.moods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(song.id).map(r => r.mood);
  song.traditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(song.id).map(r => r.tradition);
  song.recommended_for = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?').all(song.id).map(r => r.use_case);
  res.send(renderSongPage(song));
});

// Homepage — server-rendered with content
app.get('/', (req, res) => {
  const songs = db.prepare('SELECT * FROM songs ORDER BY created_at DESC LIMIT 24').all();
  const totalSongs = db.prepare('SELECT COUNT(*) as c FROM songs').get().c;
  const totalArtists = db.prepare('SELECT COUNT(DISTINCT artist) as c FROM songs').get().c;
  res.send(renderHomePage(songs, totalSongs, totalArtists));
});

// Library — server-rendered full song list
app.get('/library', (req, res) => {
  const songs = db.prepare('SELECT slug, title, artist, sensory_level, bpm FROM songs ORDER BY artist, title').all();
  res.send(renderLibraryPage(songs));
});

// Checker result page — server-rendered for SEO
app.get('/check/:slug', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE slug = ?').get(req.params.slug);
  if (!song) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  song.moods = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?').all(song.id).map(r => r.mood);
  song.traditions = db.prepare('SELECT tradition FROM song_traditions WHERE song_id = ?').all(song.id).map(r => r.tradition);
  song.recommended_for = db.prepare('SELECT use_case FROM song_recommended_for WHERE song_id = ?').all(song.id).map(r => r.use_case);
  // Render the same song page but with checker branding
  res.send(renderSongPage(song, true));
});

// Artist page — server-rendered for SEO
app.get('/artist/:name', (req, res) => {
  const artistName = decodeURIComponent(req.params.name);
  const songs = db.prepare('SELECT * FROM songs WHERE LOWER(artist) LIKE ? ORDER BY year ASC, title ASC')
    .all(`%${artistName.toLowerCase()}%`);
  if (songs.length === 0) return res.sendFile(path.join(__dirname, 'public', 'index.html'));

  const moodStmt = db.prepare('SELECT mood FROM song_moods WHERE song_id = ?');
  for (const s of songs) s.moods = moodStmt.all(s.id).map(r => r.mood);

  const levels = { safe: 0, moderate: 0, intense: 0 };
  let totalDR = 0;
  for (const s of songs) { levels[s.sensory_level]++; totalDR += s.dynamic_range; }
  const avgDR = Math.round((totalDR / songs.length) * 10) / 10;
  const name = songs[0].artist;

  // Generate personality line
  const mostCommon = levels.intense >= levels.moderate && levels.intense >= levels.safe ? 'intense' : levels.moderate >= levels.safe ? 'moderate' : 'safe';
  const personality = mostCommon === 'intense'
    ? `${esc(name)} is a band that doesn't hold back. ${levels.intense} of ${songs.length} songs hit intense — this is music that demands something from you.`
    : mostCommon === 'safe'
    ? `${esc(name)} lives in gentleness. ${levels.safe} of ${songs.length} songs are safe — this is music that holds you.`
    : `${esc(name)} lives in the middle ground — ${levels.moderate} moderate songs that balance intensity with control. ${levels.safe > 0 ? `${levels.safe} quiet anchor${levels.safe > 1 ? 's' : ''} and ` : ''}${levels.intense > 0 ? `${levels.intense} song${levels.intense > 1 ? 's' : ''} where they let go completely.` : ''}`;

  // Group songs by feel
  const quietSongs = songs.filter(s => s.sensory_level === 'safe');
  const middleSongs = songs.filter(s => s.sensory_level === 'moderate');
  const loudSongs = songs.filter(s => s.sensory_level === 'intense');

  function songCard(s) {
    const sl = s.sensory_level === 'safe' ? 'badge-safe' : s.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';
    const drBar = `<span style="display:inline-block;width:60px;height:4px;background:var(--bg-hover);border-radius:2px;vertical-align:middle;margin-left:0.5rem"><span style="display:block;height:100%;width:${s.dynamic_range*10}%;background:var(--accent);border-radius:2px"></span></span>`;
    return `<a href="/song/${s.slug}" style="display:block;padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);text-decoration:none;color:var(--text);border-left:3px solid ${s.sensory_level === 'safe' ? 'var(--safe)' : s.sensory_level === 'moderate' ? 'var(--moderate)' : 'var(--intense)'}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${esc(s.title)}</strong>
        <span class="badge ${sl}" style="font-size:0.7rem">${s.sensory_level}</span>
      </div>
      <div style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-dim)">
        ${s.texture} texture &middot; ${s.sudden_changes} changes &middot; DR ${s.dynamic_range} ${drBar}
        ${s.year ? ` &middot; ${s.year}` : ''}
      </div>
    </a>`;
  }

  // Get recent fan stories across all this artist's songs
  const slugs = songs.map(s => s.slug);
  const placeholders = slugs.map(() => '?').join(',');
  const recentStories = db.prepare(
    `SELECT fs.*, s.title as song_title FROM fan_stories fs
     JOIN songs s ON s.slug = fs.song_slug
     WHERE fs.song_slug IN (${placeholders}) AND fs.approved = 1
     ORDER BY fs.created_at DESC LIMIT 10`
  ).all(...slugs);

  const storyFeed = recentStories.length > 0
    ? recentStories.map(st => `<div style="padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
        <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.4rem"><a href="/song/${st.song_slug}" style="color:var(--accent);text-decoration:none">${esc(st.song_title)}</a></div>
        ${st.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.4rem 0">"${esc(st.lyric)}"</p>` : ''}
        <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.4rem 0">${esc(st.story)}</p>
        <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${esc(st.name)}</strong>${st.city ? ` &mdash; ${esc(st.city)}` : ''}</p>
      </div>`).join('')
    : `<div style="padding:2rem;background:var(--bg-card);border-radius:var(--radius);text-align:center">
        <p style="color:var(--text-muted);font-size:1rem;margin:0 0 0.5rem 0">No stories yet.</p>
        <p style="color:var(--text-dim);font-size:0.85rem;margin:0">Click any song and share what it means to you. Be the first voice on this wall.</p>
      </div>`;

  res.send(`${headHTML(
    `${esc(name)} — Every Song Decoded | Music I Want`,
    `${personality} ${songs.length} songs analyzed for intensity, texture, and emotional arc.`,
    `https://musiciwant.com/artist/${encodeURIComponent(name)}`
  )}
  <body>
    ${sidebarHTML()}
    <main class="main-content">
      <div id="app">
        <div style="max-width:760px;margin:0 auto">

          <div style="margin-bottom:2rem">
            <h1 style="margin-bottom:0.25rem">${esc(name)}</h1>
            <p style="color:var(--text-muted);font-size:1.05rem;font-style:italic;margin:0">${personality}</p>
          </div>

          <div style="display:flex;gap:1rem;margin-bottom:2.5rem;flex-wrap:wrap">
            <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center;flex:1;min-width:100px">
              <div style="font-size:2rem;font-weight:700;color:var(--accent)">${avgDR}</div>
              <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Avg Intensity</div>
            </div>
            <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center;flex:1;min-width:100px">
              <div style="font-size:2rem;font-weight:700;color:var(--text)">${songs.length}</div>
              <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Songs Decoded</div>
            </div>
            <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center;flex:1;min-width:100px">
              <div style="font-size:2rem;font-weight:700;color:var(--text)">${recentStories.length}</div>
              <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Fan Stories</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
            <div>
              ${loudSongs.length > 0 ? `<h2 style="font-size:1rem;color:var(--intense);margin-bottom:0.75rem">The songs that hit hardest</h2>
              <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2rem">${loudSongs.map(songCard).join('')}</div>` : ''}

              ${middleSongs.length > 0 ? `<h2 style="font-size:1rem;color:var(--moderate);margin-bottom:0.75rem">The controlled burn</h2>
              <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2rem">${middleSongs.map(songCard).join('')}</div>` : ''}

              ${quietSongs.length > 0 ? `<h2 style="font-size:1rem;color:var(--safe);margin-bottom:0.75rem">The quiet ones</h2>
              <div style="display:flex;flex-direction:column;gap:0.5rem">${quietSongs.map(songCard).join('')}</div>` : ''}
            </div>

            <div>
              <h2 style="font-size:1rem;color:var(--accent);margin-bottom:0.75rem">The Wall &mdash; Fan Stories</h2>
              <div style="display:flex;flex-direction:column;gap:0.75rem">
                ${storyFeed}
              </div>
            </div>
          </div>

          <div style="margin-top:2.5rem;padding:1.25rem;background:rgba(212,149,106,0.06);border-radius:var(--radius);border:1px solid rgba(212,149,106,0.15);text-align:center">
            <p style="color:var(--text);font-size:0.95rem;margin:0 0 0.75rem 0">Know a ${esc(name)} song we haven't decoded yet?</p>
            <a href="/check" style="display:inline-block;padding:0.6rem 1.5rem;background:var(--accent);color:var(--bg);border-radius:var(--radius-sm);text-decoration:none;font-weight:600">Check a Song</a>
          </div>

          <div style="margin-top:1.5rem">
            <a href="/library" style="color:var(--accent)">&larr; Back to Library</a>
          </div>
        </div>
      </div>
      ${footerHTML()}
    </main>
    <script src="/js/app.js"></script>
  </body></html>`);
});

// All other routes — serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Render Functions ---

function sidebarHTML() {
  return `<aside class="sidebar">
    <div class="sidebar-header"><a href="/" class="sidebar-logo">Music I Want</a></div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">Menu</div>
      <a href="/" class="sidebar-link"><span class="sidebar-icon">&#9750;</span> Home</a>
      <a href="/library" class="sidebar-link"><span class="sidebar-icon">&#9835;</span> Library</a>
      <a href="/finder" class="sidebar-link"><span class="sidebar-icon">&#10026;</span> Find Music</a>
      <a href="/check" class="sidebar-link"><span class="sidebar-icon">&#10003;</span> Check a Song</a>
      <a href="/profile" class="sidebar-link"><span class="sidebar-icon">&#9733;</span> My Profile</a>
      <a href="/make" class="sidebar-link"><span class="sidebar-icon">&#9836;</span> Make Music</a>
      <a href="/about" class="sidebar-link"><span class="sidebar-icon">&#9432;</span> About</a>
    </nav>
  </aside>`;
}

function headHTML(title, description, url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <link rel="canonical" href="${url}">
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8335376690790226" crossorigin="anonymous"></script>
</head>`;
}

function footerHTML() {
  return `<footer class="site-footer">
    <p>Built by <a href="https://linkedin.com/in/build-ai-for-good" rel="noopener" target="_blank">The Architect</a> &middot; A project of The Hive</p>
    <p class="footer-sub">Music that fits you. Not the other way around.</p>
  </footer>`;
}

function esc(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderFanStoriesSection(slug) {
  const stories = db.prepare(
    'SELECT name, city, story, lyric, created_at FROM fan_stories WHERE song_slug = ? AND approved = 1 ORDER BY created_at DESC LIMIT 10'
  ).all(slug);

  const storyCards = stories.map(s => {
    const location = s.city ? ` &mdash; ${esc(s.city)}` : '';
    return `<div style="padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
      ${s.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.5rem 0">"${esc(s.lyric)}"</p>` : ''}
      <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.5rem 0">${esc(s.story)}</p>
      <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${esc(s.name)}</strong>${location}</p>
    </div>`;
  }).join('');

  return `<div style="margin-top:2rem">
    <h3 style="color:var(--accent);font-size:1rem;margin-bottom:0.5rem">What this song means to people</h3>
    ${stories.length > 0 ? `<div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem">${storyCards}</div>` : `<p style="color:var(--text-dim);font-size:0.85rem">No stories yet. Be the first.</p>`}
    <details style="margin-top:1rem">
      <summary style="color:var(--accent);cursor:pointer;font-size:0.9rem">Share what this song means to you</summary>
      <form id="story-form" style="margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem" onsubmit="return submitStory(event, '${slug}')">
        <input type="text" name="name" placeholder="Your first name" required maxlength="50" class="filter-input" style="padding:0.6rem">
        <input type="text" name="city" placeholder="City (optional)" maxlength="50" class="filter-input" style="padding:0.6rem">
        <input type="text" name="lyric" placeholder="Your favorite lyric from this song (optional)" maxlength="200" class="filter-input" style="padding:0.6rem">
        <textarea name="story" placeholder="What does this song mean to you? When did you first hear it? What memory lives inside it?" required maxlength="1000" rows="3" class="filter-input" style="padding:0.6rem;resize:vertical"></textarea>
        <button type="submit" class="cta-primary" style="align-self:flex-start">Share My Story</button>
      </form>
    </details>
  </div>
  <script>
  function submitStory(e, slug) {
    e.preventDefault();
    const f = e.target;
    fetch('/api/stories', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        song_slug: slug,
        name: f.name.value,
        city: f.city.value,
        story: f.story.value,
        lyric: f.lyric.value
      })
    }).then(r => r.json()).then(d => {
      if (d.ok) { f.innerHTML = '<p style="color:var(--safe)">Thank you. Your story is now part of this song.</p>'; }
      else { alert(d.error || 'Something went wrong'); }
    });
    return false;
  }
  </script>`;
}

function renderAlternativesSection(song) {
  if (song.sensory_level === 'safe') return '';

  const songMoods = song.moods || [];
  const songTraditions = song.traditions || [];
  const targetLevels = song.sensory_level === 'intense' ? ['safe', 'moderate'] : ['safe'];

  let candidates = [];

  if (songMoods.length > 0) {
    const moodPlaceholders = songMoods.map(() => '?').join(',');
    const moodCandidates = db.prepare(`
      SELECT DISTINCT s.slug, s.title, s.artist, s.sensory_level, s.bpm, COUNT(DISTINCT sm.mood) as overlap
      FROM songs s JOIN song_moods sm ON s.id = sm.song_id
      WHERE sm.mood IN (${moodPlaceholders}) AND s.id != ? AND s.sensory_level IN (${targetLevels.map(() => '?').join(',')})
      GROUP BY s.id ORDER BY overlap DESC LIMIT 10
    `).all(...songMoods, song.id, ...targetLevels);
    candidates.push(...moodCandidates);
  }

  // Deduplicate
  const seen = new Set();
  const unique = candidates.filter(c => { if (seen.has(c.slug)) return false; seen.add(c.slug); return true; });
  const top = unique.slice(0, 5);

  if (top.length === 0) return '';

  const altCards = top.map(a => {
    const badge = a.sensory_level === 'safe' ? 'badge-safe' : 'badge-moderate';
    return `<a href="/song/${a.slug}" style="display:block;padding:0.75rem;background:var(--bg-card);border-radius:var(--radius-sm);text-decoration:none;color:var(--text)">
      <strong>${esc(a.title)}</strong><br>
      <span style="font-size:0.85rem;color:var(--text-muted)">${esc(a.artist)}</span>
      <span class="badge ${badge}" style="margin-left:0.5rem;font-size:0.7rem">${a.sensory_level}</span>
    </a>`;
  }).join('');

  return `<div style="margin-top:2rem;padding:1.25rem;background:var(--bg-sidebar);border-radius:var(--radius);border:1px solid var(--bg-hover)">
    <h3 style="margin:0 0 0.75rem 0;font-size:1rem;color:var(--accent)">Safer alternatives with a similar feel</h3>
    <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1rem 0">These songs share similar moods but with a gentler sensory profile.</p>
    <div style="display:flex;flex-direction:column;gap:0.5rem">${altCards}</div>
  </div>`;
}

function renderSongPage(song, isChecker) {
  const sc = song.sudden_changes === 'none' ? 'badge-safe' : song.sudden_changes === 'mild' ? 'badge-moderate' : 'badge-intense';
  const sl = song.sensory_level === 'safe' ? 'badge-safe' : song.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';
  const arcParagraphs = (song.arc_description || '').split(/\\n\\n|\n\n/).filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('');

  return `${headHTML(
    `${esc(song.title)} by ${esc(song.artist)} — Sensory Rating | Music I Want`,
    esc(song.description),
    `https://musiciwant.com/song/${song.slug}`
  )}
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": "${esc(song.title)}",
    "byArtist": {"@type": "MusicGroup", "name": "${esc(song.artist)}"},
    "inAlbum": {"@type": "MusicAlbum", "name": "${esc(song.album)}"},
    "description": "${esc(song.description)}",
    "datePublished": "${song.year || ''}",
    "url": "https://musiciwant.com/song/${song.slug}"
  }
  </script>
<body>
  ${sidebarHTML()}
  <main class="main-content">
    <div id="app">
      <div class="song-detail" style="max-width:720px;margin:0 auto">
        <div class="song-detail-header">
          ${song.thumbnail_url ? `<img class="song-detail-art" src="${song.thumbnail_url}" alt="${esc(song.title)} album art" width="180" height="180">` : ''}
          <div class="song-detail-info">
            <h1>${esc(song.title)}</h1>
            <div class="artist" style="font-size:1.05rem;color:var(--accent)">${esc(song.artist)}</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">${esc(song.album)}${song.year ? ' (' + song.year + ')' : ''}</div>
            <div class="meta" style="margin-top:0.5rem">
              <span class="badge ${sl}">${song.sensory_level === 'safe' ? 'Safe' : song.sensory_level === 'moderate' ? 'Moderate' : 'Intense'}</span>
              ${song.bpm ? `<span class="badge badge-neutral">${song.bpm} BPM</span>` : ''}
            </div>
            ${song.source === 'ai-checked' ? `<div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-dim);background:var(--bg-card);display:inline-block;padding:0.25rem 0.6rem;border-radius:6px">AI-analyzed &mdash; <a href="/check" style="color:var(--accent)">check another song</a></div>` : ''}
          </div>
        </div>

        <div class="sensory-card">
          <h2>Sensory Profile</h2>
          <div class="rating-row"><span class="rating-label">Dynamic Range</span><span class="rating-value">${song.dynamic_range}/10</span></div>
          <div class="rating-row"><span class="rating-label">Sudden Changes</span><span class="rating-value ${sc}">${song.sudden_changes}</span></div>
          <div class="rating-row"><span class="rating-label">Texture</span><span class="rating-value">${song.texture}</span></div>
          <div class="rating-row"><span class="rating-label">Predictability</span><span class="rating-value">${song.predictability}</span></div>
          <div class="rating-row"><span class="rating-label">Vocal Style</span><span class="rating-value">${song.vocal_style}</span></div>
          ${song.sensory_notes ? `<div class="sensory-notes"><strong>Notes:</strong> ${esc(song.sensory_notes)}</div>` : ''}
        </div>

        ${(song.miso_mouth && song.miso_mouth !== 'unknown') || (song.miso_clicks && song.miso_clicks !== 'unknown') || (song.miso_breathing && song.miso_breathing !== 'unknown') || (song.miso_repetitive && song.miso_repetitive !== 'unknown') ? `
        <div class="sensory-card" style="margin-top:1rem;border:1px solid rgba(212,149,106,0.15)">
          <h3 style="color:var(--accent);margin:0 0 0.75rem 0;font-size:0.9rem">Misophonia Triggers</h3>
          ${song.miso_mouth !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Mouth Sounds</span><span class="rating-value ${song.miso_mouth === 'none' ? 'badge-safe' : 'badge-intense'}">${song.miso_mouth}</span></div>` : ''}
          ${song.miso_clicks !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Percussive Clicks</span><span class="rating-value ${song.miso_clicks === 'none' ? 'badge-safe' : 'badge-intense'}">${song.miso_clicks}</span></div>` : ''}
          ${song.miso_breathing !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Breathing Sounds</span><span class="rating-value ${song.miso_breathing === 'none' ? 'badge-safe' : 'badge-intense'}">${song.miso_breathing}</span></div>` : ''}
          ${song.miso_repetitive !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Repetitive Micro-sounds</span><span class="rating-value ${song.miso_repetitive === 'none' ? 'badge-safe' : 'badge-intense'}">${song.miso_repetitive}</span></div>` : ''}
        </div>` : ''}

        ${song.recommended_for && song.recommended_for.length ? `<div class="recommended-for"><strong>Recommended for:</strong> ${song.recommended_for.map(r => `<span class="rec-tag">${esc(r)}</span>`).join(' ')}</div>` : ''}

        ${song.description ? `<p style="color:var(--text);font-size:0.95rem;margin:1.5rem 0">${esc(song.description)}</p>` : ''}

        ${song.cultural_context ? `<div class="cultural-context"><h3>Cultural Context</h3><p>${esc(song.cultural_context)}</p></div>` : ''}

        ${song.listening_prompt ? `<div class="listening-prompt"><h3>Listening Prompt</h3><p>${esc(song.listening_prompt)}</p></div>` : ''}

        ${arcParagraphs ? `<div class="guide-content"><h3>What to Expect</h3>${arcParagraphs}</div>` : ''}

        ${song.spotify_id ? `<div class="embed-container"><iframe src="https://open.spotify.com/embed/track/${song.spotify_id}?theme=0" height="152" allow="encrypted-media" loading="lazy" title="Listen to ${esc(song.title)} on Spotify"></iframe></div>` : ''}

        ${song.youtube_id ? `<div class="embed-container"><iframe src="https://www.youtube.com/embed/${song.youtube_id}" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="Watch ${esc(song.title)} on YouTube"></iframe></div>` : ''}

        <div class="listen-links">
          ${song.spotify_url ? `<a href="${song.spotify_url}" class="listen-link" rel="noopener" target="_blank">Listen on Spotify</a>` : ''}
          ${song.youtube_url ? `<a href="${song.youtube_url}" class="listen-link" rel="noopener" target="_blank">Watch on YouTube</a>` : ''}
        </div>

        <div class="affiliate-section">
          <span class="affiliate-disclosure">affiliate links</span>
          <h3>Listen with care</h3>
          <p>For sensory-sensitive listening, the right headphones matter.</p>
          <div class="affiliate-links">
            <a href="https://www.ebay.com/sch/i.html?_nkw=noise+cancelling+headphones&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Noise-Canceling Headphones</a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(song.artist + ' vinyl')}&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">${esc(song.artist)} on Vinyl</a>
          </div>
        </div>

        ${song.moods && song.moods.length ? `<p style="color:var(--text-dim);font-size:0.8rem">Moods: ${song.moods.join(', ')}</p>` : ''}
        ${song.traditions && song.traditions.length ? `<p style="color:var(--text-dim);font-size:0.8rem">Traditions: ${song.traditions.join(', ')}</p>` : ''}

        ${renderAlternativesSection(song)}

        ${renderFanStoriesSection(song.slug)}

        <div style="margin-top:2rem">
          <a href="/artist/${encodeURIComponent(song.artist)}" style="color:var(--accent)">&larr; All ${esc(song.artist)} songs</a>
          &nbsp;&nbsp;
          <a href="/check" style="color:var(--accent)">Check another song &rarr;</a>
        </div>
      </div>
    </div>
    ${footerHTML()}
  </main>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

function renderHomePage(recentSongs, totalSongs, totalArtists) {
  const songList = recentSongs.map(s => `<li><a href="/song/${s.slug}">${esc(s.title)}</a> by ${esc(s.artist)} — <span class="badge badge-${s.sensory_level === 'safe' ? 'safe' : s.sensory_level === 'moderate' ? 'moderate' : 'intense'}">${s.sensory_level}</span></li>`).join('');

  return `${headHTML(
    'Music I Want — Find the Music You Want',
    'Find the music you want. Understand any song. Discover what hits the same. Every song analyzed for texture, intensity, and emotional arc.',
    'https://musiciwant.com'
  )}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebSite","name":"Music I Want","url":"https://musiciwant.com","description":"Every song rated for sensory sensitivity. Find music that fits you."}
  </script>
<body>
  ${sidebarHTML()}
  <main class="main-content">
    <div id="app">
      <section class="home-hero">
        <h1>Find the music you want.</h1>
        <p class="tagline">Understand any song. Discover what hits the same. ${totalSongs} songs analyzed.</p>

        <div style="max-width:560px;margin:1.5rem auto">
          <form action="/library" method="get">
            <input type="text" name="search" placeholder="Search any song, artist, or mood..." class="filter-input" style="width:100%;padding:0.85rem 1.2rem;font-size:1.05rem;border-radius:12px;text-align:center">
          </form>
        </div>

        <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:1rem;flex-wrap:wrap">
          <a href="/finder" class="cta-primary">Find Music For Me</a>
          <a href="/check" class="cta-primary" style="background:var(--safe)">Check a Song</a>
          <a href="/make" class="cta-primary" style="background:var(--moderate)">Make a Song</a>
        </div>

        <div style="margin-top:2.5rem">
          <p style="color:#5a5550;font-size:0.85rem;margin-bottom:0.75rem">Explore</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center">
            <a href="/library?recommended_for=deep+listening" class="home-cat-btn">Deep Listening</a>
            <a href="/library?mood=cathartic" class="home-cat-btn">Songs That Build</a>
            <a href="/library?mood=intimate" class="home-cat-btn">Intimate &amp; Quiet</a>
            <a href="/library?recommended_for=focus" class="home-cat-btn">Focus &amp; Study</a>
            <a href="/library?recommended_for=sleep" class="home-cat-btn">Sleep</a>
            <a href="/library?recommended_for=anxiety+relief" class="home-cat-btn">Anxiety Relief</a>
            <a href="/library?sensory_level=safe" class="home-cat-btn" style="border-color:var(--safe)">Sensory Safe</a>
            <a href="/library?recommended_for=energy" class="home-cat-btn">Workout</a>
            <a href="/library?mood=melancholy" class="home-cat-btn">Beautiful Sadness</a>
            <a href="/library?recommended_for=meditation" class="home-cat-btn">Meditation</a>
            <a href="/profile" class="home-cat-btn">My Profile</a>
            <a href="/library" class="home-cat-btn">Browse All</a>
          </div>
        </div>
      </section>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:700px;margin:2rem auto">
        <a href="/check" style="padding:1.5rem;background:var(--bg-card);border-radius:12px;text-decoration:none;border:1px solid #1c1c28">
          <h3 style="color:var(--safe);margin:0 0 0.5rem 0;font-size:1rem">Understand Any Song</h3>
          <p style="color:#8a8580;font-size:0.85rem;margin:0">Enter any song &mdash; see its dynamic range, texture, intensity, and emotional arc before you press play.</p>
        </a>
        <a href="/make" style="padding:1.5rem;background:var(--bg-card);border-radius:12px;text-decoration:none;border:1px solid #1c1c28">
          <h3 style="color:var(--moderate);margin:0 0 0.5rem 0;font-size:1rem">Create Your Own</h3>
          <p style="color:#8a8580;font-size:0.85rem;margin:0">Describe the music you want to hear. Pick a genre, set the intensity, and we'll create a unique song for you.</p>
        </a>
      </div>

      <h2>What is Music I Want?</h2>
      <p>Every song has a DNA &mdash; its dynamic range, texture, intensity, predictability, and emotional arc. We analyze every song so you can understand what you're hearing, find music that hits the same way, and discover songs you'd never find through genre labels alone. Whether you're a Pearl Jam fanatic looking for songs with the same gut-punch as "Black," or a parent finding safe music for a sensory-sensitive child, the DNA tells you what you need to know. <a href="/check">Check any song</a> or <a href="/library">explore the library</a>.</p>

      <h2>Recently Added</h2>
      <ul style="list-style:none;padding:0">${songList}</ul>

      <h2>How Our Ratings Work</h2>
      <p>Every song has a sensory profile covering dynamic range (1-10), sudden changes (none to extreme), texture (smooth to abrasive), predictability (high to low), and vocal style. We rate songs as Sensory Safe, Moderate, or Intense so you know what to expect before you press play.</p>

      <p><a href="/about">Learn more about our rating system</a> | <a href="/library">Browse all ${totalSongs} songs</a></p>
    </div>
    ${footerHTML()}
  </main>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

function renderLibraryPage(songs) {
  const grouped = {};
  for (const s of songs) {
    const letter = (s.artist || '#')[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(s);
  }
  const letters = Object.keys(grouped).sort();
  const content = letters.map(letter => {
    const items = grouped[letter].map(s =>
      `<li><a href="/song/${s.slug}">${esc(s.title)}</a> by <strong>${esc(s.artist)}</strong> — <span class="badge badge-${s.sensory_level === 'safe' ? 'safe' : s.sensory_level === 'moderate' ? 'moderate' : 'intense'}">${s.sensory_level}</span>${s.bpm ? ` ${s.bpm} BPM` : ''}</li>`
    ).join('');
    return `<h3 id="letter-${letter}">${letter}</h3><ul style="list-style:none;padding:0">${items}</ul>`;
  }).join('');

  const letterNav = letters.map(l => `<a href="#letter-${l}" style="margin:0 0.25rem">${l}</a>`).join('');

  return `${headHTML(
    'Song Library — Music I Want',
    `Browse ${songs.length} songs rated for sensory sensitivity. Every song has a complete sensory profile.`,
    'https://musiciwant.com/library'
  )}
<body>
  ${sidebarHTML()}
  <main class="main-content">
    <div id="app">
      <h1>Song Library</h1>
      <p>${songs.length} songs rated for sensory sensitivity. Search, filter, and discover music that fits you.</p>
      <p style="font-size:0.85rem;color:var(--text-dim)">Jump to: ${letterNav}</p>
      ${content}
    </div>
    ${footerHTML()}
  </main>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Music I Want running on port ${PORT}`);
});

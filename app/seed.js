const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'musiciwant.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const songs = [
  {
    title: "Says", artist: "Nils Frahm", album: "Spaces", year: 2013,
    slug: "nils-frahm-says",
    sensory_level: "safe", dynamic_range: 3, sudden_changes: "none",
    texture: "smooth", predictability: "high", vocal_style: "instrumental",
    sensory_notes: "No vocals, no percussion, no sudden changes. A single synthesizer motif repeats and layers gradually. Volume increases slowly over the final third but never becomes loud. One of the safest pieces for sensory-sensitive listening.",
    bpm: 68,
    description: "A slow, warm synthesizer piece that builds gently over 9 minutes. No surprises. Deep comfort for sensory-sensitive listeners.",
    cultural_context: "Nils Frahm is a German musician who bridges classical piano and electronic music. This piece was recorded live, capturing the warmth of analog synthesizers in a concert hall. Frahm is known for his gentleness — his music is made to be felt physically, not just heard.",
    listening_prompt: "Put on headphones. Let the first note land. Don't wait for something to happen — this piece doesn't go anywhere. It just stays. That staying is the point.",
    arc_description: "Says begins with a single synthesizer tone — warm, round, slightly buzzy. It holds. After about 30 seconds, a second layer joins, the same motif pitched slightly differently. The two tones weave together.\n\nOver the next several minutes, more layers are added one at a time. Each one is gentle. There are no rhythmic elements, no beats, no percussion. The texture remains smooth throughout.\n\nAround the 6-minute mark, the volume begins to rise gradually. It never becomes loud, but it fills more space. The feeling shifts from intimate to expansive. The final minute settles back down.\n\nThe piece ends the way it began — a single tone, fading. There is nothing in this track that will startle you.",
    spotify_id: "0SFbGFrRDRp7bsGspJpFar", youtube_id: "dIwwjy4Ni8o",
    spotify_url: "https://open.spotify.com/track/0SFbGFrRDRp7bsGspJpFar",
    youtube_url: "https://www.youtube.com/watch?v=dIwwjy4Ni8o",
    moods: ["calm", "contemplative", "warm"],
    traditions: ["neo-classical", "ambient"],
    recommended_for: ["sleep", "anxiety relief", "deep focus", "meltdown recovery"]
  }
];

const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (title, artist, album, year, slug, sensory_level, dynamic_range, sudden_changes, texture, predictability, vocal_style, sensory_notes, bpm, description, cultural_context, listening_prompt, arc_description, spotify_id, youtube_id, spotify_url, youtube_url, apple_music_url, bandcamp_url, amazon_url)
  VALUES (@title, @artist, @album, @year, @slug, @sensory_level, @dynamic_range, @sudden_changes, @texture, @predictability, @vocal_style, @sensory_notes, @bpm, @description, @cultural_context, @listening_prompt, @arc_description, @spotify_id, @youtube_id, @spotify_url, @youtube_url, '', '', '')
`);

const insertMood = db.prepare('INSERT OR IGNORE INTO song_moods (song_id, mood) VALUES (?, ?)');
const insertTradition = db.prepare('INSERT OR IGNORE INTO song_traditions (song_id, tradition) VALUES (?, ?)');
const insertRec = db.prepare('INSERT OR IGNORE INTO song_recommended_for (song_id, use_case) VALUES (?, ?)');

const insertAll = db.transaction((songs) => {
  for (const song of songs) {
    const { moods, traditions, recommended_for, ...data } = song;
    const result = insertSong.run(data);
    const id = result.lastInsertRowid || db.prepare('SELECT id FROM songs WHERE slug = ?').get(data.slug)?.id;
    if (id) {
      for (const m of moods) insertMood.run(id, m);
      for (const t of traditions) insertTradition.run(id, t);
      for (const r of recommended_for) insertRec.run(id, r);
    }
  }
});

insertAll(songs);
console.log(`Seeded ${songs.length} songs.`);

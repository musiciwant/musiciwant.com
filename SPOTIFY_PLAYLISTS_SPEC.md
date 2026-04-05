# Spotify Playlist Specification — musiciwant.com

## Purpose
Create public Spotify playlists using songs from the musiciwant.com library that are verified Sensory Safe. These playlists are discoverable within Spotify's ecosystem, driving new users to musiciwant.com.

## Account Setup
- Create a Spotify account for "Music I Want" (or use an existing one)
- Profile bio: "Every song rated for sensory sensitivity. Find your safe music at musiciwant.com"
- Profile link: musiciwant.com

## 5 Playlists to Create

### 1. Sensory Safe Sleep
**Description:** "Every track verified safe for sensory-sensitive listeners. No surprises, no sudden changes, no jarring moments. Built for sleep. Curated by musiciwant.com — check any song's sensory profile at musiciwant.com/check"
**Selection criteria:** sensory_level = 'safe', recommended_for includes 'sleep', dynamic_range <= 3, vocal_style = 'instrumental' preferred
**Target length:** 15-20 tracks, ~60-90 minutes
**Sort order:** Slowest BPM first, ascending

### 2. Sensory Safe Focus
**Description:** "Music for ADHD, study, and deep work. Every track verified for sensory safety — moderate tempo, no sudden changes, no distracting vocals. Curated by musiciwant.com"
**Selection criteria:** sensory_level = 'safe', recommended_for includes 'focus' or 'deep focus' or 'study', BPM 70-110 preferred
**Target length:** 20-25 tracks, ~90-120 minutes
**Sort order:** Group by similar BPM ranges

### 3. Sensory Safe Calm
**Description:** "Anxiety relief and meltdown recovery. The gentlest music in our library, verified safe across all sensory dimensions. For when you need the world to be quieter. musiciwant.com"
**Selection criteria:** sensory_level = 'safe', recommended_for includes 'anxiety relief' or 'meltdown recovery' or 'relaxation', dynamic_range <= 4
**Target length:** 15-20 tracks
**Sort order:** By mood flow — start calm, stay calm

### 4. Sensory Safe Energy
**Description:** "Safe doesn't mean boring. Uplifting, joyful, energizing music — all verified safe for sensory sensitivity. No bass drops, no screaming, just energy that doesn't hurt. musiciwant.com"
**Selection criteria:** sensory_level = 'safe', recommended_for includes 'energy' or 'movement' or 'workout', BPM >= 90
**Target length:** 15-20 tracks
**Sort order:** Build energy gradually

### 5. Sensory Safe Kids
**Description:** "Music safe for sensory-sensitive children. Every track verified for no sudden changes, no harsh sounds, no surprises. For parents, teachers, and therapists. Learn more at musiciwant.com/guide/sensory-safe-music-for-kids"
**Selection criteria:** sensory_level = 'safe', texture = 'smooth', sudden_changes = 'none', predictability = 'high'
**Target length:** 10-15 tracks
**Sort order:** Gentle, predictable flow

## How to Populate

### Option A: Query the database directly
```sql
SELECT s.title, s.artist, s.spotify_url
FROM songs s
JOIN song_recommended_for r ON s.id = r.song_id
WHERE s.sensory_level = 'safe'
  AND r.use_case = 'sleep'
  AND s.spotify_url != ''
ORDER BY s.bpm ASC
LIMIT 20;
```

### Option B: Use the API
```
GET https://musiciwant.com/api/songs?sensory_level=safe&recommended_for=sleep&sort=dynamic_range_asc
```
Filter results for those with non-empty spotify_url.

### Option C: Browse the site
Go to musiciwant.com/library, filter by Safe + relevant Recommended For, open each song page, click the Spotify link.

## After Creation
- Add playlist links to the musiciwant.com homepage
- Add playlist links to relevant guide articles (sleep guide links to sleep playlist, etc.)
- Submit playlists to Spotify editorial for consideration in their directory

## Maintenance
- Add new Safe-rated songs to playlists monthly
- Keep playlist descriptions updated with song count and musiciwant.com links

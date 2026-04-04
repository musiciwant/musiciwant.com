# Delegation Prompt: Song Entries for musiciwant.com (JSON format)

## Who You Are

You are writing song entries for a website called Music I Want (musiciwant.com). The site rates music for sensory sensitivity — helping people with autism, ADHD, anxiety, SPD, and highly sensitive persons find music that's safe for them to listen to.

## What You Need to Produce

Output a JSON array of song objects. No commentary, no markdown — just valid JSON. Each song object must have EXACTLY these fields:

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "year": 2000,
  "slug": "artist-name-song-title",
  "sensory_level": "safe",
  "dynamic_range": 3,
  "sudden_changes": "none",
  "texture": "smooth",
  "predictability": "high",
  "vocal_style": "instrumental",
  "sensory_notes": "What a sensory-sensitive listener should expect.",
  "bpm": 70,
  "description": "One sentence — what this song feels like and who it's for.",
  "cultural_context": "2-3 sentences about where this music comes from.",
  "listening_prompt": "A gentle invitation to listen. Not instructions. Permission.",
  "arc_description": "2-4 paragraphs describing the arc of the song. How does it begin? Middle? End? Any surprises?",
  "spotify_id": "",
  "youtube_id": "",
  "spotify_url": "",
  "youtube_url": "",
  "apple_music_url": "",
  "bandcamp_url": "",
  "amazon_url": "",
  "moods": ["calm", "contemplative"],
  "traditions": ["ambient"],
  "recommended_for": ["sleep", "focus"]
}
```

## Field Values

### sensory_level: "safe" | "moderate" | "intense"
- safe: No sudden changes, consistent volume, smooth texture
- moderate: Some variation but nothing jarring
- intense: Significant dynamic range, sudden changes. Not bad — just needs preparation

### dynamic_range: 1-10
- 1-2: Almost no variation (ambient, drone)
- 3-4: Gentle variation
- 5-6: Noticeable variation (quiet verses, louder choruses)
- 7-8: Significant variation
- 9-10: Extreme (whisper to scream)

### sudden_changes: "none" | "mild" | "moderate" | "frequent" | "extreme"

### texture: "smooth" | "layered" | "complex" | "harsh" | "abrasive"

### predictability: "high" | "medium" | "low"

### vocal_style: "instrumental" | "soft vocals" | "spoken word" | "dynamic vocals" | "screaming"

### moods (pick from): calm, contemplative, warm, joyful, melancholy, energetic, spacious, intimate, transcendent, heavy, cathartic

### traditions (pick from): ambient, neo-classical, post-rock, electronic, world, jazz, folk, classical, Icelandic, West African, Japanese, Indian classical, Latin American, Nordic, Middle Eastern, American roots, hip-hop, R&B, pop, rock, metal, punk

### recommended_for (pick from): sleep, focus, anxiety relief, meltdown recovery, deep listening, meditation, movement, energy, emotional release

## slug format
Lowercase, hyphens only: `artist-name-song-title`. Example: `nils-frahm-says`

## Rules

1. You must actually know the song. Do not fabricate.
2. Do not reproduce lyrics. Not a single word.
3. Be honest about intensity. An intense song rated "safe" could hurt someone.
4. Leave spotify_id, youtube_id, and URLs empty if you can't verify them.
5. Output ONLY the JSON array. No other text.

## Batch Request

Produce 10 songs covering:
- 3-4 sensory-safe (ambient, neo-classical, gentle instrumental)
- 3-4 moderate (folk, soft vocals, gentle post-rock)
- 2-3 intense (post-rock builds, dynamic classical, cathartic)

Across multiple cultural traditions. Include at least 2 non-Western traditions.

# Delegation Prompt: Song Entries for musiciwant.com

## Who You Are

You are writing song entries for a website called Music I Want (musiciwant.com). The site rates music for sensory sensitivity — helping people with autism, ADHD, anxiety, SPD, and highly sensitive persons find music that's safe for them to listen to.

## What You Need to Produce

For each song, produce a single markdown file. Follow this EXACT format. Do not add fields. Do not remove fields. Do not change field names.

## Template

```markdown
---
title: "Song Title"
description: "One sentence — what this song feels like and who it's for."
date: 2026-04-02
artist: "Artist Name"
album: "Album Name"
year: 2000

sensory_level: "safe"
dynamic_range: 3
sudden_changes: "none"
texture: "smooth"
predictability: "high"
vocal_style: "instrumental"
sensory_notes: "Specific details about what a sensory-sensitive listener should expect."

bpm: 70
recommended_for: ["sleep", "focus", "anxiety relief", "meltdown recovery"]
moods: ["calm", "contemplative"]
traditions: ["ambient"]

spotify_id: ""
youtube_id: ""

spotify_url: ""
youtube_url: ""
apple_music_url: ""
bandcamp_url: ""
amazon_url: ""

cultural_context: "2-3 sentences about where this music comes from and the tradition it belongs to."
listening_prompt: "A gentle, personal invitation to listen. Not instructions. Permission."
---

2-4 paragraphs describing the arc of the song for someone who needs to know what will happen before they press play. How does it begin? What happens in the middle? How does it end? Are there any moments that might surprise? Write warmly but honestly. If something is jarring, say so.
```

## Field Definitions

### sensory_level
- **safe** — No sudden changes, consistent volume, smooth texture. A sensory-sensitive listener can trust this completely.
- **moderate** — Some variation but nothing jarring. Mild dynamic shifts, gentle builds. Most listeners will be comfortable with a heads-up.
- **intense** — Significant dynamic range, sudden changes, complex texture. Beautiful music but needs preparation. The rating is not a judgment — intense music has value. The rating is information.

### dynamic_range (1-10)
How much the volume varies within the track.
- 1-2: Almost no variation. Ambient, drone.
- 3-4: Gentle variation. Soft builds and fades.
- 5-6: Noticeable variation. Quiet verses, louder choruses.
- 7-8: Significant variation. Quiet passages followed by loud passages.
- 9-10: Extreme. Whisper to scream.

### sudden_changes
- **none** — Nothing unexpected happens at any point.
- **mild** — Minor shifts but all gradual.
- **moderate** — Some noticeable transitions but nothing jarring.
- **frequent** — Multiple moments of unexpected change.
- **extreme** — Sudden loud sounds, unexpected starts/stops, jarring shifts.

### texture
- **smooth** — Clean, warm, even. Like a single stream.
- **layered** — Multiple elements but they blend harmoniously.
- **complex** — Many interwoven elements that reward attention.
- **harsh** — Some frequencies that feel sharp or uncomfortable at volume.
- **abrasive** — Deliberately rough, distorted, challenging. Not a flaw — an aesthetic. But sensory-sensitive listeners need to know.

### predictability
- **high** — You can feel what's coming next. Repetitive structures, clear patterns.
- **medium** — Generally predictable with some variation.
- **low** — Hard to anticipate what comes next.

### vocal_style
- **instrumental** — No human voice.
- **soft vocals** — Gentle singing, whispering, humming.
- **spoken word** — Spoken passages.
- **dynamic vocals** — Varies from soft to powerful.
- **screaming** — Contains screaming, growling, or shouting.

### recommended_for
Choose from: sleep, focus, anxiety relief, meltdown recovery, deep listening, meditation, movement, energy, emotional release

### moods
Choose from: calm, contemplative, warm, joyful, melancholy, energetic, spacious, intimate, transcendent, heavy, cathartic

### traditions
Choose from: ambient, neo-classical, post-rock, electronic, world, jazz, folk, classical, Icelandic, West African, Japanese, Indian classical, Latin American, Nordic, Middle Eastern, American roots, hip-hop, R&B, pop, rock, metal, punk

## Important Rules

1. **You must actually know the song.** Do not fabricate descriptions of songs you haven't been trained on. If you don't know a specific track well enough to describe its arc, skip it and move to the next.
2. **Do not reproduce lyrics.** Not a single word. Reference what the voice does, not what it says.
3. **Be honest about intensity.** An intense song getting a "safe" rating could hurt someone. When in doubt, rate higher.
4. **Spotify and YouTube IDs:** Look up the actual IDs if you can. If you can't verify, leave them empty — we'll fill them in.
5. **Filename:** Use format `artist-name-song-title.md` with hyphens, all lowercase. Example: `nils-frahm-says.md`

## Batch Request

Please produce 10 song entries covering a mix of:
- 3-4 sensory-safe songs (ambient, neo-classical, gentle instrumental)
- 3-4 moderate songs (folk, soft vocals, gentle post-rock)
- 2-3 intense songs (post-rock builds, dynamic classical, cathartic)

Across multiple cultural traditions. Not all Western. Include at least 2 non-Western traditions.

Each entry is a separate markdown file. Produce all 10 in one response.

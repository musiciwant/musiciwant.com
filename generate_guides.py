#!/usr/bin/env python3
"""Generate SEO guide articles using ChatGPT and import them."""

import json, time
try:
    import requests
except ImportError:
    import os; os.system("pip3 install requests"); import requests

OPENAI_KEY = os.environ.get("OPENAI_KEY", "")
ADMIN_KEY = "hive-tuning-2026"

GUIDES = [
    {
        "slug": "sensory-safe-music-for-sleep",
        "prompt": "Write a 600-word article titled 'Sensory-Safe Music for Sleep: A Guide for Sensitive Listeners'. Cover: why sensory-sensitive people struggle with sleep music (sudden changes, unpredictable textures), what to look for (low dynamic range, no sudden changes, smooth texture, high predictability), and recommend looking for songs rated 'Sensory Safe' with recommendations for sleep. Mention autism, ADHD, SPD, HSP. Include internal links as HTML: <a href='/library'>Browse our sensory-rated library</a> and <a href='/finder'>Use our Frequency Finder</a>. Output valid HTML paragraphs with h2 headings. No markdown. Do not reproduce song lyrics.",
        "meta": "A guide for sensory-sensitive listeners who need safe, predictable music for sleep. Learn what to look for and find rated songs."
    },
    {
        "slug": "music-for-adhd-focus",
        "prompt": "Write a 600-word article titled 'Music for ADHD Focus: What Actually Works'. Cover: why ADHD brains respond differently to music (dopamine, stimulation threshold), what properties help focus (moderate tempo, layered texture, instrumental, medium predictability), and what to avoid (sudden changes, lyrics that pull attention). Include internal links as HTML: <a href='/library'>Browse our library filtered by focus</a> and <a href='/finder'>Try the Frequency Finder</a>. Output valid HTML with h2 headings. No markdown. No lyrics.",
        "meta": "What music properties actually help ADHD focus? A guide to tempo, texture, and sensory ratings for finding the right study music."
    },
    {
        "slug": "calming-music-for-autism-sensory-overload",
        "prompt": "Write a 600-word article titled 'Calming Music for Autism and Sensory Overload'. Cover: what sensory overload feels like, how music can help (grounding, predictability, distraction from overwhelming input), what to look for (sensory-safe rating, no sudden changes, smooth texture, instrumental or soft vocals), and what to avoid (harsh textures, extreme dynamic range, screaming vocals). Write with warmth and respect — not clinical. Include internal links as HTML: <a href='/library'>Find sensory-safe songs</a>. Output valid HTML with h2 headings. No markdown. No lyrics.",
        "meta": "How to find calming music during sensory overload. A warm guide for autistic listeners and their families."
    },
    {
        "slug": "what-is-sensory-friendly-music",
        "prompt": "Write a 600-word article titled 'What Is Sensory-Friendly Music? A Simple Guide'. Cover: what makes music sensory-friendly (predictability, smooth texture, consistent volume, no sudden changes), who benefits (autism, ADHD, anxiety, HSP, SPD, anyone who's ever been startled by a song), how Music I Want rates songs (dynamic range, sudden changes, texture, predictability, vocal style), and how to use the site. Include internal links: <a href='/about'>About our rating system</a>, <a href='/library'>Browse the library</a>, <a href='/finder'>Find music for your mood</a>. Output valid HTML with h2 headings. No markdown. No lyrics.",
        "meta": "What makes music sensory-friendly? Learn about dynamic range, texture, predictability, and how to find music that won't overwhelm you."
    },
    {
        "slug": "best-headphones-for-sensory-sensitivity",
        "prompt": "Write a 500-word article titled 'Best Headphones for Sensory Sensitivity: What to Look For'. Cover: why headphone choice matters for sensory-sensitive listeners (noise cancellation reduces overwhelm, over-ear reduces ear pressure, weight and clamping force matter), what features to prioritize (active noise cancellation, comfortable padding, adjustable clamping, wired option to avoid Bluetooth latency). Do NOT recommend specific brands — say 'look for headphones with these features'. Include affiliate link: <a href='https://www.amazon.com/s?k=noise+cancelling+headphones+comfortable&tag=musiciwant-20' rel='noopener nofollow' target='_blank'>Browse noise-canceling headphones on Amazon</a>. Output valid HTML with h2 headings. No markdown.",
        "meta": "What headphones work best for sensory-sensitive listeners? A guide to noise cancellation, comfort, and features that matter."
    },
]


def generate_guide(prompt):
    r = requests.post("https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
        json={"model": "gpt-4o-mini", "messages": [
            {"role": "system", "content": "You write helpful, warm, non-clinical articles for musiciwant.com. Output only valid HTML (paragraphs, h2 headings, links). No markdown. No code fences. No lyrics."},
            {"role": "user", "content": prompt}
        ], "max_tokens": 3000, "temperature": 0.7}, timeout=120)
    if r.status_code != 200:
        print(f"  Error: {r.status_code}")
        return None
    raw = r.json()["choices"][0]["message"]["content"].strip()
    # Clean any markdown fences
    if raw.startswith("```"): raw = raw.split("\n", 1)[1]
    if raw.endswith("```"): raw = raw[:-3]
    return raw.strip()


def import_guide(slug, title_from_content, meta, content):
    # Extract title from first h1 if present
    import re
    title_match = re.search(r'<h1>(.*?)</h1>', content)
    title = title_match.group(1) if title_match else slug.replace('-', ' ').title()

    r = requests.post("https://musiciwant.com/api/admin/import-guide",
        headers={"Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY},
        json={"slug": slug, "title": title, "meta_description": meta, "content": content},
        timeout=15)
    return r.status_code == 200


if __name__ == "__main__":
    for guide in GUIDES:
        print(f"\nGenerating: {guide['slug']}...")
        content = generate_guide(guide["prompt"])
        if content:
            ok = import_guide(guide["slug"], "", guide["meta"], content)
            print(f"  {'Imported' if ok else 'FAILED'}: {guide['slug']}")
        else:
            print(f"  Generation failed")
        time.sleep(2)

    print(f"\nDone. {len(GUIDES)} guides generated.")

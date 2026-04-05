#!/usr/bin/env node
/**
 * Import SEO guide articles into musiciwant.com
 * Run: node import_guides.js [base_url]
 * Default base: http://localhost:3000
 */

const BASE = process.argv[2] || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'hive-tuning-2026';

const guides = [

// --- GUIDE 1: Sleep ---
{
  slug: 'sensory-safe-music-for-sleep',
  title: 'Sensory-Safe Music for Sleep: A Guide for Sensitive Listeners',
  meta_description: 'Find music that helps you sleep without triggering sensory sensitivity. A guide to safe, predictable, gentle music for autism, ADHD, SPD, and HSP.',
  content: `
<p>You found a playlist labeled "relaxing piano." Track one is fine. Track two is fine. Track seven has a sudden key change, a swell of strings, and a dynamic shift that yanks you out of the half-sleep you spent forty minutes building.</p>

<p>For people with sensory sensitivities &mdash; autism, ADHD, anxiety, Sensory Processing Disorder, or simply being a highly sensitive person &mdash; this is not a minor annoyance. It is a full-body event. The adrenaline spike. The racing heart. The knowledge that sleep is now further away than when you started.</p>

<h2>What Makes Sleep Music Actually Safe</h2>

<p>The word "relaxing" on a playlist means nothing. It is a marketing label, not a sensory guarantee. What you actually need is specific and measurable:</p>

<ul>
  <li><strong>Low dynamic range (1-3 out of 10)</strong> &mdash; The volume stays consistent. No swells, no crescendos, no sudden quiet-to-loud transitions.</li>
  <li><strong>No sudden changes</strong> &mdash; Every transition is gradual. No new instruments appearing without warning, no tempo shifts, no surprise elements.</li>
  <li><strong>Smooth texture</strong> &mdash; No harsh tones, no bright cymbal hits, no abrasive digital sounds. The overall feel is soft and rounded.</li>
  <li><strong>High predictability</strong> &mdash; You can feel where the music is going. Repetitive patterns, steady rhythms, no surprises.</li>
  <li><strong>Instrumental or very soft vocals</strong> &mdash; Lyrics engage the language center of your brain. For sleep, you want music that bypasses cognition entirely.</li>
</ul>

<h2>How to Find Safe Sleep Music</h2>

<p>Every song in our library is rated across these five dimensions. When you <a href="/library">browse the library</a>, filter by sensory level "Safe" and use the "Recommended For" dropdown to select "sleep." You will only see songs that have been individually verified as safe for sleep listening.</p>

<p>You can also use our <a href="/finder">Frequency Finder</a> &mdash; tell it you are feeling anxious or heavy, that you need calm, and it will match you with songs that fit.</p>

<h2>Genres That Tend to Work</h2>

<p>Ambient music, neo-classical piano, and certain forms of drone or minimal electronic music tend to score well for sleep safety. Artists like Brian Eno, Nils Frahm, and Max Richter have built careers around music that is deliberately gentle. But genre alone is not a guarantee &mdash; even ambient albums can contain jarring moments. That is why individual song ratings matter.</p>

<h2>Building a Sleep Routine</h2>

<p>Consistency matters as much as content. When your nervous system learns that a particular sequence of songs means sleep, the music itself becomes a signal. Start with 3-5 songs rated Safe that you have listened to during the day (so there are no surprises), then play them nightly in the same order.</p>

<p>Over time, you can <a href="/library">explore more Safe-rated songs</a> and add them to your rotation. The key is that every single track has been verified &mdash; one jarring song at 2 AM undoes weeks of conditioning.</p>

<h2>What to Avoid</h2>

<p>Binaural beats and "sleep frequency" tracks are not inherently safe. Many contain pulsating tones that some sensitive listeners find deeply uncomfortable. White noise machines can be helpful but are not music &mdash; they mask sound rather than provide the gentle engagement that music offers. Always check the sensory profile before trusting a label.</p>
`
},

// --- GUIDE 2: ADHD Focus ---
{
  slug: 'music-for-adhd-focus',
  title: 'Music for ADHD Focus: What Actually Works',
  meta_description: 'What music properties actually help ADHD focus? A guide to tempo, texture, and sensory ratings for finding study and work music that helps, not distracts.',
  content: `
<p>The ADHD brain does not lack attention. It lacks the ability to direct attention voluntarily. Music can serve as an external scaffolding for focus &mdash; but only if it provides the right kind of stimulation. Too little, and your mind wanders. Too much, and the music itself becomes the distraction.</p>

<h2>Why Music Helps ADHD (When It Works)</h2>

<p>Dopamine is the currency of attention. The ADHD brain has less available dopamine for sustained focus on low-stimulation tasks. Music provides a baseline of stimulation that fills the gap &mdash; enough dopamine to keep the default mode network from hijacking your attention, not so much that the music competes with the task.</p>

<p>This is why silence often makes ADHD focus worse, not better. And why the wrong music makes everything worse too.</p>

<h2>What to Look For</h2>

<ul>
  <li><strong>Moderate tempo (70-110 BPM)</strong> &mdash; Fast enough to maintain engagement, slow enough not to increase arousal. Our library shows BPM for every song.</li>
  <li><strong>Medium dynamic range (3-6 out of 10)</strong> &mdash; Some variation keeps you engaged. Completely flat music is too boring for the ADHD brain. But high dynamic range (sudden loud moments) is disruptive.</li>
  <li><strong>Layered texture</strong> &mdash; Multiple instrument layers give your mind something to passively track. Smooth, single-instrument pieces may be too simple to maintain the stimulation floor.</li>
  <li><strong>High predictability</strong> &mdash; Unpredictable music pulls your attention toward the music and away from work. You need music you can tune out while still receiving its background stimulation.</li>
  <li><strong>Instrumental strongly preferred</strong> &mdash; Vocals, especially lyrics, compete directly with language processing. If your work involves reading or writing, vocal music will fight for the same neural resources.</li>
</ul>

<h2>Finding ADHD-Friendly Music</h2>

<p>In our <a href="/library">song library</a>, use the "Recommended For" filter and select "focus" or "deep focus." These songs have been rated for the specific balance of stimulation and predictability that supports sustained attention.</p>

<p>You can also try the <a href="/finder">Frequency Finder</a> &mdash; select "Scattered" for how you feel and "Focus" for what you need. The system will match you with songs tuned for that state.</p>

<h2>Lo-Fi, Classical, or Electronic?</h2>

<p>Lo-fi hip-hop has become the default "study music," but it is not universally effective. Some lo-fi tracks have sudden sample drops or vocal snippets that break focus. Classical music varies wildly &mdash; a Debussy prelude is gentle, a Tchaikovsky symphony is a roller coaster. Electronic music can be excellent if it is repetitive and predictable, or terrible if it builds to drops.</p>

<p>The genre matters less than the sensory profile. A jazz track with smooth texture, high predictability, and moderate tempo may outperform a lo-fi track with sudden changes. Check the ratings, not the genre label.</p>

<h2>The 45-Minute Rule</h2>

<p>ADHD focus tends to operate in bursts. A single song on repeat for 45 minutes can work remarkably well &mdash; the extreme familiarity turns the music into pure background stimulation. After 45 minutes, take a break, then start a new loop. This is not for everyone, but many ADHD listeners report it as more effective than playlists.</p>
`
},

// --- GUIDE 3: Autism & Sensory Overload ---
{
  slug: 'calming-music-for-autism-sensory-overload',
  title: 'Calming Music for Autism and Sensory Overload',
  meta_description: 'How to find calming music during sensory overload. A warm guide for autistic listeners and their families. Every song rated for safety.',
  content: `
<p>Sensory overload is not a preference. It is a neurological event. The world becomes too loud, too bright, too much &mdash; and the nervous system shifts into a state where even gentle input becomes painful. During overload, finding music that helps without making things worse is not a luxury. It is a survival strategy.</p>

<h2>How Music Can Help During Overload</h2>

<p>The right music does three things during sensory overload:</p>

<ul>
  <li><strong>Provides a predictable anchor.</strong> When everything else feels chaotic, a steady, familiar sound gives the nervous system something reliable to organize around.</li>
  <li><strong>Reduces competing input.</strong> Noise-canceling headphones plus gentle music replaces the overwhelming environmental sounds with a single, controlled input stream.</li>
  <li><strong>Signals safety.</strong> Over time, specific music becomes associated with recovery. The nervous system learns: when this music plays, I am safe. I can come down.</li>
</ul>

<h2>What to Look For</h2>

<p>During active overload, the threshold for tolerance is at its lowest. Music that is fine on a good day may be unbearable during a meltdown. You need the gentlest possible input:</p>

<ul>
  <li><strong>Dynamic range 1-3</strong> &mdash; Almost no volume variation at all</li>
  <li><strong>Sudden changes: none</strong> &mdash; Zero surprises. No new instruments, no transitions, no shifts.</li>
  <li><strong>Smooth texture</strong> &mdash; Nothing sharp, bright, or percussive</li>
  <li><strong>High predictability</strong> &mdash; Repetitive, cyclical patterns</li>
  <li><strong>Instrumental only</strong> &mdash; Human voices, even soft ones, can be overstimulating during overload</li>
</ul>

<p>In our <a href="/library">library</a>, filter by Sensory Level "Safe" and Recommended For "meltdown recovery." These songs meet the strictest criteria.</p>

<h2>Building a Recovery Playlist in Advance</h2>

<p>The worst time to search for calming music is during a meltdown. The best time is now &mdash; during a calm moment. Browse our <a href="/library">Safe-rated songs</a>, listen to several, and save the ones that feel right. Build a short playlist of 4-6 tracks that you know are safe.</p>

<p>When overload hits, the playlist is ready. No searching, no decisions, no risk of encountering a song you have not vetted. Just press play on a list you built during a clear moment.</p>

<h2>For Parents and Caregivers</h2>

<p>If you are choosing music for someone else &mdash; your child, your student, someone you support &mdash; remember that sensory preferences are deeply personal. A song that calms one person may irritate another. Start by offering 2-3 options from our Safe-rated library and let the listener choose. Over time, patterns will emerge: this texture works, that tempo does not. The <a href="/finder">Frequency Finder</a> can help narrow options quickly.</p>

<h2>What to Avoid</h2>

<p>Nature sounds are not universally safe. Bird calls can be sharp and unpredictable. Thunder recordings have sudden volume spikes. Ocean waves vary wildly in recording quality. If you use nature sounds, vet them with the same care you would music &mdash; listen to the entire track on a good day before relying on it during overload.</p>
`
},

// --- GUIDE 4: What Is Sensory-Friendly Music ---
{
  slug: 'what-is-sensory-friendly-music',
  title: 'What Is Sensory-Friendly Music? Understanding the Rating System',
  meta_description: 'What makes music sensory-friendly? Learn how dynamic range, sudden changes, texture, predictability, and vocal style determine whether a song is safe for sensitive listeners.',
  content: `
<p>Sensory-friendly music is music that has been evaluated for its impact on people with heightened sensory sensitivity. It is not a genre. It is a property &mdash; any genre can contain sensory-safe songs, and any genre can contain sensory-triggering songs.</p>

<h2>Who Needs Sensory-Friendly Music</h2>

<p>More people than you might think. Sensory sensitivity exists across a wide spectrum of conditions and experiences:</p>

<ul>
  <li><strong>Autism spectrum</strong> &mdash; Many autistic people experience sounds more intensely than neurotypical listeners. A cymbal crash that is "exciting" to one person may be physically painful to another.</li>
  <li><strong>ADHD</strong> &mdash; Attention regulation difficulties mean that unexpected sounds hijack focus. The wrong music disrupts rather than supports.</li>
  <li><strong>Sensory Processing Disorder (SPD)</strong> &mdash; Difficulty filtering and organizing sensory input means that complex or unpredictable audio can quickly become overwhelming.</li>
  <li><strong>Highly Sensitive Persons (HSP)</strong> &mdash; An estimated 15-20% of the population processes sensory input more deeply than average, experiencing music more intensely &mdash; for better and worse.</li>
  <li><strong>Anxiety disorders</strong> &mdash; Sudden sounds trigger the startle response and can escalate anxiety into panic.</li>
  <li><strong>Migraine with phonophobia</strong> &mdash; Sound sensitivity during or between migraines makes most music intolerable.</li>
  <li><strong>Misophonia</strong> &mdash; Specific sounds (often mouth, breathing, or repetitive noises) trigger intense emotional reactions.</li>
</ul>

<h2>The Five Dimensions We Measure</h2>

<p>Every song in our <a href="/library">library</a> is rated across five dimensions:</p>

<ul>
  <li><strong>Dynamic Range (1-10)</strong> &mdash; How much the volume varies within the song. 1 means almost no variation. 10 means extreme quiet-to-loud swings.</li>
  <li><strong>Sudden Changes (none to extreme)</strong> &mdash; Are there moments where something appears without warning? A new instrument, a tempo shift, a sound effect, a scream?</li>
  <li><strong>Texture (smooth to abrasive)</strong> &mdash; The overall tonal quality. Smooth music uses warm, rounded tones. Abrasive music uses sharp, bright, or distorted sounds.</li>
  <li><strong>Predictability (high to low)</strong> &mdash; Can you feel where the music is going? High predictability means steady patterns and gradual development. Low means surprises.</li>
  <li><strong>Vocal Style (instrumental to screaming)</strong> &mdash; The type of vocals present, from no vocals at all to aggressive, screamed vocals.</li>
</ul>

<h2>The Three Safety Tiers</h2>

<ul>
  <li><strong>Safe</strong> &mdash; Gentle across all dimensions. Suitable for the most sensitive listeners, during overload, or when you need absolute predictability.</li>
  <li><strong>Moderate</strong> &mdash; Some variation exists but within manageable bounds. Good for listeners who want engagement without risk of triggering.</li>
  <li><strong>Intense</strong> &mdash; High energy, dynamic, or unpredictable. Not inherently bad &mdash; many people seek intensity deliberately. But listeners who are sensory-sensitive should approach with awareness.</li>
</ul>

<h2>How to Use These Ratings</h2>

<p>Start with our <a href="/finder">Frequency Finder</a> to get matched with songs based on your current state. Or <a href="/library">browse the library</a> with filters. Every song page shows the full sensory profile so you know exactly what to expect before you press play.</p>
`
},

// --- GUIDE 5: Headphones ---
{
  slug: 'best-headphones-for-sensory-sensitivity',
  title: 'Best Headphones for Sensory Sensitivity: A Buyer\'s Guide',
  meta_description: 'How to choose headphones for sensory-sensitive listening. Noise cancellation, clamping pressure, and comfort guidance for autism, ADHD, SPD, and HSP.',
  content: `
<p>The right headphones do not just play music. They create a controlled sensory environment. For sensory-sensitive listeners, headphones are a tool for managing the auditory world &mdash; reducing unwanted input and delivering only the sounds you have chosen.</p>

<h2>What Matters for Sensory-Sensitive Listeners</h2>

<ul>
  <li><strong>Active Noise Cancellation (ANC)</strong> &mdash; The most important feature. ANC uses microphones and counter-frequencies to reduce ambient noise. This means less competing sensory input. Look for headphones with adjustable ANC levels so you can control how much outside sound you hear.</li>
  <li><strong>Clamping Pressure</strong> &mdash; Many sensory-sensitive people find tight headphones uncomfortable or even painful. Over-ear headphones with soft memory foam ear cushions and moderate clamping pressure work best. Avoid on-ear designs that press directly against the ear.</li>
  <li><strong>Weight</strong> &mdash; Heavy headphones cause fatigue and neck strain during extended use. Look for headphones under 300 grams for all-day wear.</li>
  <li><strong>Volume Limiting</strong> &mdash; Some headphones offer built-in volume limiting. This prevents accidental loud playback &mdash; important if you are choosing headphones for a child or if you tend to increase volume without realizing it.</li>
  <li><strong>Sound Leakage</strong> &mdash; Closed-back headphones prevent sound from escaping, which matters in shared spaces. They also prevent external sounds from entering.</li>
</ul>

<h2>Over-Ear vs. In-Ear</h2>

<p>Over-ear headphones generally provide better noise isolation and do not create the internal pressure sensation that bothers some sensitive listeners. However, some people find over-ear cups hot or the headband uncomfortable.</p>

<p>In-ear buds (especially with silicone or foam tips) offer excellent isolation in a smaller form factor. The key downside: insertion can be uncomfortable for people with tactile sensitivity in the ear canal. Try different tip sizes before deciding they do not work.</p>

<h2>When to Use Them</h2>

<p>Headphones are not just for listening to music. Many sensory-sensitive people use noise-canceling headphones with no audio playing &mdash; simply to reduce environmental sound. This is a valid and effective use. You can also pair headphones with <a href="/library">sensory-safe music</a> for maximum benefit: the headphones block outside noise, the music provides a controlled, predictable input.</p>

<h2>A Note on Bone Conduction</h2>

<p>Bone conduction headphones sit in front of the ear and transmit sound through the skull. They leave the ear canal open, which some people prefer. However, they do not provide noise isolation &mdash; you hear everything around you plus the music. This can be helpful for people who need environmental awareness or find ear coverage uncomfortable, but it defeats the purpose of creating a controlled sensory environment.</p>
`
},

// --- GUIDE 6: Misophonia ---
{
  slug: 'music-for-misophonia',
  title: 'Music for Misophonia: What to Listen For and What to Avoid',
  meta_description: 'Finding music that avoids misophonia triggers. Mouth sounds, clicking, breathing, and repetitive noises in music explained. A guide for misophonia sufferers.',
  content: `
<p>Misophonia is a condition where specific sounds trigger intense emotional responses &mdash; rage, anxiety, disgust, or the overwhelming urge to flee. The trigger sounds are often quiet and repetitive: chewing, breathing, pen clicking, keyboard tapping, sniffling. They are sounds that most people can ignore. For someone with misophonia, they cannot be ignored. They fill the entire world.</p>

<p>Music should be a safe space. But music contains more potential triggers than people realize.</p>

<h2>Common Misophonia Triggers in Music</h2>

<ul>
  <li><strong>Mouth sounds</strong> &mdash; Lip-smacking, tongue clicks, exaggerated breathing between phrases, saliva sounds. Common in ASMR-influenced music, breathy vocal styles, and intimate recordings.</li>
  <li><strong>Percussive clicks</strong> &mdash; Hi-hat ticks, rimshots, finger snaps, woodblock hits. These are short, sharp, repetitive sounds that share the acoustic profile of common misophonia triggers.</li>
  <li><strong>Breathing sounds</strong> &mdash; Audible breathing between vocal phrases, wind instrument breath sounds. Some recordings intentionally capture the performer's breathing as part of the intimacy.</li>
  <li><strong>Repetitive micro-sounds</strong> &mdash; Guitar pick scratches, vinyl crackle, tape hiss, electronic clicks. These background textures are often considered "warm" or "authentic" by listeners without misophonia. For those with it, they are unbearable.</li>
</ul>

<h2>What to Look For</h2>

<p>The safest music for misophonia listeners tends to be:</p>

<ul>
  <li><strong>Instrumental</strong> &mdash; Removes mouth sounds entirely</li>
  <li><strong>Synthesized or digitally produced</strong> &mdash; No breath sounds, no physical performance artifacts</li>
  <li><strong>Smooth texture</strong> &mdash; Rounded tones without sharp percussive elements</li>
  <li><strong>Clean production</strong> &mdash; No intentional tape hiss, vinyl crackle, or lo-fi artifacts</li>
</ul>

<p>In our <a href="/library">library</a>, filter by texture "smooth" and vocal style "instrumental." Songs meeting these criteria are the safest starting point for misophonia-sensitive listening.</p>

<h2>Genres to Approach with Caution</h2>

<p>Lo-fi music is popular but often deliberately includes vinyl crackle, tape artifacts, and background noise that can trigger misophonia. Jazz recordings, especially live recordings, often capture performer breathing. Folk and acoustic music captures finger-on-string sounds. None of these genres are inherently unsafe, but they require more careful vetting than electronic or classical music.</p>

<h2>Building Your Safe List</h2>

<p>Start by browsing our <a href="/library">Safe-rated songs</a> with instrumental filtering. Listen to each on a calm day, paying attention to background textures and subtle sounds. When you find songs that are clean, add them to a playlist. This becomes your verified-safe collection &mdash; music you can reach for when you need sound without risk.</p>
`
},

// --- GUIDE 7: Kids ---
{
  slug: 'sensory-safe-music-for-kids',
  title: 'Sensory-Safe Music for Kids: A Parent\'s Guide',
  meta_description: 'How to find music that is safe for sensory-sensitive children. A guide for parents of autistic, ADHD, or highly sensitive kids.',
  content: `
<p>Your child covers their ears at birthday parties. They cry when a song changes unexpectedly. They have one song they want to hear on repeat for weeks. These are not quirks. These are a nervous system communicating what it can and cannot handle.</p>

<h2>Why Children Are More Sensitive</h2>

<p>Children's nervous systems are still developing their ability to filter and process sensory input. For neurotypical children, this means occasional overwhelm that they grow out of. For neurodivergent children &mdash; autistic, ADHD, SPD &mdash; the sensitivity is more intense and more persistent. Music that an adult can tolerate may be genuinely painful for a child with heightened auditory processing.</p>

<h2>What to Look For</h2>

<ul>
  <li><strong>Sensory Level: Safe</strong> &mdash; Start here, always. Moderate-rated music can be introduced gradually as you learn your child's specific tolerances.</li>
  <li><strong>High predictability</strong> &mdash; Children crave predictability even more than adults. Repetitive music is not boring to a sensory-sensitive child &mdash; it is safe.</li>
  <li><strong>Low dynamic range</strong> &mdash; No volume surprises. Nothing that changes suddenly.</li>
  <li><strong>Instrumental or very soft vocals</strong> &mdash; Some children are specifically sensitive to human voices. Others find soft singing calming. Know your child.</li>
</ul>

<h2>The Repeat Request Is Not a Problem</h2>

<p>When a sensory-sensitive child wants to hear the same song again and again, they are not being difficult. They are self-regulating. The known song is a controlled environment for their nervous system. The familiarity is the point. Let them loop it.</p>

<h2>Building a Library Together</h2>

<p>Browse our <a href="/library">Safe-rated songs</a> with your child during a calm moment. Let them listen to short samples. Watch their body language &mdash; shoulders relaxing, breathing slowing, or stiffening and pulling away. They will show you what works before they can tell you.</p>

<p>Our <a href="/finder">Frequency Finder</a> can help identify songs matched to your child's current emotional state. Use it together as a tool for emotional co-regulation.</p>

<h2>Transitions and New Music</h2>

<p>Introducing new music to a sensitive child works best with gradual exposure. Play the new song quietly in the background during a preferred activity. Do not draw attention to it. Over several days, the song becomes familiar. Then it can join the active playlist. Forced exposure &mdash; "listen to this new song" &mdash; often triggers resistance because the child does not yet know whether the song is safe.</p>

<h2>At School and Therapy</h2>

<p>If your child uses music as a calming tool at school or in therapy sessions, share your Safe playlist with their team. A teacher playing an unvetted "calming music" playlist may accidentally trigger a meltdown. Your curated list ensures consistency across environments.</p>
`
},

// --- GUIDE 8: Anxiety & Panic ---
{
  slug: 'music-for-anxiety-and-panic-attacks',
  title: 'Music for Anxiety and Panic Attacks: What Actually Helps',
  meta_description: 'Music that helps during anxiety and panic attacks. What to listen for, what to avoid, and how to build an emergency music toolkit.',
  content: `
<p>During a panic attack, your nervous system believes you are in danger. Your heart races. Your breathing accelerates. Your senses sharpen to detect threats. In this state, the wrong music &mdash; a sudden chord change, a bass drop, a rising crescendo &mdash; is registered as another threat. The right music signals safety.</p>

<h2>What Helps During Active Anxiety</h2>

<p>Music for acute anxiety needs to meet the nervous system where it is and gently bring it down. This means:</p>

<ul>
  <li><strong>Start matching your current state, then slow down.</strong> If your heart is racing, music at 90-100 BPM matches your internal rhythm. Over 10-15 minutes, transition to 60-70 BPM. Your heart rate tends to follow. This is called entrainment.</li>
  <li><strong>Absolute predictability.</strong> Your threat-detection system is on high alert. Any surprise &mdash; any &mdash; will spike your anxiety. You need music where you know exactly what comes next.</li>
  <li><strong>Smooth, warm texture.</strong> Nothing bright, sharp, or metallic. Your auditory processing is sensitized during anxiety. Smooth sounds feel safe. Sharp sounds feel dangerous.</li>
  <li><strong>Low dynamic range.</strong> No volume changes. Nothing quiet followed by loud. Your startle reflex is primed. A sudden volume increase will trigger it.</li>
</ul>

<h2>Building an Emergency Playlist</h2>

<p>The time to build your anxiety toolkit is not during a panic attack. It is now.</p>

<p>Go to our <a href="/library">library</a>, filter by "Safe" and "anxiety relief" in the Recommended For dropdown. Listen to several songs while calm. Pick 5-7 that feel right. Save them as a playlist called something like "Emergency" or "Breathe."</p>

<p>When anxiety hits, you open that playlist. No decisions to make. No browsing. No risk. Just press play on music you have already verified.</p>

<h2>What to Avoid</h2>

<ul>
  <li><strong>"Relaxation" playlists you have not vetted.</strong> Generic playlists contain surprises. One jarring song can undo the calming effect of the previous three.</li>
  <li><strong>Binaural beats during panic.</strong> The pulsating quality of binaural beats can increase the sensation of being trapped or overwhelmed in some people.</li>
  <li><strong>Music with lyrics about anxiety.</strong> Your brain is already generating anxious thoughts. Lyrics about the thing you are experiencing can amplify rather than soothe.</li>
  <li><strong>New music during an attack.</strong> Unknown = unpredictable = unsafe. Stick to your verified playlist.</li>
</ul>

<h2>Between Episodes</h2>

<p>On calmer days, explore our <a href="/library">library</a> more broadly. Songs rated "Moderate" may be enjoyable when your baseline anxiety is low. The <a href="/finder">Frequency Finder</a> lets you match music to your current emotional state &mdash; it works for everyday mood management, not just crisis moments.</p>
`
},

// --- GUIDE 9: Work/Office ---
{
  slug: 'music-for-sensory-overload-at-work',
  title: 'Music for Sensory Overload at Work: Surviving the Open Office',
  meta_description: 'How to use music to manage sensory overload in open offices and workplaces. Focus music, noise management, and sensory regulation for sensitive workers.',
  content: `
<p>The open office is a sensory minefield. Keyboards clacking. Conversations overlapping. A phone ringing three desks away. The HVAC system humming. A coworker unwrapping food. For sensory-sensitive workers, this is not "office noise." It is a sustained assault on a nervous system that cannot filter it out.</p>

<h2>Music as a Sensory Shield</h2>

<p>The right headphones plus the right music creates a controlled auditory environment inside an uncontrolled one. You are not blocking out the office. You are replacing chaotic, unpredictable input with consistent, predictable input. Your nervous system can organize around the music instead of trying to process everything at once.</p>

<h2>What Works for Work</h2>

<ul>
  <li><strong>Moderate dynamic range (3-5)</strong> &mdash; Unlike sleep or recovery music, work music benefits from some variation. Completely flat music may bore an ADHD brain. Some gentle movement keeps engagement.</li>
  <li><strong>No sudden changes</strong> &mdash; Still critical. A sudden sound in your headphones is just as disruptive as a sudden sound in the office.</li>
  <li><strong>Instrumental</strong> &mdash; Lyrics interfere with reading, writing, and complex thought. If your work involves language (most office work does), vocal music will compete.</li>
  <li><strong>Layered texture</strong> &mdash; Multiple gentle layers give the mind something to passively organize around. A single drone tone may not be enough.</li>
  <li><strong>Extended duration</strong> &mdash; Frequent song changes interrupt flow. Look for longer tracks (5+ minutes) or use a playlist of similar songs to create a continuous soundscape.</li>
</ul>

<h2>Finding the Right Balance</h2>

<p>Browse our <a href="/library">library</a> with "focus" or "deep focus" in the Recommended For filter. These songs balance the engagement needed for sustained work with the safety needed for sensory-sensitive listening. The <a href="/finder">Frequency Finder</a> can also help &mdash; select "Scattered" and "Focus" for work-optimized recommendations.</p>

<h2>The Meeting Problem</h2>

<p>Meetings strip away your controlled environment. You remove the headphones. The group conversation is unpredictable. Multiple people talk at different volumes. After a meeting, many sensory-sensitive workers need a recovery period. Have your work playlist ready to put on immediately after &mdash; it signals to your nervous system that the uncontrolled input is over and the controlled environment is back.</p>

<h2>Talking to Your Workplace</h2>

<p>If headphone use is questioned, frame it as a productivity accommodation, not a preference. Noise-canceling headphones with focus music is functionally equivalent to having an office with a closed door &mdash; it creates the controlled auditory environment needed for sustained cognitive work. Many workplaces already provide quiet rooms. Headphones are the portable version.</p>
`
},

// --- GUIDE 10: How to Build a Sensory-Safe Playlist ---
{
  slug: 'how-to-build-a-sensory-safe-playlist',
  title: 'How to Build a Sensory-Safe Playlist: A Step-by-Step Guide',
  meta_description: 'Learn how to build a playlist where every track is verified safe for sensory-sensitive listening. Step-by-step methodology for trustworthy playlists.',
  content: `
<p>A playlist is a promise. When you press play, you are trusting that every track in that list will be safe for you. A single unvetted song breaks that promise &mdash; and for sensory-sensitive listeners, that broken promise has real consequences. A safe playlist is not just nice to have. It is a tool for managing your nervous system.</p>

<h2>Step 1: Define Your Use Case</h2>

<p>A playlist for sleep is different from a playlist for focus is different from a playlist for recovery. Each use case has different optimal ranges:</p>

<ul>
  <li><strong>Sleep:</strong> Dynamic range 1-3, no sudden changes, smooth texture, high predictability, instrumental</li>
  <li><strong>Focus:</strong> Dynamic range 3-6, no sudden changes, layered texture, high predictability, instrumental</li>
  <li><strong>Recovery (post-overload):</strong> Dynamic range 1-2, no sudden changes, smooth texture, high predictability, instrumental</li>
  <li><strong>Energizing:</strong> Dynamic range 4-7, mild sudden changes acceptable, any texture, medium predictability, vocals optional</li>
</ul>

<h2>Step 2: Source Verified Songs</h2>

<p>Go to our <a href="/library">library</a> and use the filters. For a sleep playlist, filter by Sensory Level "Safe" and Recommended For "sleep." Every song in the results has been individually rated across five sensory dimensions. You are not trusting a genre label. You are trusting measured properties.</p>

<h2>Step 3: Listen Before Adding</h2>

<p>Even within Safe-rated songs, personal preference matters. A song rated Safe might use a synthesizer timbre that you personally find irritating. Listen to each candidate on a calm day. Pay attention to your body: are your shoulders relaxing or tensing? Is your breathing steady or shallow? Your body tells you what your mind might not.</p>

<h2>Step 4: Order Matters</h2>

<p>Arrange songs so that transitions are gentle. Moving from a 68 BPM ambient piece to a 95 BPM piano piece creates a jarring shift even if both are rated Safe. Group songs by similar tempo and mood. If your playlist includes a range, arrange them in a gentle arc &mdash; slow to slightly less slow and back.</p>

<h2>Step 5: Test the Full Sequence</h2>

<p>Play your playlist end to end. Every transition between songs is a potential surprise &mdash; the ending of one song and the beginning of the next create a moment of change. If any transition feels jarring, reorder or add a buffer track (an especially gentle song between two that do not flow naturally).</p>

<h2>Step 6: Save and Protect</h2>

<p>Once your playlist is tested, save it. On our site, you can <a href="/playlists">create and manage playlists</a> with email backup. Your verified playlist is now a tool you can rely on &mdash; at 2 AM, during overload, in a meeting break, whenever you need it. Trust what you built during clarity.</p>
`
}

];

// Append checker CTA to every guide
const checkerCTA = `
<div style="margin-top:2rem;padding:1.25rem;background:rgba(212,149,106,0.08);border-radius:12px;border:1px solid rgba(212,149,106,0.2)">
  <h3 style="margin:0 0 0.5rem 0;font-size:1rem">Wondering about a specific song?</h3>
  <p style="font-size:0.9rem;margin:0 0 0.75rem 0;color:#8a8580">Enter any song title and artist &mdash; we'll tell you if it's safe before you press play.</p>
  <a href="/check" style="display:inline-block;padding:0.5rem 1.5rem;background:#d4956a;color:#0a0a10;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem">Check a Song</a>
</div>`;

for (const guide of guides) {
  guide.content = guide.content.trim() + checkerCTA;
}

async function importGuides() {
  console.log(`Importing ${guides.length} guides to ${BASE}...`);

  for (const guide of guides) {
    try {
      const res = await fetch(`${BASE}/api/admin/import-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify(guide)
      });

      const data = await res.json();
      if (data.ok) {
        console.log(`  ✓ ${guide.slug}`);
      } else {
        console.log(`  ✗ ${guide.slug}: ${data.error}`);
      }
    } catch (e) {
      console.log(`  ✗ ${guide.slug}: ${e.message}`);
    }
  }

  console.log('Done.');
}

importGuides();

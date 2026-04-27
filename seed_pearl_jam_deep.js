// Pearl Jam — deep catalog expansion (B-sides, soundtracks, side-projects, live)
//
// FOR: the 38-year-old Pearl Jam fan in Cleveland, autism diagnosis at 31,
// awake at 2 AM, trying to figure out which tracks across the PJ ecosystem
// she can actually listen to without dysregulating. She remembers Just Breathe
// feeling safe; she wants to know about the B-sides, the side-projects, the
// soundtrack contributions, the Mad Season songs, the Lost Dogs comp. The
// hits are easy to find; the rest of the ecosystem isn't, and the rest of
// the ecosystem is where comfort might be hiding for her.
//
// Run against local Express server: node seed_pearl_jam_deep.js
// Auto-rates and inserts via /api/check (Perplexity-backed).

async function cs(t, a) {
  try {
    const r = await fetch("http://localhost:3000/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "pj-deep-" + Date.now() + Math.random() },
      body: JSON.stringify({ title: t, artist: a })
    });
    const d = await r.json();
    console.log("  " + (d.song?.sensory_level || d.error || "?") + " | " + t + " — " + a);
  } catch (e) { console.log("  ERR | " + t + " — " + a); }
}

async function sa(artist, songs) {
  console.log("\n" + artist + " (" + songs.length + ")");
  for (const t of songs) {
    await cs(t, artist);
    await new Promise(r => setTimeout(r, 650));
  }
}

async function run() {
  // ---- Pearl Jam: fill missing studio tracks across full catalog ----
  await sa("Pearl Jam", [
    // Ten extras
    "Black", "Jeremy", "Oceans", "Porch", "Release", "Even Flow", "Alive",
    // Vs.
    "Daughter", "Glorified G", "Indifference", "Rats", "W.M.A.", "Rearviewmirror", "Elderly Woman Behind the Counter in a Small Town",
    // Vitalogy
    "Better Man", "Corduroy", "Nothingman", "Last Exit", "Whipping", "Pry, To", "Stupid Mop", "Bugs",
    // No Code
    "Sometimes", "Smile", "Off He Goes", "Lukin", "Habit", "Red Mosquito", "Who You Are", "Mankind", "I'm Open", "Around the Bend",
    // Yield
    "Brain of J.", "Given to Fly", "Wishlist", "Pilate", "Do the Evolution", "MFC", "All Those Yesterdays", "No Way", "Untitled", "Push Me, Pull Me",
    // Binaural
    "Breakerfall", "Gods' Dice", "Evacuation", "Light Years", "Insignificance", "Of the Girl", "Grievance", "Rival", "Sleight of Hand", "Soon Forget", "Parting Ways",
    // Riot Act
    "Can't Keep", "Get Right", "Cropduster", "I Am Mine", "Half Full", "Green Disease", "Help Help", "Bushleaguer", "Arc", "All or None",
    // Self-titled (2006)
    "Life Wasted", "Severed Hand", "World Wide Suicide", "Parachutes", "Unemployable", "Wasted Reprise", "Army Reserve", "Inside Job",
    // Backspacer
    "Gonna See My Friend", "The Fixer", "Johnny Guitar", "Just Breathe", "Speed of Sound", "Force of Nature", "The End", "Supersonic",
    // Lightning Bolt
    "Getaway", "Mind Your Manners", "My Father's Son", "Sirens", "Lightning Bolt", "Pendulum", "Swallowed Whole", "Sleeping by Myself", "Yellow Moon", "Future Days",
    // Gigaton
    "Who Ever Said", "Superblood Wolfmoon", "Dance of the Clairvoyants", "Buckle Up", "Seven O'Clock", "Never Destination", "Take the Long Way", "Alright", "Comes Then Goes",
    // Dark Matter
    "React, Respond", "Won't Tell", "Upper Hand", "Waiting for Stevie"
  ]);

  // ---- Pearl Jam: B-sides, rarities, Lost Dogs, singles ----
  await sa("Pearl Jam", [
    // Lost Dogs B-sides comp (2003)
    "All Night", "Sad", "Down", "Hold On", "Yellow Ledbetter", "Footsteps", "Wash", "Hard to Imagine", "Black Red Yellow", "U", "Leaving Here",
    "Gremmie Out of Control", "Whale Song", "Undone", "Alone", "Other Side", "Fatal", "Sweet Lew", "Dirty Frank", "Don't Gimme No Lip", "Drifting", "Let Me Sleep",
    // Soundtrack contributions
    "State of Love and Trust", "Breath", "Last Kiss", "Man of the Hour", "Rockin' in the Free World",
    // Live staples that often have studio takes / rare versions
    "Crazy Mary", "Last Soldier", "Bee Girl", "Olympic Platinum",
    // Singles era
    "I Got Id", "Long Road", "Out of My Mind", "Strangest Tribe", "Education"
  ]);

  // ---- Pearl Jam: representative live releases ----
  // (Live versions get their own slugs; sensory profile differs from studio.)
  await sa("Pearl Jam", [
    "Even Flow (Live at the Gorge)",
    "State of Love and Trust (Live)",
    "Yellow Ledbetter (Live at Benaroya Hall)",
    "Crazy Mary (Live at Benaroya Hall)",
    "Wishlist (Live)",
    "Black (Live at Madison Square Garden)",
    "Last Kiss (Live)"
  ]);

  // ---- Mad Season — Mike McCready + Layne Staley + others (1995) ----
  await sa("Mad Season", [
    "Wake Up", "X-Ray Mind", "River of Deceit", "I'm Above", "Artificial Red",
    "Lifeless Dead", "I Don't Know Anything", "Long Gone Day", "November Hotel", "All Alone",
    "Locomotive", "Black Book of Fears", "Slip Away", "Interlude"
  ]);

  // ---- Brad — Stone Gossard side project ----
  await sa("Brad", [
    "Buttercup", "My Fingers", "Nadine", "20th Century", "Good News",
    "Welcome to Discovery Park", "Symptom of the Universe", "A Reason to Be in My Skin",
    "The Lake", "Diamond and a Hand", "United We Stand", "United States of Brad"
  ]);

  // ---- Wellwater Conspiracy — Matt Cameron + John McBain ----
  await sa("Wellwater Conspiracy", [
    "Felicity's Surprise", "What's Wrong With One More Day?", "Sleeveless in Seattle",
    "Born With a Tail", "Far East Texas", "Brotherhood of Electric: Operational Directives"
  ]);

  // ---- The Rockfords — Mike McCready side project ----
  await sa("The Rockfords", [
    "Riverwide", "Peace and Quiet", "Sonic Tonic", "Carry On"
  ]);

  // ---- Stone Gossard — solo (Bayleaf 2001, Moonlander 2013) ----
  await sa("Stone Gossard", [
    "Bore Me", "Last Black Tear", "Speed of Time", "Bayleaf",
    "Both Live", "Beyond Measure", "Moonlander", "I Need Something Different",
    "Remain"
  ]);

  // ---- Jeff Ament — solo (Tone, While My Heart Beats, Heaven/Hell) ----
  await sa("Jeff Ament", [
    "Bulletin", "Wasted",
    "While My Heart Beats", "I Should Be Outside", "American Death Squad",
    "Tone", "Tigers", "Black Field", "What Did You Do?"
  ]);

  // ---- Matt Cameron — Cavedweller (2017) ----
  await sa("Matt Cameron", [
    "Time Can't Wait", "Unnecessary Things", "Through Yesterday", "Time of My Life",
    "One Special Lady", "Into the Fire", "Curtains Up", "Off the Charts",
    "Kingdom of the Damned", "Blind"
  ]);

  // ---- Three Fish — Jeff Ament + Robi Kahakalau + Richard Stuverud ----
  await sa("Three Fish", [
    "An Otherwise Lovely Evening Spent in Front of the Television", "Solitude",
    "Silence at the Bottom", "Build a House", "If You Need a Friend",
    "Songs from the Other Side", "Letters", "All Crushed Down"
  ]);

  // ---- Temple of the Dog — PJ + Soundgarden 1991 tribute ----
  await sa("Temple of the Dog", [
    "Say Hello 2 Heaven", "Reach Down", "Hunger Strike", "Pushin Forward Back",
    "Call Me a Dog", "Times of Trouble", "Wooden Jesus", "Your Saviour",
    "Four Walled World", "All Night Thing"
  ]);

  // ---- Counts ----
  const Database = require("better-sqlite3");
  const db = new Database("musiciwant.db");
  const artists = ["Pearl Jam", "Eddie Vedder", "Mad Season", "Brad", "Wellwater Conspiracy", "The Rockfords", "Mike McCready", "Stone Gossard", "Jeff Ament", "Matt Cameron", "Three Fish", "Temple of the Dog"];
  console.log("\n=== PEARL JAM ECOSYSTEM COUNTS ===");
  let total = 0;
  for (const a of artists) {
    const c = db.prepare("SELECT COUNT(*) as c FROM songs WHERE artist = ?").get(a);
    console.log("  " + (c.c + "").padStart(4) + " | " + a);
    total += c.c;
  }
  console.log("  ---");
  console.log("  " + (total + "").padStart(4) + " | TOTAL Pearl Jam ecosystem");
  const dbTotal = db.prepare("SELECT COUNT(*) as c FROM songs").get();
  console.log("\nTotal songs in DB: " + dbTotal.c);
}

run();

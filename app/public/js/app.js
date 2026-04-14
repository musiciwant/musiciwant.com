// Music I Want — Dashboard SPA
const app = document.getElementById('app');
let currentSensoryFilter = '';

// --- Playlist Storage ---
function getPlaylists() { try { return JSON.parse(localStorage.getItem('miw_playlists') || '[]'); } catch { return []; } }
function savePlaylists(p) { localStorage.setItem('miw_playlists', JSON.stringify(p)); }
function createPlaylist(name) { const p = getPlaylists(); const pl = { id: Date.now().toString(36), name, songs: [], created: new Date().toISOString() }; p.push(pl); savePlaylists(p); return pl; }
function addToPlaylist(pid, song) { const p = getPlaylists(); const pl = p.find(x => x.id === pid); if (pl && !pl.songs.find(s => s.slug === song.slug)) { pl.songs.push({ slug: song.slug, title: song.title, artist: song.artist, sensory_level: song.sensory_level, spotify_id: song.spotify_id, thumbnail_url: song.thumbnail_url }); savePlaylists(p); return true; } return false; }
function removeFromPlaylist(pid, slug) { const p = getPlaylists(); const pl = p.find(x => x.id === pid); if (pl) { pl.songs = pl.songs.filter(s => s.slug !== slug); savePlaylists(p); } }
function deletePlaylist(pid) { savePlaylists(getPlaylists().filter(p => p.id !== pid)); syncPlaylistsToServer(); }

// --- Cloud Playlist Sync ---
function getUserEmail() { return localStorage.getItem('miw_user_email') || ''; }
function getUserToken() { return localStorage.getItem('miw_user_token') || ''; }
function setUserEmail(email) { localStorage.setItem('miw_user_email', email); }

async function syncPlaylistsToServer() {
  const email = getUserEmail();
  if (!email) return; // Not saved yet — will prompt
  const playlists = getPlaylists();
  try {
    const r = await fetch('/api/playlists/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, playlists })
    });
    const data = await r.json();
    if (data.token) localStorage.setItem('miw_user_token', data.token);
  } catch (e) { /* silent fail — local still works */ }
}

function showSavePlaylistPrompt() {
  if (getUserEmail()) return; // Already saved
  const pls = getPlaylists();
  if (pls.length === 0 || pls.every(p => p.songs.length === 0)) return; // Nothing to save

  const existing = document.getElementById('save-pl-banner');
  if (existing) return; // Already showing

  const banner = document.createElement('div');
  banner.id = 'save-pl-banner';
  banner.className = 'save-banner';
  banner.innerHTML = `
    <div class="save-banner-content">
      <div class="save-banner-text">
        <strong>Save your playlists</strong>
        <span>Enter your email and we'll send you a link that restores your playlists on any device.</span>
      </div>
      <div class="save-banner-form">
        <input type="email" id="save-pl-email" class="filter-input" placeholder="your@email.com" style="width:220px">
        <button class="cta-primary" id="save-pl-btn" style="white-space:nowrap;font-size:0.85rem;padding:0.45rem 1rem">Save</button>
      </div>
      <button class="save-banner-close" id="save-pl-close">&times;</button>
    </div>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 50);

  document.getElementById('save-pl-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('save-pl-email').value.trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid email'); return; }

    setUserEmail(email);
    await syncPlaylistsToServer();
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
    showToast('Playlists saved! Check your email for your restore link.');
  });

  document.getElementById('save-pl-close')?.addEventListener('click', () => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  });
}

// Override savePlaylists to also sync
const _origSavePlaylists = savePlaylists;
function savePlaylists(p) {
  localStorage.setItem('miw_playlists', JSON.stringify(p));
  // Show save prompt if they have playlists but haven't given email
  setTimeout(() => showSavePlaylistPrompt(), 1000);
  // Auto-sync if they've already given email
  if (getUserEmail()) syncPlaylistsToServer();
}

// --- Router ---
function navigate(path) { history.pushState(null, '', path); route(); window.scrollTo(0, 0); }
window.addEventListener('popstate', route);
document.addEventListener('click', e => { const l = e.target.closest('[data-link]'); if (l) { e.preventDefault(); navigate(l.getAttribute('href')); } });

function route() {
  const p = location.pathname;
  updateSidebarActive(p);
  if (p === '/') renderHome();
  else if (p === '/library') renderLibrary();
  else if (p === '/finder') renderFinder();
  else if (p === '/playlists') renderPlaylists();
  else if (p.startsWith('/playlist/')) renderPlaylist(p.replace('/playlist/', ''));
  else if (p === '/make') renderMakeMusic();
  else if (p === '/about') renderAbout();
  else if (p === '/check') renderChecker();
  else if (p === '/request') renderRequestArtist();
  else if (p === '/wall') renderWall();
  else if (p === '/profile') renderProfile();
  else if (p === '/battle') renderBattle();
  else if (p === '/one') renderOneSong();
  else if (p.startsWith('/check/')) renderSong(p.replace('/check/', ''));
  else if (p.startsWith('/artist/')) renderArtist(p.replace('/artist/', ''));
  else if (p.startsWith('/song/')) renderSong(p.replace('/song/', ''));
  else renderHome();
  updateSidebarPlaylists();
}

function updateSidebarActive(path) {
  document.querySelectorAll('.sidebar-link').forEach(l => {
    const href = l.getAttribute('href');
    l.classList.toggle('active', href === path || (href === '/library' && path.startsWith('/song/')));
  });
}

function updateSidebarPlaylists() {
  const el = document.getElementById('sidebar-playlists');
  if (!el) return;
  const pls = getPlaylists();
  el.innerHTML = pls.slice(0, 5).map(pl => `<a href="/playlist/${pl.id}" data-link class="sidebar-pl-link">${pl.name} (${pl.songs.length})</a>`).join('') || '<p style="font-size:0.75rem;color:var(--text-dim);padding:0 0.65rem">None yet</p>';
}

function updateSidebarStats() {
  api('/api/filters').then(f => {
    const el = document.getElementById('sidebar-stats');
    if (el) el.innerHTML = `${f.artists.length} artists &middot; ${f.traditions.length} traditions`;
  });
}

// --- API ---
async function api(endpoint) { return (await fetch(endpoint)).json(); }

// --- Render Helpers ---
function sensoryBadge(level) {
  const cls = level === 'safe' ? 'badge-safe' : level === 'moderate' ? 'badge-moderate' : 'badge-intense';
  const label = level === 'safe' ? 'Safe' : level === 'moderate' ? 'Moderate' : 'Intense';
  return `<span class="badge ${cls}">${label}</span>`;
}

function songCard(song, opts = {}) {
  const art = song.thumbnail_url ? `<img class="song-card-art" src="${song.thumbnail_url}" alt="${song.title}" loading="lazy">` : `<div class="song-card-art-placeholder">&#9835;</div>`;
  const addBtn = opts.showRemove ? `<button class="remove-from-pl-btn" data-slug="${song.slug}" data-playlist="${opts.playlistId}">x</button>` : `<button class="add-to-pl-btn" data-slug="${song.slug}">+</button>`;

  return `<div class="song-card-wrap">
    ${addBtn}
    <a href="/song/${song.slug}" data-link class="song-card">
      ${art}
      <div class="song-card-body">
        <h3>${song.title}</h3>
        <div class="artist">${song.artist}</div>
        <div class="meta">${sensoryBadge(song.sensory_level)}${song.bpm ? ` <span class="badge badge-neutral">${song.bpm}</span>` : ''}</div>
      </div>
    </a>
  </div>`;
}

function showPlaylistModal(song) {
  const pls = getPlaylists();
  document.getElementById('pl-modal')?.remove();
  const m = document.createElement('div'); m.id = 'pl-modal'; m.className = 'modal-overlay';
  m.innerHTML = `<div class="modal-content">
    <h3>Add to Playlist</h3>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.75rem">${song.artist} — ${song.title}</p>
    ${pls.length ? pls.map(pl => `<button class="modal-pl-btn" data-pl-id="${pl.id}">${pl.name} (${pl.songs.length})</button>`).join('') : ''}
    <div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
      <input type="text" id="new-pl-name" placeholder="New playlist name..." class="filter-input" style="margin-bottom:0.4rem">
      <button class="cta-primary" id="create-pl-btn" style="width:100%;font-size:0.85rem;padding:0.45rem">Create & Add</button>
    </div>
    <button class="modal-close" id="close-modal">Cancel</button>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => {
    if (e.target.id === 'close-modal' || e.target === m) { m.remove(); return; }
    const b = e.target.closest('.modal-pl-btn');
    if (b) { addToPlaylist(b.dataset.plId, song); m.remove(); showToast('Added to playlist'); updateSidebarPlaylists(); }
    if (e.target.id === 'create-pl-btn') { const n = document.getElementById('new-pl-name').value.trim(); if (n) { const pl = createPlaylist(n); addToPlaylist(pl.id, song); m.remove(); showToast(`Created "${n}"`); updateSidebarPlaylists(); } }
  });
}

function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000); }

// --- Pages ---
async function renderHome() {
  app.innerHTML = `
    <section class="home-hero">
      <h1>Find the music you want.</h1>
      <p class="tagline">Understand any song. Discover what hits the same.</p>

      <div class="home-search" style="max-width:560px;margin:1.5rem auto">
        <input type="text" id="home-search-input" placeholder="Search any song, artist, or mood..." class="filter-input" style="width:100%;padding:0.85rem 1.2rem;font-size:1.05rem;border-radius:var(--radius);text-align:center">
      </div>

      <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:1rem;flex-wrap:wrap">
        <a href="/finder" data-link class="cta-primary">Find Music For Me</a>
        <a href="/check" data-link class="cta-primary" style="background:var(--safe)">Check a Song</a>
        <a href="/make" data-link class="cta-primary" style="background:var(--moderate)">Make a Song</a>
      </div>

      <div class="home-categories" style="margin-top:2.5rem">
        <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:0.75rem">Explore</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center">
          <a href="/library?recommended_for=deep+listening" data-link class="home-cat-btn">Deep Listening</a>
          <a href="/library?mood=cathartic" data-link class="home-cat-btn">Songs That Build</a>
          <a href="/library?mood=intimate" data-link class="home-cat-btn">Intimate &amp; Quiet</a>
          <a href="/library?recommended_for=focus" data-link class="home-cat-btn">Focus &amp; Study</a>
          <a href="/library?recommended_for=sleep" data-link class="home-cat-btn">Sleep</a>
          <a href="/library?recommended_for=anxiety+relief" data-link class="home-cat-btn">Anxiety Relief</a>
          <a href="/library?sensory_level=safe" data-link class="home-cat-btn" style="border-color:var(--safe)">Sensory Safe</a>
          <a href="/library?recommended_for=energy" data-link class="home-cat-btn">Workout</a>
          <a href="/library?mood=melancholy" data-link class="home-cat-btn">Beautiful Sadness</a>
          <a href="/library?recommended_for=meditation" data-link class="home-cat-btn">Meditation</a>
          <a href="/profile" data-link class="home-cat-btn">My Profile</a>
          <a href="/library" data-link class="home-cat-btn">Browse All</a>
        </div>
      </div>
    </section>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:700px;margin:2rem auto">
      <a href="/check" data-link style="padding:1.5rem;background:var(--bg-card);border-radius:var(--radius);text-decoration:none;border:1px solid var(--bg-hover);transition:border-color 0.15s" class="home-feature-card">
        <h3 style="color:var(--safe);margin:0 0 0.5rem 0;font-size:1rem">Understand Any Song</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0">Enter any song &mdash; see its dynamic range, texture, intensity, and emotional arc before you press play.</p>
      </a>
      <a href="/make" data-link style="padding:1.5rem;background:var(--bg-card);border-radius:var(--radius);text-decoration:none;border:1px solid var(--bg-hover);transition:border-color 0.15s" class="home-feature-card">
        <h3 style="color:var(--moderate);margin:0 0 0.5rem 0;font-size:1rem">Create Your Own</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0">Describe the music you want to hear. Pick a genre, set the intensity, and we'll create a unique song that exists nowhere else.</p>
      </a>
    </div>

    <div id="home-stories" style="max-width:700px;margin:2rem auto"></div>

    <h2>Recently Added</h2>
    <div class="song-grid" id="recent-songs"></div>
    <footer class="site-footer">
      <p>Built by <a href="https://linkedin.com/in/build-ai-for-good" rel="noopener" target="_blank">The Architect</a> &middot; A project of The Hive</p>
      <p class="footer-sub">Music that fits you. Not the other way around.</p>
    </footer>`;
  const songs = await api('/api/songs');
  document.getElementById('recent-songs').innerHTML = songs.slice(0, 12).map(s => songCard(s)).join('');
  bindCardButtons();

  // Home search — navigates to library with search query
  const homeInput = document.getElementById('home-search-input');
  if (homeInput) {
    homeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && homeInput.value.trim()) {
        navigate('/library?search=' + encodeURIComponent(homeInput.value.trim()));
      }
    });
  }
  updateSidebarStats();

  // Load global story feed on homepage
  try {
    const stories = await api('/api/stories/recent/all');
    const container = document.getElementById('home-stories');
    if (container && stories.length > 0) {
      const cards = stories.slice(0, 6).map(st => {
        const artistSlug = st.song_artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `<div style="padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.4rem">
            <a href="/song/${st.song_slug}" data-link style="color:var(--accent);text-decoration:none">${st.song_title}</a> by <a href="/artist/${artistSlug}" data-link style="color:var(--text-muted);text-decoration:none">${st.song_artist}</a>
          </div>
          ${st.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.4rem 0">"${st.lyric}"</p>` : ''}
          <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.4rem 0">${st.story}</p>
          <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${st.name}</strong>${st.city ? ' — ' + st.city : ''}</p>
        </div>`;
      }).join('');

      container.innerHTML = `
        <h2 style="margin-bottom:0.5rem">What music means to people</h2>
        <div style="display:flex;flex-direction:column;gap:0.75rem">${cards}</div>
      `;
    }
  } catch (e) {}
}

async function renderLibrary() {
  app.innerHTML = `
    <h1>Song Library</h1>
    <div class="filter-bar">
      <select id="filter-mood" class="filter-select"><option value="">All Moods</option></select>
      <select id="filter-use" class="filter-select"><option value="">Recommended For...</option></select>
      <select id="filter-tradition" class="filter-select"><option value="">All Traditions</option></select>
      <select id="filter-sort" class="filter-select"><option value="">Recent</option><option value="artist">Artist A-Z</option><option value="dynamic_range_asc">Calmest</option><option value="dynamic_range_desc">Intense</option></select>
    </div>
    <div class="result-count" id="song-count"></div>
    <div class="song-grid" id="song-list"></div>`;
  const f = await api('/api/filters');
  const ms = document.getElementById('filter-mood'), us = document.getElementById('filter-use'), ts = document.getElementById('filter-tradition');
  f.moods.forEach(m => ms.innerHTML += `<option value="${m}">${m}</option>`);
  f.use_cases.forEach(u => us.innerHTML += `<option value="${u}">${u}</option>`);
  f.traditions.forEach(t => ts.innerHTML += `<option value="${t}">${t}</option>`);
  loadLibrary();
  ['filter-mood','filter-use','filter-tradition','filter-sort'].forEach(id => document.getElementById(id)?.addEventListener('change', loadLibrary));
}

async function loadLibrary() {
  const p = new URLSearchParams();
  const gs = document.getElementById('global-search')?.value;
  if (gs) p.set('search', gs);
  if (currentSensoryFilter) p.set('sensory_level', currentSensoryFilter);
  ['mood:filter-mood','recommended_for:filter-use','tradition:filter-tradition','sort:filter-sort'].forEach(pair => {
    const [k, id] = pair.split(':'); const v = document.getElementById(id)?.value; if (v) p.set(k, v);
  });
  const songs = await api('/api/songs?' + p.toString());
  const cnt = document.getElementById('song-count');
  if (cnt) cnt.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
  const list = document.getElementById('song-list');
  if (list) { list.innerHTML = songs.map(s => songCard(s)).join('') || '<p style="color:var(--text-dim)">No songs match.</p>'; bindCardButtons(); }
}

// Activity tracking
function trackView(song) {
  try {
    const history = JSON.parse(localStorage.getItem('miw_history') || '[]');
    history.unshift({ slug: song.slug, title: song.title, artist: song.artist, texture: song.texture, dynamic_range: song.dynamic_range, sensory_level: song.sensory_level, vocal_style: song.vocal_style, moods: song.moods || [], time: Date.now() });
    // Keep last 200
    if (history.length > 200) history.length = 200;
    localStorage.setItem('miw_history', JSON.stringify(history));
  } catch (e) {}
}
function getHistory() { try { return JSON.parse(localStorage.getItem('miw_history') || '[]'); } catch { return []; } }

// Stop words for word cloud
const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','it','its','this','that','was','are','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','shall','not','no','nor','so','if','than','too','very','just','about','above','after','again','all','am','any','because','before','below','between','both','during','each','few','further','here','how','into','more','most','my','other','our','out','over','own','same','she','he','some','such','then','there','these','they','through','under','until','up','we','what','when','where','which','while','who','whom','why','you','your','i','me','him','her','us','them','his','my','mine','her','hers','its','our','ours','their','theirs','dont','cant','wont','aint','im','youre','hes','shes','were','theyre','ive','youve','weve','theyve','id','youd','hed','shed','wed','theyd','ill','youll','hell','shell','well','theyll','like','get','got','go','going','know','want','come','make','say','said','one','two','back','way','even','new','now','old','see','time','well','also','people','into','year','your','some','them','than','then','look','only','also','after','many','before','right','too','does','must','said','let','made','find','long','day','down','been','call','first','who','may','each','tell','still'];

async function renderSong(slug) {
  app.innerHTML = '<p>Loading...</p>';
  const s = await api('/api/songs/' + slug);
  if (s.error) { app.innerHTML = '<h1>Song not found</h1>'; return; }
  trackView(s);
  const sc = s.sudden_changes === 'none' ? 'badge-safe' : s.sudden_changes === 'mild' ? 'badge-moderate' : 'badge-intense';
  const art = s.thumbnail_url ? `<img class="song-detail-art" src="${s.thumbnail_url}" alt="${s.title}">` : '';

  app.innerHTML = `<div class="song-detail">
    <div class="song-detail-header">
      ${art}
      <div class="song-detail-info">
        <h1>${s.title}</h1>
        <div class="artist">${s.artist}</div>
        <div class="album">${s.album || ''}${s.year ? ' (' + s.year + ')' : ''}</div>
        <div class="meta" style="margin-top:0.5rem">${sensoryBadge(s.sensory_level)} ${s.bpm ? `<span class="badge badge-neutral">${s.bpm} BPM</span>` : ''}</div>
        <button class="add-to-pl-btn-large" id="add-song-btn" style="margin-top:0.75rem">+ Playlist</button>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(s.title + ' by ' + s.artist + ': DR ' + s.dynamic_range + '/10, ' + s.texture + ' texture. See the full DNA →')}&url=${encodeURIComponent('https://musiciwant.com/song/' + slug)}" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#1DA1F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Share on X</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://musiciwant.com/song/' + slug)}" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#4267B2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Facebook</a>
      <button onclick="navigator.clipboard.writeText('https://musiciwant.com/song/${slug}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Link',2000)" style="padding:0.4rem 0.8rem;background:var(--bg-hover);color:var(--text);border:1px solid var(--bg-hover);border-radius:6px;font-size:0.8rem;cursor:pointer;font-weight:600">Copy Link</button>
      <button id="gen-song-card" style="padding:0.4rem 0.8rem;background:var(--accent);color:var(--bg);border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;font-weight:600">Generate Card</button>
    </div>
    <div id="song-card-preview"></div>
    <div class="sensory-card">
      <h2>Song DNA</h2>
      <div class="rating-row"><span class="rating-label">Dynamic Range</span><span class="rating-value">${s.dynamic_range}/10 <span class="dr-bar"><span class="dr-fill" style="width:${s.dynamic_range*10}%"></span></span></span></div>
      <div class="rating-row"><span class="rating-label">Sudden Changes</span><span class="rating-value ${sc}">${s.sudden_changes}</span></div>
      <div class="rating-row"><span class="rating-label">Texture</span><span class="rating-value">${s.texture}</span></div>
      <div class="rating-row"><span class="rating-label">Predictability</span><span class="rating-value">${s.predictability}</span></div>
      <div class="rating-row"><span class="rating-label">Vocal Style</span><span class="rating-value">${s.vocal_style}</span></div>
      ${s.sensory_notes ? `<div class="sensory-notes"><strong>Notes:</strong> ${s.sensory_notes}</div>` : ''}
    </div>
    ${(s.miso_mouth && s.miso_mouth !== 'unknown') || (s.miso_clicks && s.miso_clicks !== 'unknown') ? `
    <div class="sensory-card" style="margin-top:1rem;border:1px solid rgba(212,149,106,0.15)">
      <h3 style="color:var(--accent);margin:0 0 0.75rem 0;font-size:0.9rem">Misophonia Triggers</h3>
      ${s.miso_mouth && s.miso_mouth !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Mouth Sounds</span><span class="rating-value ${s.miso_mouth === 'none' ? 'badge-safe' : 'badge-intense'}">${s.miso_mouth}</span></div>` : ''}
      ${s.miso_clicks && s.miso_clicks !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Percussive Clicks</span><span class="rating-value ${s.miso_clicks === 'none' ? 'badge-safe' : 'badge-intense'}">${s.miso_clicks}</span></div>` : ''}
      ${s.miso_breathing && s.miso_breathing !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Breathing Sounds</span><span class="rating-value ${s.miso_breathing === 'none' ? 'badge-safe' : 'badge-intense'}">${s.miso_breathing}</span></div>` : ''}
      ${s.miso_repetitive && s.miso_repetitive !== 'unknown' ? `<div class="rating-row"><span class="rating-label">Repetitive Micro-sounds</span><span class="rating-value ${s.miso_repetitive === 'none' ? 'badge-safe' : 'badge-intense'}">${s.miso_repetitive}</span></div>` : ''}
    </div>` : ''}
    ${s.recommended_for?.length ? `<div class="recommended-for">${s.recommended_for.map(r => `<span class="rec-tag">${r}</span>`).join('')}</div>` : ''}
    ${s.spotify_id ? `<div class="embed-container"><iframe src="https://open.spotify.com/embed/track/${s.spotify_id}?theme=0" height="152" allow="encrypted-media" loading="lazy"></iframe></div>` : ''}
    ${s.youtube_id ? `<div class="embed-container"><iframe src="https://www.youtube.com/embed/${s.youtube_id}" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : ''}
    ${s.cultural_context ? `<div class="cultural-context"><p>${s.cultural_context}</p></div>` : ''}
    ${s.listening_prompt ? `<div class="listening-prompt"><p>${s.listening_prompt}</p></div>` : ''}
    ${s.arc_description ? `<div class="guide-content">${s.arc_description.split('\\n\\n').map(p => `<p>${p}</p>`).join('')}</div>` : ''}
    <div class="listen-links">
      ${s.spotify_url ? `<a href="${s.spotify_url}" class="listen-link" rel="noopener" target="_blank">Spotify</a>` : ''}
      ${s.youtube_url ? `<a href="${s.youtube_url}" class="listen-link" rel="noopener" target="_blank">YouTube</a>` : ''}
    </div>

    <div class="affiliate-section">
      <span class="affiliate-disclosure">affiliate links</span>
      <h3>Hear it the way it was made</h3>
      <p style="font-size:0.85rem;color:var(--text-muted)">The right gear changes everything.</p>
      <div class="affiliate-links">
        <a href="https://www.ebay.com/sch/i.html?_nkw=studio+headphones&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Studio Headphones</a>
        ${s.artist ? `<a href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(s.artist + ' vinyl')}&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">${s.artist} on Vinyl</a>` : ''}
        ${s.artist ? `<a href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(s.artist + ' merch')}&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">${s.artist} Merch</a>` : ''}
      </div>
    </div>

    <div id="alternatives-container"></div>
    <div id="stories-container" style="margin-top:1.5rem"></div>

    <div style="margin-top:1.5rem">
      <a href="/artist/${s.artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}" data-link style="color:var(--accent)">&larr; All ${s.artist} songs</a>
      &nbsp;&nbsp;
      <a href="/check" data-link style="color:var(--accent)">Check another song &rarr;</a>
    </div>
  </div>`;
  document.getElementById('add-song-btn')?.addEventListener('click', () => showPlaylistModal(s));
  document.getElementById('gen-song-card')?.addEventListener('click', () => {
    const canvas = generateCard({
      title: s.title,
      artist: s.artist,
      subtitle: s.album ? s.album + (s.year ? ' (' + s.year + ')' : '') : '',
      stats: [
        { value: s.dynamic_range + '/10', label: 'INTENSITY', color: '#d4956a' },
        { value: s.texture, label: 'TEXTURE', color: '#e8e4df' },
        { value: s.predictability, label: 'PREDICTABILITY', color: '#8a8580' },
        { value: s.vocal_style, label: 'VOCALS', color: '#c4a94d' }
      ],
      bodyText: s.sensory_notes || s.description || ''
    });
    showCardPreview(canvas, 'song-card-preview');
  });

  // Load safe alternatives for moderate/intense songs
  if (s.sensory_level !== 'safe') {
    try {
      const alts = await api('/api/songs/' + slug + '/alternatives');
      if (alts.length > 0) {
        const altCards = alts.map(a => {
          const abadge = a.sensory_level === 'safe' ? 'badge-safe' : 'badge-moderate';
          return `<a href="/song/${a.slug}" data-link style="display:block;padding:0.75rem;background:var(--bg-card);border-radius:var(--radius-sm);text-decoration:none;color:var(--text)">
            <strong>${a.title}</strong><br>
            <span style="font-size:0.85rem;color:var(--text-muted)">${a.artist}</span>
            <span class="badge ${abadge}" style="margin-left:0.5rem;font-size:0.7rem">${a.sensory_level}</span>
          </a>`;
        }).join('');

        document.getElementById('alternatives-container').innerHTML = `
          <div style="margin-top:2rem;padding:1.25rem;background:var(--bg-sidebar);border-radius:var(--radius);border:1px solid var(--bg-hover)">
            <h3 style="margin:0 0 0.75rem 0;font-size:1rem;color:var(--accent)">Safer alternatives with a similar feel</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1rem 0">These songs share similar moods but with a gentler sensory profile.</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem">${altCards}</div>
          </div>`;
      }
    } catch (e) { /* alternatives are non-critical */ }
  }

  // Load fan stories
  try {
    const stories = await api('/api/stories/' + slug);
    const container = document.getElementById('stories-container');
    if (container) {
      const storyCards = stories.map(st => {
        const loc = st.city ? ` &mdash; ${st.city}` : '';
        return `<div style="padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
          ${st.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.5rem 0">"${st.lyric}"</p>` : ''}
          <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.5rem 0">${st.story}</p>
          <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${st.name}</strong>${loc}</p>
        </div>`;
      }).join('');
      container.innerHTML = `
        <h3 style="color:var(--accent);font-size:1rem;margin-bottom:0.5rem">What this song means to people</h3>
        ${stories.length > 0 ? `<div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem">${storyCards}</div>` : `<p style="color:var(--text-dim);font-size:0.85rem">No stories yet. Be the first.</p>`}
        <details style="margin-top:0.75rem">
          <summary style="color:var(--accent);cursor:pointer;font-size:0.9rem">Share what this song means to you</summary>
          <div style="margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem" id="story-form-wrap">
            <input type="text" id="sf-name" placeholder="Your first name" maxlength="50" class="filter-input" style="padding:0.6rem">
            <input type="text" id="sf-city" placeholder="City (optional)" maxlength="50" class="filter-input" style="padding:0.6rem">
            <input type="text" id="sf-lyric" placeholder="Your favorite lyric from this song (optional)" maxlength="200" class="filter-input" style="padding:0.6rem">
            <textarea id="sf-story" placeholder="What does this song mean to you?" maxlength="1000" rows="3" class="filter-input" style="padding:0.6rem;resize:vertical"></textarea>
            <button class="cta-primary" style="align-self:flex-start" id="sf-submit">Share My Story</button>
          </div>
        </details>`;
      document.getElementById('sf-submit')?.addEventListener('click', async () => {
        const name = document.getElementById('sf-name').value.trim();
        const story = document.getElementById('sf-story').value.trim();
        if (!name || !story) return;
        const res = await fetch('/api/stories', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ song_slug: slug, name, city: document.getElementById('sf-city').value.trim(), story, lyric: document.getElementById('sf-lyric').value.trim() })
        });
        const d = await res.json();
        if (d.ok) document.getElementById('story-form-wrap').innerHTML = '<p style="color:var(--safe)">Thank you. Your story is now part of this song.</p><div style="margin-top:0.75rem;display:flex;gap:0.5rem"><a href="https://twitter.com/intent/tweet?text='+encodeURIComponent('I just shared what this song means to me on Music I Want →')+'" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#1DA1F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Share on X</a><a href="https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.href)+'" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#4267B2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Facebook</a><button onclick="navigator.clipboard.writeText(window.location.href);this.textContent=\\'Copied!\\'" style="padding:0.4rem 0.8rem;background:var(--bg-hover);color:var(--text);border:1px solid var(--bg-hover);border-radius:6px;font-size:0.8rem;cursor:pointer;font-weight:600">Copy Link</button></div>';
        else showToast(d.error || 'Something went wrong');
      });
    }
  } catch (e) { /* stories non-critical */ }
}

// --- Artist Page ---
async function renderArtist(name) {
  app.innerHTML = '<p>Loading...</p>';
  const data = await api('/api/artist/' + encodeURIComponent(name));
  if (data.error) { app.innerHTML = `<h1>No songs found for "${name}"</h1><p>Try <a href="/check" data-link>checking a song</a> by this artist to add them.</p>`; return; }

  const mostCommon = data.levels.intense >= data.levels.moderate && data.levels.intense >= data.levels.safe ? 'intense' : data.levels.moderate >= data.levels.safe ? 'moderate' : 'safe';
  const personality = mostCommon === 'intense'
    ? `${data.artist} doesn't hold back. ${data.levels.intense} of ${data.song_count} songs hit intense — music that demands something from you.`
    : mostCommon === 'safe'
    ? `${data.artist} lives in gentleness. ${data.levels.safe} of ${data.song_count} songs are safe — music that holds you.`
    : `${data.artist} lives in the middle ground — ${data.levels.moderate} moderate songs that balance intensity with control.`;

  const quiet = data.songs.filter(s => s.sensory_level === 'safe');
  const mid = data.songs.filter(s => s.sensory_level === 'moderate');
  const loud = data.songs.filter(s => s.sensory_level === 'intense');

  function sc(s) {
    const sl = s.sensory_level === 'safe' ? 'badge-safe' : s.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';
    const borderColor = s.sensory_level === 'safe' ? 'var(--safe)' : s.sensory_level === 'moderate' ? 'var(--moderate)' : 'var(--intense)';
    return `<a href="/song/${s.slug}" data-link style="display:block;padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);text-decoration:none;color:var(--text);border-left:3px solid ${borderColor}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${s.title}</strong>
        <span class="badge ${sl}" style="font-size:0.7rem">${s.sensory_level}</span>
      </div>
      <div style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-dim)">
        ${s.texture} texture &middot; ${s.sudden_changes} changes &middot; DR ${s.dynamic_range}
        ${s.year ? ` &middot; ${s.year}` : ''}
      </div>
    </a>`;
  }

  // Load stories
  let storyFeed = '';
  try {
    const allStories = [];
    for (const s of data.songs) {
      const st = await api('/api/stories/' + s.slug);
      st.forEach(x => { x.song_title = s.title; x.song_slug = s.slug; });
      allStories.push(...st);
    }
    allStories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (allStories.length > 0) {
      storyFeed = allStories.slice(0, 10).map(st => `<div style="padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
        <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.4rem"><a href="/song/${st.song_slug}" data-link style="color:var(--accent);text-decoration:none">${st.song_title}</a></div>
        ${st.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.4rem 0">"${st.lyric}"</p>` : ''}
        <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.4rem 0">${st.story}</p>
        <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${st.name}</strong>${st.city ? ' — ' + st.city : ''}</p>
      </div>`).join('');
    }
  } catch (e) {}

  if (!storyFeed) {
    storyFeed = `<div style="padding:2rem;background:var(--bg-card);border-radius:var(--radius);text-align:center">
      <p style="color:var(--text-muted);font-size:1rem;margin:0 0 0.5rem 0">No stories yet.</p>
      <p style="color:var(--text-dim);font-size:0.85rem;margin:0">Click any song and share what it means to you. Be the first voice on this wall.</p>
    </div>`;
  }

  app.innerHTML = `<div style="max-width:760px;margin:0 auto">
    <div style="margin-bottom:2rem">
      <h1 style="margin-bottom:0.25rem">${data.artist}</h1>
      <p style="color:var(--text-muted);font-size:1.05rem;font-style:italic;margin:0">${personality}</p>
    </div>

    <div style="display:flex;gap:1rem;margin-bottom:2.5rem;flex-wrap:wrap">
      <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center;flex:1;min-width:100px">
        <div style="font-size:2rem;font-weight:700;color:var(--accent)">${data.avg_dynamic_range}</div>
        <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Avg Intensity</div>
      </div>
      <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center;flex:1;min-width:100px">
        <div style="font-size:2rem;font-weight:700;color:var(--text)">${data.song_count}</div>
        <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Songs Decoded</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
      <div>
        ${loud.length > 0 ? `<h2 style="font-size:1rem;color:var(--intense);margin-bottom:0.75rem">The songs that hit hardest</h2>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2rem">${loud.map(sc).join('')}</div>` : ''}
        ${mid.length > 0 ? `<h2 style="font-size:1rem;color:var(--moderate);margin-bottom:0.75rem">The controlled burn</h2>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2rem">${mid.map(sc).join('')}</div>` : ''}
        ${quiet.length > 0 ? `<h2 style="font-size:1rem;color:var(--safe);margin-bottom:0.75rem">The quiet ones</h2>
        <div style="display:flex;flex-direction:column;gap:0.5rem">${quiet.map(sc).join('')}</div>` : ''}
      </div>
      <div>
        <h2 style="font-size:1rem;color:var(--accent);margin-bottom:0.5rem">The Wall &mdash; Fan Stories</h2>
        <a href="#asf-wrap" style="display:block;padding:0.6rem;background:var(--accent);color:var(--bg);border-radius:var(--radius-sm);text-align:center;text-decoration:none;font-weight:600;font-size:0.9rem;margin-bottom:1rem" onclick="document.getElementById('asf-wrap').scrollIntoView({behavior:'smooth'});document.getElementById('asf-song').focus();return false;">Share your story</a>
        <div style="display:flex;flex-direction:column;gap:0.75rem">${storyFeed}</div>

        <div style="margin-top:1.5rem;padding:1.25rem;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--bg-hover)">
          <h3 style="margin:0 0 0.75rem 0;font-size:0.95rem;color:var(--accent)">Add your story to the wall</h3>
          <div id="asf-wrap" style="display:flex;flex-direction:column;gap:0.6rem">
            <select id="asf-song" class="filter-select" style="padding:0.6rem">
              <option value="">Which song?</option>
              ${data.songs.map(s => `<option value="${s.slug}">${s.title}</option>`).join('')}
            </select>
            <input type="text" id="asf-name" placeholder="Your first name" maxlength="50" class="filter-input" style="padding:0.6rem">
            <input type="text" id="asf-city" placeholder="City (optional)" maxlength="50" class="filter-input" style="padding:0.6rem">
            <input type="text" id="asf-lyric" placeholder="Your favorite lyric (optional)" maxlength="200" class="filter-input" style="padding:0.6rem">
            <textarea id="asf-story" placeholder="What does this song mean to you?" maxlength="1000" rows="3" class="filter-input" style="padding:0.6rem;resize:vertical"></textarea>
            <input type="email" id="asf-email" placeholder="Email (optional — we'll never spam you)" class="filter-input" style="padding:0.6rem">
            <button class="cta-primary" style="align-self:flex-start" id="asf-submit">Share My Story</button>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:2.5rem">
      <div style="padding:1.25rem;background:rgba(212,149,106,0.06);border-radius:var(--radius);border:1px solid rgba(212,149,106,0.15);text-align:center">
        <p style="color:var(--text);font-size:0.95rem;margin:0 0 0.75rem 0">Know a ${data.artist} song we haven't decoded?</p>
        <a href="/check" data-link style="display:inline-block;padding:0.6rem 1.5rem;background:var(--accent);color:var(--bg);border-radius:var(--radius-sm);text-decoration:none;font-weight:600">Check a Song</a>
      </div>
      <div style="padding:1.25rem;background:rgba(74,158,111,0.06);border-radius:var(--radius);border:1px solid rgba(74,158,111,0.15);text-align:center">
        <p style="color:var(--text);font-size:0.95rem;margin:0 0 0.75rem 0">Don't see your favorite artist?</p>
        <a href="/request" data-link style="display:inline-block;padding:0.6rem 1.5rem;background:var(--safe);color:var(--bg);border-radius:var(--radius-sm);text-decoration:none;font-weight:600">Request an Artist</a>
      </div>
    </div>

    <div style="margin-top:1.5rem"><a href="/library" data-link style="color:var(--accent)">&larr; Back to Library</a></div>
  </div>`;

  // Bind story form
  document.getElementById('asf-submit')?.addEventListener('click', async () => {
    const song = document.getElementById('asf-song').value;
    const sname = document.getElementById('asf-name').value.trim();
    const story = document.getElementById('asf-story').value.trim();
    if (!song || !sname || !story) { showToast('Pick a song, add your name, and tell your story'); return; }
    const res = await fetch('/api/stories', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ song_slug: song, name: sname, city: document.getElementById('asf-city').value.trim(), story, lyric: document.getElementById('asf-lyric').value.trim(), email: document.getElementById('asf-email').value.trim() })
    });
    const d = await res.json();
    if (d.ok) document.getElementById('asf-wrap').innerHTML = '<p style="color:var(--safe);font-size:0.95rem">Thank you. Your story is now part of the wall.</p><div style="margin-top:0.75rem;display:flex;gap:0.5rem"><a href="https://twitter.com/intent/tweet?text='+encodeURIComponent('I just shared my music story on Music I Want →')+'" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#1DA1F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Share on X</a><a href="https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.href)+'" target="_blank" rel="noopener" style="padding:0.4rem 0.8rem;background:#4267B2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600">Facebook</a><button onclick="navigator.clipboard.writeText(window.location.href);this.textContent=\\'Copied!\\'" style="padding:0.4rem 0.8rem;background:var(--bg-hover);color:var(--text);border:1px solid var(--bg-hover);border-radius:6px;font-size:0.8rem;cursor:pointer;font-weight:600">Copy Link</button></div>';
    else showToast(d.error || 'Something went wrong');
  });
}

function renderFinder() {
  app.innerHTML = `<h1>Find Music For Me</h1><p>Answer a few questions. We'll find something that fits.</p>
    <div id="finder">
      <div class="finder-step" id="step-1"><h3>How are you feeling?</h3><div class="finder-options">
        <button class="finder-btn" data-field="feeling" data-value="anxious">Anxious</button><button class="finder-btn" data-field="feeling" data-value="scattered">Scattered</button><button class="finder-btn" data-field="feeling" data-value="heavy">Heavy</button><button class="finder-btn" data-field="feeling" data-value="restless">Restless</button><button class="finder-btn" data-field="feeling" data-value="numb">Numb</button><button class="finder-btn" data-field="feeling" data-value="okay">Okay</button>
      </div></div>
      <div class="finder-step hidden" id="step-2"><h3>What do you need?</h3><div class="finder-options">
        <button class="finder-btn" data-field="need" data-value="calm">Calm</button><button class="finder-btn" data-field="need" data-value="focus">Focus</button><button class="finder-btn" data-field="need" data-value="release">Release</button><button class="finder-btn" data-field="need" data-value="energy">Energy</button><button class="finder-btn" data-field="need" data-value="feel">To feel something</button>
      </div></div>
      <div class="finder-step hidden" id="step-3"><h3>Vocals?</h3><div class="finder-options">
        <button class="finder-btn" data-field="vocal_preference" data-value="vocals">Vocals</button><button class="finder-btn" data-field="vocal_preference" data-value="instrumental">Instrumental</button><button class="finder-btn" data-field="vocal_preference" data-value="no_preference">No preference</button>
      </div></div>
    </div>
    <div id="finder-results" class="song-grid" style="margin-top:1.5rem"></div>`;
  const state = {}; let step = 0; const steps = ['step-1','step-2','step-3'];
  document.getElementById('finder').addEventListener('click', async e => {
    const b = e.target.closest('.finder-btn'); if (!b) return;
    state[b.dataset.field] = b.dataset.value;
    b.parentElement.querySelectorAll('.finder-btn').forEach(x => x.classList.remove('selected')); b.classList.add('selected');
    step++;
    if (step < steps.length) setTimeout(() => document.getElementById(steps[step]).classList.remove('hidden'), 200);
    else {
      const res = await fetch('/api/finder', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(state) });
      const songs = await res.json();
      document.getElementById('finder-results').innerHTML = songs.length ? '<h2>Here\'s what we found</h2>' + songs.map(s => songCard(s)).join('') : '<p style="color:var(--text-dim)">No match yet — try the <a href="/library" data-link>library</a>.</p>';
      bindCardButtons();
    }
  });
}

function renderPlaylists() {
  const pls = getPlaylists();
  const email = getUserEmail();
  const savedStatus = email
    ? `<div class="save-status saved"><span class="save-dot"></span> Playlists synced to <strong>${email}</strong></div>`
    : `<div class="save-status unsaved"><span class="save-dot"></span> Playlists only saved in this browser</div>`;

  app.innerHTML = `<h1>Your Playlists</h1>
    ${savedStatus}
    <div style="margin:1rem 0;display:flex;gap:0.5rem;flex-wrap:wrap">
      <input type="text" id="new-pl-input" placeholder="New playlist name..." class="filter-input" style="max-width:250px;flex:1">
      <button class="cta-primary" id="create-pl-btn" style="font-size:0.85rem;padding:0.45rem 1rem">Create</button>
    </div>
    ${pls.length ? `<div class="playlist-grid">${pls.map(pl => `<div class="playlist-card-wrap"><a href="/playlist/${pl.id}" data-link class="playlist-card"><h3>${pl.name}</h3><p>${pl.songs.length} song${pl.songs.length!==1?'s':''}</p></a><button class="delete-pl-btn" data-pl-id="${pl.id}">x</button></div>`).join('')}</div>` : `<p style="color:var(--text-dim)">No playlists yet. Create one above, then add songs from the library.</p>
      <div class="recover-section">
        <h3>Had playlists before?</h3>
        <p>If you saved playlists on another device or browser, we can send you a link to restore them.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <input type="email" id="recover-email" class="filter-input" placeholder="your@email.com" style="flex:1;min-width:200px">
          <button class="cta-secondary" id="recover-btn" style="white-space:nowrap;font-size:0.85rem">Recover Playlists</button>
        </div>
        <p id="recover-msg" class="make-fine-print" style="margin-top:0.4rem"></p>
      </div>`}
    ${!email && pls.length ? `
      <div class="save-prompt">
        <h3>Keep your playlists safe</h3>
        <p>Enter your email and we'll send you a magic link. Click it anytime to restore your playlists on any device — phone, laptop, anywhere.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <input type="email" id="save-email" class="filter-input" placeholder="your@email.com" style="flex:1;min-width:200px">
          <button class="cta-primary" id="save-btn" style="white-space:nowrap;font-size:0.85rem;padding:0.45rem 1rem">Save My Playlists</button>
        </div>
        <p class="make-fine-print">One email with your restore link. No spam, no newsletter, ever.</p>
      </div>` : ''}`;

  document.getElementById('create-pl-btn')?.addEventListener('click', () => {
    const n = document.getElementById('new-pl-input')?.value.trim();
    if (n) { createPlaylist(n); renderPlaylists(); showToast(`Created "${n}"`); updateSidebarPlaylists(); }
  });

  document.querySelectorAll('.delete-pl-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); deletePlaylist(b.dataset.plId); renderPlaylists(); updateSidebarPlaylists(); showToast('Deleted');
  }));

  document.getElementById('save-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('save-email').value.trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid email'); return; }
    setUserEmail(email);
    await syncPlaylistsToServer();
    renderPlaylists();
    showToast('Playlists saved! Check your email for your restore link.');
  });

  document.getElementById('recover-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('recover-email').value.trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid email'); return; }
    const msg = document.getElementById('recover-msg');
    msg.textContent = 'Sending...';
    try {
      const r = await fetch('/api/playlists/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await r.json();
      msg.textContent = 'If we have your playlists, a restore link has been sent to your email. Check your inbox.';
      msg.style.color = 'var(--safe)';
    } catch (e) {
      msg.textContent = 'Something went wrong. Try again.';
      msg.style.color = 'var(--intense)';
    }
  });
}

async function renderPlaylist(id) {
  const pl = getPlaylists().find(p => p.id === id);
  if (!pl) { app.innerHTML = '<h1>Not found</h1>'; return; }
  app.innerHTML = `<h1>${pl.name}</h1><p>${pl.songs.length} song${pl.songs.length!==1?'s':''}</p>
    ${pl.songs.length ? `<div class="song-grid">${pl.songs.map(s => songCard(s, {showRemove:true, playlistId:id})).join('')}</div>` : '<p style="color:var(--text-dim)">Empty. Browse the <a href="/library" data-link>library</a> to add songs.</p>'}
    <div style="margin-top:1.5rem"><a href="/playlists" data-link style="color:var(--accent)">&larr; All Playlists</a></div>`;
  document.querySelectorAll('.remove-from-pl-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); removeFromPlaylist(b.dataset.playlist, b.dataset.slug); renderPlaylist(id); updateSidebarPlaylists(); showToast('Removed'); }));
}

function renderMakeMusic() {
  app.innerHTML = `
    <div class="make-music-page">
      <h1>Make Music</h1>
      <p>Describe the music you want to hear. We'll create it for you — a unique song that exists nowhere else.</p>

      <!-- Step 1: Genre -->
      <div class="make-step" id="make-step-1">
        <h2>What kind of music?</h2>
        <p class="make-hint">Pick a starting point. You can describe more in the next step.</p>
        <div class="genre-grid">
          <button class="genre-btn" data-genre="ambient"><span class="genre-icon">🌊</span>Ambient<span class="genre-desc">Calm, spacious, flowing</span></button>
          <button class="genre-btn" data-genre="classical"><span class="genre-icon">🎻</span>Classical<span class="genre-desc">Orchestral, piano, strings</span></button>
          <button class="genre-btn" data-genre="jazz"><span class="genre-icon">🎷</span>Jazz<span class="genre-desc">Smooth, complex, soulful</span></button>
          <button class="genre-btn" data-genre="folk"><span class="genre-icon">🪕</span>Folk<span class="genre-desc">Acoustic, warm, storytelling</span></button>
          <button class="genre-btn" data-genre="electronic"><span class="genre-icon">🎧</span>Electronic<span class="genre-desc">Synths, beats, atmospheric</span></button>
          <button class="genre-btn" data-genre="lo-fi"><span class="genre-icon">📻</span>Lo-Fi<span class="genre-desc">Chill, hazy, relaxed</span></button>
          <button class="genre-btn" data-genre="world"><span class="genre-icon">🌍</span>World<span class="genre-desc">Global traditions, fusion</span></button>
          <button class="genre-btn" data-genre="cinematic"><span class="genre-icon">🎬</span>Cinematic<span class="genre-desc">Film score, dramatic, sweeping</span></button>
          <button class="genre-btn" data-genre="rock"><span class="genre-icon">🎸</span>Rock<span class="genre-desc">Guitars, energy, drive</span></button>
          <button class="genre-btn" data-genre="r&b soul"><span class="genre-icon">🎤</span>R&B / Soul<span class="genre-desc">Groovy, emotional, vocal</span></button>
          <button class="genre-btn" data-genre="meditation"><span class="genre-icon">🧘</span>Meditation<span class="genre-desc">Gentle, still, breathing</span></button>
          <button class="genre-btn" data-genre="custom"><span class="genre-icon">✨</span>Surprise Me<span class="genre-desc">I'll describe it myself</span></button>
        </div>
      </div>

      <!-- Step 2: Sensory + Prompt -->
      <div class="make-step hidden" id="make-step-2">
        <h2>Describe your song</h2>
        <p class="make-hint">The more detail you give, the more personal it gets. Here are some ideas:</p>
        <div class="prompt-ideas">
          <button class="idea-chip" data-idea="A gentle piano piece for falling asleep, with soft rain in the background">Piano + rain for sleep</button>
          <button class="idea-chip" data-idea="An uplifting acoustic guitar song that feels like a sunny morning walk">Sunny morning walk</button>
          <button class="idea-chip" data-idea="A calm ambient track with slow strings, no sudden changes, safe for sensory overload">Safe for sensory overload</button>
          <button class="idea-chip" data-idea="A lo-fi hip hop beat with warm vinyl crackle, perfect for studying">Lo-fi study beat</button>
          <button class="idea-chip" data-idea="An emotional cinematic piece that builds slowly from quiet to powerful">Emotional slow build</button>
          <button class="idea-chip" data-idea="A peaceful meditation soundscape with singing bowls and gentle drones">Meditation soundscape</button>
        </div>
        <textarea id="make-prompt" class="make-textarea" rows="4" placeholder="Describe the music you want to hear..."></textarea>

        <div class="make-options">
          <div class="make-option">
            <label>Sensory level</label>
            <select id="make-sensory" class="filter-select">
              <option value="safe">Safe — no surprises, gentle</option>
              <option value="moderate">Moderate — some variation</option>
              <option value="intense">Intense — dynamic, powerful</option>
            </select>
          </div>
          <div class="make-option">
            <label>Vocals</label>
            <select id="make-vocals" class="filter-select">
              <option value="instrumental">Instrumental only</option>
              <option value="soft vocals">Soft vocals</option>
              <option value="dynamic vocals">Dynamic vocals</option>
              <option value="no preference">No preference</option>
            </select>
          </div>
        </div>

        <button class="cta-primary make-submit" id="make-submit" style="margin-top:1rem;width:100%;padding:0.75rem;font-size:1rem">Create My Song</button>
      </div>

      <!-- Step 3: Ad Gate + Waiting -->
      <div class="make-step hidden" id="make-step-3">
        <div class="make-creating">
          <div class="make-spinner"></div>
          <h2>Creating your song...</h2>
          <p>This usually takes about 1-2 minutes. While you wait:</p>
        </div>

        <!-- Affiliate browsing section -->
        <div class="make-while-waiting">
          <span class="affiliate-disclosure">affiliate links</span>
          <h3>Explore while you wait</h3>
          <div class="waiting-links">
            <a href="https://www.ebay.com/sch/i.html?_nkw=noise+cancelling+headphones+over+ear&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">🎧</span>
              <span class="waiting-title">Best Headphones for Listening</span>
              <span class="waiting-desc">Over-ear, noise-canceling, comfortable for long sessions</span>
            </a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=vinyl+record+player+bluetooth&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">📀</span>
              <span class="waiting-title">Vinyl Record Players</span>
              <span class="waiting-desc">Warm analog sound, Bluetooth enabled</span>
            </a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=portable+bluetooth+speaker&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">🔊</span>
              <span class="waiting-title">Portable Speakers</span>
              <span class="waiting-desc">Take your music anywhere</span>
            </a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=LED+ambient+light+music+sync&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">💡</span>
              <span class="waiting-title">Music-Synced LED Lights</span>
              <span class="waiting-desc">Turn any room into a listening experience</span>
            </a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=weighted+blanket&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">🛋️</span>
              <span class="waiting-title">Weighted Blankets</span>
              <span class="waiting-desc">Deep pressure comfort while you listen</span>
            </a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=sensory+fidget+toys+adults&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="waiting-card" rel="noopener nofollow" target="_blank">
              <span class="waiting-icon">🧩</span>
              <span class="waiting-title">Sensory Fidget Tools</span>
              <span class="waiting-desc">Calm your hands while your ears discover</span>
            </a>
          </div>
        </div>

        <!-- Notification + Email -->
        <div class="make-notify">
          <h3>Don't want to wait?</h3>
          <p>We'll email you when your song is ready — with a link you can keep forever.</p>
          <div class="notify-row">
            <input type="email" id="make-email" class="filter-input" placeholder="your@email.com" style="flex:1">
            <button class="cta-primary" id="make-notify-btn" style="white-space:nowrap">Notify Me</button>
          </div>
          <p class="make-fine-print">We'll only email you about this song. No spam, ever.</p>
        </div>

        <!-- Result (shown when ready) -->
        <div class="make-result hidden" id="make-result">
          <div class="make-result-card">
            <h2>Your song is ready!</h2>
            <div id="make-result-player"></div>
            <div class="make-result-actions">
              <button class="cta-primary" id="make-share-btn">Share</button>
              <button class="cta-secondary" id="make-another-btn">Make Another</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  let selectedGenre = '';

  // Step 1: Genre selection
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedGenre = btn.dataset.genre;
      setTimeout(() => {
        document.getElementById('make-step-2').classList.remove('hidden');
        document.getElementById('make-step-2').scrollIntoView({ behavior: 'smooth' });
        if (selectedGenre !== 'custom') {
          const ta = document.getElementById('make-prompt');
          if (!ta.value) ta.placeholder = `Describe your ${selectedGenre} song... What mood? What instruments? What should it feel like?`;
        }
      }, 200);
    });
  });

  // Idea chips fill the textarea
  document.querySelectorAll('.idea-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('make-prompt').value = chip.dataset.idea;
    });
  });

  // Step 2: Submit
  document.getElementById('make-submit')?.addEventListener('click', () => {
    const prompt = document.getElementById('make-prompt').value.trim();
    if (!prompt) { showToast('Describe the music you want'); return; }

    const sensory = document.getElementById('make-sensory').value;
    const vocals = document.getElementById('make-vocals').value;

    // Build the full prompt
    const fullPrompt = `${selectedGenre !== 'custom' ? selectedGenre + ' ' : ''}${prompt}. Sensory level: ${sensory}. Vocals: ${vocals}.`;

    // Store the request
    localStorage.setItem('miw_pending_song', JSON.stringify({
      prompt: fullPrompt,
      genre: selectedGenre,
      sensory: sensory,
      vocals: vocals,
      userPrompt: prompt,
      created: new Date().toISOString()
    }));

    // Hide step 2, show step 3 (creating)
    document.getElementById('make-step-1').classList.add('hidden');
    document.getElementById('make-step-2').classList.add('hidden');
    document.getElementById('make-step-3').classList.remove('hidden');
    window.scrollTo(0, 0);

    // TODO: In production, this sends to the server which queues the Suno generation
    // For now, show the waiting experience
    showToast('Song queued for creation');
  });

  // Email notification
  document.getElementById('make-notify-btn')?.addEventListener('click', () => {
    const email = document.getElementById('make-email').value.trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid email'); return; }

    // Store email for this request
    const pending = JSON.parse(localStorage.getItem('miw_pending_song') || '{}');
    pending.notifyEmail = email;
    localStorage.setItem('miw_pending_song', JSON.stringify(pending));

    showToast('We\'ll email you when it\'s ready');
    document.getElementById('make-notify-btn').textContent = 'Saved';
    document.getElementById('make-notify-btn').disabled = true;
  });

  // Make another
  document.getElementById('make-another-btn')?.addEventListener('click', () => navigate('/make'));
}

function renderAbout() {
  app.innerHTML = `<div class="guide-content" style="max-width:640px">
    <h1>About Music I Want</h1>
    <h2>Why This Exists</h2>
    <p>Some people can't just press play. A sudden cymbal crash. An unexpected scream in a chorus. For people with sensory sensitivities — autism, ADHD, anxiety, SPD, or being highly sensitive — these moments hurt.</p>
    <p>Music I Want rates every song for sensory sensitivity so you can listen with confidence.</p>
    <h2>How Ratings Work</h2>
    <ul>
      <li><strong>Dynamic Range</strong> (1-10) — Volume variation</li>
      <li><strong>Sudden Changes</strong> — None to extreme</li>
      <li><strong>Texture</strong> — Smooth to abrasive</li>
      <li><strong>Predictability</strong> — Can you trust what's next?</li>
      <li><strong>Vocal Style</strong> — Instrumental to screaming</li>
    </ul>
    <h2>Who Built This</h2>
    <p>Built by <a href="https://linkedin.com/in/build-ai-for-good" rel="noopener" target="_blank">The Architect</a>, University of Delaware alum building AI tools that do genuine good. A project of The Hive.</p>
  </div>`;
}

// --- My Sensory Profile ---
function getProfile() { try { return JSON.parse(localStorage.getItem('miw_sensory_profile')) || null; } catch { return null; } }

function renderProfile() {
  const existing = getProfile();

  if (existing) {
    // Show existing profile with option to retake
    const levelLabel = { low: 'Low sensitivity', medium: 'Medium sensitivity', high: 'High sensitivity' };
    const triggers = existing.triggers || [];
    app.innerHTML = `
      <div style="max-width:640px;margin:0 auto">
        <h1>Your Sensory Profile</h1>
        <div class="sensory-card" style="margin-bottom:1.5rem">
          <h2 style="margin-top:0">${levelLabel[existing.level] || existing.level}</h2>
          <p style="color:var(--text-muted)">${existing.level === 'high' ? 'You are highly sensitive to sound. We recommend starting with Safe-rated songs only.' : existing.level === 'medium' ? 'You have moderate sound sensitivity. Safe and some Moderate songs should work well.' : 'You have lower sound sensitivity. Most songs should be comfortable, but check Intense songs before playing.'}</p>
          ${triggers.length ? `<div style="margin-top:1rem"><strong>Your triggers:</strong><div style="margin-top:0.5rem">${triggers.map(t => `<span class="rec-tag">${t}</span>`).join(' ')}</div></div>` : ''}
          ${existing.preferences ? `<div style="margin-top:1rem"><strong>You prefer:</strong> ${existing.preferences.join(', ')}</div>` : ''}
        </div>
        <div id="profile-card-preview" style="margin-bottom:1rem"></div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <button id="gen-profile-card" class="cta-primary">Generate My Music DNA Card</button>
          <a href="/library${existing.level === 'high' ? '?sensory_level=safe' : ''}" data-link class="cta-secondary">Browse Music For You</a>
          <a href="/battle" data-link class="cta-secondary">Song Battle</a>
          <button id="retake-profile" class="cta-secondary">Retake Quiz</button>
        </div>
      </div>`;
    document.getElementById('retake-profile')?.addEventListener('click', () => { localStorage.removeItem('miw_sensory_profile'); renderProfile(); });
    document.getElementById('gen-profile-card')?.addEventListener('click', () => {
      const history = getHistory();
      // Build word cloud from song titles, artists, moods, textures
      const wordCounts = {};
      history.forEach(h => {
        const words = [h.title, h.artist, ...(h.moods || []), h.texture, h.sensory_level].join(' ').toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
        words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
      });
      const wordCloud = Object.entries(wordCounts).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 30);

      // Compute stats from history
      const avgDR = history.length > 0 ? (history.reduce((s, h) => s + (h.dynamic_range || 0), 0) / history.length).toFixed(1) : '?';
      const textures = {};
      history.forEach(h => { if (h.texture) textures[h.texture] = (textures[h.texture] || 0) + 1; });
      const topTexture = Object.entries(textures).sort((a, b) => b[1] - a[1])[0]?.[0] || '?';
      const topArtists = {};
      history.forEach(h => { if (h.artist) topArtists[h.artist] = (topArtists[h.artist] || 0) + 1; });
      const favArtist = Object.entries(topArtists).sort((a, b) => b[1] - a[1])[0]?.[0] || '?';

      const personality = existing.level === 'high'
        ? 'Highly tuned ears. You hear what others miss.'
        : existing.level === 'medium'
        ? 'You live between intensity and control.'
        : 'Open to everything. The whole spectrum is yours.';

      const canvas = generateCard({
        title: 'My Music DNA',
        artist: 'musiciwant.com',
        subtitle: personality,
        stats: [
          { value: avgDR, label: 'AVG INTENSITY', color: '#d4956a' },
          { value: topTexture, label: 'TEXTURE', color: '#e8e4df' },
          { value: history.length.toString(), label: 'SONGS EXPLORED', color: '#4a9e6f' }
        ],
        bodyText: history.length > 0 ? 'Top artist: ' + favArtist + '. ' + (existing.triggers?.length ? 'Triggers: ' + existing.triggers.join(', ') + '.' : '') : 'Explore more songs to build your DNA.',
        wordCloud: wordCloud
      });
      showCardPreview(canvas, 'profile-card-preview');
    });
    return;
  }

  // Quiz
  const questions = [
    { id: 'cymbal', q: 'How do you react to sudden cymbal crashes?', opts: [['Fine', 0], ['Noticeable', 1], ['Uncomfortable', 2], ['Painful', 3]] },
    { id: 'volume', q: 'How do you handle sudden volume changes in music?', opts: [['No issue', 0], ['Slightly jarring', 1], ['Very disruptive', 2], ['Triggering', 3]] },
    { id: 'screaming', q: 'How do you feel about screamed or shouted vocals?', opts: [['Enjoy them', 0], ['Tolerate them', 1], ['Avoid them', 2], ['Cannot handle them', 3]] },
    { id: 'bass', q: 'How do bass drops or heavy sub-bass affect you?', opts: [['Love them', 0], ['Neutral', 1], ['Uncomfortable', 2], ['Overwhelming', 3]] },
    { id: 'unpredictable', q: 'How do you feel about music you can\'t predict?', opts: [['Exciting', 0], ['Interesting', 1], ['Stressful', 2], ['Unbearable', 3]] },
    { id: 'mouth', q: 'Do mouth sounds in music bother you? (breathing, lip sounds)', opts: [['Not at all', 0], ['Slightly', 1], ['Significantly', 2], ['Intensely — this is a major trigger', 3]] },
    { id: 'texture', q: 'How do you react to harsh, distorted, or abrasive sounds?', opts: [['Enjoy the intensity', 0], ['Can tolerate briefly', 1], ['Avoid them', 2], ['Physical discomfort', 3]] },
    { id: 'environment', q: 'How sensitive are you to environmental noise? (offices, restaurants)', opts: [['Not very', 0], ['Somewhat', 1], ['Very — I often need quiet', 2], ['Extremely — I use earplugs or headphones daily', 3]] },
  ];

  let step = 0;
  const answers = {};

  function renderStep() {
    if (step >= questions.length) {
      // Calculate profile
      const scores = Object.values(answers);
      const total = scores.reduce((a, b) => a + b, 0);
      const max = questions.length * 3;
      const pct = total / max;

      const level = pct >= 0.6 ? 'high' : pct >= 0.3 ? 'medium' : 'low';
      const triggers = [];
      if (answers.cymbal >= 2) triggers.push('sudden percussion');
      if (answers.volume >= 2) triggers.push('volume changes');
      if (answers.screaming >= 2) triggers.push('screamed vocals');
      if (answers.bass >= 2) triggers.push('heavy bass');
      if (answers.unpredictable >= 2) triggers.push('unpredictability');
      if (answers.mouth >= 2) triggers.push('mouth sounds');
      if (answers.texture >= 2) triggers.push('harsh textures');
      if (answers.environment >= 2) triggers.push('environmental noise');

      const preferences = [];
      if (answers.screaming >= 2) preferences.push('instrumental');
      if (answers.texture >= 2) preferences.push('smooth texture');
      if (answers.unpredictable >= 1) preferences.push('high predictability');
      if (answers.volume >= 2) preferences.push('low dynamic range');

      const profile = { level, triggers, preferences, created: new Date().toISOString() };
      localStorage.setItem('miw_sensory_profile', JSON.stringify(profile));
      renderProfile();
      return;
    }

    const q = questions[step];
    app.innerHTML = `
      <div style="max-width:640px;margin:0 auto">
        <h1>My Sensory Profile</h1>
        <p style="color:var(--text-dim);font-size:0.85rem">Question ${step + 1} of ${questions.length}</p>
        <div style="background:var(--bg-hover);height:4px;border-radius:2px;margin-bottom:2rem">
          <div style="background:var(--accent);height:100%;border-radius:2px;width:${((step) / questions.length) * 100}%;transition:width 0.3s"></div>
        </div>
        <h2 style="font-size:1.2rem;margin-bottom:1.5rem">${q.q}</h2>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${q.opts.map(([label, val]) => `<button class="profile-opt finder-btn" data-val="${val}" style="text-align:left;padding:1rem;font-size:1rem">${label}</button>`).join('')}
        </div>
        ${step > 0 ? `<button id="profile-back" style="margin-top:1.5rem;background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.9rem">&larr; Previous</button>` : ''}
      </div>`;

    document.querySelectorAll('.profile-opt').forEach(b => b.addEventListener('click', () => {
      answers[q.id] = parseInt(b.dataset.val);
      step++;
      renderStep();
    }));
    document.getElementById('profile-back')?.addEventListener('click', () => { step--; renderStep(); });
  }

  renderStep();
}

// --- Song Checker: "Is This Song Safe?" ---
function renderChecker() {
  app.innerHTML = `
    <div style="max-width:640px;margin:0 auto">
      <h1>Is This Song Safe?</h1>
      <p style="color:var(--text-muted);margin-bottom:1.5rem">Enter any song and artist. We'll check our database or analyze it for sensory safety.</p>

      <div class="checker-form">
        <input type="text" id="check-title" class="filter-input" placeholder="Song title" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;font-size:1rem">
        <input type="text" id="check-artist" class="filter-input" placeholder="Artist name" style="width:100%;padding:0.75rem;margin-bottom:1rem;font-size:1rem">
        <button id="check-submit" class="cta-primary" style="width:100%;padding:0.75rem;font-size:1rem">Check This Song</button>
      </div>

      <div id="check-status" style="margin-top:1rem;text-align:center;display:none">
        <div class="make-spinner"></div>
        <p style="color:var(--text-muted);margin-top:0.5rem">Analyzing sensory profile...</p>
      </div>

      <div id="check-error" style="margin-top:1rem;color:var(--intense);display:none"></div>

      <div id="check-result" style="margin-top:1.5rem;display:none"></div>

      <div style="margin-top:2rem;padding:1.25rem;background:var(--bg-card);border-radius:var(--radius)">
        <h3 style="margin:0 0 0.5rem 0;font-size:0.95rem;color:var(--accent)">How it works</h3>
        <ul style="color:var(--text-muted);font-size:0.85rem;margin:0;padding-left:1.2rem">
          <li>We first search our curated library of ${document.getElementById('sidebar-stats')?.textContent?.match(/\\d+/)?.[0] || '1,600'}+ rated songs</li>
          <li>If the song isn't in our database, AI analyzes it across 5 sensory dimensions</li>
          <li>AI-analyzed songs are flagged &mdash; curated ratings are verified by humans</li>
        </ul>
      </div>
    </div>`;

  const btn = document.getElementById('check-submit');
  const titleInput = document.getElementById('check-title');
  const artistInput = document.getElementById('check-artist');

  btn.addEventListener('click', runCheck);
  artistInput.addEventListener('keydown', e => { if (e.key === 'Enter') runCheck(); });

  async function runCheck() {
    const title = titleInput.value.trim();
    const artist = artistInput.value.trim();
    if (!title || !artist) return;

    const status = document.getElementById('check-status');
    const error = document.getElementById('check-error');
    const result = document.getElementById('check-result');

    status.style.display = 'block';
    error.style.display = 'none';
    result.style.display = 'none';
    btn.disabled = true;

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist })
      });
      const data = await res.json();

      status.style.display = 'none';
      btn.disabled = false;

      if (data.error) {
        error.textContent = data.error;
        error.style.display = 'block';
        return;
      }

      if (!data.found) {
        error.textContent = 'Song not recognized. Try checking the spelling or a different song.';
        error.style.display = 'block';
        return;
      }

      const s = data.song;
      const sl = s.sensory_level === 'safe' ? 'badge-safe' : s.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';
      const slLabel = s.sensory_level === 'safe' ? 'Safe' : s.sensory_level === 'moderate' ? 'Moderate' : 'Intense';
      const sc = s.sudden_changes === 'none' ? 'badge-safe' : s.sudden_changes === 'mild' ? 'badge-moderate' : 'badge-intense';

      result.innerHTML = `
        <div class="sensory-card" style="margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <div>
              <h2 style="margin:0;font-size:1.2rem">${s.title}</h2>
              <div style="color:var(--accent);font-size:0.95rem">${s.artist}</div>
              ${s.album ? `<div style="color:var(--text-dim);font-size:0.8rem">${s.album}${s.year ? ' (' + s.year + ')' : ''}</div>` : ''}
            </div>
            <div>
              <span class="badge ${sl}" style="font-size:0.9rem;padding:0.3rem 0.8rem">${slLabel}</span>
              ${s.bpm ? `<span class="badge badge-neutral">${s.bpm} BPM</span>` : ''}
            </div>
          </div>
          ${data.generated ? `<div style="font-size:0.75rem;color:var(--text-dim);background:var(--bg);padding:0.3rem 0.6rem;border-radius:6px;margin-bottom:1rem;display:inline-block">AI-analyzed</div>` : ''}
          <h3 style="color:var(--accent);font-size:0.95rem;margin:0 0 0.75rem 0">Sensory Profile</h3>
          <div class="rating-row"><span class="rating-label">Dynamic Range</span><span class="rating-value">${s.dynamic_range}/10</span></div>
          <div class="rating-row"><span class="rating-label">Sudden Changes</span><span class="rating-value ${sc}">${s.sudden_changes}</span></div>
          <div class="rating-row"><span class="rating-label">Texture</span><span class="rating-value">${s.texture}</span></div>
          <div class="rating-row"><span class="rating-label">Predictability</span><span class="rating-value">${s.predictability}</span></div>
          <div class="rating-row"><span class="rating-label">Vocal Style</span><span class="rating-value">${s.vocal_style}</span></div>
          ${s.sensory_notes ? `<div class="sensory-notes"><strong>Notes:</strong> ${s.sensory_notes}</div>` : ''}
          ${s.description ? `<p style="color:var(--text);font-size:0.9rem;margin-top:1rem">${s.description}</p>` : ''}
        </div>
        ${s.slug ? `<a href="/song/${s.slug}" data-link style="color:var(--accent);font-size:0.9rem">View full song page &rarr;</a>` : ''}

        <div class="affiliate-section" style="margin-top:1.5rem">
          <span class="affiliate-disclosure">affiliate links</span>
          <h3>Listen with care</h3>
          <p style="font-size:0.85rem;color:var(--text-muted)">For sensory-sensitive listening, the right headphones matter.</p>
          <div class="affiliate-links">
            <a href="https://www.ebay.com/sch/i.html?_nkw=noise+cancelling+headphones&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Noise-Canceling Headphones</a>
            <a href="https://www.ebay.com/sch/i.html?_nkw=weighted+blanket&mkcid=1&mkrid=711-53200-19255-0&campid=5339144864&toolid=10001" class="affiliate-link" rel="noopener nofollow" target="_blank">Weighted Blankets</a>
          </div>
        </div>
      `;
      result.style.display = 'block';

    } catch (e) {
      status.style.display = 'none';
      btn.disabled = false;
      error.textContent = 'Something went wrong. Please try again.';
      error.style.display = 'block';
    }
  }
}

// --- Request an Artist ---
// --- The Wall: Global Story Feed ---
async function renderWall() {
  app.innerHTML = '<p>Loading stories...</p>';
  const stories = await api('/api/stories/recent/all');
  const artists = await api('/api/artists');

  const storyCards = stories.length > 0 ? stories.map(st => `
    <div style="padding:1.25rem;background:var(--bg-card);border-radius:var(--radius);border-left:3px solid var(--accent)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <a href="/song/${st.song_slug}" data-link style="color:var(--accent);text-decoration:none;font-weight:600">${st.song_title || st.song_slug}</a>
        <span style="color:var(--text-dim);font-size:0.75rem">${st.song_artist || ''}</span>
      </div>
      ${st.lyric ? `<p style="font-style:italic;color:var(--accent);font-size:0.85rem;margin:0 0 0.5rem 0">"${st.lyric}"</p>` : ''}
      <p style="color:var(--text);font-size:0.95rem;margin:0 0 0.5rem 0">${st.story}</p>
      <p style="color:var(--text-dim);font-size:0.75rem;margin:0"><strong>${st.name}</strong>${st.city ? ' — ' + st.city : ''}</p>
    </div>`).join('') : '<p style="color:var(--text-dim)">No stories yet. Be the first — click any song and share what it means to you.</p>';

  const artistLinks = artists.slice(0, 20).map(a => {
    const slug = a.artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `<a href="/artist/${slug}" data-link class="home-cat-btn">${a.artist} (${a.song_count})</a>`;
  }).join('');

  app.innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <h1>The Wall</h1>
      <p style="color:var(--text-muted);margin-bottom:1.5rem">Real people. Real songs. Real moments. This is what music means to the people who listen.</p>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem">
        <div>
          <div style="display:flex;flex-direction:column;gap:1rem">
            ${storyCards}
          </div>
        </div>
        <div>
          <h3 style="color:var(--accent);font-size:0.9rem;margin-bottom:0.75rem">Artists with stories</h3>
          <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.5rem">
            ${artistLinks}
          </div>
          <div style="padding:1.25rem;background:var(--bg-card);border-radius:var(--radius);text-align:center">
            <p style="color:var(--text);font-size:0.9rem;margin:0 0 0.75rem 0">Your song. Your story.</p>
            <p style="color:var(--text-dim);font-size:0.8rem;margin:0 0 0.75rem 0">Find a song that changed you. Tell us what it did.</p>
            <a href="/library" data-link class="cta-primary" style="font-size:0.85rem">Find a Song</a>
          </div>
        </div>
      </div>
    </div>`;
}

function renderRequestArtist() {
  app.innerHTML = `
    <div style="max-width:560px;margin:0 auto">
      <h1>Request an Artist</h1>
      <p style="color:var(--text-muted);margin-bottom:1.5rem">Tell us who you want to see on Music I Want. We'll decode their catalog — every song analyzed for intensity, texture, and emotional arc.</p>
      <div id="req-form" style="display:flex;flex-direction:column;gap:0.75rem">
        <input type="text" id="req-artist" placeholder="Artist or band name" maxlength="100" class="filter-input" style="padding:0.75rem;font-size:1rem" required>
        <input type="text" id="req-genre" placeholder="Genre (rock, pop, jazz, electronic...)" maxlength="50" class="filter-input" style="padding:0.6rem">
        <input type="text" id="req-song" placeholder="Their best song, in your opinion" maxlength="100" class="filter-input" style="padding:0.6rem">
        <textarea id="req-why" placeholder="What makes this artist special to you? (optional)" maxlength="500" rows="3" class="filter-input" style="padding:0.6rem;resize:vertical"></textarea>
        <input type="email" id="req-email" placeholder="Your email (optional — we'll notify you when they're live)" class="filter-input" style="padding:0.6rem">
        <button class="cta-primary" style="padding:0.75rem;font-size:1rem" id="req-submit">Request This Artist</button>
      </div>
    </div>`;
  document.getElementById('req-submit').addEventListener('click', async () => {
    const artist = document.getElementById('req-artist').value.trim();
    if (!artist) { showToast('Enter an artist name'); return; }
    const res = await fetch('/api/request-artist', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ artist_name: artist, genre: document.getElementById('req-genre').value.trim(), favorite_song: document.getElementById('req-song').value.trim(), why: document.getElementById('req-why').value.trim(), email: document.getElementById('req-email').value.trim() })
    });
    const d = await res.json();
    if (d.ok) document.getElementById('req-form').innerHTML = '<p style="color:var(--safe);font-size:1.1rem;text-align:center;padding:2rem 0">Request received. We\\'ll decode their catalog soon.</p>';
    else showToast(d.error || 'Something went wrong');
  });
}

// --- Shareable Card Generator (client-side Canvas) ---
function generateCard(opts) {
  // opts: { title, artist, subtitle, bodyText, stats, watermark, width, height }
  const w = opts.width || 1080;
  const h = opts.height || 1080;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0a10');
  grad.addColorStop(0.5, '#12121c');
  grad.addColorStop(1, '#0a0a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Accent line at top
  ctx.fillStyle = '#d4956a';
  ctx.fillRect(60, 60, 80, 4);

  // Title
  ctx.fillStyle = '#e8e4df';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(opts.title || '', 60, 130, w - 120);

  // Artist
  ctx.fillStyle = '#d4956a';
  ctx.font = '32px -apple-system, sans-serif';
  ctx.fillText(opts.artist || '', 60, 175, w - 120);

  // Subtitle
  if (opts.subtitle) {
    ctx.fillStyle = '#8a8580';
    ctx.font = '22px -apple-system, sans-serif';
    ctx.fillText(opts.subtitle, 60, 220, w - 120);
  }

  // Stats boxes
  if (opts.stats && opts.stats.length) {
    const boxW = (w - 120 - (opts.stats.length - 1) * 15) / opts.stats.length;
    opts.stats.forEach((stat, i) => {
      const x = 60 + i * (boxW + 15);
      const y = 270;
      ctx.fillStyle = '#15151f';
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, 100, 12);
      ctx.fill();
      ctx.fillStyle = stat.color || '#d4956a';
      ctx.font = 'bold 36px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stat.value, x + boxW/2, y + 48);
      ctx.fillStyle = '#5a5550';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText(stat.label, x + boxW/2, y + 78);
      ctx.textAlign = 'left';
    });
  }

  // Body text — word wrap
  if (opts.bodyText) {
    ctx.fillStyle = '#e8e4df';
    ctx.font = '24px Georgia, serif';
    const words = opts.bodyText.split(' ');
    let line = '';
    let y = opts.stats?.length ? 420 : 270;
    const maxW = w - 120;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), 60, y);
        line = word + ' ';
        y += 36;
        if (y > h - 120) break;
      } else { line = test; }
    }
    if (line && y <= h - 120) ctx.fillText(line.trim(), 60, y);
  }

  // Word cloud
  if (opts.wordCloud && opts.wordCloud.length) {
    const cloudY = opts.stats?.length ? (opts.bodyText ? 600 : 420) : 300;
    ctx.textAlign = 'center';
    const maxFont = 48, minFont = 16;
    const maxCount = opts.wordCloud[0]?.count || 1;
    let cx = w/2, cy = cloudY;
    const placed = [];
    for (const word of opts.wordCloud.slice(0, 30)) {
      const fontSize = minFont + (word.count / maxCount) * (maxFont - minFont);
      ctx.font = `bold ${Math.round(fontSize)}px -apple-system, sans-serif`;
      const colors = ['#d4956a', '#4a9e6f', '#c4a94d', '#b85c5c', '#e8e4df', '#8a8580'];
      ctx.fillStyle = colors[placed.length % colors.length];
      // Simple spiral placement
      let angle = placed.length * 0.7;
      let radius = placed.length * 12;
      let px = w/2 + Math.cos(angle) * radius;
      let py = cloudY + Math.sin(angle) * radius;
      if (px < 80) px = 80; if (px > w-80) px = w-80;
      if (py < cloudY - 150) py = cloudY - 150; if (py > cloudY + 200) py = cloudY + 200;
      ctx.fillText(word.text, px, py);
      placed.push({ x: px, y: py });
    }
    ctx.textAlign = 'left';
  }

  // Watermark
  ctx.fillStyle = '#3a3530';
  ctx.font = '18px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('musiciwant.com', w - 60, h - 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d4956a';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Music I Want', 60, h - 40);

  return c;
}

function downloadCard(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename || 'musiciwant-card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function showCardPreview(canvas, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.style.cssText = 'width:100%;border-radius:12px;margin-bottom:1rem';
  container.innerHTML = '';
  container.appendChild(img);
  const dl = document.createElement('button');
  dl.className = 'cta-primary';
  dl.textContent = 'Download Card';
  dl.style.marginRight = '0.5rem';
  dl.addEventListener('click', () => downloadCard(canvas, 'my-song-dna.png'));
  container.appendChild(dl);
  const shareBtn = document.createElement('a');
  shareBtn.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('My Song DNA on Music I Want →') + '&url=' + encodeURIComponent(window.location.href);
  shareBtn.target = '_blank';
  shareBtn.className = 'cta-primary';
  shareBtn.style.cssText = 'background:#1DA1F2;display:inline-block;text-decoration:none;margin-right:0.5rem';
  shareBtn.textContent = 'Share on X';
  container.appendChild(shareBtn);
}

// --- Song Battle ---
async function renderBattle() {
  app.innerHTML = '<p>Loading songs...</p>';
  const allSongs = await api('/api/songs?sort=dynamic_range_desc');
  if (allSongs.length < 10) { app.innerHTML = '<h1>Not enough songs for a battle yet!</h1>'; return; }

  let round = 0;
  const maxRounds = 10;
  const picks = [];
  let pool = [...allSongs].sort(() => Math.random() - 0.5);

  function showRound() {
    if (round >= maxRounds || pool.length < 2) { showResults(); return; }
    const a = pool.shift();
    const b = pool.shift();
    const slA = a.sensory_level === 'safe' ? 'badge-safe' : a.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';
    const slB = b.sensory_level === 'safe' ? 'badge-safe' : b.sensory_level === 'moderate' ? 'badge-moderate' : 'badge-intense';

    app.innerHTML = `
      <div style="max-width:760px;margin:0 auto;text-align:center">
        <h1>Song Battle</h1>
        <p style="color:var(--text-dim);font-size:0.85rem">Round ${round + 1} of ${maxRounds}</p>
        <div style="background:var(--bg-hover);height:4px;border-radius:2px;margin-bottom:2rem">
          <div style="background:var(--accent);height:100%;border-radius:2px;width:${(round / maxRounds) * 100}%;transition:width 0.3s"></div>
        </div>
        <h2 style="color:var(--text-muted);font-size:1rem;margin-bottom:1.5rem">Which one hits harder?</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <button class="battle-pick" data-pick="a" style="padding:2rem;background:var(--bg-card);border:2px solid var(--bg-hover);border-radius:var(--radius);cursor:pointer;text-align:center;color:var(--text);transition:border-color 0.15s">
            <div style="font-size:1.3rem;font-weight:700;margin-bottom:0.5rem">${a.title}</div>
            <div style="color:var(--accent);font-size:0.95rem;margin-bottom:0.5rem">${a.artist}</div>
            <span class="badge ${slA}">${a.sensory_level}</span>
            <span style="color:var(--text-dim);font-size:0.8rem;margin-left:0.5rem">DR ${a.dynamic_range}</span>
          </button>
          <button class="battle-pick" data-pick="b" style="padding:2rem;background:var(--bg-card);border:2px solid var(--bg-hover);border-radius:var(--radius);cursor:pointer;text-align:center;color:var(--text);transition:border-color 0.15s">
            <div style="font-size:1.3rem;font-weight:700;margin-bottom:0.5rem">${b.title}</div>
            <div style="color:var(--accent);font-size:0.95rem;margin-bottom:0.5rem">${b.artist}</div>
            <span class="badge ${slB}">${b.sensory_level}</span>
            <span style="color:var(--text-dim);font-size:0.8rem;margin-left:0.5rem">DR ${b.dynamic_range}</span>
          </button>
        </div>
      </div>`;
    document.querySelectorAll('.battle-pick').forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.borderColor = 'var(--accent)');
      btn.addEventListener('mouseleave', () => btn.style.borderColor = 'var(--bg-hover)');
      btn.addEventListener('click', () => {
        picks.push(btn.dataset.pick === 'a' ? a : b);
        round++;
        showRound();
      });
    });
  }

  function showResults() {
    const avgDR = (picks.reduce((s, p) => s + p.dynamic_range, 0) / picks.length).toFixed(1);
    const textures = {};
    const levels = {};
    picks.forEach(p => { textures[p.texture] = (textures[p.texture]||0)+1; levels[p.sensory_level] = (levels[p.sensory_level]||0)+1; });
    const topTexture = Object.entries(textures).sort((a,b) => b[1]-a[1])[0]?.[0] || '?';
    const topLevel = Object.entries(levels).sort((a,b) => b[1]-a[1])[0]?.[0] || '?';

    const personality = avgDR >= 7 ? "You chase intensity. The louder the crescendo, the more alive you feel."
      : avgDR >= 5 ? "You live in the tension between control and release. You want music that earns its moments."
      : "You're drawn to the quiet power. The songs that hold back hit you hardest.";

    app.innerHTML = `
      <div style="max-width:640px;margin:0 auto;text-align:center">
        <h1>Your Battle Results</h1>
        <p style="color:var(--text-muted);font-style:italic;font-size:1.1rem;margin-bottom:2rem">${personality}</p>
        <div style="display:flex;gap:1rem;justify-content:center;margin-bottom:2rem;flex-wrap:wrap">
          <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:2rem;font-weight:700;color:var(--accent)">${avgDR}</div>
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Avg Intensity</div>
          </div>
          <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:2rem;font-weight:700;color:var(--text)">${topTexture}</div>
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Preferred Texture</div>
          </div>
          <div style="padding:1rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:2rem;font-weight:700;color:var(--text)">${topLevel}</div>
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Drawn To</div>
          </div>
        </div>
        <h3 style="color:var(--accent);font-size:0.9rem;margin-bottom:0.75rem">Your picks</h3>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.5rem;text-align:left">
          ${picks.map(p => `<a href="/song/${p.slug}" data-link style="padding:0.6rem;background:var(--bg-card);border-radius:var(--radius-sm);text-decoration:none;color:var(--text)"><strong>${p.title}</strong> <span style="color:var(--text-muted)">— ${p.artist}</span></a>`).join('')}
        </div>
        <div id="battle-card-preview" style="margin-bottom:1rem"></div>
        <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
          <button class="cta-primary" id="battle-gen-card">Generate My Card</button>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('My music DNA: avg intensity ' + avgDR + ', drawn to ' + topTexture + ' texture. What are you? →')}&url=${encodeURIComponent('https://musiciwant.com/battle')}" target="_blank" class="cta-primary" style="background:#1DA1F2;text-decoration:none">Share on X</a>
          <button class="cta-secondary" onclick="location.reload()">Battle Again</button>
        </div>
      </div>`;
    document.getElementById('battle-gen-card')?.addEventListener('click', () => {
      const canvas = generateCard({
        title: 'My Song Battle',
        artist: 'musiciwant.com',
        subtitle: personality,
        stats: [
          { value: avgDR, label: 'AVG INTENSITY', color: '#d4956a' },
          { value: topTexture, label: 'TEXTURE', color: '#e8e4df' },
          { value: topLevel, label: 'DRAWN TO', color: topLevel === 'intense' ? '#b85c5c' : topLevel === 'moderate' ? '#c4a94d' : '#4a9e6f' }
        ],
        bodyText: 'My picks: ' + picks.map(p => p.title + ' — ' + p.artist).join(', ')
      });
      showCardPreview(canvas, 'battle-card-preview');
    });
  }

  showRound();
}

// --- 1-Song Challenge ---
async function renderOneSong() {
  app.innerHTML = `
    <div style="max-width:560px;margin:0 auto;text-align:center">
      <h1>The One Song Challenge</h1>
      <p style="color:var(--text-muted);font-size:1.1rem;margin-bottom:2rem">If you could only listen to one song for the rest of your life, what would it be?</p>
      <div style="margin-bottom:1.5rem">
        <input type="text" id="one-title" placeholder="Song title" class="filter-input" style="width:100%;padding:0.75rem;font-size:1rem;margin-bottom:0.75rem">
        <input type="text" id="one-artist" placeholder="Artist" class="filter-input" style="width:100%;padding:0.75rem;font-size:1rem;margin-bottom:0.75rem">
        <textarea id="one-why" placeholder="Why this song? One sentence." maxlength="200" rows="2" class="filter-input" style="width:100%;padding:0.75rem;font-size:1rem;resize:none"></textarea>
      </div>
      <button class="cta-primary" style="width:100%;padding:0.75rem;font-size:1rem" id="one-submit">This Is My Song</button>
      <div id="one-result" style="margin-top:1.5rem"></div>
    </div>`;

  document.getElementById('one-submit').addEventListener('click', async () => {
    const title = document.getElementById('one-title').value.trim();
    const artist = document.getElementById('one-artist').value.trim();
    const why = document.getElementById('one-why').value.trim();
    if (!title || !artist) { showToast('Enter a song and artist'); return; }

    // Check the song
    const res = await fetch('/api/check', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, artist }) });
    const d = await res.json();
    const song = d.song || { title, artist, dynamic_range: '?', texture: '?', sensory_level: '?' };

    // Generate card
    const canvas = generateCard({
      title: song.title || title,
      artist: song.artist || artist,
      subtitle: 'My one song. Forever.',
      stats: song.dynamic_range !== '?' ? [
        { value: song.dynamic_range + '/10', label: 'INTENSITY', color: '#d4956a' },
        { value: song.texture || '?', label: 'TEXTURE', color: '#e8e4df' },
        { value: song.sensory_level || '?', label: 'LEVEL', color: song.sensory_level === 'intense' ? '#b85c5c' : song.sensory_level === 'moderate' ? '#c4a94d' : '#4a9e6f' }
      ] : [],
      bodyText: why || ''
    });

    const result = document.getElementById('one-result');
    result.innerHTML = '';
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'width:100%;border-radius:12px;margin-bottom:1rem';
    result.appendChild(img);

    result.innerHTML += `
      <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
        <button class="cta-primary" id="one-dl">Download Card</button>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('My one song forever: ' + title + ' by ' + artist + (why ? '. ' + why : '') + ' →')}&url=${encodeURIComponent('https://musiciwant.com/one')}" target="_blank" class="cta-primary" style="background:#1DA1F2;text-decoration:none">Share on X</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://musiciwant.com/one')}" target="_blank" class="cta-primary" style="background:#4267B2;text-decoration:none">Facebook</a>
      </div>
      <p style="color:var(--text-dim);margin-top:1rem;font-size:0.85rem">Challenge your friends: what's THEIR one song?</p>`;
    document.getElementById('one-dl')?.addEventListener('click', () => downloadCard(canvas, 'my-one-song.png'));
  });
}

// --- Card button binding ---
function bindCardButtons() {
  document.querySelectorAll('.add-to-pl-btn').forEach(b => b.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();
    const song = await api('/api/songs/' + b.dataset.slug);
    showPlaylistModal(song);
  }));
}

// --- Sidebar interactions ---
// Sensory quick filter
document.querySelectorAll('.sensory-quick-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.sensory-quick-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentSensoryFilter = b.dataset.level;
    if (location.pathname === '/library') loadLibrary();
    else navigate('/library');
  });
});

// Global search
document.getElementById('global-search')?.addEventListener('input', debounce(() => {
  if (location.pathname === '/library') loadLibrary();
  else navigate('/library');
}, 400));

// Mobile toggle
document.getElementById('mobile-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Init
route();

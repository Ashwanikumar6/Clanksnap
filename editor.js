// Editor: pick a finished clip, change captions / framing / audio / effects, fix the transcript, trim, preview in 9:16, then export.
// It only uses the existing endpoints: GET /library, GET /clips/<id>/edit, POST /clips/reedit, GET /status/<job>. Nothing is re-downloaded.
(function () {
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STYLES = ['karaoke', 'tiktok', 'pill', 'oneword', 'cine', 'boxed', 'outlined', 'comic', 'gta', 'bold', 'hormozi', 'mrbeast', 'clean'];
  const STYLE_NAMES = { gta: 'GTA Neon', bold: 'Impact', mrbeast: 'MrBeast', oneword: 'One word', cine: 'Cinematic' };
  const LAYOUTS = [['stack', 'Face + gameplay'], ['bottom', 'Gameplay + face'], ['blur', 'Blurred fill'], ['fill', 'Fill screen'], ['game', 'Gameplay only'], ['pip_tl', 'Camera top-left'],
    ['pip_tr', 'Camera top-right'], ['pip_bl', 'Camera bottom-left'], ['pip_br', 'Camera bottom-right'], ['circle', 'Circle camera'], ['side', 'Side by side']];
  const ASPECTS = [['vertical', '9:16 Shorts / Reels'], ['square', '1:1 Square'], ['portrait', '4:5 Feed'], ['threefour', '3:4 Portrait'], ['landscape', '16:9 YouTube']];
  const HOOKS = [['impact', 'Impact'], ['neon', 'Neon glow'], ['banner', 'Banner bar'], ['box', 'Classic box']];
  const FONTS = ['Arial', 'Arial Black', 'Impact', 'Verdana', 'Georgia', 'Nirmala UI', 'DejaVu Sans', 'Liberation Sans'];
  const PRESETS = [['shorts', 'YouTube Shorts'], ['tiktok', 'TikTok'], ['reels', 'Instagram Reels']];
  const PRESET_MAX = { shorts: 180, tiktok: 600, reels: 90 };
  const presetOn = k => st && st.aspect === 'vertical' && st.resolution === 1080 && st.fps === 30 && st.preset === k;
  const presetNote = () => { const n = st && st.preset; if (!n) return '9:16 · 1080p · 30 fps · H.264. Pick where you will post.'; const len = length(); return PRESETS.find(p => p[0] === n)[1] + ': 9:16 · 1080p · 30 fps. ' + (len > PRESET_MAX[n] ? '⚠ This clip is ' + Math.round(len) + ' s; ' + PRESETS.find(p => p[0] === n)[1] + ' allows ' + PRESET_MAX[n] + ' s.' : 'Length is fine (' + Math.round(len) + ' s of ' + PRESET_MAX[n] + ' s).'); };
  const CAM = [['cam_brightness', 'Brightness', -0.3, 0.3, 0.02, 0], ['cam_contrast', 'Contrast', 0.5, 2, 0.05, 1], ['cam_saturation', 'Colour', 0, 2, 0.05, 1], ['cam_clarity', 'Clarity', 0, 1.5, 0.05, 0]];

  async function req(path, body) {
    const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : 'Request failed');
    return j;
  }

  // ---- state: everything that can change lives in one object so undo/redo is a snapshot
  let sortBest = false, clips = [], file = '', info = null, st = null, original = null, undo = [], redo = [], tab = 'captions';
  const snap = () => JSON.stringify(st);
  function commit(change) {
    undo.push(snap()); if (undo.length > 80) undo.shift(); redo = [];
    change(); afterChange();
  }
  function afterChange() {
    drawControls(); drawTranscript(); drawTimeline(); updateButtons(); draftSave();
  }
  function jump(stack, other) {
    if (!stack.length) return;
    other.push(snap()); st = JSON.parse(stack.pop()); afterChange();
  }
  const dirty = () => original !== null && snap() !== original;
  const draftKey = () => 'neon-editor-draft-' + file;
  function draftSave() { try { if (dirty()) localStorage.setItem(draftKey(), snap()); else localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } }

  function build() {
    const sec = document.createElement('section');
    sec.id = 'clip-editor-view';
    sec.hidden = true;
    sec.innerHTML = '<section class="library-heading"><h2>Editor, <em>polish every clip.</em></h2><span class="ed-note" id="ed-note" role="status"></span></section>' +
      '<div class="ed-grid"><aside class="ed-list panel"><div class="ed-sort"><button type="button" class="mini-btn" id="ed-sort">Sort: newest</button></div><div id="ed-list"></div></aside>' +
      '<div class="ed-center panel"><div class="ed-stage" id="ed-stage"><video id="ed-video" controls playsinline></video><div class="ed-safe" id="ed-safe" hidden></div><div class="ed-cap" id="ed-cap"></div></div>' +
      '<div class="ed-bar"><button class="mini-btn" id="ed-undo" disabled>↶ Undo</button><button class="mini-btn" id="ed-redo" disabled>↷ Redo</button>' +
      '<label class="ed-chk"><input type="checkbox" id="ed-safe-on"> Safe area</label><select id="ed-speed" aria-label="Preview speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button class="mini-btn" id="ed-reset" disabled>Reset</button></div>' +
      '<div class="ed-time" id="ed-time"></div></div>' +
      '<div class="ed-side panel"><div class="ed-tabs" id="ed-tabs"></div><div class="ed-pane" id="ed-pane"></div>' +
      '<div class="ed-export"><label class="ed-chk"><input type="radio" name="ed-scope" value="one" checked> Only this clip</label>' +
      '<label class="ed-chk"><input type="radio" name="ed-scope" value="video"> All clips of this video <small id="ed-count"></small></label>' +
      '<button class="mini-btn primary" id="ed-export" disabled>Export changes</button></div></div></div>' +
      '<div class="panel ed-words"><h3>Transcript — click a word to jump, edit the text, remove a word with ✕</h3><div id="ed-words" class="ed-wordlist"></div></div>';
    const lib = $('library-view');
    lib.after(sec);
    $('ed-tabs').innerHTML = [['captions', 'Captions'], ['framing', 'Framing'], ['audio', 'Audio'], ['effects', 'Effects']].map(([k, n]) => '<button type="button" data-tab="' + k + '">' + n + '</button>').join('');
    $('ed-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; drawControls(); } };
    $('ed-sort').onclick = () => { sortBest = !sortBest; $('ed-sort').textContent = 'Sort: ' + (sortBest ? 'best first' : 'newest'); loadList(); };
    $('ed-undo').onclick = () => jump(undo, redo);
    $('ed-redo').onclick = () => jump(redo, undo);
    $('ed-reset').onclick = () => commit(() => { st = JSON.parse(original); });
    $('ed-speed').onchange = e => { $('ed-video').playbackRate = Number(e.target.value); };
    $('ed-safe-on').onchange = e => { $('ed-safe').hidden = !e.target.checked; };
    $('ed-export').onclick = exportNow;
    $('ed-video').addEventListener('timeupdate', tick);
    $('ed-list').onclick = e => { const c = e.target.closest('[data-clip]'); if (c) openClip(c.dataset.clip); };
    document.addEventListener('keydown', e => {
      if (sec.hidden || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); jump(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); jump(redo, undo); }
      if (e.key === ' ') { e.preventDefault(); const v = $('ed-video'); v.paused ? v.play() : v.pause(); }
    });
  }

  // ---- pieces: the clip is an ordered list of ranges of the ORIGINAL video; words are stored with original-video times
  const plen = ps => ps.reduce((n, p) => n + (p.end - p.start), 0);
  const length = () => plen(st.pieces);
  function rel(ps) {
    const out = []; let off = 0;
    ps.forEach(p => {
      st.words.forEach((w, i) => {
        if (w.b > p.start && w.a < p.end) out.push({ i, start: off + Math.max(w.a, p.start) - p.start, end: off + Math.min(w.b, p.end) - p.start, text: w.text });
      });
      off += p.end - p.start;
    });
    return out;
  }
  function absAt(t) {
    let off = 0;
    const ps = JSON.parse(original).pieces;
    for (const p of ps) { const l = p.end - p.start; if (t < off + l) return p.start + (t - off); off += l; }
    return ps[ps.length - 1].end;
  }
  const note = t => { const n = $('ed-note'); if (n) n.textContent = t || ''; };

  async function loadList() {
    try {
      const lib = await req('/library');
      clips = (Array.isArray(lib) ? lib : lib.clips || lib.items || []).slice().sort((a, b) => sortBest ? ((b.meta && b.meta.score) || 0) - ((a.meta && a.meta.score) || 0) : (b.created || 0) - (a.created || 0));
    } catch (e) { clips = []; }
    $('ed-list').innerHTML = clips.length ? clips.map(c => '<button type="button" class="ed-clip' + (c.id === file ? ' on' : '') + '" data-clip="' + c.id + '"><img loading="lazy" src="/cover/' + c.id + '" alt=""><span>' + esc(String(c.title).slice(0, 44)) + '</span></button>').join('') : '<p class="muted">No clips yet. Make some first.</p>';
  }

  async function openClip(id) {
    if (dirty() && !confirm('Leave this clip? Your unsaved changes stay as a draft and come back when you reopen it.')) return;
    note('Loading…');
    try {
      info = await req('/clips/' + id + '/edit');
    } catch (e) { note(e.message); return; }
    file = info.file;
    const s = info.settings || {};
    st = {
      caption_style: s.caption_style || 'karaoke', captions: s.captions !== false, caption_y: s.caption_y || 1450, layout: s.layout || 'stack', aspect: s.aspect || 'vertical',
      resolution: Number(s.resolution || 1080), fps: Number(s.fps || 30), voice_volume: s.voice_volume == null ? 1 : Number(s.voice_volume), caption_font: s.caption_font || '', caption_size: s.caption_size || '', caption_color: s.caption_color || '', caption_active: s.caption_active || '', caption_outline: s.caption_outline || '', caption_max_words: s.caption_max_words || '', hook: s.hook || '', hook_enabled: s.hook_enabled !== false, hook_style: s.hook_style || 'impact', fade_inout: !!s.fade_inout,
      music_volume: s.music_volume == null ? 0.15 : s.music_volume,
      pieces: [], words: [],
    };
    const base = info.origin || info.source;
    st.pieces = (s.segments && s.segments.length ? s.segments : [{ start: Number(s.start || 0), end: Number(s.end || 0) }]).map(p => ({ start: Number(p.start), end: Number(p.end) }));
    const seen = new Set();
    (s.words || []).forEach(w => {
      let off = 0;
      for (const p of st.pieces) {
        const l = p.end - p.start;
        if (w.start < off + l) {
          const a = p.start + (w.start - off), b = p.start + (Math.min(w.end, off + l) - off), k = a.toFixed(2) + w.text;
          if (!seen.has(k)) { seen.add(k); st.words.push({ a, b, text: w.text }); }
          break;
        }
        off += l;
      }
    });
    st.base = base.duration || plen(st.pieces);
    CAM.forEach(([k, , , , , d]) => { st[k] = s[k] == null ? d : s[k]; });
    original = snap(); undo = []; redo = [];
    try { const d = localStorage.getItem(draftKey()); if (d) { const dd = JSON.parse(d); if (dd && Array.isArray(dd.pieces) && Array.isArray(dd.words) && confirm('Restore your unsaved changes for this clip?')) { st = dd; undo = []; } else if (!dd || !Array.isArray(dd.pieces)) localStorage.removeItem(draftKey()); } } catch (e) { /* ignore */ }
    const v = $('ed-video');
    v.src = '/media/' + file;
    $('ed-count').textContent = info.video_clips > 1 ? '(' + info.video_clips + ')' : '';
    note('');
    loadList();
    afterChange();
  }

  function tick() {
    if (!st) return;
    const t = $('ed-video').currentTime;
    const cap = $('ed-cap');
    if (!st.captions) { cap.textContent = ''; return; }
    const rw = rel(JSON.parse(original).pieces);
    const idx = rw.findIndex(w => t >= w.start && t < w.end);
    if (idx < 0) { cap.textContent = ''; return; }
    const from = Math.max(0, idx - (idx % 4));
    cap.innerHTML = rw.slice(from, from + 4).map((w, i) => '<span class="' + (from + i === idx ? 'now' : '') + '">' + esc(w.text) + '</span>').join(' ');
    cap.style.top = Math.min(92, Math.max(20, 100 * (st.caption_y || 1450) / 1920)) + '%';
    document.querySelectorAll('#ed-words .w').forEach((n, i) => n.classList.toggle('now', i === idx));
  }

  // ---- controls per tab
  function drawControls() {
    if (!st) { $('ed-pane').innerHTML = '<p class="muted">Pick a clip on the left.</p>'; return; }
    document.querySelectorAll('#ed-tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const pane = $('ed-pane');
    const range = (key, label, min, max, step, fmt) => '<label class="ed-range">' + label + ' <b>' + (fmt ? fmt(st[key]) : st[key]) + '</b><input type="range" data-key="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + st[key] + '"></label>';
    if (tab === 'captions') {
      pane.innerHTML = '<label class="ed-chk"><input type="checkbox" data-key="captions"' + (st.captions ? ' checked' : '') + '> Burn in captions</label>' +
        '<div class="ed-tiles">' + STYLES.map(k => '<button type="button" class="ed-tile' + (st.caption_style === k ? ' on' : '') + '" data-style="' + k + '">' + (STYLE_NAMES[k] || k[0].toUpperCase() + k.slice(1)) + '</button>').join('') + '</div>' +
        range('caption_y', 'Caption height', 900, 1700, 10, v => Math.round(100 * v / 1920) + '%') +
        '<label>Font<select data-key="caption_font"><option value="">Style default</option>' + FONTS.map(f => '<option' + (st.caption_font === f ? ' selected' : '') + '>' + f + '</option>').join('') + '</select></label>' +
        '<label>Size <b>' + (st.caption_size || 'default') + '</b><input type="range" data-key="caption_size" min="24" max="140" step="2" value="' + (st.caption_size || 58) + '"></label>' +
        '<div class="ed-colors">' + [['caption_color', 'Text'], ['caption_active', 'Active word'], ['caption_outline', 'Outline']].map(([k, n]) => '<label>' + n + '<input type="color" data-key="' + k + '" value="' + (st[k] || '#FFFFFF') + '"></label>').join('') + '<button type="button" class="mini-btn" id="ed-colors-reset">Default colours</button></div>' +
        '<label>Words per line <b>' + (st.caption_max_words || 'default') + '</b><input type="range" data-key="caption_max_words" min="1" max="8" step="1" value="' + (st.caption_max_words || 4) + '"></label>' +
        '<label>Opening heading<input type="text" data-key="hook" maxlength="65" value="' + esc(st.hook) + '" placeholder="Opening line"></label>';
    } else if (tab === 'framing') {
      pane.innerHTML = '<label>Shape<select data-key="aspect">' + ASPECTS.map(([k, n]) => '<option value="' + k + '"' + (st.aspect === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
        '<h4>Export preset</h4><div class="ed-tiles">' + PRESETS.map(([k, n]) => '<button type="button" class="ed-tile' + (presetOn(k) ? ' on' : '') + '" data-preset="' + k + '">' + n + '</button>').join('') + '</div><p class="muted" id="ed-preset-note">' + presetNote() + '</p>' +
        '<div class="ed-tiles">' + LAYOUTS.map(([k, n]) => '<button type="button" class="ed-tile' + (st.layout === k ? ' on' : '') + '" data-layout="' + k + '">' + n + '</button>').join('') + '</div>' +
        '<p class="muted">The camera and gameplay boxes keep what Create clips found. Draw new ones there if the crop is off.</p>';
    } else if (tab === 'audio') {
      pane.innerHTML = '<label class="ed-chk"><input type="checkbox" id="ed-mute"' + (st.voice_volume === 0 ? ' checked' : '') + '> Mute the clip</label>' + range('voice_volume', 'Volume', 0, 2, 0.05, v => Math.round(v * 100) + '%') + range('music_volume', 'Music volume (only if the clip has music)', 0, 1, 0.05, v => Math.round(v * 100) + '%') +
        '<label class="ed-chk"><input type="checkbox" data-key="fade_inout"' + (st.fade_inout ? ' checked' : '') + '> Fade in and out</label>';
    } else {
      pane.innerHTML = '<label class="ed-chk"><input type="checkbox" data-key="hook_enabled"' + (st.hook_enabled ? ' checked' : '') + '> Show the opening heading</label>' +
        '<label>Heading look<select data-key="hook_style">' + HOOKS.map(([k, n]) => '<option value="' + k + '"' + (st.hook_style === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
        '<h4>Camera look</h4>' + CAM.map(([k, n, a, b, s]) => range(k, n, a, b, s, v => Number(v).toFixed(2))).join('');
    }
  }
  function onControl(e) {
    const t = e.target, key = t.dataset && t.dataset.key;
    if (!key || !st) return;
    const value = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
    if (st[key] === value) return;
    if (t.type === 'range' && e.type === 'input') { st[key] = value; const b = t.parentElement.querySelector('b'); if (b) b.textContent = t.dataset.key === 'caption_y' ? Math.round(100 * value / 1920) + '%' : value; tick(); return; }
    if (t.type === 'range' && e.type === 'change') { const old = st[key]; st[key] = old; }
    commit(() => { st[key] = value; });
  }

  document.addEventListener('click', e => {
    const s = e.target.closest('#ed-pane [data-style]'); if (s && st) commit(() => { st.caption_style = s.dataset.style; });
    if (e.target.id === 'ed-colors-reset' && st) commit(() => { st.caption_color = st.caption_active = st.caption_outline = ''; });
    if (e.target.id === 'ed-mute' && st) commit(() => { st.voice_volume = e.target.checked ? 0 : 1; });
    const pr = e.target.closest('#ed-pane [data-preset]'); if (pr && st) commit(() => { st.aspect = 'vertical'; st.resolution = 1080; st.fps = 30; st.preset = pr.dataset.preset; });
    const l = e.target.closest('#ed-pane [data-layout]'); if (l && st) commit(() => { st.layout = l.dataset.layout; });
  });

  // ---- transcript
  function drawTranscript() {
    const box = $('ed-words');
    if (!st) { box.innerHTML = ''; return; }
    const rw = rel(st.pieces);
    box.innerHTML = rw.length ? rw.map(w => '<span class="w" data-i="' + w.i + '"><button type="button" class="seek" data-seek="' + w.start.toFixed(2) + '" title="Jump here">▸</button>' +
      '<small class="tm">' + w.start.toFixed(1) + '</small><input value="' + esc(w.text) + '" data-word="' + w.i + '" size="' + Math.max(2, w.text.length) + '" aria-label="Word"><button type="button" class="del" data-del="' + w.i + '" title="Remove this word">✕</button></span>').join('') : '<p class="muted">This clip has no saved transcript.</p>';
  }
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-seek]'); if (k && st) { $('ed-video').currentTime = Number(k.dataset.seek); return; }
    const d = e.target.closest('[data-del]'); if (d && st) commit(() => { st.words.splice(Number(d.dataset.del), 1); });
  });
  document.addEventListener('change', e => {
    if (e.target.matches && e.target.matches('#ed-words [data-word]') && st) {
      const i = Number(e.target.dataset.word), text = e.target.value.trim();
      if (!text) { commit(() => { st.words.splice(i, 1); }); return; }
      if (text !== st.words[i].text) commit(() => { st.words[i].text = text; });
    } else if (e.target.closest && e.target.closest('#ed-pane')) onControl(e);
  });
  document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#ed-pane') && e.target.type === 'range') onControl(e); });

  // ---- timeline: the clip inside the saved video; the two handles trim it
  function drawTimeline() {
    const box = $('ed-time');
    if (!st || !info) { box.innerHTML = ''; return; }
    const total = Math.max(st.base, ...st.pieces.map(p => p.end)), pct = v => (100 * v / total).toFixed(2) + '%';
    box.innerHTML = '<div class="ed-track">' + st.pieces.map((p, i) => '<i class="ed-sel" title="Piece ' + (i + 1) + '" style="left:' + pct(p.start) + ';width:' + pct(p.end - p.start) + '"></i>').join('') + '</div>' +
      '<div class="ed-bar"><button type="button" class="mini-btn" id="ed-split">✂ Split at playhead</button><span class="muted">Total ' + length().toFixed(1) + ' s · ' + st.pieces.length + ' piece' + (st.pieces.length > 1 ? 's' : '') + ' · the preview shows the last export until you export</span></div>' +
      st.pieces.map((p, i) => '<div class="ed-piece"><b>' + (i + 1) + '</b>' +
        '<label>from <input type="number" step="0.1" min="0" max="' + total.toFixed(1) + '" data-piece="' + i + '" data-edge="start" value="' + p.start.toFixed(1) + '"></label>' +
        '<label>to <input type="number" step="0.1" min="0" max="' + total.toFixed(1) + '" data-piece="' + i + '" data-edge="end" value="' + p.end.toFixed(1) + '"></label>' +
        '<button type="button" class="mini-btn" data-pa="up" data-i="' + i + '" title="Move earlier"' + (i ? '' : ' disabled') + '>↑</button>' +
        '<button type="button" class="mini-btn" data-pa="down" data-i="' + i + '" title="Move later"' + (i < st.pieces.length - 1 ? '' : ' disabled') + '>↓</button>' +
        '<button type="button" class="mini-btn" data-pa="dup" data-i="' + i + '" title="Duplicate this piece">⧉</button>' +
        '<button type="button" class="mini-btn warn" data-pa="drop" data-i="' + i + '" title="Remove this piece"' + (st.pieces.length > 1 ? '' : ' disabled') + '>✕</button></div>').join('');
  }
  function fits(ps) {
    const t = plen(ps);
    if (ps.some(p => !(p.end - p.start >= 0.2) || p.start < 0 || p.end > st.base + 0.05)) { note('Each piece must be at least 0.2 s and inside the saved video (' + st.base.toFixed(0) + ' s).'); return false; }
    if (t < 3 || t > 180) { note('The clip must be 3 to 180 seconds in total (now ' + t.toFixed(1) + ' s).'); return false; }
    if (ps.length > 16) { note('At most 16 pieces.'); return false; }
    note(''); return true;
  }
  document.addEventListener('click', e => {
    if (!st) return;
    if (e.target.id === 'ed-split') {
      const t = absAt($('ed-video').currentTime);
      const i = st.pieces.findIndex(p => t > p.start + 0.1 && t < p.end - 0.1);
      if (i < 0) { note('Move the playhead inside the clip first (not at a piece edge).'); return; }
      commit(() => { const p = st.pieces[i]; st.pieces.splice(i, 1, { start: p.start, end: t }, { start: t, end: p.end }); });
      return;
    }
    const b = e.target.closest('[data-pa]'); if (!b) return;
    const i = Number(b.dataset.i), act = b.dataset.pa, next = st.pieces.map(p => ({ ...p }));
    if (act === 'up' && i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
    else if (act === 'down' && i < next.length - 1) [next[i + 1], next[i]] = [next[i], next[i + 1]];
    else if (act === 'dup') next.splice(i + 1, 0, { ...next[i] });
    else if (act === 'drop') next.splice(i, 1);
    else return;
    if (fits(next)) commit(() => { st.pieces = next; });
  });
  document.addEventListener('change', e => {
    const t = e.target.closest && e.target.closest('[data-piece]'); if (!t || !st) return;
    const next = st.pieces.map(p => ({ ...p })); next[Number(t.dataset.piece)][t.dataset.edge] = Math.max(0, Number(t.value) || 0);
    if (fits(next)) commit(() => { st.pieces = next; }); else drawTimeline();
  });

  function updateButtons() {
    $('ed-undo').disabled = !undo.length; $('ed-redo').disabled = !redo.length;
    $('ed-reset').disabled = !dirty(); $('ed-export').disabled = !dirty();
    $('ed-export').textContent = dirty() ? 'Export changes' : 'No changes yet';
  }

  async function exportNow() {
    if (!st || !dirty()) return;
    const scope = (document.querySelector('input[name=ed-scope]:checked') || {}).value || 'one';
    const changes = {};
    ['caption_style', 'captions', 'caption_y', 'voice_volume', 'caption_font', 'caption_size', 'caption_color', 'caption_active', 'caption_outline', 'caption_max_words', 'resolution', 'fps', 'layout', 'aspect', 'hook', 'hook_enabled', 'hook_style', 'fade_inout', 'music_volume'].concat(CAM.map(c => c[0])).forEach(k => { changes[k] = st[k]; });
    const body = { file, scope, changes };
    const o = JSON.parse(original);
    const cut = JSON.stringify(o.pieces) !== JSON.stringify(st.pieces);
    const asWords = ps => rel(ps).map(w => ({ start: Number(w.start.toFixed(3)), end: Number(w.end.toFixed(3)), text: w.text }));
    const wordsChanged = cut || JSON.stringify(o.words) !== JSON.stringify(st.words);
    if (wordsChanged) {
      if (scope === 'video') { note('Transcript edits and cutting work on one clip at a time. Pick "Only this clip".'); return; }
      body.words = asWords(st.pieces);
      if (cut) body.segments = st.pieces;
    }
    $('ed-export').disabled = true;
    try {
      const { job, clips: n } = await req('/clips/reedit', body);
      for (;;) {
        note('Exporting ' + n + ' clip(s)…');
        await new Promise(r => setTimeout(r, 1500));
        const r = await req('/status/' + job);
        if (r.status === 'error') throw new Error(r.error || 'Export failed');
        if (r.status === 'done') {
          try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ }
          const first = (r.clips || []).find(c => c.previous === file) || (r.clips || [])[0];
          note('Done. The new version replaced the old one.');
          if (typeof refreshLibrary === 'function') refreshLibrary().catch(() => {});
          original = null;
          await openClip(first ? first.file || first.id || file : file);
          return;
        }
      }
    } catch (e) { note(e.message); updateButtons(); }
  }

  async function show() {
    if (!$('clip-editor-view')) return;
    await loadList();
    if (!file && clips.length) openClip(clips[0].id);
  }

  function init() {
    if ($('clip-editor-view')) return;
    const nav = document.querySelector('[data-view=library]');
    if (!nav) return;
    build();
    const btn = document.createElement('button');
    btn.className = 'nav'; btn.type = 'button'; btn.id = 'nav-clip-editor';
    btn.innerHTML = '✎ &nbsp; Editor';
    nav.after(btn);
    const views = ['editor-view', 'library-view', 'clip-editor-view'];
    btn.onclick = () => {
      document.querySelectorAll('.nav').forEach(x => x.classList.toggle('active', x === btn));
      views.forEach(v => { const el = $(v); if (el) el.hidden = v !== 'clip-editor-view'; });
      show();
    };
    // the old navigation must also hide the editor
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { $('clip-editor-view').hidden = true; btn.classList.remove('active'); }));
    window.openInEditor = id => { btn.click(); setTimeout(() => openClip(id), 50); };
  }
  if (document.readyState === 'complete') setTimeout(init, 500);
  else window.addEventListener('load', () => setTimeout(init, 500));
})();

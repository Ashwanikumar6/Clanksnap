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
      hook: s.hook || '', hook_enabled: s.hook_enabled !== false, hook_style: s.hook_style || 'impact', fade_inout: !!s.fade_inout,
      music_volume: s.music_volume == null ? 0.15 : s.music_volume, start: Number(s.start || 0), end: Number(s.end || 0),
      words: (s.words || []).map(w => ({ start: w.start, end: w.end, text: w.text })),
    };
    CAM.forEach(([k, , , , , d]) => { st[k] = s[k] == null ? d : s[k]; });
    original = snap(); undo = []; redo = [];
    try { const d = localStorage.getItem(draftKey()); if (d && confirm('Restore your unsaved changes for this clip?')) { st = JSON.parse(d); undo = []; } } catch (e) { /* ignore */ }
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
    const idx = st.words.findIndex(w => t >= w.start && t < w.end);
    if (idx < 0) { cap.textContent = ''; return; }
    const from = Math.max(0, idx - (idx % 4));
    cap.innerHTML = st.words.slice(from, from + 4).map((w, i) => '<span class="' + (from + i === idx ? 'now' : '') + '">' + esc(w.text) + '</span>').join(' ');
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
        '<label>Opening heading<input type="text" data-key="hook" maxlength="65" value="' + esc(st.hook) + '" placeholder="Opening line"></label>';
    } else if (tab === 'framing') {
      pane.innerHTML = '<label>Shape<select data-key="aspect">' + ASPECTS.map(([k, n]) => '<option value="' + k + '"' + (st.aspect === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
        '<div class="ed-tiles">' + LAYOUTS.map(([k, n]) => '<button type="button" class="ed-tile' + (st.layout === k ? ' on' : '') + '" data-layout="' + k + '">' + n + '</button>').join('') + '</div>' +
        '<p class="muted">The camera and gameplay boxes keep what Create clips found. Draw new ones there if the crop is off.</p>';
    } else if (tab === 'audio') {
      pane.innerHTML = range('music_volume', 'Music volume (only if the clip has music)', 0, 1, 0.05, v => Math.round(v * 100) + '%') +
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
    const l = e.target.closest('#ed-pane [data-layout]'); if (l && st) commit(() => { st.layout = l.dataset.layout; });
  });

  // ---- transcript
  function drawTranscript() {
    const box = $('ed-words');
    if (!st) { box.innerHTML = ''; return; }
    box.innerHTML = st.words.length ? st.words.map((w, i) => '<span class="w" data-i="' + i + '"><button type="button" class="seek" data-seek="' + i + '" title="Jump here">▸</button>' +
      '<small class="tm">' + w.start.toFixed(1) + '</small><input value="' + esc(w.text) + '" data-word="' + i + '" size="' + Math.max(2, w.text.length) + '" aria-label="Word ' + (i + 1) + '"><button type="button" class="del" data-del="' + i + '" title="Remove this word">✕</button></span>').join('') : '<p class="muted">This clip has no saved transcript.</p>';
  }
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-seek]'); if (k && st) { $('ed-video').currentTime = st.words[Number(k.dataset.seek)].start; return; }
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
    const total = Math.max(info.source.duration || st.end, st.end), len = st.end - st.start;
    const pct = v => (100 * v / total).toFixed(2) + '%';
    box.innerHTML = '<div class="ed-track"><i class="ed-sel" style="left:' + pct(st.start) + ';width:' + (100 * len / total).toFixed(2) + '%"></i></div>' +
      '<div class="ed-trim"><label>Start <input type="number" step="0.1" min="0" max="' + total.toFixed(1) + '" data-trim="start" value="' + st.start.toFixed(1) + '"> s</label>' +
      '<label>End <input type="number" step="0.1" min="0" max="' + total.toFixed(1) + '" data-trim="end" value="' + st.end.toFixed(1) + '"> s</label><span class="muted">Length ' + len.toFixed(1) + ' s of ' + total.toFixed(0) + ' s</span></div>';
  }
  document.addEventListener('change', e => {
    const t = e.target.closest && e.target.closest('[data-trim]'); if (!t || !st) return;
    const v = Math.max(0, Number(t.value) || 0), which = t.dataset.trim;
    const ns = which === 'start' ? v : st.start, ne = which === 'end' ? v : st.end;
    if (ne - ns < 3 || ne - ns > 180) { note('A clip must be 3 to 180 seconds long.'); drawTimeline(); return; }
    if (info.source.duration && ne > info.source.duration + .05) { note('The saved video is only ' + info.source.duration.toFixed(0) + ' s long.'); drawTimeline(); return; }
    note('');
    commit(() => {
      const shift = ns - st.start, length = ne - ns;
      st.words = st.words.map(w => ({ start: w.start - shift, end: w.end - shift, text: w.text })).filter(w => w.end > 0 && w.start < length).map(w => ({ start: Math.max(0, w.start), end: Math.min(length, w.end), text: w.text }));
      st.start = ns; st.end = ne;
    });
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
    ['caption_style', 'captions', 'caption_y', 'layout', 'aspect', 'hook', 'hook_enabled', 'hook_style', 'fade_inout', 'music_volume'].concat(CAM.map(c => c[0])).forEach(k => { changes[k] = st[k]; });
    const body = { file, scope, changes };
    const o = JSON.parse(original);
    const wordsChanged = JSON.stringify(o.words) !== JSON.stringify(st.words);
    const trimChanged = o.start !== st.start || o.end !== st.end;
    if (wordsChanged || trimChanged) {
      if (scope === 'video') { note('Transcript edits and trimming work on one clip at a time. Pick "Only this clip".'); return; }
      body.words = st.words;
      if (trimChanged) body.trim = { start: st.start, end: st.end };
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

// Right sidebar: what is being made right now, your latest clips, and a chat that changes settings or edits a clip.
// The chat only proposes. Nothing changes until you press Apply.
(function () {
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const post = async (path, body) => {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || 'Request failed');
    return j;
  };
  const get = async path => { const r = await fetch(path); if (!r.ok) throw new Error('x'); return r.json(); };
  let selected = '';          // clip the chat should edit
  let pending = [];           // actions shown as buttons

  function setField(id, value) {
    const el = $(id);
    if (!el) return false;
    if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const FIELD = { count: 'count', minlen: 'minlen', length: 'length', quality: 'srcq', aspect: 'aspect', mode: 'mode', language: 'language', captions: 'captions', heading_on: 'hook-enabled' };

  async function apply(a) {
    if (a.type === 'set_option') {
      if (a.key === 'caption_style') { const b = document.querySelector('[data-style="' + a.value + '"]'); if (!b) return 'Style not found on this page'; b.click(); return 'ok'; }
      if (a.key === 'layout') { const b = document.querySelector('[data-layout="' + a.value + '"]'); if (!b) return 'Layout not found on this page'; b.click(); return 'ok'; }
      const id = FIELD[a.key];
      if (!id || !setField(id, a.value)) return 'That setting is not on this page';
      if (a.key === 'quality' && $('srcq') && $('srcq').value !== String(a.value)) return 'This quality is not offered';
      return 'ok';
    }
    if (a.type === 'make') {
      if (a.url && $('url')) setField('url', a.url);
      const b = $('make');
      if (!b) return 'Make button not found';
      b.click();
      return 'ok';
    }
    if (a.type === 'edit_clip') {
      if (!selected) return 'Select a clip first (press Edit on a clip below)';
      const r = await post('/clips/reedit', { file: selected, scope: 'one', changes: a.changes });
      return 'Updating the clip (job ' + String(r.job || '').slice(0, 6) + '). It appears in My clips when done.';
    }
    return 'Unknown action';
  }

  function say(who, html) {
    const log = $('rb-log');
    const d = document.createElement('div');
    d.className = 'rb-msg ' + who;
    d.innerHTML = html;
    log.append(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  async function send(text) {
    text = text.trim();
    if (!text) return;
    say('me', esc(text));
    const wait = say('bot', '<i>thinking…</i>');
    try {
      const r = await post('/assistant', { message: text, context: { clip_id: selected || null, url: ($('url') || {}).value || '' } });
      pending = r.actions || [];
      const btns = pending.map((a, i) => '<button type="button" class="mini-btn" data-act="' + i + '">' + esc(a.label) + '</button>').join('');
      wait.innerHTML = esc(r.reply) + (pending.length ? '<div class="rb-acts">' + btns + (pending.length > 1 ? '<button type="button" class="mini-btn primary" data-act="all">Apply all</button>' : '') + '</div>' : '');
    } catch (e) { wait.textContent = 'Could not reach the assistant: ' + e.message; }
  }

  async function runActions(which) {
    const list = which === 'all' ? pending : [pending[Number(which)]];
    for (const a of list.filter(Boolean)) {
      let out;
      try { out = await apply(a); } catch (e) { out = e.message; }
      say('bot', (out === 'ok' ? '✓ ' : '⚠ ') + esc(a.label) + (out === 'ok' ? '' : ' — ' + esc(out)));
    }
  }

  // ---- live activity + latest clips
  async function refresh() {
    if (document.hidden) return;
    const live = $('rb-live'), clips = $('rb-clips');
    try {
      const rt = await get('/runtime');
      const jobs = Object.values(rt.active || rt.jobs || {}).filter(j => j && ['running', 'queued', 'starting', 'recording'].includes(j.status));
      let q = [];
      try { q = ((await get('/queue')).jobs || []).filter(j => ['running', 'queued'].includes(j.status)); } catch (e) { /* PC only */ }
      const rows = jobs.map(j => ({ t: j.title || 'Clip job', s: j.stage || j.status })).concat(q.map(j => ({ t: String(j.url || 'Queued link').replace(/^https?:\/\/(www\.)?/, '').slice(0, 40), s: j.status === 'running' ? ((j.result && j.result.stage) || 'Running') : 'Waiting in the queue' })));
      live.innerHTML = rows.length ? rows.map(r => '<div class="rb-row"><b>' + esc(r.t) + '</b><small>' + esc(String(r.s).slice(0, 90)) + '</small></div>').join('') : '<small class="rb-empty">Nothing is being made. Paste a link and press Make clips.</small>';
    } catch (e) { live.innerHTML = '<small class="rb-empty">Activity is unavailable.</small>'; }
    try {
      const lib = await get('/library');
      const items = (Array.isArray(lib) ? lib : lib.clips || lib.items || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 6);
      clips.innerHTML = items.length ? items.map(c => '<div class="rb-clip' + (c.id === selected ? ' on' : '') + '" data-id="' + c.id + '"><b>' + esc(String(c.title).slice(0, 48)) + '</b>' +
        '<span><button type="button" class="mini-btn" data-edit="' + c.id + '">' + (c.id === selected ? 'Selected' : 'Edit by chat') + '</button> <a class="mini-btn" href="/media/' + c.id + '" download>Download</a></span></div>').join('') : '<small class="rb-empty">No clips yet.</small>';
    } catch (e) { /* keep the old list */ }
  }

  function init() {
    if ($('right-bar')) return;
    const bar = document.createElement('aside');
    bar.id = 'right-bar';
    bar.className = 'right-bar';
    bar.innerHTML = '<button type="button" id="rb-toggle" class="rb-toggle" aria-label="Open or close the assistant panel">✦</button>' +
      '<div class="rb-inner"><h3>Now making</h3><div id="rb-live"></div><h3>Latest clips</h3><div id="rb-clips"></div>' +
      '<h3>Assistant</h3><div id="rb-log" class="rb-log"><div class="rb-msg bot">Tell me what you want: “3 clips of 30-45 seconds in 4K”, “pill captions”, or select a clip and say “this clip: karaoke captions”.</div></div>' +
      '<div class="rb-chips"><button type="button" class="mini-btn" data-say="use karaoke captions">Karaoke captions</button><button type="button" class="mini-btn" data-say="3 clips, 30-45 seconds, 4K">3 clips · 4K</button><button type="button" class="mini-btn" data-say="gameplay + face layout">Face + gameplay</button></div>' +
      '<form id="rb-form" class="rb-form"><input id="rb-input" type="text" maxlength="500" placeholder="Ask or tell me a change…" autocomplete="off"><button type="submit" class="mini-btn primary">Send</button></form></div>';
    document.body.append(bar);
    let open = true;
    try { open = localStorage.getItem('neon-rightbar') !== '0' && window.innerWidth > 1280; } catch (e) { /* ignore */ }
    const set = on => { document.body.classList.toggle('rb-open', on); try { localStorage.setItem('neon-rightbar', on ? '1' : '0'); } catch (e) { /* ignore */ } };
    set(open);
    $('rb-toggle').onclick = () => set(!document.body.classList.contains('rb-open'));
    $('rb-form').onsubmit = e => { e.preventDefault(); const i = $('rb-input'); const v = i.value; i.value = ''; send(v); };
    bar.addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (a) { runActions(a.dataset.act); return; }
      const s = e.target.closest('[data-say]');
      if (s) { send(s.dataset.say); return; }
      const ed = e.target.closest('[data-edit]');
      if (ed) { selected = selected === ed.dataset.edit ? '' : ed.dataset.edit; refresh(); say('bot', selected ? 'Clip selected. Now say what to change, e.g. “tiktok captions”.' : 'Clip unselected.'); }
    });
    refresh();
    setInterval(refresh, 4000);
  }
  if (document.readyState === 'complete') setTimeout(init, 600);
  else window.addEventListener('load', () => setTimeout(init, 600));
})();

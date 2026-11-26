/* Sol. No build step. Data seed lives in data.js; your edits live in the browser
   and, once you connect Supabase on the Connect tab, sync to your own account. */
(function () {
'use strict';
var SEED = window.SEED;
var PALS = [['apple', 'Apple', '#0071e3', '#f5f5f7'], ['graphite', 'Graphite', '#ff9f0a', '#111113'], ['forest', 'Forest', '#2f6b4f', '#f3f5f1'], ['sunset', 'Sunset', '#e4572e', '#fff7f2'], ['ocean', 'Ocean', '#38bdf8', '#0a1628'], ['paper', 'Paper', '#111111', '#ffffff']];
function applyPal() { setTimeout(function () { if (window.applyLook) applyLook(); }, 0); var p = ''; try { p = localStorage.getItem('pd_pal') || ''; } catch (e) {} if (p && p !== 'apple') document.documentElement.setAttribute('data-pal', p); else document.documentElement.removeAttribute('data-pal'); }
applyPal();
var KEY = 'pd_state_v1', CFGKEY = 'pd_cfg_v1', SESSKEY = 'pd_sess_v1', UNLOCK = 'pd_unlocked';
var mem = {};
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return mem['s' + k] || null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { mem['s' + k] = v; } }

/* ---------- helpers ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayIso() { return isoOf(new Date()); }
function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function daysUntil(iso) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((parseIso(iso) - t) / 86400000); }
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function fmtTime(t) { var m = /^(\d{1,2}):(\d\d)/.exec(t || ''); if (!m) return t || ''; var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM'); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmt(iso) { if (!iso) return ''; var d = parseIso(iso); return cap(MON[d.getMonth()]) + ' ' + d.getDate() + ', ' + d.getFullYear(); }
function dowIdx(d) { return (d.getDay() + 6) % 7; }
function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function leftTxt(iso) {
  var n = daysUntil(iso);
  if (n < 0) return '<span class="d over">' + (-n) + 'd overdue</span>';
  if (n === 0) return '<span class="d soon">today</span>';
  return '<span class="d' + (n <= 7 ? ' soon' : '') + '">' + n + (n === 1 ? ' day' : ' days') + '</span>';
}
function dots(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? '●' : '<i>●</i>'; return '<span class="dots">' + s + '</span>'; }
function gcal(title, iso, details) {
  var a = iso.replace(/-/g, ''), d = parseIso(iso); d.setDate(d.getDate() + 1);
  var b = isoOf(d).replace(/-/g, '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + a + '/' + b + '&details=' + encodeURIComponent(details || '');
}

/* ---------- state ---------- */
function defaultState() {
  return {
    profile: { name: 'Palash', pinHash: '' }, status: {}, notes: {}, stars: {}, checks: {}, focus: {},
    tasks: SEED.tasks.map(function (t) { return { id: t.id, title: t.title, due: t.due, course: t.course, type: t.type, info: t.info, link: t.link, done: false }; }),
    events: [
      { id: 'e3', title: 'SAT prep', start: '17:30', end: '18:30', cat: 'sat', date: '2026-11-17' },
    ],
    sat: { tests: [], plan: {} },
    updated: 0
  };
}
var S;
function load() {
  var raw = lsGet(KEY), d = defaultState();
  if (raw) { try { var p = JSON.parse(raw); for (var k in d) if (p[k] === undefined) p[k] = d[k]; if (p.tasks && !p.tasks.some(function (t) { return t.id === 't7'; })) { p.tasks.push({ id: 't7', title: 'Finish Xylem submission', due: '2026-11-19', course: 'Science Fair', type: 'Deadline', info: 'Hard deadline is Nov 20, 1 pm PT and late entries are not accepted, so aim to finish Nov 19. Get the parent consent form signed. Submit on the Xylem platform.', link: 'https://xyleminnovationchallenge.bemyapp.com/', done: false }); lsSet(KEY, JSON.stringify(p)); }
    if (p.events && !p.events.some(function (e) { return e.id === 'e3'; })) { p.events.push({ id: 'e3', title: 'SAT prep', start: '17:30', end: '18:30', cat: 'sat', date: '2026-11-17' }); lsSet(KEY, JSON.stringify(p)); }
    if (p.sat && p.sat.tests && p.sat.tests.length) { p.sat.tests = []; lsSet(KEY, JSON.stringify(p)); } S = p; return; } catch (e) {} }
  S = d;
}
var pushTimer = null;
function save() { S.updated = Date.now(); lsSet(KEY, JSON.stringify(S)); if (cloudOn() && session()) { clearTimeout(pushTimer); setSync('Saving...'); pushTimer = setTimeout(cloudPush, 600); } }

/* ---------- config, auth ---------- */
var SOLMAIL = 'sol@palashraks-afk.github.io';
function cfg() { var c = {}; try { c = JSON.parse(lsGet(CFGKEY) || '{}'); } catch (e) {} if (!c.url && SEED.supabase) c = SEED.supabase; return c; }
function cloudOn() { var c = cfg(); return !!(c.url && c.key); }
function session() { try { return JSON.parse(lsGet(SESSKEY) || 'null'); } catch (e) { return null; } }
var syncMsg = '';
function setSync(m) { syncMsg = m; var el = document.getElementById('syncmsg'); if (el) el.textContent = m; }

function hashPin(pin) {
  var data = new TextEncoder().encode('pd-salt:' + pin);
  if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', data).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return pad(x.toString(16)).slice(-2); }).join(''); });
  var h = 0; for (var i = 0; i < pin.length; i++) h = (h * 31 + pin.charCodeAt(i)) | 0;
  return Promise.resolve('x' + h);
}
function sbBase() { return cfg().url.replace(/\/+$/, ''); }
function sbCall(path, body) {
  var c = cfg();
  return fetch(sbBase() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.msg || j.error_description || j.message || j.error || 'Request failed'); return j; }); });
}
function saveSess(j) {
  lsSet(SESSKEY, JSON.stringify({ uid: j.user.id, email: j.user.email, idToken: j.access_token, refresh: j.refresh_token, exp: Date.now() + (+j.expires_in - 60) * 1000 }));
}
function fbAuth(mode, email, pw) {
  var p = mode === 'up' ? sbCall('/auth/v1/signup', { email: email, password: pw }) : sbCall('/auth/v1/token?grant_type=password', { email: email, password: pw });
  return p.then(function (j) {
    if (!j.access_token) throw new Error('Check your email to confirm the account, then sign in');
    saveSess(j);
  });
}
function fbToken() {
  var s = session(); if (!s) return Promise.reject(new Error('Not signed in'));
  if (Date.now() < s.exp) return Promise.resolve(s.idToken);
  return sbCall('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh }).then(function (j) { saveSess(j); return j.access_token; }).catch(function () { throw new Error('Session expired. Sign in again.'); });
}
function sbHeaders(t, extra) { var h = { apikey: cfg().key, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }; for (var k in (extra || {})) h[k] = extra[k]; return h; }
function cloudPull() {
  var s = session();
  return fbToken().then(function (t) { return fetch(sbBase() + '/rest/v1/dashboards?uid=eq.' + encodeURIComponent(s.uid) + '&select=json,updated', { headers: sbHeaders(t) }); }).then(function (r) {
    if (!r.ok) throw new Error('Cloud read failed (' + r.status + ')'); return r.json();
  }).then(function (rows) {
    if (!rows || !rows.length || !rows[0].json) return false;
    var remote = JSON.parse(rows[0].json);
    if ((remote.updated || 0) > (S.updated || 0)) { var pin = S.profile && S.profile.pinHash; S = remote; if (!S.profile) S.profile = { name: 'Palash', pinHash: pin || '' }; lsSet(KEY, JSON.stringify(S)); return true; }
    return false;
  });
}
function cloudPush() {
  var s = session();
  return fbToken().then(function (t) {
    return fetch(sbBase() + '/rest/v1/dashboards?on_conflict=uid', { method: 'POST', headers: sbHeaders(t, { Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify({ uid: s.uid, json: JSON.stringify(S), updated: S.updated }) });
  }).then(function (r) { setSync(r.ok ? 'Synced ' + new Date().toLocaleTimeString() : 'Sync failed (' + r.status + ')'); }).catch(function (e) { setSync('Sync failed: ' + e.message); });
}

/* ---------- aggregate dates ---------- */
function allDeadlines() {
  var out = [];
  S.tasks.forEach(function (t) { if (t.due && !t.done) out.push({ iso: t.due, title: t.title, kind: 'Task', id: t.id, task: true }); });
  SEED.competitions.forEach(function (c) { var st = S.status[c.id] || c.status; if (c.iso && !c.approx && st !== 'Skipped' && st !== 'Closed' && st !== 'Submitted') out.push({ iso: c.iso, title: c.name, kind: 'Competition', id: c.id, view: 'comps', link: c.link }); });
  SEED.programs.forEach(function (p) { var st = S.status[p.id] || p.status; if (p.iso && !p.approx && st !== 'Skipped' && st !== 'Closed' && st !== 'Submitted' && st !== 'Accepted' && st !== 'Rejected') out.push({ iso: p.iso, title: p.name, kind: p.cat === 'Internship / research' ? 'Internship' : 'Program', id: p.id, view: 'progs', link: p.link }); });
  SEED.sat.forEach(function (s) { out.push({ iso: s.reg, title: 'SAT registration deadline (test ' + fmt(s.date) + ')', kind: 'SAT', view: 'sat' }); out.push({ iso: s.date, title: 'SAT test day', kind: 'SAT', view: 'sat' }); });
  out.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; });
  return out;
}

/* ---------- views ---------- */
var view = 'today';
var NAV = [['today', 'Today'], ['comps', 'Competitions'], ['progs', 'Programs & Internships'], ['school', 'School'], ['sat', 'SAT Prep'], ['sched', 'Schedule'], ['connect', 'Connect']];
var F = { q: '', cat: '', type: '', win: '', st: '', hideSkip: true, sort: 'date' };

function eventsOn(d) {
  var di = dowIdx(d), iso = isoOf(d);
  return S.events.filter(function (e) { return (e.days && e.days.indexOf(di) >= 0) || e.date === iso; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
}
function openBtn(link, label) { return link ? '<a class="btn small" href="' + esc(link) + '" target="_blank" rel="noopener">' + (label || 'Open') + ' &#8599;</a>' : ''; }
var CAL = { off: 0, sel: null };
var MONFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayAgenda(iso) {
  var evs = eventsOn(parseIso(iso)), dls = allDeadlines().filter(function (x) { return x.iso === iso && (x.id || x.kind === 'SAT'); });
  var o = '<div class="cal-ag"><b>' + fmt(iso) + '</b><ul class="list">';
  evs.forEach(function (e) { o += '<li><span class="t"><b>' + esc(fmtTime(e.start)) + '</b> ' + esc(e.title) + '</span><button class="x" data-act="delevent" data-id="' + e.id + '" title="Delete">&times;</button></li>'; });
  dls.forEach(function (x) { o += '<li><span class="t' + (x.id ? ' click' : '') + '"' + (x.id ? ' data-act="detail" data-id="' + x.id + '"' : '') + '>' + esc(shortTxt(x.title, 40)) + ' <span class="tag">' + x.kind + '</span></span></li>'; });
  if (!evs.length && !dls.length) o += '<li class="muted">Nothing on this day.</li>';
  return o + '</ul></div>';
}
function calHtml() {
  var tdy = todayIso(), sel = CAL.sel || tdy;
  var b = new Date(); b.setDate(1); b.setMonth(b.getMonth() + CAL.off);
  var y = b.getFullYear(), m = b.getMonth(), lead = dowIdx(b), n = new Date(y, m + 1, 0).getDate(), by = {};
  allDeadlines().forEach(function (x) { if (x.id || x.kind === 'SAT') (by[x.iso] = by[x.iso] || []).push(x); });
  var o = '<div class="cal"><div class="cal-hd"><button class="x" data-act="calprev" aria-label="Previous month">&#8249;</button><b>' + MONFULL[m] + ' ' + y + '</b><button class="btn ghost small" data-act="caltoday">Today</button><button class="x" data-act="calnext" aria-label="Next month">&#8250;</button></div><div class="cal-g">';
  DOW.forEach(function (d) { o += '<div class="cal-dw">' + d.slice(0, 2) + '</div>'; });
  for (var i = 0; i < lead; i++) o += '<div></div>';
  for (var d = 1; d <= n; d++) {
    var iso = y + '-' + pad(m + 1) + '-' + pad(d), ne = eventsOn(new Date(y, m, d)).length, nd = (by[iso] || []).length;
    o += '<button class="cal-c' + (iso === tdy ? ' today' : '') + (iso === sel ? ' sel' : '') + '" data-act="calday" data-id="' + iso + '"><span>' + d + '</span><span class="cal-dots">' + (ne ? '<i></i>' : '') + (nd ? '<i class="d"></i>' : '') + (nd > 1 ? '<i class="d"></i>' : '') + '</span></button>';
  }
  return o + '</div>' + dayAgenda(sel) + '</div>';
}
function vToday() {
  var now = new Date(), h = now.getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  var tdy = todayIso(), dl = allDeadlines();
  var dueToday = dl.filter(function (x) { return x.iso === tdy; }), over = dl.filter(function (x) { return x.iso < tdy && x.task; });
  var week = dl.filter(function (x) { var n = daysUntil(x.iso); return n >= 0 && n <= 14; });
  var nextSat = SEED.sat.filter(function (s) { return daysUntil(s.reg) >= 0; })[0];
  var hero = dl.filter(function (x) { return x.iso >= tdy; })[0];
  var ev = eventsOn(now);
  var o = '<div class="hd"><h1>' + g + ', ' + esc(S.profile.name || 'Palash') + '</h1><span class="row"><span class="muted">' + now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) + '</span><button class="btn ghost small" data-act="readday">&#9658; Read my day</button></span></div>';
  if (hero) o += '<div class="hero"><div><span class="kicker">Next up</span><h2>' + esc(hero.title) + '</h2><span class="muted">' + fmt(hero.iso) + ' · ' + hero.kind + '</span></div><div class="hero-r">' + ringHtml(daysUntil(hero.iso)) + '<div class="row">' + openBtn(hero.link) + '<a class="btn ghost small" target="_blank" rel="noopener" href="' + gcal(hero.title, hero.iso, hero.kind) + '">+ Calendar</a></div></div></div>';
  o += '<div class="statbar">' + [['Due today', dueToday.length, dueToday.length ? 'hot' : ''], ['Overdue', over.length, over.length ? 'bad' : ''], ['Next 14 days', week.length, '']].map(function (x) { return '<div class="stat ' + x[2] + '"><b data-count="' + x[1] + '">' + x[1] + '</b><small>' + x[0] + '</small></div>'; }).join('') + (nextSat ? '<div class="stat' + (daysUntil(nextSat.reg) <= 7 ? ' hot' : '') + '"><b>' + daysUntil(nextSat.reg) + 'd</b><small>SAT sign-up ' + fmtShort(nextSat.reg) + '</small></div>' : '') + '</div>';
  o += priorities(dl);
  var tl = S.tasks.filter(function (t) { return !t.done && t.due && t.due <= tdy; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  o += '<div class="two"><div><h2>Do today</h2><div class="card"><form data-form="quicktask" class="row"><input type="text" name="title" placeholder="Add a task" required style="flex:1;min-width:140px"><input type="date" name="due" value="' + tdy + '"><button class="btn">Add</button></form><ul class="list">' + (tl.length ? tl.map(taskLi).join('') : '<li class="muted">Nothing due.</li>') + '</ul></div>' +
    '<h2>Schedule</h2><div class="card"><ul class="list">' + (ev.length ? ev.map(function (e) { return '<li><span class="t"><b>' + esc(fmtTime(e.start)) + '</b> ' + esc(e.title) + '</span></li>'; }).join('') : '<li class="muted">No blocks today.</li>') + '</ul></div></div>' +
    '<div><h2>Calendar</h2><div class="card">' + strip14(dl).replace('<h2>Next 14 days</h2><div class="card">', '<div>').replace(/<\/div><\/div>$/, '</div></div>') + calHtml() + '</div></div></div>';
  o += '<h2>Deadlines</h2>' + colHead('Due', 'What', 'What to do next', 'Status') + deadlineRows(dl, true);
  return o;
}
function remList(dl) {
  var r = [], tdy = todayIso();
  var sat = SEED.sat.filter(function (x) { return daysUntil(x.reg) >= 0; })[0];
  if (sat) r.push('<li><span class="t">Register for SAT ' + fmtShort(sat.date) + '</span>' + leftTxt(sat.reg) + '</li>');
  dl.filter(function (x) { return x.iso >= tdy && x.iso <= isoOf(new Date(Date.now() + 7 * 864e5)) && !x.task && x.kind !== 'SAT'; }).slice(0, 4).forEach(function (x) { r.push('<li><span class="t click" data-act="detail" data-id="' + x.id + '">Start: ' + esc(shortTxt(x.title, 32)) + '</span>' + leftTxt(x.iso) + '</li>'); });
  return r.length ? r.join('') : '<li class="muted">Nothing urgent this week.</li>';
}
function deadlineRows(dl, fold) {
  var tdy = todayIso(), hor = isoOf(new Date(Date.now() + 60 * 864e5)), out = '', last = '';
  var G = [['over', 'Overdue', function (x) { return x.iso < tdy; }], ['today', 'Today', function (x) { return x.iso === tdy; }], ['', 'This week', function (x) { return x.iso > tdy && daysUntil(x.iso) <= 7; }], ['', 'Next 60 days', function (x) { return daysUntil(x.iso) > 7 && x.iso <= hor; }]];
  G.forEach(function (g) {
    var items = dl.filter(function (x) { return g[2](x) && (x.id || x.kind === 'SAT'); }); if (!items.length) return;
    var isLate = fold && g[1] === 'Next 60 days'; if (isLate) out += '<details class="later"><summary>' + g[1] + ' (' + items.length + ')</summary>'; else out += '<div class="grp ' + g[0] + '">' + g[1] + ' (' + items.length + ')</div>';
    out += '<div class="rows">' + items.map(function (x) {
      var it = x.id ? findItem(x.id) : null, st = '';
      if (it && it.list) st = sel(x.id, it.list, S.status[x.id] || it.list[0]);
      else if (x.task) st = '<span class="muted">Task</span>';
      var o2 = { id: x.id || 'sat', iso: x.iso, name: shortTxt(x.title, 42), sub: x.kind, next: it && it.todo[0] ? shortTxt(it.todo[0], 90) : '', st: st, stars: it && it.list ? starsOf(x.id) : 0, prog: x.id ? progOf(x.id) : 0 };
      return x.id ? dRow(o2) : dRow(o2).replace('data-act="detail" data-id="sat"', 'data-nav="sat"');
    }).join('') + '</div>' + (isLate ? '</details>' : '');
  });
  return out || '<p class="muted">Nothing coming up.</p>';
}
function parsePaste(txt, course) {
  var M = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }, now = new Date(), out = [];
  String(txt || '').split(/\r?\n/).forEach(function (ln) {
    ln = ln.trim(); if (!ln || /^(assigned|missing|done|due)\s*$/i.test(ln)) return;
    var mo, d, y = now.getFullYear(), due = '', m = ln.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i) || null;
    if (m) { mo = M[m[1].toLowerCase()]; d = +m[2]; }
    else { m = ln.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/); if (m) { mo = +m[1]; d = +m[2]; if (m[3]) y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; } }
    if (m && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) { var dt = new Date(y, mo - 1, d); if (!m[3] && dt < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) dt = new Date(y + 1, mo - 1, d); due = isoOf(dt); }
    var title = ln.replace(m ? m[0] : '', '').replace(/\b(due|by|on)\b\s*[:\-]?\s*$/i, '').replace(/[\s\-–:,|]+$/, '').replace(/^[\s\-•*]+/, '').trim();
    if (title) out.push({ title: title, due: due, course: course || '' });
  });
  return out;
}
function taskLi(t) {
  return '<li><input type="checkbox" data-act="toggletask" data-id="' + t.id + '"' + (t.done ? ' checked' : '') + '><span class="t click" data-act="detail" data-id="' + t.id + '">' + esc(shortTxt(t.title, 44)) + (t.course ? ' <span class="tag">' + esc(t.course) + '</span>' : '') + '</span>' + (t.due ? leftTxt(t.due) : '') + '<button class="x" data-act="deltask" data-id="' + t.id + '" title="Delete">&times;</button></li>';
}

var CST = ['Not started', 'Working', 'Submitted', 'Won / placed', 'Skipped', 'Closed'];
var PST = ['Not started', 'Researching', 'Applying', 'Submitted', 'Accepted', 'Rejected', 'Skipped', 'Closed'];
function sel(id, list, cur) { return '<select data-act="status" data-id="' + id + '">' + list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'; }


function urg(iso) { if (!iso) return 'u-later'; var n = daysUntil(iso); return n < 0 ? 'u-over' : n === 0 ? 'u-today' : n <= 3 ? 'u-soon' : n <= 7 ? 'u-wk' : 'u-later'; }
function chipTxt(iso) { if (!iso) return ''; var n = daysUntil(iso); return n < 0 ? (-n) + 'd overdue' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'in ' + n + ' days'; }
function dueChip(iso, text, approx, closed) {
  if (closed) return '<span class="chip"><b>Closed</b>' + esc(iso ? fmtShort(iso) : '') + '</span>';
  if (!iso) return '<span class="chip"><b>' + esc(text || 'TBD') + '</b>date to confirm</span>';
  return '<span class="chip"><b>' + (approx ? '~' : '') + esc(fmtShort(iso)) + '</b>' + (approx ? 'approx' : esc(chipTxt(iso))) + '</span>';
}
function fmtShort(iso) { return parseIso(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function colHead(a, b, c, d) { return '<div class="cols head"><span>' + a + '</span><span>' + b + '</span><span>' + c + '</span><span>' + d + '</span></div>'; }
var PSTAR = { p109: 3, p110: 3, p111: 3, p112: 2, p113: 4, p102: 3, p103: 3, p104: 4, p105: 4, p106: 2, p107: 3, p108: 3, p93: 5, p94: 4, p95: 4, p96: 3, p97: 3, p98: 2, p99: 3, p100: 3, p67: 5, p68: 5, p20: 5, p43: 5, p12: 5, p73: 5, p16: 5, p10: 5, p28: 5, p8: 1, p22: 4, p13: 4, p34: 1, p36: 1, p11: 4, p46: 4, p29: 2, p33: 1, p75: 4, p76: 4, p77: 3, p78: 2, p79: 2, p80: 3, p81: 3, p82: 3, p83: 3, p84: 3, p92: 2, p90: 5, p91: 3, p1: 4, p89: 3, p85: 3, p86: 2, p87: 4, p88: 3, p69: 4, p35: 4, p7: 4, p40: 4, p32: 4, p71: 4, p15: 4, p53: 4, p50: 4, p48: 4, p54: 4, p21: 2, p5: 2, p38: 2, p39: 2, p6: 2, p63: 2, p66: 2 };
function starsOf(id) {
  var v = S.stars && S.stars[id]; if (v) return v;
  var c = SEED.competitions.filter(function (x) { return x.id === id; })[0];
  return c ? (c.prestige || 3) : (PSTAR[id] || 3);
}
function starsHtml(n) { return '<span class="stars" aria-label="Importance ' + n + ' of 5">' + '\u2605'.repeat(n) + '<i>' + '\u2605'.repeat(5 - n) + '</i></span>'; }
function starPicker(id) { var n = starsOf(id), o = '<span class="rate">'; for (var i = 1; i <= 5; i++) o += '<button type="button" class="star' + (i <= n ? ' on' : '') + '" data-act="setstar" data-id="' + id + '" data-v="' + i + '" aria-label="' + i + ' stars">\u2605</button>'; return o + '</span>'; }
function byStars(a, b, ka, kb) { var za = /^zz/.test(ka), zb = /^zz/.test(kb); if (za !== zb) return za ? 1 : -1; var d = starsOf(b.id) - starsOf(a.id); return d || (ka < kb ? -1 : ka > kb ? 1 : 0); }function segHtml() { return '<div class="seg" role="group" aria-label="Order by"><button data-act="sortset" data-id="date" class="' + (F.sort !== 'rank' ? 'on' : '') + '">Time</button><button data-act="sortset" data-id="rank" class="' + (F.sort === 'rank' ? 'on' : '') + '">Importance</button></div>'; }
function chipsHtml(list, cnt, cur, act) {
  var total = 0; list.forEach(function (k) { total += cnt[k] || 0; });
  return '<div class="chips"><button class="chip2' + (!cur ? ' on' : '') + '" data-act="' + act + '" data-id="">All <b>' + total + '</b></button>' + list.filter(function (k) { return cnt[k]; }).map(function (k) { return '<button class="chip2' + (cur === k ? ' on' : '') + '" data-act="' + act + '" data-id="' + esc(k) + '">' + esc(k) + ' <b>' + cnt[k] + '</b></button>'; }).join('') + '</div>';
}
function progOf(id) { var it = findItem(id), c = S.checks && S.checks[id]; if (!it || !it.todo.length || !c) return 0; var n = 0; it.todo.forEach(function (x, i) { if (c[i]) n++; }); return Math.round(100 * n / it.todo.length); }function dRow(o) {
  return '<div class="row2 cols click ' + (o.closed ? 'dim' : (o.approx ? 'u-later' : urg(o.iso))) + '" data-act="detail" data-id="' + o.id + '" tabindex="0"><div>' + dueChip(o.iso, o.dateText, o.approx, o.closed) + '</div><div class="c-name"><b>' + esc(o.name) + '</b>' + (o.stars ? starsHtml(o.stars) : '') + '<small>' + esc(o.sub || '') + '</small>' + (o.prog ? '<div class="bar" title="' + o.prog + '% of steps done"><i style="width:' + o.prog + '%"></i></div>' : '') + '</div><div class="c-next">' + esc(o.next || '') + '</div><div class="c-st">' + (o.st || '') + '</div></div>';
}
function firstStep(t, n) { var a = sentences(t)[0] || ''; return shortTxt(a, n || 80); }
function shortDate(t) { return String(t || '').replace(/,? 20(\d\d)/, ' \u2019$1').replace(/ to /, ' to '); }
function shortTxt(t, n) { t = String(t || '').replace(/\s*\([^)]*\)/g, ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : t; }
function sentences(t) { return String(t || '').replace(/\b(Dr|Mr|Mrs|Ms|vs|St|Rep)\./g, '$1\u0001').split(/(?<=[.!?])\s+/).filter(Boolean).map(function (x) { return x.replace(/\u0001/g, '.'); }); }
function findItem(id) {
  var c = SEED.competitions.filter(function (x) { return x.id === id; })[0];
  if (c) return { kind: 'Competition', id: id, title: c.name, sub: c.sub, iso: c.iso, dateText: c.dateText, status: c.status, todo: sentences(c.needs), facts: [c.dateNote, c.elig ? 'Who can enter: ' + c.elig : '', c.verified ? 'Checked against the official source on ' + c.verified + '.' : ''], link: c.link, list: CST, src: c.src };
  var p = SEED.programs.filter(function (x) { return x.id === id; })[0];
  if (p) return { kind: p.cat === 'Internship / research' ? 'Internship' : 'Program', id: id, title: p.name, sub: p.get, iso: p.approx ? '' : p.iso, dateText: (p.dateText || p.date) + (p.approx ? ' (approx)' : ''), todo: sentences(p.next), facts: [p.pay, p.type ? 'Type: ' + p.type : '', p.verified ? 'Checked against the official source on ' + p.verified + '.' : ''], link: p.link, list: PST, search: !p.link };
  var t = S.tasks.filter(function (x) { return x.id === id; })[0];
  if (t) { var sd = SEED.tasks.filter(function (x) { return x.id === id; })[0] || {}; return { kind: 'Task', id: id, title: t.title, sub: t.course || '', iso: t.due, dateText: t.due ? fmt(t.due) : 'No date', todo: sentences(t.info || sd.info || ''), facts: [], link: t.link || sd.link, task: true }; }
  return null;
}
function showDetail(id) {
  var it = findItem(id); if (!it) return;
  var st = S.status[id] || it.status || (it.list ? it.list[0] : '');
  var m = document.getElementById('modal') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'modal' }));
  var q = encodeURIComponent(it.title + ' application deadline');
  m.innerHTML = '<div class="m-bg" data-act="closedetail"></div><div class="m-box" role="dialog" aria-label="' + esc(it.title) + '">' +
    '<button class="x m-x" data-act="closedetail" title="Close">&times;</button>' +
    '<span class="kicker">' + it.kind + '</span><h2>' + esc(it.title) + '</h2>' + (it.sub ? '<p class="muted">' + esc(it.sub) + '</p>' : '') +
    '<p><b>' + esc(it.dateText || '') + '</b> ' + (it.iso && it.list && !/approx|TBA|not posted/i.test(it.dateText || '') ? leftTxt(it.iso) : '') + '</p>' +
    (it.list ? '<p>' + sel(id, it.list, st) + '</p><p class="muted">Importance ' + starPicker(id) + '</p>' : '') +
    (it.todo.length ? '<h3>What to do <span class="muted">' + progOf(id) + '%</span></h3><ul class="steps chk">' + it.todo.map(function (x, i) { return '<li><label><input type="checkbox" data-act="chk" data-id="' + id + '" data-i="' + i + '"' + ((S.checks[id] || [])[i] ? ' checked' : '') + '> <span>' + esc(x) + '</span></label></li>'; }).join('') + '</ul>' : '') +
    (it.facts.filter(Boolean).length ? '<h3>Good to know</h3><ul class="steps">' + it.facts.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="row"><button class="btn ghost small" data-act="readitem" data-id="' + id + '">&#9658; Listen</button>' + (it.link ? openBtn(it.link, 'Open official page') : '') + '<a class="btn ghost small" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + q + '">Search</a>' + (it.iso ? '<a class="btn ghost small" target="_blank" rel="noopener" href="' + gcal(it.title, it.iso, it.kind) + '">+ Calendar</a>' : '') + '<button class="btn ghost small" data-act="askabout" data-id="' + id + '">Ask assistant</button></div>' +
    (it.task ? '' : '<h3>Your notes</h3><textarea data-act="note" data-id="' + id + '" placeholder="Notes">' + esc(S.notes[id] || '') + '</textarea>') + '</div>';
  m.style.display = 'block';
}
function hideDetail() { var m = document.getElementById('modal'); if (m) m.style.display = 'none'; }
function vComps() {
  var rows = SEED.competitions.slice();
  function ck(c) { return ((S.status[c.id] || c.status) === 'Closed' ? 'zz' : '') + (c.iso || '9999'); }
  rows.sort(function (a, b) { return F.sort === 'rank' ? byStars(a, b, ck(a), ck(b)) : (ck(a) < ck(b) ? -1 : ck(a) > ck(b) ? 1 : 0); });
  var cnt = {}; SEED.competitions.forEach(function (c) { var s0 = S.status[c.id] || c.status || 'Not started'; cnt[s0] = (cnt[s0] || 0) + 1; }); var o = '<div class="hd"><h1>Competitions</h1>' + segHtml() + '</div>' + chipsHtml(CST, cnt, F.cst, 'chipc') + '<div class="chips"><button class="chip2' + (F.quick ? ' on' : '') + '" data-act="quick">Quick builds and submits <b>' + SEED.competitions.filter(function (c) { return c.quick; }).length + '</b></button></div>' + colHead('Due', 'Competition', 'What to do next', 'Status') + '<div class="rows">';
  rows.forEach(function (c) {
    var st = S.status[c.id] || c.status || 'Not started'; if (F.cst && st !== F.cst) return;
    if (F.quick && !c.quick) return;
    var cl = st === 'Closed'; o += dRow({ id: c.id, iso: c.iso, approx: c.approx, closed: cl, dateText: shortDate(c.dateText), name: c.name, stars: starsOf(c.id), prog: progOf(c.id), sub: shortTxt(c.sub, 40), next: firstStep(c.needs, 90), st: sel(c.id, CST, st) });
  });
  return o + '</div>';
}

function progMatch(p) {
  var st = S.status[p.id] || p.status || 'Not started';
  if (F.hideSkip && st === 'Skipped') return false;
  if (F.cat && p.cat !== F.cat) return false;
  if (F.type && p.type !== F.type) return false;
  if (F.win && p.window !== F.win) return false;
  if (F.st && st !== F.st) return false;
  if (F.q && (p.name + ' ' + p.get + ' ' + p.next).toLowerCase().indexOf(F.q.toLowerCase()) < 0) return false;
  return true;
}
function progTable() {
  function pk(p) { return ((S.status[p.id] || p.status) === 'Closed' ? 'zz' : '') + (p.iso || '9999'); }
  var rows = SEED.programs.filter(progMatch).sort(function (a, b) { return F.sort === 'rank' ? byStars(a, b, pk(a), pk(b)) : (pk(a) < pk(b) ? -1 : pk(a) > pk(b) ? 1 : 0); });
  var o = colHead('Due', 'Program', 'What to do next', 'Status') + '<div class="rows">';
  rows.forEach(function (p) {
    var st = S.status[p.id] || p.status || 'Not started';
    o += dRow({ id: p.id, iso: p.iso, approx: p.approx, closed: st === 'Closed', dateText: shortDate(p.dateText || p.date), name: shortTxt(p.name, 34), stars: starsOf(p.id), prog: progOf(p.id), sub: p.type + ' · ' + shortTxt(p.get, 28), next: firstStep(p.next, 90), st: sel(p.id, PST, st) });
  });
  return o + '</div><p class="muted">' + rows.length + ' of ' + SEED.programs.length + ' shown, closest deadline first. Dates marked approx are projected from 2026.</p>';
}
function opts(list, cur) { return '<option value="">All</option>' + list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; }).join(''); }
function uniq(f) { var s = {}; SEED.programs.forEach(function (p) { s[p[f]] = 1; }); return Object.keys(s); }
function vProgs() {
  var pcnt = {}; SEED.programs.forEach(function (p) { var s0 = S.status[p.id] || p.status || 'Not started'; pcnt[s0] = (pcnt[s0] || 0) + 1; }); var o = '<div class="hd"><h1>Programs &amp; Internships</h1>' + segHtml() + '</div>' + chipsHtml(PST, pcnt, F.st, 'chipp');
  o += '<div class="filters"><input type="search" data-act="q" placeholder="Search" value="' + esc(F.q) + '"><select data-act="fcat">' + opts(uniq('cat'), F.cat) + '</select><select data-act="ftype">' + opts(uniq('type'), F.type) + '</select><select data-act="fwin">' + opts(uniq('window'), F.win) + '</select><select data-act="fst">' + opts(PST, F.st) + '</select><label class="muted"><input type="checkbox" data-act="hideskip"' + (F.hideSkip ? ' checked' : '') + '> hide skipped</label></div>';
  o += '<div id="progTable">' + progTable() + '</div>';
  o += '<details><summary>More programs from your lists (' + SEED.extra.length + ')</summary><p class="muted">Mostly 2026 dates. Check each site for 2027 deadlines.</p><div class="wrap"><table style="min-width:760px"><thead><tr><th>Program</th><th>Cost</th><th>Dates listed</th><th>Status</th></tr></thead><tbody>';
  SEED.extra.forEach(function (e) { o += '<tr><td class="nm">' + esc(e.name) + '<small>' + esc(e.what) + '</small></td><td>' + esc(e.cost) + '</td><td>' + esc(e.dates) + '</td><td>' + sel(e.id, PST, S.status[e.id] || 'Not started') + '</td></tr>'; });
  return o + '</tbody></table></div></details>';
}

var FOC = { run: false, mode: 'focus', len: 25, left: 1500, end: 0, tm: null };
function focFmt(s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
function focTick() { if (!FOC.run) return; FOC.left = Math.max(0, Math.round((FOC.end - Date.now()) / 1000)); var el = document.getElementById('focT'); if (el) el.textContent = focFmt(FOC.left); if (FOC.left <= 0) focDone(); }
function focDone() {
  clearInterval(FOC.tm); FOC.run = false;
  if (FOC.mode === 'focus') { S.focus = S.focus || {}; var k0 = todayIso(); S.focus[k0] = (S.focus[k0] || 0) + FOC.len; save(); }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(FOC.mode === 'focus' ? 'Focus session done. Take a break.' : 'Break over. Ready to focus?'); } catch (e) {}
  FOC.mode = FOC.mode === 'focus' ? 'break' : 'focus'; FOC.len = FOC.mode === 'focus' ? 25 : 5; FOC.left = FOC.len * 60; render();
}
function focStats() {
  var f = S.focus || {}, wk = 0, streak = 0, d = new Date();
  for (var i = 0; i < 7; i++) { var x = new Date(); x.setDate(x.getDate() - i); wk += f[isoOf(x)] || 0; }
  if (!f[isoOf(d)]) d.setDate(d.getDate() - 1);
  while (f[isoOf(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return { today: f[todayIso()] || 0, wk: wk, streak: streak };
}
function focusCard() {
  var st = focStats();
  return '<h2>Focus timer</h2><div class="card foc"><div class="foc-l"><div class="foc-t" id="focT">' + focFmt(FOC.left) + '</div><div class="muted">' + (FOC.mode === 'focus' ? 'Focus session' : 'Break') + '</div></div><div class="foc-r"><div class="row"><button class="btn" data-act="focstart">' + (FOC.run ? 'Pause' : 'Start') + '</button><button class="btn ghost" data-act="focreset">Reset</button><button class="btn ghost small' + (FOC.mode === 'focus' && FOC.len === 25 ? ' on' : '') + '" data-act="focmode" data-id="25">25 min</button><button class="btn ghost small' + (FOC.mode === 'focus' && FOC.len === 50 ? ' on' : '') + '" data-act="focmode" data-id="50">50 min</button><button class="btn ghost small' + (FOC.mode === 'break' ? ' on' : '') + '" data-act="focmode" data-id="5">Break</button></div><div class="row foc-s"><span><b>' + st.today + '</b> min today</span><span><b>' + st.wk + '</b> min this week</span><span><b>' + st.streak + '</b> day streak</span></div></div></div>';
}
var vSat0 = vSat;
vSat = function () { var h = vSat0(), i = h.indexOf('</div>') + 6; return h.slice(0, i) + focusCard() + h.slice(i); };
/* ---------- Google Classroom import (no API: paste what the page shows) ---------- */
var CLS = { items: [], gone: [], msg: '' };
var CLS_NOISE = /^(classroom|to-?do|assigned|missing|done|all classes|review|work|this week|next week|later|earlier|past due|no due date|today|tomorrow|upcoming|view|filter|sort|menu|settings|turned in|marked as done|returned|graded|open|archived|todo|assigned work|\d+\s+(assigned|missing|done))$/i;
var COURSE_ALIAS = [['physics c', 'AP Physics C'], ['calc', 'AP Calculus BC'], ['chem', 'AP Chemistry'], ['lang', 'AP Lang'], ['apush', 'AP US History'], ['us history', 'AP US History'], ['history', 'AP US History'], ['physics', 'Physics Honors']];
function matchCourse(line) {
  var l = String(line || '').toLowerCase(), i;
  for (i = 0; i < SEED.courses.length; i++) if (l.indexOf(SEED.courses[i].toLowerCase()) >= 0) return SEED.courses[i];
  for (i = 0; i < COURSE_ALIAS.length; i++) if (l.indexOf(COURSE_ALIAS[i][0]) >= 0) return COURSE_ALIAS[i][1];
  return '';
}
function relDate(w) {
  var d = new Date(); d.setHours(0, 0, 0, 0); w = w.toLowerCase();
  if (w === 'today') return isoOf(d); if (w === 'tomorrow') { d.setDate(d.getDate() + 1); return isoOf(d); } if (w === 'yesterday') { d.setDate(d.getDate() - 1); return isoOf(d); }
  var i = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(w.slice(0, 3)); if (i < 0) return '';
  var add = (i - d.getDay() + 7) % 7; d.setDate(d.getDate() + (add || 7)); return isoOf(d);
}
function parseDueLine(ln) {
  var m = /^due[:\s]+(.*)$/i.exec(ln); if (!m) return null;
  var rest = m[1].trim(), tm = /(\d{1,2})(?::(\d\d))?\s*([ap])\.?m\.?/i.exec(rest), iso = '';
  var mo = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(20\d\d))?/i.exec(rest), M = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  if (mo) { var now = new Date(), y = mo[3] ? +mo[3] : now.getFullYear(), dt = new Date(y, M[mo[1].toLowerCase()] - 1, +mo[2]); if (!mo[3] && dt < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60)) dt = new Date(y + 1, dt.getMonth(), dt.getDate()); iso = isoOf(dt); }
  else { var w = /^(today|tomorrow|yesterday|sun|mon|tue|wed|thu|fri|sat)[a-z]*/i.exec(rest); if (w) iso = relDate(w[1]); else { var sl = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(rest); if (sl) { var yy = sl[3] ? (+sl[3] < 100 ? 2000 + +sl[3] : +sl[3]) : new Date().getFullYear(); iso = isoOf(new Date(yy, +sl[1] - 1, +sl[2])); } } }
  return { iso: iso, time: tm ? (+tm[1]) + ':' + (tm[2] || '00') + ' ' + tm[3].toUpperCase() + 'M' : '' };
}
function parseClassroom(text) {
  var lines = String(text || '').split(/\r?\n/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean), items = [];
  lines.forEach(function (ln, i) {
    var due = parseDueLine(ln); if (!due) return;
    var prev = []; for (var j = i - 1; j >= 0 && prev.length < 2; j--) { if (parseDueLine(lines[j]) || CLS_NOISE.test(lines[j])) break; prev.push(lines[j]); }
    if (!prev.length) return;
    var title = prev[prev.length - 1], course = prev.length > 1 ? prev[0] : '';
    if (prev.length > 1 && matchCourse(title) && !matchCourse(course)) { var sw = title; title = course; course = sw; }
    items.push({ title: title.slice(0, 120), course: matchCourse(course) || course.slice(0, 40), due: due.iso, info: due.time ? 'Due ' + due.time : '' });
  });
  if (!items.length) items = parsePaste(text, '').map(function (x) { return { title: x.title, course: '', due: x.due, info: '' }; });
  return items;
}
function sameTask(t, x) { return String(t.title).toLowerCase() === String(x.title).toLowerCase() && (t.due || '') === (x.due || ''); }
function clsStart(text) {
  var items = parseClassroom(text);
  items.forEach(function (x) { x.dup = S.tasks.some(function (t) { return sameTask(t, x); }); x.on = !x.dup; });
  CLS.items = items; CLS.msg = items.length ? '' : 'I could not find any assignments in that text. Copy the whole To-do page and try again.';
  CLS.gone = items.length ? S.tasks.filter(function (t) { return !t.done && t.type === 'Classroom' && !items.some(function (x) { return sameTask(t, x); }); }) : [];
}
function clsPanel() {
  var o = '<details style="margin-top:12px"' + (CLS.items.length || CLS.msg ? ' open' : '') + '><summary>Import from Google Classroom</summary><div class="card">';
  if (CLS.msg) o += '<p class="' + (CLS.items.length ? 'ok-msg' : 'err') + '">' + esc(CLS.msg) + '</p>';
  if (!CLS.items.length) {
    return o + '<ol class="steps"><li>On your school computer or phone, open <b>classroom.google.com</b> and tap <b>To-do</b>, then <b>Assigned</b>.</li><li>Select everything (Ctrl+A, or Cmd+A) and copy (Ctrl+C, or Cmd+C).</li><li>Paste it below. You get a preview to fix before anything is added.</li></ol><form data-form="clsparse" style="display:grid;gap:8px"><textarea class="paste" name="txt" required placeholder="Paste the Classroom To-do page here"></textarea><div class="row"><button class="btn">Read it</button><span class="muted">Works without any Google access. Nothing leaves this browser except your own sync.</span></div></form></div></details>';
  }
  o += '<div class="cls-list">' + CLS.items.map(function (x, i) { return '<div class="cls-r' + (x.dup ? ' dup' : '') + '"><input type="checkbox" data-act="clspick" data-i="' + i + '"' + (x.on ? ' checked' : '') + (x.dup ? ' disabled' : '') + ' aria-label="Include"><input type="text" data-act="clstitle" data-i="' + i + '" value="' + esc(x.title) + '" aria-label="Title"><input type="text" data-act="clscourse" data-i="' + i + '" value="' + esc(x.course) + '" list="cls-courses" placeholder="Class" aria-label="Class"><input type="date" data-act="clsdue" data-i="' + i + '" value="' + esc(x.due) + '" aria-label="Due date">' + (x.dup ? '<span class="tag">already added</span>' : '') + '</div>'; }).join('') + '</div><datalist id="cls-courses">' + SEED.courses.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>';
  var n = CLS.items.filter(function (x) { return x.on; }).length;
  o += '<div class="row" style="margin-top:10px"><button class="btn" data-act="clsadd">Add ' + n + ' selected</button>' + (CLS.gone.length ? '<button class="btn ghost" data-act="clsgone">Check off ' + CLS.gone.length + ' earlier (not in this list)</button>' : '') + '<button class="btn ghost" data-act="clsclear">Start over</button></div>' + (CLS.gone.length ? '<p class="muted">Classroom tasks you imported before that are missing now are probably turned in.</p>' : '') + '</div></details>';
  return o;
}
function vSchool() {
  var tasks = S.tasks.slice().sort(function (a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; });
  var open = tasks.filter(function (t) { return !t.done; }), done = tasks.filter(function (t) { return t.done; });
  var h2 = '<div class="hd"><h1>School</h1><span class="muted">Import a school calendar on the Connect tab</span></div>';
  h2 += '<div class="row" style="margin-top:10px">' + SEED.courses.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>';
  h2 += '<div class="card" style="margin-top:14px"><form data-form="task" class="row"><input type="text" name="title" placeholder="Assignment or reminder" required style="flex:1;min-width:160px"><select name="course"><option value="">No class</option>' + SEED.courses.concat(['Science Fair', 'Civic', 'SAT', 'Other']).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select><select name="type"><option>Assignment</option><option>Test</option><option>Project</option><option>Form</option><option>Reminder</option></select><input type="date" name="due"><button class="btn">Add</button></form></div>';
  h2 += clsPanel();
  h2 += '<h2>Open (' + open.length + ')</h2><div class="card"><ul class="list">' + (open.length ? open.map(taskLi).join('') : '<li class="muted">All clear.</li>') + '</ul></div>';
  h2 += '<details><summary>Done (' + done.length + ')</summary><ul class="list">' + done.map(taskLi).join('') + '</ul></details>';
  return h2;
}

function vSat() {
  var tests = S.sat.tests;
  var h2 = '<div class="hd"><h1>SAT Prep</h1><span class="muted">Test dates and weekly plan</span></div>';
  var next = SEED.sat.filter(function (s) { return daysUntil(s.reg) >= 0; })[0];
  h2 += '<div class="grid">' + (next ? '<div class="card hot"><small>Next test: ' + fmt(next.date) + '</small><b class="big">' + daysUntil(next.reg) + ' days</b><small>to register (late fee after ' + fmt(next.late) + ')</small></div>' : '') + '</div>';
  h2 += '<h2>Test dates</h2><div class="wrap"><table><thead><tr><th>Test day</th><th>Register by</th><th>Late deadline</th><th>Left</th></tr></thead><tbody>' + SEED.sat.map(function (s) { return '<tr><td>' + fmt(s.date) + '</td><td>' + fmt(s.reg) + '</td><td>' + fmt(s.late) + '</td><td>' + leftTxt(s.reg) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  h2 += '<h2>Weekly checklist <span class="tag ex">starter plan, edit to taste</span></h2><div class="card"><ul class="list">' + SEED.plan.map(function (p, i) { return '<li><input type="checkbox" data-act="plan" data-id="p' + i + '"' + (S.sat.plan['p' + i] ? ' checked' : '') + '><span class="t">' + esc(p) + '</span></li>'; }).join('') + '</ul><button class="btn ghost small" data-act="resetplan">Reset checklist for a new week</button></div>';
  return h2;
}

/* ---------- auto planner: place work blocks in free time before deadlines ---------- */
var PLAN = { items: [], msg: '' };
function hmin(t) { var q = String(t || '0:0').split(':'); return (+q[0]) * 60 + (+q[1]); }
function minhm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function freeSlots(d, extra, need) {
  var iso = isoOf(d), we = dowIdx(d) >= 5, start = we ? 600 : 960, end = we ? 1080 : 1260, now = new Date();
  if (iso === todayIso()) start = Math.max(start, Math.ceil((now.getHours() * 60 + now.getMinutes() + 20) / 15) * 15);
  var busy = eventsOn(d).map(function (e) { return [hmin(e.start), hmin(e.end)]; }).concat(extra.filter(function (x) { return x.date === iso; }).map(function (x) { return [hmin(x.start), hmin(x.end)]; })).sort(function (a, b) { return a[0] - b[0]; });
  var out = [], cur = start; busy.forEach(function (b) { if (b[0] - cur >= need) out.push([cur, b[0]]); cur = Math.max(cur, b[1] + 10); }); if (end - cur >= need) out.push([cur, end]); return out;
}
function planWeek() {
  var tdy = todayIso(), want = [], out = [];
  allDeadlines().forEach(function (x) {
    var n = daysUntil(x.iso); if (n < 0 || n > 21) return;
    if (x.task) want.push({ title: 'Work on: ' + shortTxt(x.title, 40), due: x.iso, min: 45, n: 1, rank: n - 2, cat: 'school', why: 'Task due ' + fmt(x.iso) });
    else if (x.view === 'comps' || x.view === 'progs') { var st = starsOf(x.id); want.push({ title: 'Work on ' + shortTxt(x.title, 34), due: x.iso, min: 60, n: st >= 4 ? 2 : 1, rank: n - st * 2, cat: 'sci', why: st + ' stars, due ' + fmt(x.iso) }); }
  });
  var nextSat = SEED.sat.filter(function (t) { return daysUntil(t.date) > 0 && daysUntil(t.date) < 120; })[0];
  if (nextSat && !eventsOn(new Date()).concat([1, 2, 3, 4, 5, 6].map(function (i) { var d = new Date(); d.setDate(d.getDate() + i); return eventsOn(d); }).reduce(function (a, b) { return a.concat(b); }, [])).some(function (e) { return e.cat === 'sat'; })) want.push({ title: 'SAT practice', due: isoOf(new Date(Date.now() + 6 * 864e5)), min: 60, n: 3, rank: 5, cat: 'sat', why: 'Test ' + fmt(nextSat.date) });
  want.sort(function (a, b) { return a.rank - b.rank; });
  var perDay = {};
  want.forEach(function (w) {
    for (var k = 0; k < w.n; k++) {
      var best = null;
      for (var i = 0; i < 7; i++) {
        var d = new Date(); d.setDate(d.getDate() + i); var iso = isoOf(d); if (iso > w.due) break; if ((perDay[iso] || 0) >= 3) continue;
        var slots = freeSlots(d, out, w.min); if (!slots.length) continue;
        if (!best || (perDay[iso] || 0) < (perDay[best.iso] || 0)) best = { iso: iso, slot: slots[0] };
      }
      if (best) { out.push({ title: w.title, date: best.iso, start: minhm(best.slot[0]), end: minhm(best.slot[0] + w.min), cat: w.cat, why: w.why, on: true }); perDay[best.iso] = (perDay[best.iso] || 0) + 1; }
    }
  });
  return out.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
}
function planAdd(items) { var n = 0; items.forEach(function (x) { if (x.on) { S.events.push({ id: uid('e'), title: x.title, start: x.start, end: x.end, cat: x.cat, date: x.date }); n++; } }); save(); return n; }
function planPanel() {
  var o = '<h2>Plan my week</h2><div class="card">';
  if (PLAN.msg) o += '<p class="ok-msg">' + esc(PLAN.msg) + '</p>';
  if (!PLAN.items.length) return o + '<p class="muted">Finds free time after school and before your deadlines, ranked by your stars. You review it before anything is added.</p><div class="row"><button class="btn" data-act="planrun">Make a plan</button></div></div>';
  o += '<div class="cls-list">' + PLAN.items.map(function (x, i) { return '<label class="plan-r"><input type="checkbox" data-act="planpick" data-i="' + i + '"' + (x.on ? ' checked' : '') + '><span><b>' + esc(x.title) + '</b><small>' + esc(fmtShort(x.date)) + ', ' + esc(fmtTime(x.start)) + ' to ' + esc(fmtTime(x.end)) + ' · ' + esc(x.why) + '</small></span></label>'; }).join('') + '</div>';
  return o + '<div class="row" style="margin-top:10px"><button class="btn" data-act="planadd">Add ' + PLAN.items.filter(function (x) { return x.on; }).length + ' to my schedule</button><button class="btn ghost" data-act="planrun">Redo</button><button class="btn ghost" data-act="planclear">Cancel</button></div></div>';
}
function vSched() {
  var now = new Date(), ti = dowIdx(now);
  var h2 = '<div class="hd"><h1>Schedule</h1></div>';
  h2 += '<div class="card" style="margin-top:12px"><form data-form="event" class="row"><input type="text" name="title" placeholder="Block or event" required style="flex:1;min-width:150px"><input type="time" name="start" value="16:00" required><input type="time" name="end" value="17:00" required><select name="cat"><option value="sat">SAT</option><option value="sci">Science</option><option value="school">School</option><option value="life">Life</option></select><select name="repeat"><option value="weekly">Every week on...</option><option value="once">One date</option></select><select name="dow">' + DOW.map(function (d, i) { return '<option value="' + i + '"' + (i === ti ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select><input type="date" name="date" value="' + (CAL.sel || todayIso()) + '"><button class="btn">Add</button></form><small class="muted">For "Every week" pick the weekday. For "One date" the date is used.</small></div>';
  h2 += planPanel();
  h2 += '<h2>Calendar</h2><div class="card">' + calHtml() + '</div>';
  var wk = allDeadlines().filter(function (x) { var n = daysUntil(x.iso); return n >= 0 && n <= 7; });
  h2 += '<h2>Deadlines in the next 7 days</h2><div class="card"><ul class="list">' + (wk.length ? wk.map(function (x) { return '<li><span class="t">' + esc(x.title) + ' <span class="tag">' + x.kind + '</span></span>' + leftTxt(x.iso) + '</li>'; }).join('') : '<li class="muted">None.</li>') + '</ul></div>';
  return h2;
}

function vConnect() {
  var c = cfg(), s = session();
  var h2 = '<div class="hd"><h1>Connect</h1></div>';

  var ac = window.AI ? AI.cfg() : {};
  h2 += '<div class="two"><div><h2>Assistant</h2><div class="card"><p>Turn on the web-searching assistant with your Anthropic API key. It is stored only in this browser and is never synced.</p><form data-form="ai" style="display:grid;gap:8px"><input type="password" name="key" placeholder="sk-ant-..." value="' + esc(ac.key || '') + '" autocomplete="off"><input type="text" name="model" placeholder="Model" value="' + esc(ac.model || '') + '"><label><input type="checkbox" name="web"' + (ac.web !== false ? ' checked' : '') + '> Allow web search</label><div class="row"><button class="btn">Save</button><button type="button" class="btn ghost" data-act="clearai">Remove key</button></div></form></div></div></div>';
  h2 += '<h2>Colors</h2><div class="card"><div class="pal">' + PALS.map(function (x) { var on = (lsGet('pd_pal') || 'apple') === x[0]; return '<button data-act="pal" data-id="' + x[0] + '" class="' + (on ? 'on' : '') + '"><i style="background:linear-gradient(90deg,' + x[3] + ' 55%,' + x[2] + ' 55%)"></i>' + x[1] + '</button>'; }).join('') + '</div></div>';
  h2 += '<div class="two"><div><h2>Account and sync</h2><div class="card"><p>' + (cloudOn() ? (s ? 'Signed in as <b>' + esc(s.email) + '</b>. <span class="sync" id="syncmsg">' + esc(syncMsg) + '</span>' : 'Cloud sync is configured. Sign out and back in to link your account.') : 'Right now your data lives only in this browser. Add your Supabase URL and key below to sync across phone and laptop with a real login.') + '</p>' +
    '<div class="row">' + (s ? '<button class="btn" data-act="syncnow">Sync now</button><button class="btn ghost" data-act="signout">Sign out</button>' : '') + (S.profile.pinHash && !cloudOn() ? (bioOn() ? '<button class="btn ghost" data-act="biooff">Turn off Touch ID</button>' : '<button class="btn ghost" data-act="bioon">Turn on Touch ID</button>') : '') + '</div></div>' +
    '<h2>Supabase keys</h2><div class="card"><form data-form="fb" style="display:grid;gap:8px"><input type="text" name="url" placeholder="Project URL" value="' + esc(c.url || '') + '"><input type="text" name="key" placeholder="anon / publishable key" value="' + esc(c.key || '') + '"><div class="row"><button class="btn">Save keys</button><button type="button" class="btn ghost" data-act="clearfb">Remove keys</button></div></form></div></div>';
  h2 += '<div><h2>Apple Calendar</h2><div class="card"><p>Web pages cannot write into Apple Calendar directly, so there are two links. <b>Subscribe</b> keeps a calendar called Palash Deadlines updated on your Mac, iPhone and iPad. <b>Add once</b> imports your current list including tasks you added here.</p><div class="row"><a class="btn" href="' + subUrl() + '">Subscribe in Apple Calendar</a><button class="btn ghost" data-act="ics">Add once (.ics)</button><button class="btn ghost" data-act="notify">Browser notifications</button></div><p class="muted">Subscribe works from your hosted site (GitHub Pages) and shows the deadlines saved in the repo file deadlines.ics. Every item reminds you 7 days, 3 days and 1 day before. Browser notifications only fire while this tab is open.</p></div>' +
    '<h2>Bring in school assignments</h2><div class="card"><p>Export or subscribe to your school calendar (Google Classroom, Canvas, Schoology and PowerSchool all offer an .ics or calendar link) and import the file here. Items with due dates become tasks.</p><input type="file" id="icsfile" accept=".ics,text/calendar"></div>' +
    '<h2>Backup</h2><div class="card"><div class="row"><button class="btn ghost" data-act="export">Export my data</button><label class="btn ghost" style="cursor:pointer">Import data<input type="file" id="jsonfile" accept=".json" hidden></label></div></div></div></div>';
  h2 += lookCard();
  h2 += '<h2>About me</h2><div class="card"><p class="muted">Private notes the assistant reads so its advice fits you. Saved only in this browser. They are never sent to the repo or the sync. Paste your resume or a short bio on each device.</p><form data-form="profile" style="display:grid;gap:8px"><textarea class="paste" name="txt" placeholder="Paste your resume or a short bio">' + esc(lsGet('pd_profile_v1') || '') + '</textarea><div class="row"><button class="btn">Save on this device</button><span class="muted">' + (lsGet('pd_profile_v1') || '').length + ' characters saved</span></div></form></div>';
  h2 += '<h2>Voice</h2><div class="card"><p class="muted">Read aloud uses your device voices by default, instantly and offline. Add an OpenAI key below for a much more natural voice. It is stored only on this device.</p><div class="row"><select data-act="ttsvoice" aria-label="Voice"><option value="">Best available voice</option>' + ttsVoices().map(function (v) { return '<option value="' + esc(v.name) + '"' + (ttsCfg().voice === v.name ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select><label class="muted">Speed <input type="range" min="0.8" max="1.8" step="0.1" value="' + ttsCfg().rate + '" data-act="ttsrate"> <span id="ttsrv">' + ttsCfg().rate + 'x</span></label><button class="btn ghost small" data-act="ttstest">Test voice</button></div><div class="row" style="margin-top:8px"><input type="password" data-act="ttsoai" placeholder="OpenAI key for a natural voice (optional)" value="' + esc(ttsCfg().oai || '') + '" style="flex:1;min-width:200px"><select data-act="ttsoaivoice" aria-label="Natural voice">' + ['nova', 'alloy', 'shimmer', 'coral', 'echo', 'onyx', 'fable'].map(function (n) { return '<option' + ((ttsCfg().oaiVoice || 'nova') === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><button class="btn ghost small" data-act="ttsstop">Stop</button></div></div>';
  h2 += '<details><summary>Set up login and cross-device sync with Supabase</summary><ol><li>Create a project at supabase.com.</li><li>Authentication, Providers, Email: turn off Confirm email.</li><li>SQL Editor: run the SQL below.</li><li>Project Settings, API: copy the Project URL and the anon key into the form above.</li><li>Sign in with Create account. After that, turn off sign-ups in Authentication, Sign In / Providers.</li></ol><pre>create table dashboards (uid uuid primary key references auth.users(id) on delete cascade, json text, updated bigint);\nalter table dashboards enable row level security;\ncreate policy own on dashboards for all using (auth.uid() = uid) with check (auth.uid() = uid);</pre><p class="muted">The anon key is not a secret. The row level security policy is what protects your data.</p></details>';
  h2 += '<details><summary>Put it on your GitHub repo and a web address</summary><pre>git clone https://github.com/palashraks-afk/Dashboard\ncd Dashboard\n# copy index.html, styles.css, app.js, data.js into this folder\ngit add . &amp;&amp; git commit -m "Add daily dashboard" &amp;&amp; git push</pre><p>Then on GitHub: Settings, Pages, Source "Deploy from a branch", branch main, folder /root. Your dashboard will be live at https://palashraks-afk.github.io/Dashboard/ in a minute or two. Change deadlines or add programs by editing data.js.</p></details>';
  return h2;
}

/* ---------- ics ---------- */
function icsName(x) {
  if (x.kind === 'Competition') return 'Submit ' + x.title;
  if (x.kind === 'Internship' || x.kind === 'Program') return 'Apply to ' + x.title;
  if (x.kind === 'SAT') return x.title.replace(/^SAT registration deadline \(test (.*), \d{4}\)$/, 'Register for SAT ($1)');
  return x.title;
}
function icsDesc(x) {
  var it = x.id ? findItem(x.id) : null; if (!it) return '';
  return (it.todo || []).join(' ') + (it.link ? ' ' + it.link : '');
}function icsEscape(s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
function subUrl() { var u = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + 'deadlines.ics'; return u.replace(/^https?:/, 'webcal:'); }
function buildIcs() {
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sol//EN', 'X-WR-CALNAME:Palash Deadlines', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'];
  allDeadlines().forEach(function (x, i) {
    var a = x.iso.replace(/-/g, ''), d = parseIso(x.iso); d.setDate(d.getDate() + 1);
    L.push('BEGIN:VEVENT', 'UID:pd-' + (x.id || ('x' + i)) + '-' + a + '@dashboard', 'DTSTAMP:' + todayIso().replace(/-/g, '') + 'T000000Z', 'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + isoOf(d).replace(/-/g, ''), 'SUMMARY:' + icsEscape(icsName(x)), 'DESCRIPTION:' + icsEscape(icsDesc(x)), 'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Due in a week', 'END:VALARM', 'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', 'DESCRIPTION:Due in 3 days', 'END:VALARM', 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Due tomorrow', 'END:VALARM', 'END:VEVENT');
  });
  var stampD = todayIso().replace(/-/g, ''), BD = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  (S.events || []).forEach(function (e) {
    if (e.example || !e.start || !e.end) return;
    var t1 = e.start.replace(':', '') + '00', t2 = e.end.replace(':', '') + '00', day = e.date ? e.date.replace(/-/g, '') : '', rr = '';
    if (!day && e.days && e.days.length) {
      var d0 = new Date(); for (var k = 0; k < 7 && e.days.indexOf(dowIdx(d0)) < 0; k++) d0.setDate(d0.getDate() + 1);
      day = isoOf(d0).replace(/-/g, ''); rr = 'RRULE:FREQ=WEEKLY;BYDAY=' + e.days.map(function (i) { return BD[i]; }).join(',');
    }
    if (!day) return;
    L.push('BEGIN:VEVENT', 'UID:pd-ev-' + e.id + '@dashboard', 'DTSTAMP:' + stampD + 'T000000Z', 'DTSTART:' + day + 'T' + t1, 'DTEND:' + day + 'T' + t2, 'SUMMARY:' + icsEscape(e.title));
    if (rr) L.push(rr);
    L.push('BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Starting soon', 'END:VALARM', 'END:VEVENT');
  });  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function download(name, text, type) {
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function importIcs(text) {
  var lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/), added = 0, cur = null;
  lines.forEach(function (ln) {
    if (ln === 'BEGIN:VEVENT') cur = {};
    else if (ln === 'END:VEVENT' && cur) {
      if (cur.title && cur.date && !S.tasks.some(function (t) { return t.title === cur.title && t.due === cur.date; })) { S.tasks.push({ id: uid('t'), title: cur.title, due: cur.date, course: '', type: 'Imported', done: false }); added++; }
      cur = null;
    } else if (cur) {
      var m = ln.match(/^([A-Z-]+)[^:]*:(.*)$/); if (!m) return;
      if (m[1] === 'SUMMARY') cur.title = m[2].replace(/\\([,;n\\])/g, function (x, c) { return c === 'n' ? ' ' : c; });
      if ((m[1] === 'DUE' || m[1] === 'DTSTART') && !cur.date) { var d = m[2].replace(/\D/g, '').slice(0, 8); if (d.length === 8) cur.date = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8); }
    }
  });
  return added;
}

/* ---------- text to speech (browser voices: instant, offline, no key) ---------- */
var TTSKEY = 'pd_tts_v1', ttsId = 0, ttsOn = false;
var SAY = { SAT: 'S A T', PSAT: 'P S A T', AP: 'A P', ISEF: 'eye-sef', SIMSEF: 'sim-sef', JSHS: 'J S H S', USACO: 'you-sack-oh', NIH: 'N I H', SIP: 'S I P', SEAP: 'seep', AEOP: 'A E O P', MIT: 'M I T', UCLA: 'U C L A', UCSF: 'U C S F', UCSB: 'U C S B', UCSD: 'U C S D', UCI: 'U C I', UCR: 'U C R', UC: 'U C', USC: 'U S C', NYU: 'N Y U', BWSI: 'B W S I', RSI: 'R S I', AIMI: 'A I M I', SRP: 'S R P', SIMR: 'simmer', STAR: 'star', PRIMES: 'primes', CNSI: 'C N S I', SSTP: 'S S T P', ASDRP: 'A S D R P', CHLA: 'C H L A', NIST: 'nist', NASA: 'NASA', JPL: 'J P L', AFRL: 'A F R L', APL: 'A P L', GPA: 'G P A', PDF: 'P D F', AI: 'A I', ML: 'M L', USA: 'U S A', STEM: 'stem', SHTEM: 'shtem', RISE: 'rise', BSAS: 'B S A S', BEYA: 'B E Y A', REHS: 'R E H S', SEES: 'sees', WFIRM: 'W F I R M', DSI: 'D S I', EEI: 'E E I', ABC: 'A B C', IMO: 'I M O', RMP: 'R M P', SCIP: 'S C I P', SRTP: 'S R T P', INSPIRE: 'inspire', DREAM: 'dream', CS4CS: 'C S 4 C S', ICS: 'I C S', ASSIP: 'A S S I P', COM: 'C O M', SoCal: 'So Cal', FlowPhase: 'Flow Phase', ExploraVision: 'Explora Vision', BioGENEius: 'Bio Genius', PT: 'Pacific time', ET: 'Eastern time', CT: 'Central time', ICS: 'I C S' };
var MONTHS = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Sept: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
function ordinal(n) { n = +n; var v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); }
function speakable(t) {
  t = String(t || '');
  t = t.replace(/\[([^\]]+)\]\(https?:[^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, 'the link on screen').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, 'the address on screen');
t = t.replace(/^\s*[-\u2022*]\s+/gm, '').replace(/\n+/g, '. ');
  t = t.replace(/[*`#_]/g, '').replace(/&/g, ' and ').replace(/\s*[\u2013\u2014]\s*/g, ', ').replace(/\u2026/g, '.');
  t = t.replace(/\b(20\d\d)-(\d\d)-(\d\d)\b/g, function (m, y, mo, d) { var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return names[+mo - 1] + ' ' + ordinal(d); });
  t = t.replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:,\s*(20\d\d))?\b(?!:)/g, function (m, mo, d, y) { return MONTHS[mo] + ' ' + ordinal(d) + (y ? ', ' + y : ''); });
  t = t.replace(/\bMay\s+(\d{1,2})\b(?!:)/g, function (m, d) { return 'May ' + ordinal(d); });
  t = t.replace(/\b(\d{1,2}):(\d\d)\s*([ap])\.?m\.?/gi, function (m, h, mi, ap) { return h + (mi === '00' ? '' : ' ' + mi) + ' ' + ap.toUpperCase() + ' M'; });
  t = t.replace(/\b(\d{1,2})\s*([ap])\.?m\.?\b/gi, function (m, h, ap) { return h + ' ' + ap.toUpperCase() + ' M'; });
  t = t.replace(/\b(\d+)\s*d\b/g, '$1 days').replace(/\bw\/\s*/g, 'with ').replace(/\bvs\.?\b/g, 'versus').replace(/\b(\d+)\+/g, '$1 plus');
  t = t.replace(/\b[A-Za-z][A-Za-z0-9]*\b/g, function (w) { return Object.prototype.hasOwnProperty.call(SAY, w) ? SAY[w] : w; });
  return t.replace(/\s+/g, ' ').trim();
}
function ttsCfg() { var c = {}; try { c = JSON.parse(lsGet(TTSKEY) || '{}'); } catch (e) {} if (!c.rate) c.rate = 1.05; return c; }
function ttsVoices() { return ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); }) : []; }
function pickVoice() {
  var c = ttsCfg(), vs = ttsVoices(); if (!vs.length) return null;
  if (c.voice) { var m = vs.filter(function (v) { return v.name === c.voice; })[0]; if (m) return m; }
  var rank = [/natural|neural|online/i, /premium|enhanced|siri/i, /google us english|samantha|ava|allison|zoe|aria|jenny|guy|aaron|nicky/i];
  for (var i = 0; i < rank.length; i++) { var f = vs.filter(function (v) { return rank[i].test(v.name) && /en[-_]US/i.test(v.lang); })[0]; if (f) return f; }
  return vs.filter(function (v) { return /en[-_]US/i.test(v.lang); })[0] || vs[0];
}
var ttsAudio = null, ttsDone = null;
function ttsStop() { ttsId++; ttsOn = false; ttsDone = null; try { speechSynthesis.cancel(); } catch (e) {} if (ttsAudio) { try { ttsAudio.pause(); } catch (e) {} ttsAudio = null; } }
function ttsParts(text) {
  var chunks = speakable(text).match(/[^.!?;:]+[.!?;:]*\s*/g) || [], parts = [], cur = '';
  chunks.forEach(function (c) { if (cur && (cur + c).length > 140) { parts.push(cur); cur = c; } else cur += c; });
  if (cur.trim()) parts.push(cur); return parts;
}
function browserSay(parts, my, done) {
  var c = ttsCfg(), v = pickVoice();
  (function next(i) {
    if (my !== ttsId) return;
    if (i >= parts.length) { ttsOn = false; if (done) done(); return; }
    var u = new SpeechSynthesisUtterance(parts[i]); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = c.rate || 1.05; u.pitch = 1; u.onend = function () { next(i + 1); }; u.onerror = function () { if (my === ttsId) { ttsOn = false; if (done) done(); } };
    speechSynthesis.speak(u);
  })(0);
}
function cloudSay(parts, my, c, done) {
  function get(i) { return fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.oai }, body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: c.oaiVoice || 'nova', input: parts[i], instructions: 'Speak naturally and warmly, like a calm helpful friend. Keep a smooth, even pace and normal intonation.', response_format: 'mp3' }) }).then(function (r) { if (!r.ok) throw new Error('voice ' + r.status); return r.blob(); }).then(function (b) { return URL.createObjectURL(b); }); }
  function play(i, pr) {
    if (my !== ttsId) return;
    if (i >= parts.length) { ttsOn = false; if (done) done(); return; }
    var pre = i + 1 < parts.length ? get(i + 1) : null;
    pr.then(function (url) {
      if (my !== ttsId) return; var a = new Audio(url); ttsAudio = a;
      a.onended = function () { URL.revokeObjectURL(url); play(i + 1, pre); };
      a.onerror = function () { play(i + 1, pre); };
      var pp = a.play(); if (pp && pp.catch) pp.catch(function () { browserSay(parts.slice(i), my, done); });
    }).catch(function () { browserSay(parts.slice(i), my, done); });
  }
  play(0, get(0));
}
function say(text, done) {
  if (!('speechSynthesis' in window) && !ttsCfg().oai) { alert('This browser has no built-in speech.'); return; }
  if (ttsOn && !done) { ttsStop(); return; }
  var parts = ttsParts(text); if (!parts.length) { if (done) done(); return; }
  ttsStop(); var my = ttsId, c = ttsCfg(); ttsOn = true; ttsDone = done || null;
  if (c.oai) cloudSay(parts, my, c, done); else browserSay(parts, my, done);
}
function dayBrief() {
  var now = new Date(), h = now.getHours(), tdy = todayIso(), dl = allDeadlines().filter(function (x) { return x.id || x.kind === 'SAT'; });
  var nm = function (x) { return x.kind === 'SAT' ? x.title.replace(/ \(test.*$/, '') : x.title; };
  var out = [(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (S.profile.name || 'Palash') + '. Today is ' + now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(/(\d+)$/, function (d) { return ordinal(d); }) + '.'];
  var over = dl.filter(function (x) { return x.iso < tdy && x.task; }), dt = dl.filter(function (x) { return x.iso === tdy; });
  var soon = dl.filter(function (x) { var n = daysUntil(x.iso); return n >= 1 && n <= 3; });
  if (over.length) out.push('Overdue: ' + over.slice(0, 4).map(nm).join(', ') + '.');
  out.push(dt.length ? 'Due today: ' + dt.slice(0, 6).map(nm).join(', ') + '.' : 'Nothing is due today.');
  var ev = eventsOn(now); if (ev.length) out.push('On your schedule: ' + ev.map(function (e) { return e.title + ' at ' + fmtTime(e.start); }).join(', ') + '.');
  if (soon.length) out.push('Coming up in the next three days: ' + soon.slice(0, 5).map(function (x) { return nm(x) + ' on ' + fmtShort(x.iso); }).join(', ') + '.');
  return out.join(' ');
}
function itemSpeech(id) { var it = findItem(id); if (!it) return ''; return it.title + '. ' + (it.dateText ? 'Date: ' + it.dateText + '. ' : '') + (it.todo.length ? 'What to do: ' + it.todo.join(' ') + ' ' : '') + it.facts.filter(Boolean).join(' '); }
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = function () { if (view === 'connect') render(); };
/* ---------- render ---------- */
var app = document.getElementById('app');
function countUp() {
  if (document.hidden || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var els = document.querySelectorAll('[data-count]'), t0 = performance.now();
  els.forEach(function (el) { el.textContent = '0'; });
  setTimeout(function () { els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); }); }, 900);
  (function tick(now) {
    var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
    els.forEach(function (el) { el.textContent = Math.round(+el.getAttribute('data-count') * e); });
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}
function ringHtml(n) {
  var pct = Math.max(6, Math.round(100 * (1 - Math.min(Math.max(n, 0), 30) / 30)));
  return '<div class="ring' + (n === 0 ? ' now' : '') + '"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="rb" cx="40" cy="40" r="34"/><circle class="rf" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="' + pct + ' 100"/></svg><b>' + (n === 0 ? 'Today' : n) + '</b><small>' + (n === 0 ? '' : n === 1 ? 'day' : 'days') + '</small></div>';
}
function strip14(dl) {
  var o = '<h2>Next 14 days</h2><div class="card"><div class="strip">';
  for (var i = 0; i < 14; i++) {
    var d = new Date(); d.setDate(d.getDate() + i); var iso = isoOf(d), it = dl.filter(function (x) { return x.iso === iso && (x.id || x.kind === 'SAT'); }), n = it.length;
    o += '<button class="st-d ' + (n ? urg(iso) : '') + (i === 0 ? ' now' : '') + '" data-act="calday" data-id="' + iso + '" style="--h:' + Math.min(n, 4) + ';--i:' + i + '" title="' + esc(n ? it.map(function (x) { return shortTxt(x.title, 30); }).join(', ') : 'Nothing due') + '"><i></i><span>' + d.getDate() + '</span><small>' + DOW[dowIdx(d)].slice(0, 1) + '</small></button>';
  }
  return o + '</div></div>';
}
function priorities(dl) {
  var c = dl.filter(function (x) { return x.id && (x.view === 'comps' || x.view === 'progs') && daysUntil(x.iso) >= 0 && daysUntil(x.iso) <= 75; });
  c.sort(function (a, b) { return (starsOf(b.id) * 14 - daysUntil(b.iso)) - (starsOf(a.id) * 14 - daysUntil(a.iso)); });
  if (!c.length) return '';
  return '<h2>Top priorities</h2><div class="card"><ul class="list">' + c.slice(0, 4).map(function (x) { return '<li><span class="t click" data-act="detail" data-id="' + x.id + '"><b>' + esc(shortTxt(x.title, 40)) + '</b> ' + starsHtml(starsOf(x.id)) + '</span>' + leftTxt(x.iso) + '</li>'; }).join('') + '</ul><small class="muted">Ranked by your star rating and how soon it is due.</small></div>';
}
function glowInit() {
  if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest('.card,.row2,.hero,.item'); if (!t) return;
    var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
}
glowInit();
var lastView = null;
function render() {
  var viewChanged = view !== lastView; lastView = view;
  if (S && S.events) S.events = S.events.filter(function (e) { return !e.example; });
  var body = view === 'today' ? vToday() : view === 'comps' ? vComps() : view === 'progs' ? vProgs() : view === 'school' ? vSchool() : view === 'sat' ? vSat() : view === 'sched' ? vSched() : vConnect();
  app.innerHTML = '<div class="shell"><nav class="side"><div class="brand"><svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#000"/><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd37e"/><stop offset="1" stop-color="#ff7a45"/></linearGradient></defs><path d="M244.4 143.5 A130.6 130.6 0 0 0 244.4 404.6 Z" fill="#eef2f5"/><path d="M268.2 107.8 A130.6 130.6 0 0 1 268.2 369.2 Z" fill="url(#sg)"/></svg><span>Sol</span></div>' + NAV.map(function (n) { return '<button data-nav="' + n[0] + '" class="' + (view === n[0] ? 'on' : '') + '">' + n[1] + '</button>'; }).join('') + '<div class="grow"></div><button data-act="ask" class="ask">Ask <kbd>Ctrl K</kbd></button></nav><main' + (viewChanged ? ' class="enter"' : '') + '>' + body + '</main></div>';
  if (viewChanged) countUp();
  if (window.AI) AI.draw();
}
function go(v) { view = v; render(); window.scrollTo(0, 0); }

var LOOKKEY = 'pd_look_v1', ACCENTS = ['#0a74ff', '#5b5bf0', '#8b5cf6', '#e0457b', '#ef6c3a', '#17a398', '#2f9e44', '#374151'];
function lookCfg() { var c = {}; try { c = JSON.parse(lsGet(LOOKKEY) || '{}'); } catch (e) {} return c; }
function applyLook() {
  var c = lookCfg(), r = document.documentElement;
  if (c.mode === 'light' || c.mode === 'dark') r.setAttribute('data-theme', c.mode); else r.removeAttribute('data-theme');
  if (c.accent) { r.style.setProperty('--accent', c.accent); r.style.setProperty('--accent-soft', 'color-mix(in srgb, ' + c.accent + ' 16%, transparent)'); r.style.setProperty('--accent-fg', '#ffffff'); }
  else { r.style.removeProperty('--accent'); r.style.removeProperty('--accent-soft'); r.style.removeProperty('--accent-fg'); }
  if (c.glass) r.style.setProperty('--glass-a', c.glass + '%'); else r.style.removeProperty('--glass-a');
}
function lookCard() {
  var c = lookCfg();
  return '<h2>Appearance</h2><div class="card"><div class="row"><span class="muted">Mode</span><div class="seg" role="group">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (m) { return '<button data-act="lookmode" data-id="' + m[0] + '" class="' + ((c.mode || 'auto') === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div><div class="row" style="margin-top:10px"><span class="muted">Accent</span><div class="swatches">' + ACCENTS.map(function (a) { return '<button class="sw' + (c.accent === a ? ' on' : '') + '" data-act="accent" data-id="' + a + '" style="background:' + a + '" aria-label="Accent ' + a + '"></button>'; }).join('') + '<button class="sw reset' + (!c.accent ? ' on' : '') + '" data-act="accent" data-id="" aria-label="Default accent">A</button></div></div><div class="row" style="margin-top:10px"><label class="muted">Glass <input type="range" min="30" max="92" value="' + (c.glass || 58) + '" data-act="glass"></label></div></div>';
}
var BIOKEY = 'pd_bio_v1';
function b64(buf) { var a = new Uint8Array(buf), t = ''; for (var i = 0; i < a.length; i++) t += String.fromCharCode(a[i]); return btoa(t); }
function unb64(x) { var t = atob(x), a = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; }
function bioSupported() { return !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext); }
function bioOn() { return !!lsGet(BIOKEY); }
function bioEnroll() {
  if (!bioSupported()) { alert('Touch ID needs https (like GitHub Pages) and a browser that supports it.'); return; }
  var ch = crypto.getRandomValues(new Uint8Array(32)), uid = crypto.getRandomValues(new Uint8Array(16));
  navigator.credentials.create({ publicKey: { challenge: ch, rp: { name: 'Sol' }, user: { id: uid, name: 'palash', displayName: 'Palash' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } })
    .then(function (c) { lsSet(BIOKEY, b64(c.rawId)); alert('Touch ID is on for this device.'); render(); })
    .catch(function () { alert('Touch ID was not set up.'); });
}
function bioUnlock() {
  var id = lsGet(BIOKEY); if (!id || !bioSupported()) return;
  navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(id) }], userVerification: 'required', timeout: 60000 } })
    .then(function () { enter(); })
    .catch(function () { var er = document.getElementById('err'); if (er) er.textContent = 'Touch ID did not work. Use your PIN.'; });
}
function loginScreen(msg) {
  var cloud = cloudOn(), first = !S.profile.pinHash;
  var h2 = '<div class="login"><div class="box"><svg class="logo" style="width:56px;height:56px" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#000"/><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd37e"/><stop offset="1" stop-color="#ff7a45"/></linearGradient></defs><path d="M244.4 143.5 A130.6 130.6 0 0 0 244.4 404.6 Z" fill="#eef2f5"/><path d="M268.2 107.8 A130.6 130.6 0 0 1 268.2 369.2 Z" fill="url(#sg)"/></svg><h1>Sol</h1>';
  if (cloud && !session()) {
    h2 += '<p class="muted">Enter your PIN. First time on this account? Type a PIN and tap Set up.</p><form data-form="login" style="display:grid;gap:10px"><input type="password" name="pin" placeholder="PIN" inputmode="numeric" minlength="4" required autofocus autocomplete="off"><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn" name="mode" value="in">Unlock</button><button type="submit" class="btn ghost" name="mode" value="up">Set up (first time)</button></form>';
  } else if (first) {
    h2 += '<p class="muted">Set a PIN for this device, or continue without one. This is a screen lock for this browser only. Your data stays on this device until you connect cloud sync on the Connect tab.</p><form data-form="setpin" style="display:grid;gap:10px"><input type="text" name="name" placeholder="Your name" value="' + esc(S.profile.name || '') + '"><input type="password" name="pin" placeholder="PIN (4 or more digits)" inputmode="numeric" minlength="4"><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn">Set PIN and open</button><button type="button" class="btn ghost" data-act="nopin">Continue without a PIN</button></form>';
  } else {
    h2 += '<p class="muted">Enter your PIN.</p><form data-form="pin" style="display:grid;gap:10px"><input type="password" name="pin" placeholder="PIN" inputmode="numeric" autofocus><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn">Unlock</button>' + (bioOn() ? '<button type="button" class="btn ghost" data-act="bio">Use Touch ID</button>' : '') + '</form>';
  }
  app.innerHTML = h2 + '</div></div>';
  if (!cloud && !first && bioOn() && !msg) setTimeout(bioUnlock, 250);
}
function enter() { ssSet(UNLOCK, '1'); view = 'today'; render(); startReminders(); }
var SOLPW = 'sol-v1-open-sync-account';
function boot() {
  load();
  if (!cloudOn()) { enter(); return; }
  setSync('Loading...');
  var go = session() ? Promise.resolve() : fbAuth('in', SOLMAIL, SOLPW).catch(function () { return fbAuth('up', SOLMAIL, SOLPW); });
  go.then(function () { return cloudPull(); }).then(function (changed) { if (changed) setSync('Loaded from cloud'); else cloudPush(); enter(); }).catch(function (e) { setSync('Offline: ' + e.message); enter(); });
}

function autoPull() {
  if (!cloudOn() || !session() || document.hidden) return;
  cloudPull().then(function (ch) { if (ch) { setSync('Updated ' + new Date().toLocaleTimeString()); var t = document.activeElement && document.activeElement.tagName; if (!/INPUT|TEXTAREA|SELECT/.test(t || '')) render(); } }).catch(function () {});
}
setInterval(autoPull, 15000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) autoPull(); });
window.addEventListener('focus', autoPull);
/* ---------- reminders ---------- */
var fired = {}, remTimer = null;
function startReminders() {
  clearInterval(remTimer);
  remTimer = setInterval(function () {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes()), tdy = todayIso();
    eventsOn(now).forEach(function (e) {
      var st = e.start.split(':'), m = (+st[0]) * 60 + (+st[1]) - (now.getHours() * 60 + now.getMinutes());
      var k = tdy + e.id; if (m >= 0 && m <= 10 && !fired[k]) { fired[k] = 1; new Notification(e.title, { body: 'Starts at ' + fmtTime(e.start) }); }
    });
    if (hm === '07:30' && !fired[tdy + 'sum']) { fired[tdy + 'sum'] = 1; var n = allDeadlines().filter(function (x) { return x.iso <= tdy; }).length; if (n) new Notification('Today', { body: n + ' item(s) due today or overdue' }); }
  }, 30000);
}

/* ---------- events ---------- */
document.addEventListener('click', function (e) {
  var nav = e.target.closest('[data-nav]'); if (nav) { go(nav.getAttribute('data-nav')); return; }
  var b = e.target.closest('[data-act]'); if (!b) return;
  var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
  if (a === 'deltask') { S.tasks = S.tasks.filter(function (t) { return t.id !== id; }); save(); render(); }
  else if (a === 'delevent') { S.events = S.events.filter(function (t) { return t.id !== id; }); save(); render(); }
  else if (a === 'setstar') { S.stars = S.stars || {}; S.stars[id] = +b.getAttribute('data-v'); save(); render(); showDetail(id); }
  else if (a === 'sortset') { F.sort = id; render(); }
  else if (a === 'chipc') { F.cst = id; render(); }
  else if (a === 'quick') { F.quick = !F.quick; render(); }
  else if (a === 'chipp') { F.st = id; render(); }
  else if (a === 'focstart') { if (FOC.run) { FOC.run = false; clearInterval(FOC.tm); } else { FOC.run = true; FOC.end = Date.now() + FOC.left * 1000; clearInterval(FOC.tm); FOC.tm = setInterval(focTick, 500); } render(); }
  else if (a === 'focreset') { FOC.run = false; clearInterval(FOC.tm); FOC.left = FOC.len * 60; render(); }
  else if (a === 'focmode') { FOC.run = false; clearInterval(FOC.tm); FOC.mode = id === '5' ? 'break' : 'focus'; FOC.len = +id; FOC.left = FOC.len * 60; render(); }
  else if (a === 'clsadd') { var cn = 0; CLS.items.forEach(function (x) { if (x.on && x.title.trim()) { S.tasks.push({ id: uid('t'), title: x.title.trim(), due: x.due || '', course: x.course || '', type: 'Classroom', info: x.info || '', done: false }); cn++; } }); CLS.items = []; CLS.gone = []; CLS.msg = cn + ' assignment' + (cn === 1 ? '' : 's') + ' added.'; save(); render(); }
  else if (a === 'clsgone') { CLS.gone.forEach(function (t) { t.done = true; }); CLS.gone = []; save(); render(); }
  else if (a === 'clsclear') { CLS.items = []; CLS.gone = []; CLS.msg = ''; render(); }
  else if (a === 'planrun') { PLAN.items = planWeek(); PLAN.msg = PLAN.items.length ? '' : 'No free time found before your deadlines. Your week looks full or clear.'; render(); }
  else if (a === 'planadd') { var pn = planAdd(PLAN.items); PLAN.items = []; PLAN.msg = pn + ' block' + (pn === 1 ? '' : 's') + ' added to your schedule.'; render(); }
  else if (a === 'planclear') { PLAN.items = []; PLAN.msg = ''; render(); }
  else if (a === 'lookmode') { var lc = lookCfg(); lc.mode = id; lsSet(LOOKKEY, JSON.stringify(lc)); applyLook(); render(); }
  else if (a === 'accent') { var la = lookCfg(); if (id) la.accent = id; else delete la.accent; lsSet(LOOKKEY, JSON.stringify(la)); applyLook(); render(); }
  else if (a === 'readday') { say(dayBrief()); }
  else if (a === 'readitem') { say(itemSpeech(id)); }
  else if (a === 'ttsstop') { ttsStop(); }
  else if (a === 'ttstest') { ttsStop(); say('Good evening. Your S A T registration closes November 20th at 11:59 P M Pacific time. Xylem is due at 1 P M.'); }
  else if (a === 'calprev') { CAL.off--; render(); }
  else if (a === 'calnext') { CAL.off++; render(); }
  else if (a === 'caltoday') { CAL.off = 0; CAL.sel = todayIso(); render(); }
  else if (a === 'calday') { CAL.sel = id; render(); }
  else if (a === 'delsat') { S.sat.tests = S.sat.tests.filter(function (t) { return t.id !== id; }); save(); render(); }
  else if (a === 'clearexamples') { S.events = S.events.filter(function (t) { return !t.example; }); save(); render(); }
  else if (a === 'resetplan') { S.sat.plan = {}; save(); render(); }
  else if (a === 'lock') { try { sessionStorage.removeItem(UNLOCK); } catch (x) {} delete mem['s' + UNLOCK]; if (!S.profile.pinHash && !cloudOn()) { lsDel('pd_nopin'); } boot(); }
  else if (a === 'pal') { lsSet('pd_pal', id); applyPal(); render(); }
  else if (a === 'detail') { if (e.target.closest('select,a,button,input,textarea')) return; showDetail(id); }
  else if (a === 'closedetail') hideDetail();
  else if (a === 'askabout') { var it2 = findItem(id); hideDetail(); if (window.AI) AI.open('Tell me how to get this done and what to watch for: ' + (it2 ? it2.title : '')); }
  else if (a === 'bio') bioUnlock();
  else if (a === 'bioon') bioEnroll();
  else if (a === 'biooff') { lsDel(BIOKEY); render(); }
  else if (a === 'nopin') { lsSet('pd_nopin', '1'); enter(); }
  else if (a === 'signout') { lsDel(SESSKEY); try { sessionStorage.removeItem(UNLOCK); } catch (x) {} boot(); }
  else if (a === 'syncnow') { setSync('Syncing...'); cloudPull().then(function (ch) { if (ch) render(); return cloudPush(); }); }
  else if (a === 'clearai') { AI.saveCfg({}); render(); }
  else if (a === 'clearfb') { lsDel(CFGKEY); render(); }
  else if (a === 'ics') { download('palash-deadlines.ics', buildIcs(), 'text/calendar'); }
  else if (a === 'export') { download('dashboard-data.json', JSON.stringify(S, null, 2), 'application/json'); }
  else if (a === 'notify') { if ('Notification' in window) Notification.requestPermission().then(function (p) { alert(p === 'granted' ? 'Notifications on while this tab is open.' : 'Notifications are blocked in your browser.'); }); }
});
document.addEventListener('change', function (e) {
  var t = e.target, a = t.getAttribute('data-act'), id = t.getAttribute('data-id');
  if (t.id === 'icsfile' && t.files[0]) { var r = new FileReader(); r.onload = function () { var n = importIcs(String(r.result)); save(); alert('Imported ' + n + ' item(s).'); go('school'); }; r.readAsText(t.files[0]); return; }
  if (t.id === 'jsonfile' && t.files[0]) { var r2 = new FileReader(); r2.onload = function () { try { var p = JSON.parse(String(r2.result)); if (p && p.tasks) { S = p; if (!S.profile) S.profile = { name: 'Palash', pinHash: '' }; save(); alert('Data imported.'); render(); } else alert('That file does not look like a dashboard export.'); } catch (x) { alert('Could not read that file.'); } }; r2.readAsText(t.files[0]); return; }
  if (!a) return;
  if (a === 'toggletask') { S.tasks.forEach(function (x) { if (x.id === id) x.done = t.checked; }); save(); render(); }
  else if (a === 'status') { S.status[id] = t.value; save(); render(); }
  else if (a === 'note') { S.notes[id] = t.value; save(); }
  else if (a === 'plan') { S.sat.plan[id] = t.checked; save(); }
  else if (a === 'sort') { F.sort = t.value; render(); }
  else if (a === 'planpick') { PLAN.items[+t.getAttribute('data-i')].on = t.checked; render(); }
  else if (a === 'clspick') { CLS.items[+t.getAttribute('data-i')].on = t.checked; render(); }
  else if (a === 'clstitle') { CLS.items[+t.getAttribute('data-i')].title = t.value; }
  else if (a === 'clscourse') { CLS.items[+t.getAttribute('data-i')].course = t.value; }
  else if (a === 'clsdue') { var cx = CLS.items[+t.getAttribute('data-i')]; cx.due = t.value; cx.dup = S.tasks.some(function (q) { return sameTask(q, cx); }); }
  else if (a === 'glass') { var lg = lookCfg(); lg.glass = +t.value; lsSet(LOOKKEY, JSON.stringify(lg)); applyLook(); }
  else if (a === 'chk') { S.checks = S.checks || {}; var ca = S.checks[id] || (S.checks[id] = []); ca[+t.getAttribute('data-i')] = t.checked; save(); var hh = t.closest('.m-box') && t.closest('.m-box').querySelector('h3 .muted'); if (hh) hh.textContent = progOf(id) + '%'; render(); }
  else if (a === 'ttsoai') { var to = ttsCfg(); to.oai = t.value.trim(); lsSet(TTSKEY, JSON.stringify(to)); }
  else if (a === 'ttsoaivoice') { var tv = ttsCfg(); tv.oaiVoice = t.value; lsSet(TTSKEY, JSON.stringify(tv)); }
  else if (a === 'ttsvoice') { var tc = ttsCfg(); tc.voice = t.value; lsSet(TTSKEY, JSON.stringify(tc)); }
  else if (a === 'ttsrate') { var tc2 = ttsCfg(); tc2.rate = +t.value; lsSet(TTSKEY, JSON.stringify(tc2)); var rv = document.getElementById('ttsrv'); if (rv) rv.textContent = t.value + 'x'; }
  else if (a === 'fcat') { F.cat = t.value; render(); } else if (a === 'ftype') { F.type = t.value; render(); } else if (a === 'fwin') { F.win = t.value; render(); } else if (a === 'fst') { F.st = t.value; render(); }
  else if (a === 'hideskip') { F.hideSkip = t.checked; render(); }
});
document.addEventListener('input', function (e) {
  if (e.target.getAttribute('data-act') === 'q') { F.q = e.target.value; var el = document.getElementById('progTable'); if (el) el.innerHTML = progTable(); }
});
document.addEventListener('submit', function (e) {
  var f = e.target, k = f.getAttribute('data-form'); if (!k) return; e.preventDefault();
  var v = {}; new FormData(f).forEach(function (val, key) { v[key] = val; });
  if (k === 'quicktask' || k === 'task') { S.tasks.push({ id: uid('t'), title: v.title.trim(), due: v.due || '', course: v.course || '', type: v.type || 'Task', done: false }); save(); render(); }
  else if (k === 'event') { var ev = { id: uid('e'), title: v.title.trim(), start: v.start, end: v.end, cat: v.cat }; if (v.repeat === 'once') ev.date = v.date; else ev.days = [+v.dow]; S.events.push(ev); save(); render(); }
  else if (k === 'sat') { var e1 = +v.ebrw || 0, m1 = +v.math || 0; if (!e1 || !m1) return; S.sat.tests.push({ id: uid('s'), label: v.label, ebrw: e1, math: m1, total: e1 + m1, note: v.note || '' }); save(); render(); }
  else if (k === 'ai') { AI.saveCfg({ key: (v.key || '').trim(), model: (v.model || '').trim() || 'claude-sonnet-5-5', web: !!f.querySelector('[name=web]').checked }); alert('Assistant saved.'); render(); }
  else if (k === 'fb') { lsSet(CFGKEY, JSON.stringify({ url: v.url.trim(), key: v.key.trim() })); alert('Saved. Sign out and sign in to link your account.'); render(); }
  else if (k === 'profile') { lsSet('pd_profile_v1', String(v.txt || '').slice(0, 8000)); render(); }
  else if (k === 'clsparse') { clsStart(v.txt); render(); }
  else if (k === 'paste') { var ps = parsePaste(v.txt, v.course); ps.forEach(function (x) { if (!S.tasks.some(function (t) { return t.title === x.title && t.due === x.due; })) S.tasks.push({ id: uid('t'), title: x.title, due: x.due, course: x.course, type: 'Assignment', done: false }); }); save(); alert(ps.length + ' added.'); render(); }
  else if (k === 'setpin') { S.profile.name = v.name || 'Palash'; if (v.pin && v.pin.length >= 4) { hashPin(v.pin).then(function (h) { S.profile.pinHash = h; save(); enter(); }); } else { var er = document.getElementById('err'); if (er) er.textContent = 'Use at least 4 digits, or continue without a PIN.'; } }
  else if (k === 'pin') { hashPin(v.pin).then(function (h) { if (h === S.profile.pinHash) { if (cloudOn() && session()) { setSync('Loading...'); cloudPull().then(function () { enter(); }).catch(function () { enter(); }); } else enter(); } else { var er2 = document.getElementById('err'); if (er2) er2.textContent = 'Wrong PIN.'; } }); }
  else if (k === 'login') {
    var mode = (e.submitter && e.submitter.value) || 'in', er3 = document.getElementById('err'), pin3 = (v.pin || '').trim();
    if (pin3.length < 4) { if (er3) er3.textContent = 'Use at least 4 digits.'; return; }
    if (er3) er3.textContent = 'Working...';
    fbAuth(mode, SOLMAIL, 'sol-v1-' + pin3).then(function () { return cloudPull(); }).then(function (ch) { if (!ch) cloudPush(); return hashPin(pin3); }).then(function (h) { S.profile = S.profile || { name: 'Palash' }; S.profile.pinHash = h; lsSet(KEY, JSON.stringify(S)); enter(); }).catch(function (x) { var m = (x.message || '').toLowerCase(); loginScreen(/invalid login/.test(m) ? 'Wrong PIN. If this is your first time, tap Set up.' : /already registered/.test(m) ? 'Account exists. Tap Unlock with your PIN.' : m.replace(/_/g, ' ')); });
  }
});

/* ---------- install + auto update ---------- */
(function () {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  var had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (had) { try { sessionStorage.setItem('pd_updated', '1'); } catch (e) {} location.reload(); } had = true; });
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    var base = null;
    function sig() { return Promise.all(['app.js', 'data.js', 'styles.css', 'assistant.js'].map(function (f) { return fetch(f, { cache: 'reload' }).then(function (r) { return r.text(); }).then(function (t) { return t.length + ':' + t.slice(0, 40) + t.slice(-40); }); })).then(function (a) { return a.join('|'); }); }
    sig().then(function (v) { base = v; }).catch(function () {});
    function chk() { reg.update().catch(function () {}); sig().then(function (v) { if (base && v !== base) location.reload(); }).catch(function () {}); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) chk(); });
    setInterval(chk, 30 * 60 * 1000);
  }).catch(function () {});
})();

/* ---------- natural language helpers (used by the assistant) ---------- */
var DAYN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function parseWhen(text) {
  var orig = ' ' + String(text) + ' ', t = orig.toLowerCase(), now = new Date(), d = null, time = '', m;
  function setD(dt) { d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function cut(str) { var k = t.indexOf(str); if (k >= 0) { orig = orig.slice(0, k) + ' ' + orig.slice(k + str.length); t = t.slice(0, k) + ' ' + t.slice(k + str.length); } }
  if ((m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)) || (m = t.match(/\bat\s+(\d{1,2}):(\d{2})\b()/))) {
    var hh = +m[1], mm = +(m[2] || 0); if (m[3] === 'pm' && hh < 12) hh += 12; if (m[3] === 'am' && hh === 12) hh = 0; time = pad(hh) + ':' + pad(mm); cut(m[0]);
  }
  if ((m = t.match(/\b(today|tonight)\b/))) { setD(now); cut(m[0]); }
  else if ((m = t.match(/\b(tomorrow|tmrw|tmr)\b/))) { var x = new Date(now); x.setDate(x.getDate() + 1); setD(x); cut(m[0]); }
  else if ((m = t.match(/\bin (\d+) (day|days|week|weeks)\b/))) { var y = new Date(now); y.setDate(y.getDate() + (+m[1]) * (m[2][0] === 'w' ? 7 : 1)); setD(y); cut(m[0]); }
  else if ((m = t.match(/\b(?:(next|this|on) )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)) || (m = t.match(/\b(?:(next|this|on) )?(mon|tues?|wed|thu(?:rs?)?|fri)\b/)) || (m = t.match(/\b(next|this|on) (sun|sat)\b/))) {
    var want = DAYN.indexOf(m[2].slice(0, 3)), cur = now.getDay(), diff = (want - cur + 7) % 7; if (diff === 0 || m[1] === 'next') diff = diff || 7; var z = new Date(now); z.setDate(z.getDate() + diff); setD(z); cut(m[0]);
  }
  else if ((m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/))) {
    var dt = new Date(now.getFullYear(), MON.indexOf(m[1]), +m[2]); if (dt < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) dt.setFullYear(dt.getFullYear() + 1); setD(dt); cut(m[0]);
  }
  else if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) { var yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear(); var d2 = new Date(yy, +m[1] - 1, +m[2]); if (!m[3] && d2 < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) d2.setFullYear(yy + 1); setD(d2); cut(m[0]); }
  return { iso: d ? isoOf(d) : '', time: time, rest: orig.replace(/\b(by|on|due|at|for|before)\b\s*$/gi, ' ').replace(/\s+/g, ' ').trim() };
}
function findByName(q) {
  q = String(q).toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  var words = q.split(/\s+/).filter(function (w) { return w.length > 2 && !/^(the|for|and|due|when|what|how|about|status|mark|set|link|open|info|deadline|application|apply|did|does|with|have|need|from|that|this|tell|show|give|program|competition|challenge|summer|submit|submitted|finish|finished|done|skip|skipped|working|started)$/.test(w); });
  if (!words.length) return null;
  var best = null, bs = 0, all = [];
  SEED.competitions.forEach(function (c) { all.push([c.id, c.name + ' ' + (c.sub || '')]); });
  SEED.programs.forEach(function (p) { all.push([p.id, p.name + ' ' + (p.get || '')]); });
  S.tasks.forEach(function (t) { all.push([t.id, t.title + ' ' + (t.course || '')]); });
  all.forEach(function (a) {
    var hay = a[1].toLowerCase().replace(/[^a-z0-9 ]/g, ' '), sc = 0;
    words.forEach(function (w) { if (hay.indexOf(w) >= 0) sc += w.length > 4 ? 2 : 1; });
    if (sc > bs) { bs = sc; best = a[0]; }
  });
  return bs >= 2 ? best : null;
}
function statusFor(id, want) {
  var it = findItem(id); if (!it) return null;
  if (it.task) return null;
  var list = it.list, map = { submitted: ['Submitted'], working: ['Working', 'Applying'], researching: ['Researching', 'Working'], skipped: ['Skipped'], accepted: ['Accepted', 'Won / placed'], won: ['Won / placed', 'Accepted'], rejected: ['Rejected'], closed: ['Closed'] };
  var c = map[want] || []; for (var i = 0; i < c.length; i++) if (list.indexOf(c[i]) >= 0) return c[i];
  return null;
}
window.PD = {
  esc: esc, go: function (v) { go(v); },
  parseWhen: parseWhen, find: findByName, item: function (id) { return findItem(id); }, statusFor: statusFor,
  show: function (id) { showDetail(id); },
  addEvent: function (title, iso, start, end) { S.events.push({ id: uid('e'), title: String(title).slice(0, 120), start: start, end: end, cat: 'life', date: iso }); save(); render(); },
  completeTask: function (id) { var t = S.tasks.filter(function (x) { return x.id === id; })[0]; if (t) { t.done = true; save(); render(); return true; } return false; },
  setPal: function (n) { lsSet('pd_pal', n); applyPal(); render(); },
  due: function (fromIso, toIso) { return allDeadlines().filter(function (x) { return x.iso >= fromIso && x.iso <= toIso; }); },
  eventsOn: function (iso) { return eventsOn(parseIso(iso)); },
  ics: function () { return buildIcs(); },
  say: function (t, d) { say(t, d); },
  look: function () { applyLook(); },
  isSpeaking: function () { return ttsOn; },
  setStars: function (id, n) { n = Math.max(1, Math.min(5, +n || 3)); if (!findItem(id) || findItem(id).task) return false; S.stars = S.stars || {}; S.stars[id] = n; save(); render(); return true; },
  planWeek: function (addAll) { var it = planWeek(); if (addAll) planAdd(it); render(); return it.map(function (x) { return { title: x.title, date: x.date, start: fmtTime(x.start), end: fmtTime(x.end), why: x.why }; }); },
  search: function (q, limit) {
    var qs = String(q || '').toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; }); if (!qs.length) return [];
    var pool = [];
    SEED.competitions.forEach(function (c) { pool.push({ id: c.id, name: c.name, text: [c.sub, c.needs, c.dateNote, c.elig].join(' ') }); });
    SEED.programs.forEach(function (p) { pool.push({ id: p.id, name: p.name, text: [p.get, p.next, p.type, p.pay, p.dateText].join(' ') }); });
    S.tasks.forEach(function (t) { pool.push({ id: t.id, name: t.title, text: [t.info, t.course].join(' ') }); });
    var sc = pool.map(function (x) { var n = x.name.toLowerCase(), t = x.text.toLowerCase(), s0 = 0; qs.forEach(function (w) { if (n.indexOf(w) >= 0) s0 += 3; if (t.indexOf(w) >= 0) s0 += 1; }); return { x: x, s: s0 }; }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, limit || 6);
    return sc.map(function (r) { var it = findItem(r.x.id); if (!it) return null; var raw = SEED.competitions.concat(SEED.programs).filter(function (z) { return z.id === it.id; })[0] || {}; return { id: it.id, name: it.title, kind: it.kind, date: it.dateText, status: S.status[it.id] || it.status || 'Not started', stars: it.list ? starsOf(it.id) : undefined, cost: raw.pay || '', checked: raw.verified ? 'verified ' + raw.verified : '', steps: it.todo.slice(0, 4), notes: it.facts.filter(Boolean).slice(0, 3), link: it.link || '' }; }).filter(Boolean);
  },
  upcoming: function (days) { var to = isoOf(new Date(Date.now() + (days || 14) * 864e5)); return allDeadlines().filter(function (x) { return x.iso >= todayIso() && x.iso <= to && (x.id || x.kind === 'SAT'); }).map(function (x) { return { date: x.iso, title: x.title, kind: x.kind, id: x.id || '', stars: x.id && !x.task ? starsOf(x.id) : undefined }; }); },
  fmtTime: fmtTime,
  stopSay: function () { ttsStop(); },
  speakable: function (t) { return speakable(t); },
  addTask: function (title, due) { S.tasks.push({ id: uid('t'), title: String(title).slice(0, 200), due: due || '', course: '', type: 'Task', done: false }); save(); render(); },
  setStatus: function (id, st) {
    var known = SEED.competitions.concat(SEED.programs, SEED.extra).some(function (x) { return x.id === id; });
    if (!known) return false; S.status[id] = st; save(); render(); return true;
  },
  snapshot: function () {
    var tdy = todayIso(), now = new Date();
    return {
      today: tdy, weekday: now.toLocaleDateString('en-US', { weekday: 'long' }), time: fmtTime(pad(now.getHours()) + ':' + pad(now.getMinutes())),
      next14days: PD.upcoming(14),
      openTasks: S.tasks.filter(function (t) { return !t.done; }).slice(0, 25).map(function (t) { return { id: t.id, title: t.title, due: t.due, course: t.course }; }),
      scheduleToday: eventsOn(now).map(function (e) { return { title: e.title, start: fmtTime(e.start), end: fmtTime(e.end) }; }),
      counts: { competitions: SEED.competitions.length, programs: SEED.programs.length },
      satTests: SEED.sat.filter(function (t) { return daysUntil(t.date) >= 0; }).slice(0, 3)
    };
  }
};
boot();
})();

/* Sol. No build step. Data seed lives in data.js; your edits live in the browser
   and, once you connect Firebase on the Connect tab, sync to your own account. */
(function () {
'use strict';
var SEED = window.SEED;
var PALS = [['apple', 'Apple', '#0071e3', '#f5f5f7'], ['graphite', 'Graphite', '#ff9f0a', '#111113'], ['forest', 'Forest', '#2f6b4f', '#f3f5f1'], ['sunset', 'Sunset', '#e4572e', '#fff7f2'], ['ocean', 'Ocean', '#38bdf8', '#0a1628'], ['paper', 'Paper', '#111111', '#ffffff']];
function applyPal() { var p = ''; try { p = localStorage.getItem('pd_pal') || ''; } catch (e) {} if (p && p !== 'apple') document.documentElement.setAttribute('data-pal', p); else document.documentElement.removeAttribute('data-pal'); }
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
    profile: { name: 'Palash', pinHash: '' }, status: {}, notes: {},
    tasks: SEED.tasks.map(function (t) { return { id: t.id, title: t.title, due: t.due, course: t.course, type: t.type, info: t.info, link: t.link, done: false }; }),
    events: [
      { id: 'e1', title: 'SAT practice (example)', start: '19:00', end: '20:00', cat: 'sat', days: [0, 2, 4], example: true },
      { id: 'e3', title: 'SAT prep', start: '17:30', end: '18:30', cat: 'sat', date: '2026-11-17' },
      { id: 'e2', title: 'FlowPhase lab or data work (example)', start: '16:00', end: '17:30', cat: 'sci', days: [5], example: true }
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
function save() { S.updated = Date.now(); lsSet(KEY, JSON.stringify(S)); if (cloudOn() && session()) { clearTimeout(pushTimer); setSync('Saving...'); pushTimer = setTimeout(cloudPush, 1500); } }

/* ---------- config, auth ---------- */
function cfg() { var c = {}; try { c = JSON.parse(lsGet(CFGKEY) || '{}'); } catch (e) {} if (!c.apiKey && SEED.firebase) c = SEED.firebase; return c; }
function cloudOn() { var c = cfg(); return !!(c.apiKey && c.projectId); }
function session() { try { return JSON.parse(lsGet(SESSKEY) || 'null'); } catch (e) { return null; } }
var syncMsg = '';
function setSync(m) { syncMsg = m; var el = document.getElementById('syncmsg'); if (el) el.textContent = m; }

function hashPin(pin) {
  var data = new TextEncoder().encode('pd-salt:' + pin);
  if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', data).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return pad(x.toString(16)).slice(-2); }).join(''); });
  var h = 0; for (var i = 0; i < pin.length; i++) h = (h * 31 + pin.charCodeAt(i)) | 0;
  return Promise.resolve('x' + h);
}
function fbCall(url, body) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || 'Request failed'); return j; }); });
}
function fbAuth(mode, email, pw) {
  var c = cfg();
  return fbCall('https://identitytoolkit.googleapis.com/v1/accounts:' + (mode === 'up' ? 'signUp' : 'signInWithPassword') + '?key=' + encodeURIComponent(c.apiKey), { email: email, password: pw, returnSecureToken: true }).then(function (j) {
    lsSet(SESSKEY, JSON.stringify({ uid: j.localId, email: j.email, idToken: j.idToken, refresh: j.refreshToken, exp: Date.now() + (+j.expiresIn - 60) * 1000 }));
  });
}
function fbToken() {
  var s = session(); if (!s) return Promise.reject(new Error('Not signed in'));
  if (Date.now() < s.exp) return Promise.resolve(s.idToken);
  var c = cfg();
  return fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(c.apiKey), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refresh) })
    .then(function (r) { return r.json(); }).then(function (j) {
      if (!j.id_token) throw new Error('Session expired. Sign in again.');
      s.idToken = j.id_token; s.refresh = j.refresh_token; s.exp = Date.now() + (+j.expires_in - 60) * 1000; lsSet(SESSKEY, JSON.stringify(s)); return s.idToken;
    });
}
function docUrl() { var c = cfg(), s = session(); return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(c.projectId) + '/databases/(default)/documents/dashboards/' + encodeURIComponent(s.uid); }
function cloudPull() {
  return fbToken().then(function (t) { return fetch(docUrl(), { headers: { Authorization: 'Bearer ' + t } }); }).then(function (r) {
    if (r.status === 404) return null; if (!r.ok) throw new Error('Cloud read failed (' + r.status + ')'); return r.json();
  }).then(function (j) {
    if (!j || !j.fields || !j.fields.json) return false;
    var remote = JSON.parse(j.fields.json.stringValue);
    if ((remote.updated || 0) > (S.updated || 0)) { var pin = S.profile && S.profile.pinHash; S = remote; if (!S.profile) S.profile = { name: 'Palash', pinHash: pin || '' }; lsSet(KEY, JSON.stringify(S)); return true; }
    return false;
  });
}
function cloudPush() {
  return fbToken().then(function (t) {
    return fetch(docUrl() + '?updateMask.fieldPaths=json&updateMask.fieldPaths=updated', { method: 'PATCH', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(S) }, updated: { integerValue: String(S.updated) } } }) });
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
function vToday() {
  var now = new Date(), h = now.getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  var tdy = todayIso(), dl = allDeadlines();
  var dueToday = dl.filter(function (x) { return x.iso === tdy; }), over = dl.filter(function (x) { return x.iso < tdy && x.task; });
  var week = dl.filter(function (x) { var n = daysUntil(x.iso); return n >= 0 && n <= 14; });
  var nextSat = SEED.sat.filter(function (s) { return daysUntil(s.reg) >= 0; })[0];
  var hero = dl.filter(function (x) { return x.iso >= tdy; })[0];
  var ev = eventsOn(now);
  var o = '<div class="hd"><h1>' + g + ', ' + esc(S.profile.name || 'Palash') + '</h1><span class="muted">' + now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) + '</span></div>';
  if (hero) o += '<div class="hero"><div><span class="kicker">Next up</span><h2>' + esc(hero.title) + '</h2><span class="muted">' + fmt(hero.iso) + ' · ' + hero.kind + '</span></div><div class="hero-r"><b>' + (daysUntil(hero.iso) === 0 ? 'Today' : daysUntil(hero.iso) + ' d') + '</b><div class="row">' + openBtn(hero.link) + '<a class="btn ghost small" target="_blank" rel="noopener" href="' + gcal(hero.title, hero.iso, hero.kind) + '">+ Calendar</a></div></div></div>';
  var urgent = dl.filter(function (x) { return x.iso <= isoOf(new Date(now.getTime() + 2 * 864e5)) && (x.task || daysUntil(x.iso) >= 0); });
  if (urgent.length) o += '<div class="alert" style="margin-bottom:12px"><b>' + urgent.length + ' due in the next 2 days:</b> ' + urgent.slice(0, 4).map(function (x) { return esc(shortTxt(x.title, 28)); }).join(', ') + (urgent.length > 4 ? ' and more' : '') + '</div>';
  o += '<div class="grid">' +
    '<div class="card' + (dueToday.length ? ' hot' : '') + '"><small>Due today</small><b class="big">' + dueToday.length + '</b></div>' +
    '<div class="card' + (over.length ? ' bad' : '') + '"><small>Overdue</small><b class="big">' + over.length + '</b></div>' +
    '<div class="card"><small>Next 14 days</small><b class="big">' + week.length + '</b></div>' +
    (nextSat ? '<div class="card' + (daysUntil(nextSat.reg) <= 7 ? ' hot' : '') + '"><small>SAT ' + fmt(nextSat.date) + ' registration</small><b class="big">' + daysUntil(nextSat.reg) + ' d</b></div>' : '') + '</div>';
  var tl = S.tasks.filter(function (t) { return !t.done && t.due && t.due <= tdy; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  o += '<div class="two"><div><h2>Do today</h2><div class="card"><form data-form="quicktask" class="row"><input type="text" name="title" placeholder="Add a task" required style="flex:1;min-width:140px"><input type="date" name="due" value="' + tdy + '"><button class="btn">Add</button></form><ul class="list">' + (tl.length ? tl.map(taskLi).join('') : '<li class="muted">Nothing due.</li>') + '</ul></div>' +
    '<h2>Schedule</h2><div class="card"><ul class="list">' + (ev.length ? ev.map(function (e) { return '<li><span class="t"><b>' + esc(e.start) + '</b> ' + esc(e.title) + '</span></li>'; }).join('') : '<li class="muted">No blocks today.</li>') + '</ul></div></div>' +
    '<div><h2>Reminders</h2><div class="card"><ul class="list">' + remList(dl) + '</ul></div></div></div>';
  o += '<h2>Deadlines, closest first</h2>' + colHead('Due', 'What', 'What to do next', 'Status') + deadlineRows(dl);
  return o;
}
function remList(dl) {
  var r = [], tdy = todayIso();
  var sat = SEED.sat.filter(function (x) { return daysUntil(x.reg) >= 0; })[0];
  if (sat) r.push('<li><span class="t">Register for SAT ' + fmtShort(sat.date) + '</span>' + leftTxt(sat.reg) + '</li>');
  dl.filter(function (x) { return x.iso >= tdy && x.iso <= isoOf(new Date(Date.now() + 7 * 864e5)) && !x.task && x.kind !== 'SAT'; }).slice(0, 4).forEach(function (x) { r.push('<li><span class="t click" data-act="detail" data-id="' + x.id + '">Start: ' + esc(shortTxt(x.title, 32)) + '</span>' + leftTxt(x.iso) + '</li>'); });
  return r.length ? r.join('') : '<li class="muted">Nothing urgent this week.</li>';
}
function deadlineRows(dl) {
  var tdy = todayIso(), hor = isoOf(new Date(Date.now() + 60 * 864e5)), out = '', last = '';
  var G = [['over', 'Overdue', function (x) { return x.iso < tdy; }], ['today', 'Today', function (x) { return x.iso === tdy; }], ['', 'This week', function (x) { return x.iso > tdy && daysUntil(x.iso) <= 7; }], ['', 'Next 60 days', function (x) { return daysUntil(x.iso) > 7 && x.iso <= hor; }]];
  G.forEach(function (g) {
    var items = dl.filter(function (x) { return g[2](x) && (x.id || x.kind === 'SAT'); }); if (!items.length) return;
    out += '<div class="grp ' + g[0] + '">' + g[1] + ' (' + items.length + ')</div><div class="rows">' + items.map(function (x) {
      var it = x.id ? findItem(x.id) : null, st = '';
      if (it && it.list) st = sel(x.id, it.list, S.status[x.id] || it.list[0]);
      else if (x.task) st = '<span class="muted">Task</span>';
      var o2 = { id: x.id || 'sat', iso: x.iso, name: shortTxt(x.title, 42), sub: x.kind, next: it && it.todo[0] ? shortTxt(it.todo[0], 90) : '', st: st };
      return x.id ? dRow(o2) : dRow(o2).replace('data-act="detail" data-id="sat"', 'data-nav="sat"');
    }).join('') + '</div>';
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
function dRow(o) {
  return '<div class="row2 cols click ' + (o.closed ? 'dim' : (o.approx ? 'u-later' : urg(o.iso))) + '" data-act="detail" data-id="' + o.id + '" tabindex="0"><div>' + dueChip(o.iso, o.dateText, o.approx, o.closed) + '</div><div class="c-name"><b>' + esc(o.name) + '</b><small>' + esc(o.sub || '') + '</small></div><div class="c-next">' + esc(o.next || '') + '</div><div class="c-st">' + (o.st || '') + '</div></div>';
}
function firstStep(t, n) { var a = sentences(t)[0] || ''; return shortTxt(a, n || 80); }
function shortDate(t) { return String(t || '').replace(/,? 20(\d\d)/, ' \u2019$1').replace(/ to /, ' to '); }
function shortTxt(t, n) { t = String(t || '').replace(/\s*\([^)]*\)/g, ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : t; }
function sentences(t) { return String(t || '').replace(/\b(Dr|Mr|Mrs|Ms|vs|St|Rep)\./g, '$1\u0001').split(/(?<=[.!?])\s+/).filter(Boolean).map(function (x) { return x.replace(/\u0001/g, '.'); }); }
function findItem(id) {
  var c = SEED.competitions.filter(function (x) { return x.id === id; })[0];
  if (c) return { kind: 'Competition', id: id, title: c.name, sub: c.sub, iso: c.iso, dateText: c.dateText, status: c.status, todo: sentences(c.needs), facts: [c.dateNote, c.elig ? 'Who can enter: ' + c.elig : ''], link: c.link, list: CST, src: c.src };
  var p = SEED.programs.filter(function (x) { return x.id === id; })[0];
  if (p) return { kind: p.cat === 'Internship / research' ? 'Internship' : 'Program', id: id, title: p.name, sub: p.get, iso: p.approx ? '' : p.iso, dateText: (p.dateText || p.date) + (p.approx ? ' (approx)' : ''), todo: sentences(p.next), facts: [p.pay, p.type ? 'Type: ' + p.type : ''], link: p.link, list: PST, search: !p.link };
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
    (it.list ? '<p>' + sel(id, it.list, st) + '</p>' : '') +
    (it.todo.length ? '<h3>What to do</h3><ul class="steps">' + it.todo.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    (it.facts.filter(Boolean).length ? '<h3>Good to know</h3><ul class="steps">' + it.facts.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="row">' + (it.link ? openBtn(it.link, 'Open official page') : '') + '<a class="btn ghost small" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + q + '">Search</a>' + (it.iso ? '<a class="btn ghost small" target="_blank" rel="noopener" href="' + gcal(it.title, it.iso, it.kind) + '">+ Calendar</a>' : '') + '<button class="btn ghost small" data-act="askabout" data-id="' + id + '">Ask assistant</button></div>' +
    (it.task ? '' : '<h3>Your notes</h3><textarea data-act="note" data-id="' + id + '" placeholder="Notes">' + esc(S.notes[id] || '') + '</textarea>') + '</div>';
  m.style.display = 'block';
}
function hideDetail() { var m = document.getElementById('modal'); if (m) m.style.display = 'none'; }
function vComps() {
  var rows = SEED.competitions.slice();
  function ck(c) { return ((S.status[c.id] || c.status) === 'Closed' ? 'zz' : '') + (c.iso || '9999'); }
  if (F.sort !== 'rank') rows.sort(function (a, b) { return ck(a) < ck(b) ? -1 : ck(a) > ck(b) ? 1 : 0; });
  var o = '<div class="hd"><h1>Competitions</h1><label class="muted">Sort <select data-act="sort"><option value="date"' + (F.sort !== 'rank' ? ' selected' : '') + '>Closest deadline</option><option value="rank"' + (F.sort === 'rank' ? ' selected' : '') + '>Prestige</option></select></label></div>' + colHead('Due', 'Competition', 'What to do next', 'Status') + '<div class="rows">';
  rows.forEach(function (c) {
    var st = S.status[c.id] || c.status || 'Not started';
    var cl = st === 'Closed'; o += dRow({ id: c.id, iso: c.iso, approx: c.approx, closed: cl, dateText: shortDate(c.dateText), name: c.name, sub: shortTxt(c.sub, 40), next: firstStep(c.needs, 90), st: sel(c.id, CST, st) });
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
  var rows = SEED.programs.filter(progMatch).sort(function (a, b) { return pk(a) < pk(b) ? -1 : pk(a) > pk(b) ? 1 : 0; });
  var o = colHead('Due', 'Program', 'What to do next', 'Status') + '<div class="rows">';
  rows.forEach(function (p) {
    var st = S.status[p.id] || p.status || 'Not started';
    o += dRow({ id: p.id, iso: p.iso, approx: p.approx, closed: st === 'Closed', dateText: shortDate(p.dateText || p.date), name: shortTxt(p.name, 34), sub: p.type + ' · ' + shortTxt(p.get, 28), next: firstStep(p.next, 90), st: sel(p.id, PST, st) });
  });
  return o + '</div><p class="muted">' + rows.length + ' of ' + SEED.programs.length + ' shown, closest deadline first. Dates marked approx are projected from 2026.</p>';
}
function opts(list, cur) { return '<option value="">All</option>' + list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; }).join(''); }
function uniq(f) { var s = {}; SEED.programs.forEach(function (p) { s[p[f]] = 1; }); return Object.keys(s); }
function vProgs() {
  var o = '<div class="hd"><h1>Programs &amp; Internships</h1></div>';
  o += '<div class="filters"><input type="search" data-act="q" placeholder="Search" value="' + esc(F.q) + '"><select data-act="fcat">' + opts(uniq('cat'), F.cat) + '</select><select data-act="ftype">' + opts(uniq('type'), F.type) + '</select><select data-act="fwin">' + opts(uniq('window'), F.win) + '</select><select data-act="fst">' + opts(PST, F.st) + '</select><label class="muted"><input type="checkbox" data-act="hideskip"' + (F.hideSkip ? ' checked' : '') + '> hide skipped</label></div>';
  o += '<div id="progTable">' + progTable() + '</div>';
  o += '<details><summary>More programs from your lists (' + SEED.extra.length + ')</summary><p class="muted">Mostly 2026 dates. Check each site for 2027 deadlines.</p><div class="wrap"><table style="min-width:760px"><thead><tr><th>Program</th><th>Cost</th><th>Dates listed</th><th>Status</th></tr></thead><tbody>';
  SEED.extra.forEach(function (e) { o += '<tr><td class="nm">' + esc(e.name) + '<small>' + esc(e.what) + '</small></td><td>' + esc(e.cost) + '</td><td>' + esc(e.dates) + '</td><td>' + sel(e.id, PST, S.status[e.id] || 'Not started') + '</td></tr>'; });
  return o + '</tbody></table></div></details>';
}

function vSchool() {
  var tasks = S.tasks.slice().sort(function (a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; });
  var open = tasks.filter(function (t) { return !t.done; }), done = tasks.filter(function (t) { return t.done; });
  var h2 = '<div class="hd"><h1>School</h1><span class="muted">Import a school calendar on the Connect tab</span></div>';
  h2 += '<div class="row" style="margin-top:10px">' + SEED.courses.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>';
  h2 += '<div class="card" style="margin-top:14px"><form data-form="task" class="row"><input type="text" name="title" placeholder="Assignment or reminder" required style="flex:1;min-width:160px"><select name="course"><option value="">No class</option>' + SEED.courses.concat(['Science Fair', 'Civic', 'SAT', 'Other']).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select><select name="type"><option>Assignment</option><option>Test</option><option>Project</option><option>Form</option><option>Reminder</option></select><input type="date" name="due"><button class="btn">Add</button></form></div>';
  h2 += '<details style="margin-top:12px"><summary>Paste assignments from Google Classroom</summary><div class="card"><p class="muted">Your school locked the Google account, so copy the to-do list from Classroom in your browser and paste it here. One assignment per line. Dates like "Nov 20" or "11/20" are picked up.</p><form data-form="paste" style="display:grid;gap:8px"><textarea class="paste" name="txt" placeholder="AP Lang essay draft - due Nov 20\nAP Chem lab report 11/22"></textarea><div class="row"><select name="course"><option value="">No class</option>' + SEED.courses.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select><button class="btn">Add them</button></div></form></div></details>';
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

function vSched() {
  var now = new Date(), ti = dowIdx(now);
  var h2 = '<div class="hd"><h1>Schedule</h1></div>';
  h2 += '<div class="card" style="margin-top:12px"><form data-form="event" class="row"><input type="text" name="title" placeholder="Block or event" required style="flex:1;min-width:150px"><input type="time" name="start" value="16:00" required><input type="time" name="end" value="17:00" required><select name="cat"><option value="sat">SAT</option><option value="sci">Science</option><option value="school">School</option><option value="life">Life</option></select><select name="repeat"><option value="weekly">Every week on...</option><option value="once">One date</option></select><select name="dow">' + DOW.map(function (d, i) { return '<option value="' + i + '"' + (i === ti ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select><input type="date" name="date" value="' + todayIso() + '"><button class="btn">Add</button></form><small class="muted">For "Every week" pick the weekday. For "One date" the date is used.</small></div>';
  h2 += '<h2>This week</h2><div class="week">';
  for (var i = 0; i < 7; i++) {
    var d = new Date(now); d.setDate(now.getDate() - ti + i);
    h2 += '<div class="day' + (i === ti ? ' today' : '') + '"><h3>' + DOW[i] + ' ' + cap(MON[d.getMonth()]) + ' ' + d.getDate() + '</h3>' + eventsOn(d).map(function (e) { return '<div class="blk cat-' + e.cat + '"><b>' + esc(e.start) + '</b> ' + esc(e.title) + (e.example ? ' <span class="tag ex">example</span>' : '') + '<small><button class="x" data-act="delevent" data-id="' + e.id + '" title="Delete">&times;</button></small></div>'; }).join('') + '</div>';
  }
  h2 += '</div><div class="row" style="margin-top:10px"><button class="btn ghost small" data-act="clearexamples">Remove example blocks</button></div>';
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
  h2 += '<div class="two"><div><h2>Account and sync</h2><div class="card"><p>' + (cloudOn() ? (s ? 'Signed in as <b>' + esc(s.email) + '</b>. <span class="sync" id="syncmsg">' + esc(syncMsg) + '</span>' : 'Cloud sync is configured. Sign out and back in to link your account.') : 'Right now your data lives only in this browser. Add your Firebase keys below to sync across phone and laptop with a real login.') + '</p>' +
    '<div class="row">' + (s ? '<button class="btn" data-act="syncnow">Sync now</button><button class="btn ghost" data-act="signout">Sign out</button>' : '') + '<button class="btn ghost" data-act="lock">Lock</button>' + (S.profile.pinHash && !cloudOn() ? (bioOn() ? '<button class="btn ghost" data-act="biooff">Turn off Touch ID</button>' : '<button class="btn ghost" data-act="bioon">Turn on Touch ID</button>') : '') + '</div></div>' +
    '<h2>Firebase keys</h2><div class="card"><form data-form="fb" style="display:grid;gap:8px"><input type="text" name="apiKey" placeholder="apiKey" value="' + esc(c.apiKey || '') + '"><input type="text" name="projectId" placeholder="projectId" value="' + esc(c.projectId || '') + '"><div class="row"><button class="btn">Save keys</button><button type="button" class="btn ghost" data-act="clearfb">Remove keys</button></div></form></div></div>';
  h2 += '<div><h2>Apple Calendar</h2><div class="card"><p>Web pages cannot write into Apple Calendar directly, so there are two links. <b>Subscribe</b> keeps a calendar called Palash Deadlines updated on your Mac, iPhone and iPad. <b>Add once</b> imports your current list including tasks you added here.</p><div class="row"><a class="btn" href="' + subUrl() + '">Subscribe in Apple Calendar</a><button class="btn ghost" data-act="ics">Add once (.ics)</button><button class="btn ghost" data-act="notify">Browser notifications</button></div><p class="muted">Subscribe works from your hosted site (GitHub Pages) and shows the deadlines saved in the repo file deadlines.ics. Every item reminds you 7 days, 3 days and 1 day before. Browser notifications only fire while this tab is open.</p></div>' +
    '<h2>Bring in school assignments</h2><div class="card"><p>Export or subscribe to your school calendar (Google Classroom, Canvas, Schoology and PowerSchool all offer an .ics or calendar link) and import the file here. Items with due dates become tasks.</p><input type="file" id="icsfile" accept=".ics,text/calendar"></div>' +
    '<h2>Backup</h2><div class="card"><div class="row"><button class="btn ghost" data-act="export">Export my data</button><label class="btn ghost" style="cursor:pointer">Import data<input type="file" id="jsonfile" accept=".json" hidden></label></div></div></div></div>';
  h2 += '<details><summary>Set up real login and cross-device sync (about 10 minutes)</summary><ol><li>Go to console.firebase.google.com and create a project.</li><li>Build, then Authentication, then enable Email/Password.</li><li>Build, then Firestore Database, create it in production mode.</li><li>In Firestore Rules, paste the rules below and publish.</li><li>Project settings, then General, then add a Web app. Copy <b>apiKey</b> and <b>projectId</b> into the keys form above.</li><li>Sign in with "Create account". Your data now saves to your own Firestore document.</li></ol><pre>rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /dashboards/{uid} {\n      allow read, write: if request.auth != null &amp;&amp; request.auth.uid == uid;\n    }\n  }\n}</pre><p class="muted">The Firebase apiKey is not a secret. The rules above are what protect your data. After creating your own account, turn off new sign-ups in Authentication settings so nobody else can register.</p></details>';
  h2 += '<details><summary>Put it on your GitHub repo and a web address</summary><pre>git clone https://github.com/palashraks-afk/Dashboard\ncd Dashboard\n# copy index.html, styles.css, app.js, data.js into this folder\ngit add . &amp;&amp; git commit -m "Add daily dashboard" &amp;&amp; git push</pre><p>Then on GitHub: Settings, Pages, Source "Deploy from a branch", branch main, folder /root. Your dashboard will be live at https://palashraks-afk.github.io/Dashboard/ in a minute or two. Change deadlines or add programs by editing data.js.</p></details>';
  return h2;
}

/* ---------- ics ---------- */
function icsEscape(s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
function subUrl() { var u = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + 'deadlines.ics'; return u.replace(/^https?:/, 'webcal:'); }
function buildIcs() {
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sol//EN'];
  allDeadlines().forEach(function (x, i) {
    var a = x.iso.replace(/-/g, ''), d = parseIso(x.iso); d.setDate(d.getDate() + 1);
    L.push('BEGIN:VEVENT', 'UID:pd-' + (x.id || ('x' + i)) + '-' + a + '@dashboard', 'DTSTAMP:' + todayIso().replace(/-/g, '') + 'T000000Z', 'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + isoOf(d).replace(/-/g, ''), 'SUMMARY:' + icsEscape(x.kind + ': ' + x.title), 'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Due in a week', 'END:VALARM', 'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', 'DESCRIPTION:Due in 3 days', 'END:VALARM', 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Due tomorrow', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR'); return L.join('\r\n');
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

/* ---------- render ---------- */
var app = document.getElementById('app');
function render() {
  var body = view === 'today' ? vToday() : view === 'comps' ? vComps() : view === 'progs' ? vProgs() : view === 'school' ? vSchool() : view === 'sat' ? vSat() : view === 'sched' ? vSched() : vConnect();
  app.innerHTML = '<div class="shell"><nav class="side"><div class="brand"><svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#000"/><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd37e"/><stop offset="1" stop-color="#ff7a45"/></linearGradient></defs><path d="M244.4 143.5 A130.6 130.6 0 0 0 244.4 404.6 Z" fill="#eef2f5"/><path d="M268.2 107.8 A130.6 130.6 0 0 1 268.2 369.2 Z" fill="url(#sg)"/></svg><span>Sol</span></div>' + NAV.map(function (n) { return '<button data-nav="' + n[0] + '" class="' + (view === n[0] ? 'on' : '') + '">' + n[1] + '</button>'; }).join('') + '<div class="grow"></div><button data-act="ask" class="ask">Ask <kbd>Ctrl K</kbd></button><button data-act="lock">Lock</button></nav><main>' + body + '</main></div>';
  if (window.AI) AI.draw();
}
function go(v) { view = v; render(); window.scrollTo(0, 0); }

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
  if (cloud) {
    h2 += '<p class="muted">Sign in to load your saved dashboard.</p><form data-form="login" style="display:grid;gap:10px"><input type="email" name="email" placeholder="Email" required autocomplete="username"><input type="password" name="pw" placeholder="Password" required minlength="6" autocomplete="current-password"><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn" name="mode" value="in">Sign in</button><button class="btn ghost" name="mode" value="up">Create account</button></form>';
  } else if (first) {
    h2 += '<p class="muted">Set a PIN for this device, or continue without one. This is a screen lock for this browser only. Your data stays on this device until you connect cloud sync on the Connect tab.</p><form data-form="setpin" style="display:grid;gap:10px"><input type="text" name="name" placeholder="Your name" value="' + esc(S.profile.name || '') + '"><input type="password" name="pin" placeholder="PIN (4 or more digits)" inputmode="numeric" minlength="4"><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn">Set PIN and open</button><button type="button" class="btn ghost" data-act="nopin">Continue without a PIN</button></form>';
  } else {
    h2 += '<p class="muted">Enter your PIN.</p><form data-form="pin" style="display:grid;gap:10px"><input type="password" name="pin" placeholder="PIN" inputmode="numeric" autofocus><div class="err" id="err">' + esc(msg || '') + '</div><button class="btn">Unlock</button>' + (bioOn() ? '<button type="button" class="btn ghost" data-act="bio">Use Touch ID</button>' : '') + '</form>';
  }
  app.innerHTML = h2 + '</div></div>';
  if (!cloud && !first && bioOn() && !msg) setTimeout(bioUnlock, 250);
}
function enter() { ssSet(UNLOCK, '1'); view = 'today'; render(); startReminders(); }
function boot() {
  load();
  if (cloudOn()) {
    if (session()) { setSync('Loading...'); cloudPull().then(function (changed) { if (changed) { setSync('Loaded from cloud'); } else { cloudPush(); } enter(); }).catch(function (e) { setSync('Offline: ' + e.message); enter(); }); return; }
    loginScreen(); return;
  }
  if (!S.profile.pinHash) { if (lsGet('pd_nopin') || ssGet(UNLOCK)) enter(); else loginScreen(); return; }
  if (ssGet(UNLOCK)) enter(); else loginScreen();
}

/* ---------- reminders ---------- */
var fired = {}, remTimer = null;
function startReminders() {
  clearInterval(remTimer);
  remTimer = setInterval(function () {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes()), tdy = todayIso();
    eventsOn(now).forEach(function (e) {
      var st = e.start.split(':'), m = (+st[0]) * 60 + (+st[1]) - (now.getHours() * 60 + now.getMinutes());
      var k = tdy + e.id; if (m >= 0 && m <= 10 && !fired[k]) { fired[k] = 1; new Notification(e.title, { body: 'Starts at ' + e.start }); }
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
  else if (k === 'fb') { lsSet(CFGKEY, JSON.stringify({ apiKey: v.apiKey.trim(), projectId: v.projectId.trim() })); alert('Saved. Sign out and sign in to link your account.'); render(); }
  else if (k === 'paste') { var ps = parsePaste(v.txt, v.course); ps.forEach(function (x) { if (!S.tasks.some(function (t) { return t.title === x.title && t.due === x.due; })) S.tasks.push({ id: uid('t'), title: x.title, due: x.due, course: x.course, type: 'Assignment', done: false }); }); save(); alert(ps.length + ' added.'); render(); }
  else if (k === 'setpin') { S.profile.name = v.name || 'Palash'; if (v.pin && v.pin.length >= 4) { hashPin(v.pin).then(function (h) { S.profile.pinHash = h; save(); enter(); }); } else { var er = document.getElementById('err'); if (er) er.textContent = 'Use at least 4 digits, or continue without a PIN.'; } }
  else if (k === 'pin') { hashPin(v.pin).then(function (h) { if (h === S.profile.pinHash) enter(); else { var er2 = document.getElementById('err'); if (er2) er2.textContent = 'Wrong PIN.'; } }); }
  else if (k === 'login') {
    var mode = (e.submitter && e.submitter.value) || 'in', er3 = document.getElementById('err'); if (er3) er3.textContent = 'Working...';
    fbAuth(mode, v.email, v.pw).then(function () { return cloudPull(); }).then(function (ch) { if (!ch) cloudPush(); enter(); }).catch(function (x) { loginScreen(x.message.replace(/_/g, ' ').toLowerCase()); });
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
  addTask: function (title, due) { S.tasks.push({ id: uid('t'), title: String(title).slice(0, 200), due: due || '', course: '', type: 'Task', done: false }); save(); render(); },
  setStatus: function (id, st) {
    var known = SEED.competitions.concat(SEED.programs, SEED.extra).some(function (x) { return x.id === id; });
    if (!known) return false; S.status[id] = st; save(); render(); return true;
  },
  snapshot: function () {
    var dl = allDeadlines().filter(function (x) { return daysUntil(x.iso) >= -3; }).slice(0, 30).map(function (x) { return { date: x.iso, title: x.title, kind: x.kind, id: x.id || '', link: x.link || '' }; });
    return {
      today: todayIso(), nextDeadlines: dl,
      openTasks: S.tasks.filter(function (t) { return !t.done; }).map(function (t) { return { id: t.id, title: t.title, due: t.due }; }),
      competitions: SEED.competitions.map(function (c) { return { id: c.id, name: c.name, deadline: c.dateText, status: S.status[c.id] || c.status || 'Not started', link: c.link, todo: c.needs }; }),
      programs: SEED.programs.map(function (p) { return { id: p.id, name: p.name, deadline: p.date, cost: p.pay, status: S.status[p.id] || 'Not started', link: p.link }; }),
      sat: { tests: SEED.sat }
    };
  }
};
boot();
})();

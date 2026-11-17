/* Rebuilds deadlines.ics from the app's own code and your synced data.
   Usage: node tools/make-ics.js            (pulls your saved data from Supabase)
          node tools/make-ics.js --offline  (seed data only) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const offline = process.argv.includes('--offline');

async function remoteState() {
  const sb = (/SEED\.supabase\s*=\s*\{url:'([^']+)',key:'([^']+)'\}/.exec(read('data.js')) || []);
  const email = (/SOLMAIL = '([^']+)'/.exec(read('app.js')) || [])[1], pw = (/SOLPW = '([^']+)'/.exec(read('app.js')) || [])[1];
  if (!sb[1] || !email || !pw) throw new Error('Supabase settings not found');
  const base = sb[1].replace(/\/+$/, '');
  const auth = await fetch(base + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: sb[2] }, body: JSON.stringify({ email, password: pw }) });
  const aj = await auth.json(); if (!aj.access_token) throw new Error('Sign-in failed: ' + JSON.stringify(aj).slice(0, 200));
  const r = await fetch(base + '/rest/v1/dashboards?select=json&limit=1', { headers: { apikey: sb[2], Authorization: 'Bearer ' + aj.access_token } });
  if (!r.ok) throw new Error('Read failed ' + r.status);
  const rows = await r.json();
  return rows[0] && rows[0].json ? rows[0].json : null;
}

(async () => {
  const state = offline ? null : await remoteState();
  const store = { pd_cfg_v1: JSON.stringify({ url: 'http://127.0.0.1:1', key: 'x' }) };
  if (state) store.pd_state_v1 = state;
  const el = () => new Proxy(function () {}, { get: (t, k) => k === 'style' || k === 'classList' || k === 'dataset' ? el() : k === 'innerHTML' || k === 'textContent' || k === 'value' ? '' : el(), set: () => true, apply: () => el() });
  const sandbox = { console, setTimeout, setInterval: () => 0, clearTimeout, clearInterval, fetch: () => Promise.reject(new Error('offline')),
    Promise, Date, Math, JSON, TextEncoder, URL, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, Number, String, Array, Object, RegExp, Error, isNaN,
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { href: 'https://palashraks-afk.github.io/Dashboard/', hash: '' }, navigator: {},
    document: { getElementById: () => el(), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: el(), body: el(), createElement: () => el(), hidden: false },
    addEventListener() {}, Notification: undefined };
  sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
  for (const f of ['data.js', 'app.js']) vm.runInContext(read(f), sandbox, { filename: f });
  const ics = sandbox.PD.ics().replace(/\r\n/g, '\n').split('\n').join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(root, 'deadlines.ics'), ics);
  console.log('wrote deadlines.ics,', (ics.match(/BEGIN:VEVENT/g) || []).length, 'events,', state ? 'from synced data' : 'seed data only');
})().catch(e => { console.error(e.message); process.exit(1); });
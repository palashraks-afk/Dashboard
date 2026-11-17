/* Network first: every open pulls the newest files from your site, so a push to GitHub updates the app by itself.
   The cached copy is only used when you are offline. */
var CACHE = 'pd-cache';
var FILES = ['./', 'index.html', 'styles.css', 'data.js', 'app.js', 'assistant.js', 'manifest.webmanifest', 'deadlines.ics'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(FILES.map(function (f) { return fetch(f, { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(f, r); }).catch(function () {}); })); }));
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'reload' }).then(function (r) {
    var copy = r.clone(); if (r.ok) caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return r;
  }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('index.html'); }); }));
});

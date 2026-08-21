const CACHE_NAME = 'kowalzki-studio-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches (bumping CACHE_NAME above is what makes this
// actually delete the previous version's cached files instead of silently
// keeping them around and serving stale app code)
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: always try the network first, and — importantly — bypass the
// browser's own HTTP cache when doing so (cache: 'no-store'). Without this,
// fetch() can still be silently answered by the browser's HTTP cache layer
// even though this code "looks" network-first, which is how an updated
// index.html can fail to show up for a long time even after a hard reload.
// Falls back to the Cache Storage copy only when truly offline.
self.addEventListener('fetch', function (event) {
  const url = event.request.url;

  // Let Firebase/Firestore/Auth requests go straight to network always
  if (url.includes('googleapis.com') || url.includes('firebaseio.com') || url.includes('firestore.googleapis.com') || url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(function (response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});

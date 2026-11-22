// Keeps a copy of the app on this computer so it works without internet.
//
// Change VERSION whenever any app file changes: browsers then fetch the
// new files, and the app switches to them the next time the bookshelf is
// showing (see install.js).

const VERSION = '2026-11-21.14';
const APP_CACHE = `app-${VERSION}`;
const STICKER_CACHE = 'stickers-v1';

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'fonts/fredoka.woff2',
  'fonts/patrick-hand.woff2',
  'fonts/luckiest-guy.woff2',
  'fonts/creepster.woff2',
  'fonts/cursive.woff2',
  'img/icon.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-512.png',
  'js/app.js',
  'js/bookfile.js',
  'js/db.js',
  'js/dialogs.js',
  'js/draw.js',
  'js/editor.js',
  'js/install.js',
  'js/items.js',
  'js/model.js',
  'js/narrator.js',
  'js/print.js',
  'js/reader.js',
  'js/render.js',
  'js/shelf.js',
  'js/sound.js',
  'js/sticker-art.js',
  'js/stickers.js',
  'js/ui.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => (k.startsWith('app-') && k !== APP_CACHE) || k === 'fonts-v1')
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // The app itself: from the saved copy, falling back to the network.
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const key = request.mode === 'navigate' ? 'index.html' : request;
      const hit = await cache.match(key, { ignoreSearch: true });
      return hit || fetch(request);
    })());
  } else if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/twemoji')) {
    event.respondWith(cacheFirst(STICKER_CACHE, request));
  }
});

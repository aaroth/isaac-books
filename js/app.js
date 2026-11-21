// Switches between the bookshelf and the editor based on the address:
//   #/                      bookshelf
//   #/book/<id>/edit/<n>    editing page n of a book
//   #/book/<id>/read/<p>    reading a book, with p sheets turned
//   #/book/<id>/print       printing a book as a booklet

import { registerOffline } from './install.js';  // first, to catch the install offer
import { openShelf } from './shelf.js';
import { openEditor } from './editor.js';
import { openReader } from './reader.js';
import { openPrint } from './print.js';
import { requestPersistentStorage } from './db.js';
import { twemojiUrls } from './stickers.js';

const root = document.getElementById('app');
let current = null;
let routeToken = 0;

async function route() {
  const token = ++routeToken;
  if (current) {
    const old = current;
    current = null;
    try { await old.destroy(); } catch (err) { console.error(err); }
  }
  if (token !== routeToken) return;
  root.replaceChildren();
  document.getElementById('dialog-root').replaceChildren();

  const edit = location.hash.match(/^#\/book\/([^/]+)\/edit(?:\/(\d+))?/);
  const read = location.hash.match(/^#\/book\/([^/]+)\/read(?:\/(\d+))?/);
  const print = location.hash.match(/^#\/book\/([^/]+)\/print/);
  const view = edit ? await openEditor(root, edit[1], Number(edit[2] || 0))
    : read ? await openReader(root, read[1], Number(read[2] || 0))
      : print ? await openPrint(root, print[1])
        : await openShelf(root);
  if (token !== routeToken) { view.destroy(); return; }
  current = view;
}

// While online, quietly save every sticker picture so stickers work offline
// too. The offline helper (sw.js) serves them from this same cache.
async function saveStickersForOffline() {
  if (!('caches' in window) || !navigator.onLine || !navigator.serviceWorker?.controller) return;
  try {
    const cache = await caches.open('stickers-v1');
    for (const url of twemojiUrls()) {
      if (!(await cache.match(url))) await cache.add(url).catch(() => {});
    }
  } catch { /* try again next time */ }
}

window.addEventListener('hashchange', route);
route();
requestPersistentStorage();
registerOffline();
setTimeout(saveStickersForOffline, 5000);

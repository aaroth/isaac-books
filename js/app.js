// Switches between the bookshelf and the editor based on the address:
//   #/                      bookshelf
//   #/book/<id>/edit/<n>    editing page n of a book

import { openShelf } from './shelf.js';
import { openEditor } from './editor.js';
import { requestPersistentStorage } from './db.js';

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
  const view = edit
    ? await openEditor(root, edit[1], Number(edit[2] || 0))
    : await openShelf(root);
  if (token !== routeToken) { view.destroy(); return; }
  current = view;
}

window.addEventListener('hashchange', route);
route();
requestPersistentStorage();

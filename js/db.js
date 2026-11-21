// Saving books in the browser (IndexedDB).
// Two stores: "books" (one record per book) and "pages" (one record per page,
// so saving a page doesn't rewrite every other page's drawing).

const DB_NAME = 'isaacs-books';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pages')) {
          const pages = db.createObjectStore('pages', { keyPath: 'id' });
          pages.createIndex('bookId', 'bookId');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Runs fn(transaction) and resolves when the transaction completes.
// fn may return an IDBRequest (its result is returned) or a function
// called after completion to compute the result.
async function run(stores, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const out = fn(t);
    t.oncomplete = () => {
      if (out instanceof IDBRequest) resolve(out.result);
      else if (typeof out === 'function') resolve(out());
      else resolve(out);
    };
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Save was cancelled'));
  });
}

export const getAllBooks = () =>
  run('books', 'readonly', t => t.objectStore('books').getAll());

export const getBook = id =>
  run('books', 'readonly', t => t.objectStore('books').get(id));

export const putBook = book =>
  run('books', 'readwrite', t => { t.objectStore('books').put(book); });

export const putPage = page =>
  run('pages', 'readwrite', t => { t.objectStore('pages').put(page); });

export const deletePage = id =>
  run('pages', 'readwrite', t => { t.objectStore('pages').delete(id); });

export function getPages(ids) {
  return run('pages', 'readonly', t => {
    const store = t.objectStore('pages');
    const reqs = ids.map(id => store.get(id));
    return () => reqs.map(r => r.result);
  });
}

// Saves a book and some of its pages together (all or nothing).
export function putBookAndPages(book, pages) {
  return run(['books', 'pages'], 'readwrite', t => {
    t.objectStore('books').put(book);
    const store = t.objectStore('pages');
    for (const p of pages) store.put(p);
  });
}

export function deleteBook(id) {
  return run(['books', 'pages'], 'readwrite', t => {
    t.objectStore('books').delete(id);
    const pages = t.objectStore('pages');
    const req = pages.index('bookId').getAllKeys(id);
    req.onsuccess = () => { for (const key of req.result) pages.delete(key); };
  });
}

// Ask the browser not to clear our data when the disk gets full.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch { /* not supported; books still save */ }
  return false;
}

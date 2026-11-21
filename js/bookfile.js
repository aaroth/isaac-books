// Saving books to a file and opening them again: for moving books between
// computers (they're otherwise kept in each browser) and for backups.
//
// A book file is JSON: { format, version, saved, books: [{ book, pages }] },
// with every picture stored as a data: URL.

import * as db from './db.js';
import { uid } from './model.js';

const FORMAT = 'isaacs-books';
const VERSION = 1;
export const FILE_EXTENSION = '.isaacbook';

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
const dataUrlToBlob = url => fetch(url).then(r => r.blob());
const maybe = (v, fn) => (v ? fn(v) : null);

async function packBook(book) {
  const pages = (await db.getPages(book.pageIds)).filter(Boolean);
  const packPage = async page => ({
    ...page,
    drawing: await maybe(page.drawing, blobToDataUrl),
    thumb: await maybe(page.thumb, blobToDataUrl),
    items: await Promise.all((page.items || []).map(async item =>
      item.type === 'photo' ? { ...item, blob: await blobToDataUrl(item.blob) } : item)),
  });
  return {
    book: { ...book, coverThumb: await maybe(book.coverThumb, blobToDataUrl) },
    pages: await Promise.all(pages.map(packPage)),
  };
}

async function unpackBook({ book, pages }) {
  const unpackPage = async page => ({
    ...page,
    drawing: await maybe(page.drawing, dataUrlToBlob),
    thumb: await maybe(page.thumb, dataUrlToBlob),
    items: await Promise.all((page.items || []).map(async item =>
      item.type === 'photo' ? { ...item, blob: await dataUrlToBlob(item.blob) } : item)),
  });
  return {
    book: { ...book, coverThumb: await maybe(book.coverThumb, dataUrlToBlob) },
    pages: await Promise.all(pages.map(unpackPage)),
  };
}

export async function makeBookFile(books) {
  const data = {
    format: FORMAT, version: VERSION, saved: new Date().toISOString(),
    books: await Promise.all(books.map(packBook)),
  };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export function fileNameFor(books) {
  const clean = s => s.replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim();
  if (books.length === 1) return (clean(books[0].title || '') || 'My book') + FILE_EXTENSION;
  return `Isaacs books ${new Date().toISOString().slice(0, 10)}${FILE_EXTENSION}`;
}

export function downloadFile(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export async function saveBooksToFile(books) {
  downloadFile(await makeBookFile(books), fileNameFor(books));
}

// Reads a book file. Throws if it isn't one.
export async function readBookFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('not a book file'); }
  if (!data || data.format !== FORMAT || !Array.isArray(data.books)) throw new Error('not a book file');
  if (data.version > VERSION) throw new Error('made by a newer version');
  const books = [];
  for (const entry of data.books) {
    if (!entry || !entry.book || !Array.isArray(entry.pages) || !Array.isArray(entry.book.pageIds)) continue;
    books.push(await unpackBook(entry));
  }
  if (!books.length) throw new Error('no books in the file');
  return books;
}

// Puts a book from a file on the shelf. With asCopy, it gets new ids so it
// sits next to any copy already there; otherwise it replaces that copy.
export async function addBookFromFile({ book, pages }, { asCopy }) {
  if (!asCopy) {
    await db.deleteBook(book.id);
    await db.putBookAndPages(book, pages);
    return book;
  }
  const bookId = uid();
  const idMap = new Map(pages.map(p => [p.id, uid()]));
  const newPages = pages.map(p => ({ ...p, id: idMap.get(p.id), bookId }));
  const newBook = {
    ...book, id: bookId, updated: Date.now(),
    pageIds: book.pageIds.map(id => idMap.get(id)).filter(Boolean),
  };
  await db.putBookAndPages(newBook, newPages);
  return newBook;
}

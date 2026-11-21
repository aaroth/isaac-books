// What a book is.
//
// book = { id, title, shape: 'tall'|'wide', coverColor, created, updated,
//          pageIds: [frontCover, ...insidePages, backCover], coverThumb: Blob|null }
// page = { id, bookId, bg: '#rrggbb', drawing: Blob|null (PNG, transparent
//          where nothing is drawn), items: [] (text/stickers/photos, later), thumb: Blob|null }
//
// Pages are half a sheet of US Letter paper, so the printed booklet is a
// sheet folded in half: tall books are 5.5 x 8.5 in, wide books 8.5 x 5.5 in.
// Drawing resolution is 200 pixels per inch.

export const SHAPES = {
  tall: { w: 1100, h: 1700, label: 'Tall' },
  wide: { w: 1700, h: 1100, label: 'Wide' },
};

export const PAGE_COUNT_CHOICES = [4, 8, 12, 16, 20, 24, 32, 40];
export const MAX_INSIDE_PAGES = 40;
export const MIN_INSIDE_PAGES = 1;

export const COVER_COLORS = [
  '#ff5d5d', '#ff9f43', '#ffd23f', '#7bd389', '#2ec4b6', '#4aa3ff',
  '#6c63ff', '#b388eb', '#ff7eb6', '#8d6e63', '#37474f', '#ffffff',
];

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function makePage(bookId, bg = '#ffffff') {
  return { id: uid(), bookId, bg, drawing: null, items: [], thumb: null };
}

export function makeBook({ shape, insidePages, coverColor }) {
  const id = uid();
  const now = Date.now();
  const pages = [makePage(id, coverColor)];
  for (let i = 0; i < insidePages; i++) pages.push(makePage(id));
  pages.push(makePage(id, coverColor));
  const book = {
    id, title: '', shape, coverColor, created: now, updated: now,
    pageIds: pages.map(p => p.id), coverThumb: null,
  };
  return { book, pages };
}

export const insidePageCount = book => book.pageIds.length - 2;
export const isCover = (book, index) => index === 0 || index === book.pageIds.length - 1;

export function pageLabel(book, index) {
  if (index === 0) return 'Front cover';
  if (index === book.pageIds.length - 1) return 'Back cover';
  return `Page ${index}`;
}

export function shortPageLabel(book, index) {
  if (index === 0) return 'Front';
  if (index === book.pageIds.length - 1) return 'Back';
  return String(index);
}

// How thick the book looks on screen, in pixels at a given scale.
// Each sheet of paper is two pages; the covers add a little.
export function thicknessPx(insidePages, scale = 1) {
  return Math.round((5 + insidePages * 0.9) * scale);
}

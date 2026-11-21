// Small shared UI pieces: element builder, dialogs, the 3D book.

import { thicknessPx } from './model.js';

// h('div.cls1.cls2', {attrs/props/on*}, ...children)
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k === 'class') el.className += ' ' + v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Opens a dialog. build(close) returns the dialog's content element.
// Resolves with whatever is passed to close().
export function openDialog(build, { className = '', dismissable = true } = {}) {
  return new Promise(resolve => {
    const root = document.getElementById('dialog-root');
    let closed = false;
    const close = value => {
      if (closed) return;
      closed = true;
      backdrop.classList.add('leaving');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => backdrop.remove(), 180);
      resolve(value);
    };
    const onKey = e => { if (e.key === 'Escape' && dismissable) close(undefined); };
    const box = h('div.dialog' + (className ? '.' + className : ''), {}, build(close));
    const backdrop = h('div.backdrop', {
      onpointerdown: e => { if (e.target === backdrop && dismissable) close(undefined); },
    }, box);
    document.addEventListener('keydown', onKey);
    root.append(backdrop);
  });
}

export function confirmDialog({ icon = '🤔', text, yes = 'Yes', no = 'No', danger = false }) {
  return openDialog(close => h('div.confirm', {},
    h('div.confirm-icon', {}, icon),
    h('p.confirm-text', {}, text),
    h('div.confirm-buttons', {},
      h('button.btn.btn-big.btn-soft', { onclick: () => close(false) }, no),
      h('button.btn.btn-big' + (danger ? '.btn-danger' : '.btn-go'), { onclick: () => close(true) }, yes),
    ),
  )).then(v => v === true);
}

// A book drawn in 3D with CSS: front cover, spine, page edges and top.
// Its thickness follows the number of inside pages.
// size is the length of the book's longer side in pixels.
export function book3d({ shape, insidePages, coverColor, coverUrl = null, size = 180 }) {
  const short = Math.round(size * 11 / 17);
  const w = shape === 'wide' ? size : short;
  const height = shape === 'wide' ? short : size;
  const t = thicknessPx(insidePages, size / 180);
  const el = h('div.b3d', { style: { '--w': w + 'px', '--h': height + 'px', '--t': t + 'px', '--c': coverColor } },
    h('div.b3d-inner', {},
      h('div.face.back'),
      h('div.face.pages'),
      h('div.face.top'),
      h('div.face.spine'),
      h('div.face.front', {}, coverUrl ? h('img', { src: coverUrl, alt: '', draggable: false }) : null,
        h('div.front-shine')),
    ),
  );
  return el;
}

// Isaac's name in bouncy rainbow letters.
const TITLE_COLORS = ['#ff5d5d', '#ff9f43', '#f5c400', '#3cb371', '#2ec4b6', '#4aa3ff', '#6c63ff', '#ff7eb6'];
export function rainbowTitle(text) {
  let n = 0;
  return h('h1.rainbow-title', {}, [...text].map(ch =>
    ch === ' ' ? h('span.space', {}, ' ')
      : h('span', { style: { color: TITLE_COLORS[n % TITLE_COLORS.length], animationDelay: (n++ * 0.08) + 's' } }, ch)));
}

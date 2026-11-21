// Stickers. Most are emoji drawn with Twemoji art (loaded from a CDN, with
// the device's own emoji as a fallback). The super heroes, bad guys and
// swarms are drawn here as SVG, so they always work, even offline.

import { shade, svgDoc, limb, starPoints, DINOSAURS, DRAGONS, PETS, KNIGHTS } from './sticker-art.js';

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';

// ---------- hand-drawn stickers ----------


const EMBLEMS = {
  star: c => `<polygon points="${starPoints(100, 105, 12, 5)}" fill="${c}"/>`,
  bolt: c => `<path d="M104 90 L91 107 L100 107 L95 119 L110 100 L101 100 Z" fill="${c}"/>`,
  heart: c => `<path d="M100 117 C84 106 88 92 96 94 C98 94.5 99.5 96 100 98 C100.5 96 102 94.5 104 94 C112 92 116 106 100 117 Z" fill="${c}"/>`,
  flame: c => `<path d="M100 88 C109 98 114 106 108 115 C105 120 95 120 92 115 C87 107 95 102 97 96 C98 102 101 104 102 101 C103 98 102 93 100 88 Z" fill="${c}"/>`,
};

function hero({ suit, cape, emblem, mask, skin, hair, hairStyle = 'short', boots = '#263238', belt = '#ffd23f', pose = 'stand' }) {
  const capePath = pose === 'stand'
    ? 'M66 82 Q44 140 32 192 Q66 182 100 192 Q134 182 168 192 Q156 140 134 82 Z'
    : 'M68 84 C34 100 16 146 6 194 C40 180 70 194 100 186 C130 194 160 180 194 194 C184 146 166 100 132 84 Z';
  const arms = pose === 'stand'
    ? limb('M74 90 L52 112 L72 130', suit) + limb('M126 90 L148 112 L128 130', suit) +
      `<circle cx="72" cy="130" r="10" fill="${boots}"/><circle cx="128" cy="130" r="10" fill="${boots}"/>`
    : limb('M76 90 L58 62 L62 32', suit) + limb('M124 90 L142 62 L138 32', suit) +
      `<circle cx="62" cy="28" r="11" fill="${boots}"/><circle cx="138" cy="28" r="11" fill="${boots}"/>`;
  const hairBack = hairStyle === 'long'
    ? `<path d="M70 52 C68 18 132 18 130 52 L134 88 L118 84 L118 60 L82 60 L82 84 L66 88 Z" fill="${hair}"/>` : '';
  const hairTop = {
    short: `<path d="M72 50 C72 26 90 20 102 22 C118 22 130 32 128 50 C120 40 108 36 100 38 C90 36 80 42 72 50Z" fill="${hair}"/>`,
    spiky: `<path d="M72 50 L72 32 L84 38 L86 20 L98 32 L104 16 L112 32 L122 22 L122 38 L130 34 L128 50 C118 40 82 40 72 50 Z" fill="${hair}"/>`,
    long: `<path d="M72 50 C70 24 130 24 128 50 C116 38 104 36 96 42 C88 38 78 42 72 50 Z" fill="${hair}"/>`,
  }[hairStyle];
  return svgDoc(`
    <path d="${capePath}" fill="${cape}" stroke="${shade(cape, -0.35)}" stroke-width="3"/>
    <rect x="76" y="136" width="20" height="44" rx="9" fill="${suit}"/>
    <rect x="104" y="136" width="20" height="44" rx="9" fill="${suit}"/>
    <rect x="72" y="164" width="27" height="24" rx="10" fill="${boots}"/>
    <rect x="101" y="164" width="27" height="24" rx="10" fill="${boots}"/>
    <rect x="68" y="78" width="64" height="66" rx="20" fill="${suit}" stroke="${shade(suit, -0.35)}" stroke-width="3"/>
    <rect x="70" y="126" width="60" height="10" fill="${belt}"/>
    <circle cx="100" cy="104" r="16" fill="#fff" stroke="${shade(suit, -0.35)}" stroke-width="2"/>
    ${EMBLEMS[emblem](cape)}
    ${arms}
    ${hairBack}
    <circle cx="100" cy="52" r="28" fill="${skin}" stroke="${shade(skin, -0.3)}" stroke-width="2"/>
    ${hairTop}
    <path d="M70 48 Q100 40 130 48 L128 61 Q100 55 72 61 Z" fill="${mask}"/>
    <ellipse cx="88" cy="53" rx="7" ry="5" fill="#fff"/><ellipse cx="112" cy="53" rx="7" ry="5" fill="#fff"/>
    <circle cx="89" cy="53.5" r="2.8" fill="#222"/><circle cx="111" cy="53.5" r="2.8" fill="#222"/>
    <path d="M89 67 Q100 76 111 67" stroke="#5d2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}

// Drawn a little smaller and lower so the horns fit.
function bossBadGuy() {
  return svgDoc(`<g transform="translate(8 12) scale(0.92)">${bossBadGuyBody()}</g>`);
}
function bossBadGuyBody() {
  return (`
    <path d="M64 84 C40 130 30 170 26 196 L174 196 C170 170 160 130 136 84 Z" fill="#212121"/>
    <path d="M74 90 C58 130 52 170 50 196 L150 196 C148 170 142 130 126 90 Z" fill="#b71c1c"/>
    <path d="M66 86 L48 34 L90 74 Z" fill="#212121" stroke="#b71c1c" stroke-width="3"/>
    <path d="M134 86 L152 34 L110 74 Z" fill="#212121" stroke="#b71c1c" stroke-width="3"/>
    <rect x="77" y="136" width="20" height="44" rx="9" fill="#4a148c"/>
    <rect x="103" y="136" width="20" height="44" rx="9" fill="#4a148c"/>
    <rect x="72" y="164" width="27" height="24" rx="10" fill="#111"/>
    <rect x="101" y="164" width="27" height="24" rx="10" fill="#111"/>
    <rect x="68" y="78" width="64" height="66" rx="18" fill="#4a148c" stroke="#2a0a52" stroke-width="3"/>
    <rect x="70" y="126" width="60" height="10" fill="#111"/>
    <rect x="94" y="125" width="12" height="12" rx="2" fill="#ffd23f"/>
    <circle cx="100" cy="104" r="16" fill="#111" stroke="#b71c1c" stroke-width="3"/>
    ${EMBLEMS.bolt('#ff1744')}
    ${limb('M74 90 L56 116 L66 138', '#4a148c')}
    ${limb('M126 90 L150 78 L154 52', '#4a148c')}
    <circle cx="66" cy="138" r="10" fill="#111"/><circle cx="154" cy="48" r="11" fill="#111"/>
    <circle cx="100" cy="56" r="26" fill="#9ccc65" stroke="#558b2f" stroke-width="2"/>
    <path d="M72 56 C70 22 130 22 128 56 L120 50 L100 60 L80 50 Z" fill="#37474f" stroke="#263238" stroke-width="2"/>
    <path d="M78 34 C64 26 60 12 64 2 C70 14 78 20 90 26 Z" fill="#eceff1" stroke="#90a4ae" stroke-width="2"/>
    <path d="M122 34 C136 26 140 12 136 2 C130 14 122 20 110 26 Z" fill="#eceff1" stroke="#90a4ae" stroke-width="2"/>
    <ellipse cx="89" cy="65" rx="6" ry="5" fill="#ff1744"/><ellipse cx="111" cy="65" rx="6" ry="5" fill="#ff1744"/>
    <path d="M80 57 L96 63 M120 57 L104 63" stroke="#1b1b1b" stroke-width="5" stroke-linecap="round"/>
    <path d="M86 73 Q100 86 114 73 Q100 78 86 73 Z" fill="#fff" stroke="#33691e" stroke-width="2" stroke-linejoin="round"/>`);
}

function robotBadGuy() {
  return svgDoc(`
    <rect x="78" y="148" width="16" height="32" fill="#78909c"/><rect x="106" y="148" width="16" height="32" fill="#78909c"/>
    <rect x="68" y="174" width="32" height="14" rx="7" fill="#455a64"/><rect x="100" y="174" width="32" height="14" rx="7" fill="#455a64"/>
    <path d="M62 100 L40 120 L40 142" fill="none" stroke="#78909c" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M138 100 L160 120 L160 142" fill="none" stroke="#78909c" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 146 A12 12 0 1 0 52 146" fill="none" stroke="#455a64" stroke-width="7" stroke-linecap="round"/>
    <path d="M148 146 A12 12 0 1 0 172 146" fill="none" stroke="#455a64" stroke-width="7" stroke-linecap="round"/>
    <rect x="58" y="84" width="84" height="70" rx="14" fill="#90a4ae" stroke="#546e7a" stroke-width="4"/>
    <rect x="76" y="98" width="48" height="30" rx="6" fill="#37474f"/>
    <circle cx="87" cy="113" r="5" fill="#ff1744"/><circle cx="100" cy="113" r="5" fill="#ffd23f"/><circle cx="113" cy="113" r="5" fill="#00e676"/>
    <rect x="92" y="76" width="16" height="10" fill="#546e7a"/>
    <line x1="100" y1="26" x2="100" y2="12" stroke="#546e7a" stroke-width="4"/>
    <circle cx="100" cy="9" r="7" fill="#ff1744"/>
    <rect x="64" y="26" width="72" height="54" rx="12" fill="#b0bec5" stroke="#546e7a" stroke-width="4"/>
    <circle cx="62" cy="53" r="6" fill="#78909c"/><circle cx="138" cy="53" r="6" fill="#78909c"/>
    <rect x="72" y="42" width="56" height="18" rx="9" fill="#212121"/>
    <rect x="78" y="47" width="44" height="8" rx="4" fill="#ff1744"/>
    <path d="M72 38 L100 45 L128 38" fill="none" stroke="#546e7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="82" y="64" width="36" height="10" rx="3" fill="#455a64"/>
    <path d="M91 64 V74 M100 64 V74 M109 64 V74" stroke="#b0bec5" stroke-width="2"/>`);
}

function bandit() {
  const stripes = [82, 94, 106, 118, 130].map(y => `<rect x="60" y="${y}" width="80" height="6" fill="#212121"/>`).join('');
  return svgDoc(`
    <defs><clipPath id="shirt"><rect x="68" y="78" width="64" height="66" rx="18"/></clipPath></defs>
    <path d="M140 70 C176 64 192 110 178 140 C166 162 126 160 120 136 C114 110 120 76 140 70 Z" fill="#c8a46a" stroke="#8d6e3f" stroke-width="3"/>
    <path d="M134 74 L148 58 L150 74 Z" fill="#c8a46a" stroke="#8d6e3f" stroke-width="3"/>
    <text x="153" y="128" font-size="38" font-family="Arial, sans-serif" font-weight="bold" fill="#5d4037" text-anchor="middle">$</text>
    <rect x="77" y="136" width="20" height="44" rx="9" fill="#263238"/>
    <rect x="103" y="136" width="20" height="44" rx="9" fill="#263238"/>
    <rect x="72" y="166" width="27" height="22" rx="10" fill="#4e342e"/>
    <rect x="101" y="166" width="27" height="22" rx="10" fill="#4e342e"/>
    <rect x="68" y="78" width="64" height="66" rx="18" fill="#fafafa"/>
    <g clip-path="url(#shirt)">${stripes}</g>
    <rect x="68" y="78" width="64" height="66" rx="18" fill="none" stroke="#212121" stroke-width="3"/>
    ${limb('M74 90 L56 114 L70 132', '#212121')}
    ${limb('M126 90 L140 80', '#212121')}
    <circle cx="70" cy="132" r="9" fill="#f1c27d"/><circle cx="142" cy="76" r="9" fill="#f1c27d"/>
    <circle cx="100" cy="54" r="27" fill="#f1c27d" stroke="#c9995a" stroke-width="2"/>
    <path d="M72 46 C72 18 128 18 128 46 Z" fill="#212121"/>
    <rect x="70" y="40" width="60" height="10" rx="5" fill="#37474f"/>
    <path d="M70 53 Q100 47 130 53 L128 65 Q100 61 72 65 Z" fill="#111"/>
    <ellipse cx="88" cy="58" rx="6" ry="4" fill="#fff"/><ellipse cx="112" cy="58" rx="6" ry="4" fill="#fff"/>
    <circle cx="91" cy="58" r="2.6" fill="#222"/><circle cx="115" cy="58" r="2.6" fill="#222"/>
    <path d="M91 71 Q102 75 111 68" stroke="#6d3b1f" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}

function minionBody(color) {
  const dark = shade(color, -0.4);
  const wing = `M62 104 C40 70 14 76 6 100 C18 96 22 108 30 112 C34 104 42 106 46 116 C50 108 56 110 60 118 Z`;
  return `
    <path d="${wing}" fill="${dark}"/>
    <path d="${wing}" fill="${dark}" transform="matrix(-1 0 0 1 200 0)"/>
    <path d="M76 74 L68 44 L94 68 Z M124 74 L132 44 L106 68 Z" fill="${dark}"/>
    <circle cx="100" cy="108" r="46" fill="${color}" stroke="${dark}" stroke-width="4"/>
    <ellipse cx="86" cy="86" rx="14" ry="8" fill="#fff" opacity="0.25"/>
    <ellipse cx="84" cy="104" rx="13" ry="15" fill="#fff"/><ellipse cx="116" cy="104" rx="13" ry="15" fill="#fff"/>
    <circle cx="88" cy="108" r="6" fill="#111"/><circle cx="112" cy="108" r="6" fill="#111"/>
    <path d="M68 86 L96 98 M132 86 L104 98" stroke="#1a1a1a" stroke-width="7" stroke-linecap="round"/>
    <path d="M82 132 Q100 122 118 132" stroke="#1a1a1a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M88 129 L92 140 L96 127 Z M104 127 L108 140 L112 129 Z" fill="#fff"/>`;
}

const minion = color => svgDoc(minionBody(color));

// Lots of little bad guys flying together.
function swarm(colors) {
  // A cloud of bad guys: random spots in an oval, small ones behind, a big
  // leader in the middle. Seeded, so the swarm looks the same every time.
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd());
    spots.push([100 + Math.cos(a) * d * 74, 100 + Math.sin(a) * d * 66, 34 + rnd() * 40, (rnd() - 0.5) * 40]);
  }
  spots.sort((p, q) => p[2] - q[2]);
  spots.push([100, 104, 92, 0]);
  const symbols = colors.map((c, i) => `<symbol id="m${i}" viewBox="0 0 200 200">${minionBody(c)}</symbol>`).join('');
  const uses = spots.map(([cx, cy, s, r], i) =>
    `<use xlink:href="#m${i % colors.length}" href="#m${i % colors.length}" x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" transform="rotate(${r} ${cx} ${cy})"/>`).join('');
  return svgDoc(`<defs>${symbols}</defs>${uses}`);
}

const CUSTOM = {
  'hero-star': () => hero({ suit: '#1e63c6', cape: '#e53935', emblem: 'star', mask: '#e53935', skin: '#f1c27d', hair: '#4e342e' }),
  'hero-bolt': () => hero({ suit: '#2e7d32', cape: '#ffd23f', emblem: 'bolt', mask: '#1b5e20', skin: '#8d5524', hair: '#1a1a1a', hairStyle: 'spiky' }),
  'hero-heart': () => hero({ suit: '#8e24aa', cape: '#ff6f91', emblem: 'heart', mask: '#ff6f91', skin: '#ffdbac', hair: '#f9a825', hairStyle: 'long' }),
  'hero-flame': () => hero({ suit: '#ef6c00', cape: '#b71c1c', emblem: 'flame', mask: '#212121', skin: '#e0ac69', hair: '#212121', hairStyle: 'spiky' }),
  'hero-star-up': () => hero({ suit: '#1e63c6', cape: '#e53935', emblem: 'star', mask: '#e53935', skin: '#f1c27d', hair: '#4e342e', pose: 'up' }),
  'hero-bolt-up': () => hero({ suit: '#2e7d32', cape: '#ffd23f', emblem: 'bolt', mask: '#1b5e20', skin: '#8d5524', hair: '#1a1a1a', hairStyle: 'spiky', pose: 'up' }),
  'hero-heart-up': () => hero({ suit: '#8e24aa', cape: '#ff6f91', emblem: 'heart', mask: '#ff6f91', skin: '#ffdbac', hair: '#f9a825', hairStyle: 'long', pose: 'up' }),
  'boss': bossBadGuy,
  'robot': robotBadGuy,
  'bandit': bandit,
  'minion-purple': () => minion('#7b1fa2'),
  'minion-green': () => minion('#43a047'),
  'swarm': () => swarm(['#7b1fa2', '#43a047']),
  'swarm-purple': () => swarm(['#7b1fa2']),
};
const NAMED = { ...DINOSAURS, ...DRAGONS, ...PETS, ...KNIGHTS };
for (const [id, s] of Object.entries(NAMED)) CUSTOM[id] = s.draw;

// Names shown under hand-drawn stickers in the sticker book.
export const STICKER_NAMES = Object.fromEntries(
  Object.entries(NAMED).map(([id, s]) => ['svg:' + id, s.name]));

// ---------- the sticker book ----------

const e = s => s.split(' ');
export const STICKER_GROUPS = [
  { id: 'heroes', label: 'Super heroes', icon: '🦸',
    items: ['svg:hero-star', 'svg:hero-bolt', 'svg:hero-heart', 'svg:hero-flame', 'svg:hero-star-up', 'svg:hero-bolt-up', 'svg:hero-heart-up',
      ...e('🦸 🦸‍♀️ 🦸‍♂️ 🦸🏽 🦸🏿‍♀️ 🦸🏼‍♂️ 💪 ⚡ 🦾 🛡️ 🏆 🥇 💥')] },
  { id: 'badguys', label: 'Bad guys', icon: '🦹',
    items: ['svg:boss', 'svg:robot', 'svg:bandit', 'svg:minion-purple', 'svg:minion-green', 'svg:swarm', 'svg:swarm-purple',
      ...e('🦹 🦹‍♀️ 🦹‍♂️ 🦹🏾 🥷 😈 👿 👹 👺 💣 🧟 🧌 👾')] },
  { id: 'knights', label: 'Knights', icon: '🛡️',
    items: [...Object.keys(KNIGHTS).map(id => 'svg:' + id), ...e('🏰 🏯 🏇 🤴 👸 👑 ⚔️ 🗡️ 🛡️ 🏹 🪓 🐴')] },
  { id: 'dinos', label: 'Dinosaurs', icon: '🦖',
    items: [...Object.keys(DINOSAURS).map(id => 'svg:' + id), ...e('🦖 🦕 🥚 🦴 🌋 🌴 🪨 🐊 🦎')] },
  { id: 'dragons', label: 'Dragons', icon: '🐉',
    items: [...Object.keys(DRAGONS).map(id => 'svg:' + id), ...e('🐉 🐲 🔥 🏰 👑 💎 🗡️ 🛡️ 🪄')] },
  { id: 'pets', label: 'Dogs & cats', icon: '🐕',
    items: [...Object.keys(PETS).map(id => 'svg:' + id), ...e('🐶 🐕 🦮 🐕‍🦺 🐩 🐱 🐈 🐈‍⬛ 😺 😸 😻 😼 🙀 😹 🐾')] },
  { id: 'animals', label: 'Animals', icon: '🐮',
    items: e('🐷 🐮 🐔 🐴 🐰 🐹 🐭 🐻 🐼 🐨 🐻‍❄️ 🦊 🐺 🦝 🦁 🐯 🐆 🦓 🦒 🐘 🦏 🦛 🐪 🦙 🦘 🦬 🐃 🐂 🐗 🐑 🐐 🦌 🦄 🐵 🦍 🦧 🐒 🦥 🦦 🦫 🦔 🐿️ 🐸 🐢 🐍 🦎 🐊 🦉 🦅 🦆 🦜 🦚 🦩 🦢 🐧 🐓 🦃 🕊️ 🐦') },
  { id: 'sea', label: 'Sea & bugs', icon: '🐙',
    items: e('🐟 🐠 🐡 🦈 🐬 🐳 🐋 🦭 🐙 🦑 🦀 🦞 🦐 🪼 🐚 🦋 🐝 🐞 🐛 🐌 🐜 🦗 🕷️ 🦂') },
  { id: 'spooky', label: 'Spooky & magic', icon: '👻',
    items: e('🧟 💀 ☠️ 👻 🧙 🧛 🦇 🕷️ 🕸️ 🎃 🧌 👾 🤖 👽 🦴 🔥 🧊 ❄️ ⚔️ 🗡️ 🛡️ 🏹 👑 💎 🪄 🏰') },
  { id: 'go', label: 'Things that go', icon: '🚀',
    items: e('🚗 🚕 🚌 🚓 🚑 🚒 🚜 🏎️ 🚂 🚁 ✈️ 🚀 🛸 🚢 ⛵ 🚲 🛴 🚧') },
  { id: 'sky', label: 'Space & sky', icon: '🌟',
    items: e('☀️ 🌙 ⭐ 🌟 ✨ 🪐 🌍 ☄️ 🌈 ☁️ ⛈️ ❄️ 🌪️ 🌋') },
  { id: 'nature', label: 'Outside', icon: '🌳',
    items: e('🌳 🌲 🌴 🌵 🌷 🌻 🌹 🍄 🍀 🍁 🌊 🏔️ 🏝️ 🏠 🏡 ⛺') },
  { id: 'food', label: 'Food', icon: '🍕',
    items: e('🍎 🍌 🍓 🍉 🍕 🍔 🌭 🍟 🍦 🍩 🍪 🎂 🍭 🥕 🧀 🥚') },
  { id: 'fun', label: 'Faces & fun', icon: '😀',
    items: e('😀 😂 😍 😎 🤩 😮 😢 😡 🥳 😴 🤪 👍 👋 ❤️ 💖 💥 💤 💨 ❓ ❗ 🎉 🎈 🎁 ⚽ 🏀 🎮 🧸') },
];

export const isEmojiSticker = id => !id.startsWith('svg:');

function twemojiUrl(emoji) {
  const cps = [...emoji].map(c => c.codePointAt(0));
  const zwj = cps.includes(0x200d);
  return TWEMOJI_BASE + cps.filter(c => zwj || c !== 0xfe0f).map(c => c.toString(16)).join('-') + '.svg';
}

// A same-origin blob URL for the sticker's picture, or null if it can't be
// loaded (then the emoji itself is shown).
const srcCache = new Map();
export function getStickerSrc(id) {
  if (!srcCache.has(id)) {
    srcCache.set(id, (async () => {
      let svg;
      if (id.startsWith('svg:')) {
        svg = CUSTOM[id.slice(4)]();
      } else {
        const res = await fetch(twemojiUrl(id));
        if (!res.ok) throw new Error('sticker not found');
        svg = await res.text();
        // Give it a real size so it draws sharply and at the right shape.
        if (!/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg', '<svg width="512" height="512"');
      }
      return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    })().catch(() => null));
  }
  return srcCache.get(id);
}

const imgCache = new Map();
export function loadStickerImage(id) {
  if (!imgCache.has(id)) {
    imgCache.set(id, getStickerSrc(id).then(src => src && new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    })));
  }
  return imgCache.get(id);
}

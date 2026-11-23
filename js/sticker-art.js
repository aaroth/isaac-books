// Hand-drawn sticker pictures: dinosaurs and dragons, plus the small
// drawing helpers the other hand-drawn stickers share. Every picture is an
// SVG on a 200 x 200 grid; animals face right.

export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = c => Math.round(c + (target - c) * p);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

export const svgDoc = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 200 200">${body}</svg>`;

// A thick limb with a darker outline.
export const limb = (d, color, width = 17) =>
  `<path d="${d}" fill="none" stroke="${shade(color, -0.35)}" stroke-width="${width + 5}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

export function starPoints(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const outline = dark => `stroke="${dark}" stroke-width="3" stroke-linejoin="round"`;
const eye = (x, y, r = 6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#333" stroke-width="1.5"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.1}" r="${r * 0.55}" fill="#222"/><circle cx="${x + r * 0.45}" cy="${y - r * 0.25}" r="${r * 0.18}" fill="#fff"/>`;
const claws = (xs, y) => xs.map(x => `<path d="M${x} ${y} L${x + 4} ${y - 7} L${x + 8} ${y} Z" fill="#fffbe6"/>`).join('');

// ---------- two-legged dinosaurs ----------

const BIPED_HEADS = {
  // Big head, toothy jaw.
  rex: (o, st) => `
    <path d="M112 100 C116 78 130 58 156 54 C178 50 196 60 196 76 C196 88 188 94 176 96 L148 100 C140 110 132 116 122 118 Z" fill="${o.body}" ${st}/>
    <path d="M146 98 L190 96 C188 110 172 116 154 114 C146 112 140 108 140 104 Z" fill="${o.body}" ${st}/>
    <path d="M150 98 L153 104 L156 98 L159 104 L162 98 L165 104 L168 98 L171 104 L174 97 L177 103 L180 97 L183 103 L186 97 Z" fill="#fff"/>
    ${eye(166, 70)}
    <path d="M156 60 L177 64" stroke="${o.dark}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="189" cy="73" r="2.2" fill="${o.dark}"/>`,
  // Long crocodile snout.
  long: (o, st) => `
    <path d="M112 100 C116 80 128 66 146 64 L196 72 C200 80 194 88 184 88 L150 96 C142 108 132 116 122 118 Z" fill="${o.body}" ${st}/>
    <path d="M148 94 L194 86 C192 96 178 100 160 100 C150 100 144 98 142 96 Z" fill="${o.body}" ${st}/>
    <path d="M152 93 L155 98 L158 92 L161 97 L164 91 L167 96 L170 90 L173 95 L176 89 L179 94 L182 88 Z" fill="#fff"/>
    ${eye(152, 74, 5.5)}
    <circle cx="186" cy="77" r="2" fill="${o.dark}"/>`,
  // Duck bill.
  duck: (o, st) => `
    <path d="M150 68 C134 50 104 38 80 34 C76 40 80 46 88 48 C108 52 126 62 142 78 Z" fill="${o.crest}" ${st}/>
    <path d="M112 100 C116 80 130 66 150 64 C168 62 182 70 192 82 C196 90 190 96 180 96 L150 98 C142 108 132 116 122 118 Z" fill="${o.body}" ${st}/>
    <path d="M168 90 Q180 95 191 88" stroke="${o.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eye(158, 76, 5.5)}`,
  // Thick round dome.
  dome: (o, st) => `
    <path d="M112 100 C112 76 126 50 152 48 C176 48 192 62 190 80 C190 92 182 98 172 98 L150 100 C142 108 132 116 122 118 Z" fill="${o.body}" ${st}/>
    <path d="M128 62 C134 50 146 45 160 46 C176 48 186 58 188 70 C170 60 148 58 128 62 Z" fill="${o.dome}"/>
    ${[[122, 74], [128, 64], [138, 56], [190, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${o.dark}"/>`).join('')}
    ${eye(164, 76, 5.5)}
    <path d="M170 90 Q178 94 186 88" stroke="${o.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
};

function biped(o) {
  const st = outline(o.dark);
  const ry = o.bodyRy || 30;
  const p = [];
  p.push(`<path d="M78 110 C52 108 24 122 4 148 C28 146 56 140 84 140 Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M106 132 C112 150 114 166 118 182 L136 182 C132 168 128 150 124 132 Z" fill="${shade(o.body, -0.2)}" ${st}/>`);
  if (o.sail) {
    p.push(`<path d="M62 110 C58 72 76 40 102 36 C124 34 136 58 130 96 L120 106 Z" fill="${o.sail}" ${st}/>`);
    p.push([[70, 64], [82, 46], [98, 38], [114, 40], [126, 56]].map(([x, y], i) =>
      `<path d="M${76 + i * 10} 106 L${x} ${y}" stroke="${shade(o.sail, -0.3)}" stroke-width="2.5"/>`).join(''));
  }
  if (o.feathers) {
    p.push([[60, 104], [72, 96], [86, 91], [100, 90], [114, 93]].map(([x, y]) =>
      `<path d="M${x} ${y + 6} C${x - 4} ${y - 6} ${x + 6} ${y - 12} ${x + 12} ${y - 4} Z" fill="${o.feathers}"/>`).join(''));
  }
  p.push(`<ellipse cx="96" cy="120" rx="40" ry="${ry}" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M68 128 C80 150 114 154 132 136 C116 144 88 142 68 128 Z" fill="${o.belly}"/>`);
  if (o.stripes) {
    p.push([70, 84, 98, 112].map(x =>
      `<path d="M${x} ${120 - ry + 4} C${x + 4} ${120 - ry + 12} ${x + 2} ${120 - ry + 20} ${x - 2} ${120 - ry + 26}" stroke="${o.dark}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.45"/>`).join(''));
  }
  if (o.spots) {
    p.push([[88, 104, 5], [104, 100, 4], [74, 112, 4], [116, 108, 3]].map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.dark}" opacity="0.4"/>`).join(''));
  }
  p.push(`<path d="M76 126 C70 148 72 166 66 182 L96 182 C94 166 100 150 102 134 Z" fill="${o.body}" ${st}/>`);
  p.push(claws([67, 77, 87], 182));
  if (o.sickle) p.push(`<path d="M90 178 C96 168 104 170 102 180 C100 176 96 176 92 182 Z" fill="#fffbe6" stroke="${o.dark}" stroke-width="1.5"/>`);
  p.push(BIPED_HEADS[o.head](o, st));
  if (o.crests) {
    p.push(`<path d="M146 60 C144 40 158 30 170 36 C164 42 160 50 158 60 Z" fill="${o.crests}" ${st}/>`);
    p.push(`<path d="M158 58 C158 40 172 32 184 40 C176 44 172 50 170 60 Z" fill="${o.crests}" ${st}/>`);
  }
  if (o.horns) {
    p.push(`<path d="M158 58 L163 40 L171 56 Z" fill="${o.horns}" ${st}/>`);
    p.push(`<path d="M146 62 L147 46 L155 59 Z" fill="${o.horns}" ${st}/>`);
  }
  if (o.ridges) p.push(`<path d="M155 61 C157 50 170 50 174 61 Z" fill="${o.ridges}" ${st}/>`);
  p.push(`<path d="M126 118 C134 120 138 124 140 131" fill="none" stroke="${o.dark}" stroke-width="10" stroke-linecap="round"/>`);
  p.push(`<path d="M126 118 C134 120 138 124 140 131" fill="none" stroke="${o.body}" stroke-width="5" stroke-linecap="round"/>`);
  if (o.feathers) p.push(`<path d="M128 120 C126 132 134 140 142 136 Z" fill="${o.feathers}"/>`);
  return svgDoc(p.join(''));
}

// ---------- four-legged dinosaurs ----------

function quad(o) {
  const st = outline(o.dark);
  const cy = o.low ? 126 : 118, ry = o.low ? 24 : 30;
  const far = shade(o.body, -0.2);
  const p = [];
  // Tail
  p.push(`<path d="M52 ${cy - 6} C32 ${cy - 4} 14 ${cy + 8} 2 ${cy + 20} C22 ${cy + 20} 40 ${cy + 16} 56 ${cy + 12} Z" fill="${o.body}" ${st}/>`);
  if (o.tail === 'spikes') {
    p.push([[8, cy + 14, -18], [20, cy + 10, -26], [32, cy + 6, -30]].map(([x, y, hgt]) =>
      `<path d="M${x - 4} ${y} L${x - 6} ${y + hgt} L${x + 6} ${y - 2} Z" fill="#fff8e1" ${st}/>`).join(''));
  }
  if (o.tail === 'club') p.push(`<ellipse cx="9" cy="${cy + 17}" rx="12" ry="9" fill="${shade(o.body, -0.3)}" ${st}/>`);
  // Far legs
  p.push(`<path d="M68 ${cy + 8} L66 182 L84 182 L86 ${cy + 8} Z" fill="${far}" ${st}/>`);
  p.push(`<path d="M118 ${cy + 8} L116 182 L134 182 L136 ${cy + 8} Z" fill="${far}" ${st}/>`);
  // Back plates go behind the body.
  if (o.plates) {
    const spots = [[50, cy - 18, 0.7], [64, cy - 30, 0.9], [80, cy - 38, 1.05], [98, cy - 41, 1.1], [116, cy - 37, 1], [131, cy - 27, 0.8]];
    p.push(spots.map(([x, y, s], i) =>
      `<path d="M${x - 10 * s} ${y + 12} L${x - 9 * s} ${y - 6 * s} L${x} ${y - 18 * s} L${x + 9 * s} ${y - 6 * s} L${x + 10 * s} ${y + 12} Z" fill="${i % 2 ? o.plates : shade(o.plates, 0.2)}" ${st}/>`).join(''));
  }
  p.push(`<ellipse cx="92" cy="${cy}" rx="48" ry="${ry}" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M56 ${cy + 12} C72 ${cy + ry + 6} 116 ${cy + ry + 6} 132 ${cy + 12} C114 ${cy + 20} 76 ${cy + 20} 56 ${cy + 12} Z" fill="${o.belly}"/>`);
  if (o.armor) {
    const bumps = [];
    for (let k = 0; k < 7; k++) {
      const x = 56 + k * 12, y = cy - ry + 6 + Math.abs(k - 3) * 2.2;
      bumps.push(`<path d="M${x - 6} ${y + 4} L${x} ${y - 8} L${x + 6} ${y + 4} Z" fill="${o.armor}" ${st}/>`);
      if (k % 2 === 0) bumps.push(`<circle cx="${x + 6}" cy="${y + 12}" r="4" fill="${shade(o.body, -0.25)}"/>`);
    }
    p.push(bumps.join(''));
  }
  if (o.spots) {
    p.push([[80, cy - 12, 5], [98, cy - 16, 4], [112, cy - 8, 4], [70, cy - 2, 3]].map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.dark}" opacity="0.35"/>`).join(''));
  }
  // Near legs
  p.push(`<path d="M58 ${cy + 8} L56 182 L78 182 L80 ${cy + 14} Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M106 ${cy + 14} L104 182 L126 182 L128 ${cy + 8} Z" fill="${o.body}" ${st}/>`);
  p.push(claws([57, 67], 182) + claws([105, 115], 182));
  p.push(QUAD_HEADS[o.head](o, st, cy));
  return svgDoc(p.join(''));
}

const QUAD_HEADS = {
  // Frill and three horns.
  tri: (o, st) => `
    <path d="M128 66 C150 44 178 50 184 74 C188 94 172 120 146 120 C132 112 124 94 128 66 Z" fill="${o.frill}" ${st}/>
    ${[[134, 64], [150, 52], [168, 52], [181, 64], [185, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${shade(o.frill, -0.3)}"/>`).join('')}
    <path d="M132 96 C138 80 158 76 174 86 C184 92 194 104 196 114 C186 122 166 124 150 120 C138 116 130 108 132 96 Z" fill="${o.body}" ${st}/>
    <path d="M186 104 C196 108 198 116 194 122 C188 118 184 112 186 104 Z" fill="${o.dark}"/>
    <path d="M156 84 C158 66 166 52 178 44 C172 58 168 72 166 86 Z" fill="#fff8e1" ${st}/>
    <path d="M146 87 C146 71 150 59 158 51 C156 63 156 77 156 89 Z" fill="#fff8e1" ${st}/>
    <path d="M182 98 C184 90 188 84 194 82 C192 90 190 96 188 102 Z" fill="#fff8e1" ${st}/>
    ${eye(162, 98, 5)}
    <path d="M168 114 Q178 118 186 114" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Frill with long spikes, one big nose horn.
  styraco: (o, st) => `
    ${[[132, 40], [150, 30], [170, 34], [186, 50]].map(([x, y]) => `<path d="M${x - 8} ${y + 34} L${x} ${y} L${x + 8} ${y + 34} Z" fill="#fff8e1" ${st}/>`).join('')}
    <path d="M128 70 C146 52 176 54 184 76 C188 96 172 120 146 120 C132 112 124 96 128 70 Z" fill="${o.frill}" ${st}/>
    <path d="M132 96 C138 80 158 76 174 86 C184 92 194 104 196 114 C186 122 166 124 150 120 C138 116 130 108 132 96 Z" fill="${o.body}" ${st}/>
    <path d="M186 104 C196 108 198 116 194 122 C188 118 184 112 186 104 Z" fill="${o.dark}"/>
    <path d="M178 98 C180 80 186 68 196 60 C194 76 190 88 188 100 Z" fill="#fff8e1" ${st}/>
    ${eye(162, 98, 5)}
    <path d="M168 114 Q178 118 186 114" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Little head, low down.
  small: (o, st, cy) => `
    <path d="M136 ${cy - 2} C150 ${cy - 10} 172 ${cy - 10} 188 ${cy - 2} C196 ${cy + 4} 190 ${cy + 14} 176 ${cy + 16} C160 ${cy + 16} 146 ${cy + 12} 136 ${cy + 8} Z" fill="${o.body}" ${st}/>
    ${eye(174, cy + 1, 4.5)}
    <path d="M178 ${cy + 10} Q184 ${cy + 12} 190 ${cy + 8}" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Wide, armored head with little horns.
  anky: (o, st, cy) => `
    <path d="M134 ${cy - 8} C146 ${cy - 20} 172 ${cy - 20} 186 ${cy - 10} C196 ${cy - 2} 192 ${cy + 12} 178 ${cy + 14} C160 ${cy + 16} 142 ${cy + 10} 134 ${cy + 4} Z" fill="${o.body}" ${st}/>
    <path d="M150 ${cy - 16} L146 ${cy - 26} L158 ${cy - 18} Z M176 ${cy - 15} L182 ${cy - 24} L184 ${cy - 11} Z" fill="${o.armor}" ${st}/>
    <path d="M148 ${cy - 14} C158 ${cy - 18} 172 ${cy - 18} 182 ${cy - 10}" stroke="${shade(o.body, -0.3)}" stroke-width="3" fill="none"/>
    ${eye(170, cy - 4, 4.5)}
    <path d="M176 ${cy + 6} Q184 ${cy + 8} 190 ${cy + 3}" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
};

// ---------- long-necked dinosaurs ----------

function longNeck(o) {
  const st = outline(o.dark);
  const far = shade(o.body, -0.2);
  const tall = o.tall; // brachiosaurus: front legs longer, neck straight up
  const p = [];
  p.push(`<path d="M50 ${tall ? 130 : 124} C30 ${tall ? 134 : 122} 12 ${tall ? 150 : 134} 0 ${tall ? 168 : 154} C20 ${tall ? 166 : 152} 38 ${tall ? 156 : 146} 58 ${tall ? 150 : 142} Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M64 140 L62 184 L80 184 L82 140 Z" fill="${far}" ${st}/>`);
  p.push(`<path d="M104 ${tall ? 128 : 140} L102 184 L120 184 L122 ${tall ? 128 : 140} Z" fill="${far}" ${st}/>`);
  if (tall) {
    p.push(`<path d="M104 112 C116 84 126 52 132 28 C134 18 146 16 150 26 C146 52 138 90 126 122 Z" fill="${o.body}" ${st}/>`);
    p.push(`<ellipse cx="88" cy="128" rx="44" ry="26" fill="${o.body}" ${st} transform="rotate(-12 88 128)"/>`);
  } else {
    p.push(`<path d="M110 116 C122 90 132 62 140 42 C143 34 152 32 154 40 C152 62 142 96 128 128 Z" fill="${o.body}" ${st}/>`);
    p.push(`<ellipse cx="86" cy="128" rx="46" ry="28" fill="${o.body}" ${st}/>`);
  }
  p.push(`<path d="M50 136 C66 156 108 158 124 140 C106 148 70 148 50 136 Z" fill="${o.belly}"/>`);
  p.push([[74, 112, 5], [92, 106, 6], [108, 114, 4], [62, 124, 4]].map(([x, y, r]) =>
    `<circle cx="${x}" cy="${y - (tall ? 6 : 0)}" r="${r}" fill="${o.dark}" opacity="0.3"/>`).join(''));
  p.push(`<path d="M52 140 L50 184 L72 184 L74 142 Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M98 ${tall ? 126 : 142} L96 184 L118 184 L120 ${tall ? 122 : 140} Z" fill="${o.body}" ${st}/>`);
  p.push(claws([52, 62], 184) + claws([98, 108], 184));
  if (tall) {
    p.push(`<path d="M130 26 C132 10 152 6 164 14 C172 20 172 30 162 32 C152 34 140 34 130 26 Z" fill="${o.body}" ${st}/>`);
    p.push(`<path d="M134 16 C136 6 146 4 150 10" fill="none" stroke="${o.dark}" stroke-width="3"/>`);
    p.push(eye(148, 19, 4.5));
    p.push(`<path d="M156 28 Q162 30 167 26" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  } else {
    p.push(`<path d="M138 40 C142 26 160 24 172 32 C178 38 172 46 162 46 C152 46 144 46 138 40 Z" fill="${o.body}" ${st}/>`);
    p.push(eye(156, 34, 4.5));
    p.push(`<path d="M162 42 Q168 44 173 40" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  }
  return svgDoc(p.join(''));
}

// ---------- flying, swimming, hatching ----------

function pteranodon(o) {
  const st = outline(o.dark);
  return svgDoc(`
    <path d="M96 94 C70 70 38 60 4 66 C28 80 46 96 62 116 C74 108 86 104 96 104 Z" fill="${o.wing}" ${st}/>
    <path d="M104 94 C130 66 162 54 196 56 C174 72 156 92 140 114 C128 106 116 104 104 104 Z" fill="${o.wing}" ${st}/>
    <path d="M96 94 L62 116 M96 94 L40 84 M104 94 L140 114 M104 94 L164 72" stroke="${shade(o.wing, -0.3)}" stroke-width="2"/>
    <ellipse cx="100" cy="110" rx="13" ry="24" fill="${o.body}" ${st}/>
    <path d="M94 132 L88 148 M106 132 L112 148" stroke="${o.dark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M100 74 C90 60 80 52 64 48 C78 62 88 72 96 82 Z" fill="${o.crest}" ${st}/>
    <path d="M94 86 C94 72 104 66 112 70 L158 80 L112 88 C106 92 98 92 94 86 Z" fill="${o.body}" ${st}/>
    <path d="M112 84 L156 80" stroke="${o.dark}" stroke-width="2"/>
    ${eye(106, 77, 4.5)}`);
}

function plesiosaurus(o) {
  const st = outline(o.dark);
  return svgDoc(`
    <path d="M0 150 C20 142 40 158 60 150 C80 142 100 158 120 150 C140 142 160 158 180 150 C190 146 196 148 200 150 L200 200 L0 200 Z" fill="#4fc3f7" opacity="0.55"/>
    <path d="M58 132 C36 128 18 136 4 146 C22 148 40 146 60 142 Z" fill="${o.body}" ${st}/>
    <path d="M70 140 C56 152 46 168 40 178 C56 172 70 160 82 146 Z" fill="${shade(o.body, -0.2)}" ${st}/>
    <path d="M118 140 C116 156 120 170 128 180 C134 166 134 152 128 140 Z" fill="${shade(o.body, -0.2)}" ${st}/>
    <ellipse cx="96" cy="134" rx="42" ry="20" fill="${o.body}" ${st}/>
    <path d="M62 140 C80 154 112 154 130 142 C112 148 82 148 62 140 Z" fill="${o.belly}"/>
    <path d="M124 126 C138 104 140 76 146 54 C148 44 160 42 162 52 C158 78 152 108 136 134 Z" fill="${o.body}" ${st}/>
    <path d="M146 54 C148 40 166 36 178 42 C186 48 182 58 170 58 C160 58 152 60 146 54 Z" fill="${o.body}" ${st}/>
    ${eye(164, 47, 4.5)}
    <path d="M170 54 Q176 56 181 52" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M78 142 C66 154 60 166 58 176 M104 146 C108 160 116 170 124 176" stroke="none"/>
    <path d="M0 160 C20 152 40 168 60 160 C80 152 100 168 120 160 C140 152 160 168 180 160 C190 156 196 158 200 160" fill="none" stroke="#fff" stroke-width="3" opacity="0.7"/>`);
}

function babyDino(o) {
  return svgDoc(`
    <path d="M64 92 C60 70 76 52 100 52 C124 52 140 70 136 92 C134 108 120 118 100 118 C80 118 66 108 64 92 Z" fill="${o.body}" stroke="${o.dark}" stroke-width="3"/>
    <path d="M128 86 C142 84 152 90 152 98 C150 106 140 108 128 104 Z" fill="${o.body}" stroke="${o.dark}" stroke-width="3"/>
    <path d="M80 54 L86 42 L94 52 L102 38 L110 52 L118 42 L122 56 C110 46 92 46 80 54 Z" fill="#fff8e1" stroke="#bcaaa4" stroke-width="2.5"/>
    ${eye(92, 80, 9)}${eye(116, 80, 9)}
    <path d="M94 100 Q104 108 116 100" stroke="${o.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="96" rx="6" ry="4" fill="#ff8a80" opacity="0.6"/>
    <path d="M52 118 C52 160 74 188 100 188 C126 188 148 160 148 118 L136 110 L126 124 L114 108 L102 124 L90 108 L78 124 L66 110 Z" fill="#fff8e1" stroke="#bcaaa4" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="80" cy="150" r="7" fill="#d7ccc8"/><circle cx="118" cy="164" r="9" fill="#d7ccc8"/><circle cx="110" cy="138" r="5" fill="#d7ccc8"/>
    <path d="M60 118 C56 112 58 104 66 104" stroke="${o.dark}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M140 118 C144 112 142 104 134 104" stroke="${o.dark}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
}

export const DINOSAURS = {
  'trex': { name: 'T. rex', draw: () => biped({ body: '#66bb6a', dark: '#2e7d32', belly: '#dcedc8', head: 'rex', spots: true }) },
  'raptor': { name: 'Velociraptor', draw: () => biped({ body: '#ff8a65', dark: '#bf360c', belly: '#ffe0b2', head: 'rex', feathers: '#6d4c41', stripes: true, sickle: true, bodyRy: 26 }) },
  'spino': { name: 'Spinosaurus', draw: () => biped({ body: '#4db6ac', dark: '#00695c', belly: '#e0f2f1', head: 'long', sail: '#ff7043' }) },
  'dilo': { name: 'Dilophosaurus', draw: () => biped({ body: '#9ccc65', dark: '#558b2f', belly: '#f0f4c3', head: 'rex', crests: '#e53935', stripes: true }) },
  'carno': { name: 'Carnotaurus', draw: () => biped({ body: '#e57373', dark: '#b71c1c', belly: '#ffcdd2', head: 'rex', horns: '#fff8e1', spots: true }) },
  'allo': { name: 'Allosaurus', draw: () => biped({ body: '#a1887f', dark: '#4e342e', belly: '#efebe9', head: 'rex', ridges: '#e64a19', stripes: true }) },
  'parasaur': { name: 'Parasaurolophus', draw: () => biped({ body: '#7986cb', dark: '#303f9f', belly: '#e8eaf6', head: 'duck', crest: '#ffb74d', spots: true }) },
  'pachy': { name: 'Pachycephalosaurus', draw: () => biped({ body: '#ba68c8', dark: '#6a1b9a', belly: '#f3e5f5', head: 'dome', dome: '#ce93d8', spots: true }) },
  'tri': { name: 'Triceratops', draw: () => quad({ body: '#64b5f6', dark: '#1565c0', belly: '#e3f2fd', head: 'tri', frill: '#ffb74d', spots: true }) },
  'styraco': { name: 'Styracosaurus', draw: () => quad({ body: '#aed581', dark: '#558b2f', belly: '#f1f8e9', head: 'styraco', frill: '#ff8a65' }) },
  'stego': { name: 'Stegosaurus', draw: () => quad({ body: '#ffb74d', dark: '#e65100', belly: '#fff3e0', head: 'small', plates: '#e53935', tail: 'spikes' }) },
  'anky': { name: 'Ankylosaurus', draw: () => quad({ body: '#8d6e63', dark: '#3e2723', belly: '#d7ccc8', head: 'anky', armor: '#ffe0b2', tail: 'club', low: true }) },
  'bronto': { name: 'Brontosaurus', draw: () => longNeck({ body: '#26a69a', dark: '#004d40', belly: '#b2dfdb' }) },
  'brachio': { name: 'Brachiosaurus', draw: () => longNeck({ body: '#9575cd', dark: '#4527a0', belly: '#ede7f6', tall: true }) },
  'ptera': { name: 'Pteranodon', draw: () => pteranodon({ body: '#8d6e63', dark: '#3e2723', wing: '#ffab91', crest: '#e53935' }) },
  'plesio': { name: 'Plesiosaurus', draw: () => plesiosaurus({ body: '#5c6bc0', dark: '#1a237e', belly: '#c5cae9' }) },
  'baby-dino': { name: 'Baby dino', draw: () => babyDino({ body: '#81c784', dark: '#2e7d32' }) },
};

// ---------- dogs and cats (sitting, facing us) ----------

const MIRROR = 'transform="matrix(-1 0 0 1 200 0)"';
const both = path => `${path}<g ${MIRROR}>${path}</g>`;

const DOG_EARS = {
  floppy: c => both(`<path d="M64 50 C48 50 40 70 44 96 C46 104 56 104 60 96 C64 84 66 66 72 56 Z" fill="${c}"/>`),
  long: c => both(`<path d="M64 50 C46 50 38 76 42 112 C44 122 58 122 60 110 C64 92 66 68 72 56 Z" fill="${c}"/>`),
  pointy: c => both(`<path d="M66 56 L60 12 L94 40 Z" fill="${c}"/><path d="M70 48 L66 24 L86 40 Z" fill="#f8bbd0"/>`),
  big: c => both(`<path d="M66 60 L46 2 L96 40 Z" fill="${c}"/><path d="M70 50 L56 16 L86 42 Z" fill="#f8bbd0"/>`),
  fold: c => both(`<path d="M62 44 L86 34 L76 60 Z" fill="${c}"/>`),
};

function dog(o) {
  const st = outline(o.dark);
  const hw = o.headW || 42;
  const short = o.short ? 14 : 0;
  const p = [];
  if (o.poodle) {
    p.push(`<circle cx="160" cy="132" r="14" fill="${o.fur}" ${st}/><path d="M138 168 C150 160 156 150 156 142" stroke="${o.dark}" stroke-width="5" fill="none"/>`);
  } else {
    p.push(`<path d="M134 162 C160 152 170 128 162 110 C174 118 178 146 156 168 Z" fill="${o.tail || o.fur}" ${st}/>`);
  }
  p.push(`<path d="M64 192 C58 152 70 120 100 116 C130 120 142 152 136 192 Z" fill="${o.fur}" ${st}/>`);
  if (o.saddle) p.push(`<path d="M70 150 C70 128 86 120 100 120 C114 120 130 128 130 150 C120 140 80 140 70 150 Z" fill="${o.saddle}"/>`);
  if (o.chest) p.push(`<ellipse cx="100" cy="150" rx="18" ry="24" fill="${o.chest}"/>`);
  if (o.patches) p.push(`<ellipse cx="78" cy="160" rx="12" ry="10" fill="${o.patches}"/><ellipse cx="124" cy="140" rx="9" ry="8" fill="${o.patches}"/>`);
  if (o.spots) p.push([[76, 146, 5], [122, 152, 6], [88, 170, 4], [118, 176, 5], [70, 172, 4], [130, 168, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.spots}"/>`).join(''));
  p.push(`<ellipse cx="66" cy="${178 + short / 2}" rx="20" ry="${15 - short / 4}" fill="${o.fur}" ${st}/><ellipse cx="134" cy="${178 + short / 2}" rx="20" ry="${15 - short / 4}" fill="${o.fur}" ${st}/>`);
  p.push(`<rect x="80" y="${140 + short}" width="16" height="${52 - short}" rx="8" fill="${o.legs || o.fur}" ${st}/><rect x="104" y="${140 + short}" width="16" height="${52 - short}" rx="8" fill="${o.legs || o.fur}" ${st}/>`);
  p.push(`<ellipse cx="88" cy="190" rx="11" ry="6" fill="${o.paws || o.fur}" ${st}/><ellipse cx="112" cy="190" rx="11" ry="6" fill="${o.paws || o.fur}" ${st}/>`);
  if (o.poodle) {
    p.push([[66, 180], [134, 180], [88, 188], [112, 188], [100, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${o.fur}" ${st}/>`).join(''));
  }
  p.push(`<path d="M72 120 Q100 132 128 120 L128 129 Q100 141 72 129 Z" fill="${o.collar || '#e53935'}" ${st}/><circle cx="100" cy="138" r="5.5" fill="#ffd23f" stroke="#c79100" stroke-width="1.5"/>`);
  const earColor = o.earColor || o.fur;
  const earsBehind = ['pointy', 'big'].includes(o.ears);
  if (earsBehind) p.push(DOG_EARS[o.ears](earColor));
  if (o.poodle) p.push(`<circle cx="100" cy="38" r="22" fill="${o.fur}" ${st}/>`);
  p.push(`<ellipse cx="100" cy="74" rx="${hw}" ry="38" fill="${o.fur}" ${st}/>`);
  if (o.mask) p.push(`<path d="M${100 - hw + 4} 80 C66 112 134 112 ${100 + hw - 4} 80 C128 92 112 84 100 96 C88 84 72 92 ${100 - hw + 4} 80 Z" fill="${o.mask}"/><path d="M94 40 L100 66 L106 40 Z" fill="${o.mask}"/>`);
  if (o.blaze) p.push(`<path d="M94 38 C96 50 94 64 92 80 L108 80 C106 64 104 50 106 38 Z" fill="${o.blaze}"/>`);
  if (o.patch) p.push(`<ellipse cx="117" cy="68" rx="15" ry="13" fill="${o.patch}"/>`);
  if (o.headSpots) p.push([[76, 54, 4], [126, 50, 5], [70, 84, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.headSpots}"/>`).join(''));
  if (!earsBehind && o.ears !== 'poodle') p.push(DOG_EARS[o.ears](earColor));
  if (o.poodle) p.push(both(`<circle cx="56" cy="82" r="17" fill="${o.fur}" ${st}/>`));
  p.push(`<ellipse cx="100" cy="94" rx="${o.wide ? 28 : 22}" ry="15" fill="${o.muzzle || o.fur}"/>`);
  if (o.wrinkles) p.push(`<path d="M88 52 Q100 46 112 52 M90 58 Q100 54 110 58" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  if (o.jowls) p.push(both(`<path d="M76 92 C70 104 76 114 88 112 Z" fill="${o.muzzle || o.fur}" ${st}/>`));
  p.push(eye(84, 70, 6.5) + eye(116, 70, 6.5));
  if (o.eyeColor) p.push(`<circle cx="85.6" cy="70.6" r="3.6" fill="${o.eyeColor}"/><circle cx="117.6" cy="70.6" r="3.6" fill="${o.eyeColor}"/><circle cx="85.6" cy="70.6" r="1.6" fill="#222"/><circle cx="117.6" cy="70.6" r="1.6" fill="#222"/>`);
  p.push(`<ellipse cx="100" cy="86" rx="9" ry="6.5" fill="#222"/><ellipse cx="97" cy="84" rx="2.5" ry="1.5" fill="#fff" opacity="0.7"/>`);
  if (o.tongue) p.push(`<path d="M94 100 Q100 116 106 100 Z" fill="#ff7096" stroke="#c2185b" stroke-width="1.5"/>`);
  p.push(`<path d="M100 92 V98 M100 98 Q92 104 86 99 M100 98 Q108 104 114 99" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  if (o.underbite) p.push(`<path d="M92 102 L94 97 L96 102 M104 102 L106 97 L108 102" stroke="#fff" stroke-width="2" fill="none"/>`);
  return svgDoc(p.join(''));
}

function cat(o) {
  const st = outline(o.dark);
  const k = o.kitten;
  const p = [];
  const tail = o.points || o.fur;
  if (o.fluffy) p.push(`<path d="M132 180 C176 186 186 144 168 122 C160 114 150 120 156 130 C168 150 160 168 130 168 Z" fill="${tail}" ${st} stroke-dasharray="0"/>`);
  else p.push(`<path d="M134 182 C170 184 178 150 166 128 C162 122 155 124 158 131 C166 150 160 170 132 172 Z" fill="${tail}" ${st}/>`);
  const bodyTop = k ? 128 : 118;
  p.push(`<path d="M70 192 C62 156 72 ${bodyTop + 6} 100 ${bodyTop} C128 ${bodyTop + 6} 138 156 130 192 Z" fill="${o.fur}" ${st}/>`);
  if (o.stripes) p.push([[76, 150], [80, 166], [124, 150], [120, 166]].map(([x, y]) => `<path d="M${x} ${y} q${x < 100 ? 8 : -8} 4 ${x < 100 ? 12 : -12} 0" stroke="${o.stripes}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join(''));
  if (o.chest) p.push(`<path d="M100 ${bodyTop + 4} C86 ${bodyTop + 6} 84 158 100 180 C116 158 114 ${bodyTop + 6} 100 ${bodyTop + 4} Z" fill="${o.chest}"/>`);
  if (o.patchesA) p.push(`<ellipse cx="80" cy="168" rx="11" ry="9" fill="${o.patchesA}"/><ellipse cx="122" cy="150" rx="9" ry="11" fill="${o.patchesB}"/>`);
  p.push(`<ellipse cx="72" cy="180" rx="16" ry="12" fill="${o.fur}" ${st}/><ellipse cx="128" cy="180" rx="16" ry="12" fill="${o.fur}" ${st}/>`);
  const legC = o.points || o.fur;
  p.push(`<rect x="85" y="146" width="13" height="46" rx="6.5" fill="${legC}" ${st}/><rect x="102" y="146" width="13" height="46" rx="6.5" fill="${legC}" ${st}/>`);
  p.push(`<ellipse cx="91.5" cy="190" rx="9" ry="5" fill="${o.paws || legC}" ${st}/><ellipse cx="108.5" cy="190" rx="9" ry="5" fill="${o.paws || legC}" ${st}/>`);
  if (o.bow) p.push(`<path d="M100 ${bodyTop + 4} L88 ${bodyTop - 4} L88 ${bodyTop + 12} Z M100 ${bodyTop + 4} L112 ${bodyTop - 4} L112 ${bodyTop + 12} Z" fill="${o.bow}" ${st}/><circle cx="100" cy="${bodyTop + 4}" r="4" fill="${o.bow}"/>`);
  const ears = o.points || o.ears || o.fur;
  p.push(both(`<path d="M66 62 L60 ${k ? 26 : 20} L92 46 Z" fill="${ears}" ${st}/><path d="M70 56 L66 ${k ? 36 : 32} L86 47 Z" fill="#f8bbd0"/>`));
  if (o.fluffy) p.push(`<path d="M58 70 L52 62 L60 58 L58 48 L68 50 L70 40 L80 46 L86 36 L94 44 L100 36 L106 44 L114 36 L120 46 L130 40 L132 50 L142 48 L140 58 L148 62 L142 70 L150 78 L142 84 L148 94 L138 96 L140 106 L128 104 L124 114 L112 108 L100 116 L88 108 L76 114 L72 104 L60 106 L62 96 L52 94 L58 84 L50 78 Z" fill="${o.fur}" ${st}/>`);
  p.push(`<ellipse cx="100" cy="78" rx="40" ry="34" fill="${o.fur}" ${st}/>`);
  if (o.patchesA) p.push(`<path d="M64 70 C64 50 82 44 94 46 C88 56 82 66 64 70 Z" fill="${o.patchesA}"/><path d="M136 66 C134 52 122 46 110 47 C118 56 124 62 136 66 Z" fill="${o.patchesB}"/>`);
  if (o.chest) p.push(`<path d="M100 74 C86 74 76 86 78 98 C84 108 116 108 122 98 C124 86 114 74 100 74 Z" fill="${o.chest}"/>`);
  if (o.points) p.push(`<ellipse cx="100" cy="88" rx="22" ry="18" fill="${o.points}" opacity="0.85"/>`);
  if (o.stripes) p.push(`<path d="M88 50 L92 60 L100 52 L108 60 L112 50" stroke="${o.stripes}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 74 L74 76 M62 84 L74 82 M138 74 L126 76 M138 84 L126 82" stroke="${o.stripes}" stroke-width="3.5" stroke-linecap="round"/>`);
  const er = k ? 9 : 7;
  for (const x of [84, 116]) {
    p.push(`<ellipse cx="${x}" cy="76" rx="${er}" ry="${er + 1.5}" fill="${o.eyeColor || '#9ccc65'}" stroke="#333" stroke-width="1.5"/>`);
    p.push(`<ellipse cx="${x}" cy="76.5" rx="${k ? 4.5 : 2.4}" ry="${er}" fill="#222"/><circle cx="${x + 2.5}" cy="72" r="${k ? 2.4 : 1.6}" fill="#fff"/>`);
  }
  p.push(`<path d="M95 88 L105 88 L100 94 Z" fill="#ff8fab" stroke="#c2185b" stroke-width="1"/>`);
  p.push(`<path d="M100 94 Q94 100 89 96 M100 94 Q106 100 111 96" stroke="#333" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
  p.push(both(`<path d="M86 92 L56 86 M86 96 L56 98" stroke="${o.whiskers || '#555'}" stroke-width="1.6" stroke-linecap="round"/>`));
  return svgDoc(p.join(''));
}

export const PETS = {
  'dog-golden': { name: 'Golden retriever', draw: () => dog({ fur: '#f0b85a', dark: '#a0682a', muzzle: '#f7d59a', chest: '#f7d59a', ears: 'floppy', earColor: '#d99a3e', tongue: true }) },
  'dog-dalmatian': { name: 'Dalmatian', draw: () => dog({ fur: '#ffffff', dark: '#666', ears: 'floppy', earColor: '#222', spots: '#222', headSpots: '#222', collar: '#1e88e5' }) },
  'dog-husky': { name: 'Husky', draw: () => dog({ fur: '#7f8c99', dark: '#3c4a56', mask: '#ffffff', muzzle: '#ffffff', chest: '#ffffff', paws: '#ffffff', ears: 'pointy', eyeColor: '#4fc3f7', collar: '#ff9800' }) },
  'dog-pug': { name: 'Pug', draw: () => dog({ fur: '#e8c79a', dark: '#8d6e47', muzzle: '#4a3b2f', ears: 'fold', earColor: '#4a3b2f', headW: 47, wide: true, wrinkles: true, tongue: true, collar: '#43a047' }) },
  'dog-corgi': { name: 'Corgi', draw: () => dog({ fur: '#f29b4b', dark: '#a8581b', muzzle: '#ffffff', chest: '#ffffff', paws: '#ffffff', blaze: '#ffffff', ears: 'big', short: true, tongue: true, collar: '#1e88e5' }) },
  'dog-poodle': { name: 'Poodle', draw: () => dog({ fur: '#f8bbd0', dark: '#c2185b', muzzle: '#fce4ec', ears: 'poodle', poodle: true, collar: '#8e24aa' }) },
  'dog-beagle': { name: 'Beagle', draw: () => dog({ fur: '#c98a4b', dark: '#6d4422', muzzle: '#ffffff', chest: '#ffffff', paws: '#ffffff', blaze: '#ffffff', saddle: '#3a2a1e', ears: 'long', earColor: '#8d5a2b' }) },
  'dog-chihuahua': { name: 'Chihuahua', draw: () => dog({ fur: '#e9c08a', dark: '#9a6b35', muzzle: '#f5dcb6', ears: 'big', headW: 40, short: true, collar: '#ff4081' }) },
  'dog-shepherd': { name: 'German shepherd', draw: () => dog({ fur: '#c8874a', dark: '#5d3a1a', muzzle: '#3a2a1e', saddle: '#3a2a1e', ears: 'pointy', earColor: '#3a2a1e', tongue: true }) },
  'dog-lab': { name: 'Black lab', draw: () => dog({ fur: '#333333', dark: '#111111', muzzle: '#444444', ears: 'floppy', earColor: '#222222', collar: '#e53935', tongue: true }) },
  'dog-puppy': { name: 'Puppy', draw: () => dog({ fur: '#bcaaa4', dark: '#6d4c41', muzzle: '#efebe9', patch: '#6d4c41', ears: 'floppy', earColor: '#6d4c41', tongue: true, collar: '#fdd835' }) },
  'dog-bulldog': { name: 'Bulldog', draw: () => dog({ fur: '#f5efe4', dark: '#8d6e47', muzzle: '#f5efe4', patches: '#c9a27a', patch: '#c9a27a', ears: 'fold', earColor: '#c9a27a', headW: 48, wide: true, jowls: true, underbite: true, collar: '#212121' }) },
  'cat-orange': { name: 'Orange tabby', draw: () => cat({ fur: '#f6a04d', dark: '#a85a1c', stripes: '#c46a1e', eyeColor: '#9ccc65' }) },
  'cat-grey': { name: 'Grey tabby', draw: () => cat({ fur: '#a7b1ba', dark: '#4f5b66', stripes: '#5f6b76', eyeColor: '#ffd54f' }) },
  'cat-black': { name: 'Black cat', draw: () => cat({ fur: '#2b2b2b', dark: '#000000', eyeColor: '#ffd23f', whiskers: '#bbb', bow: '#e53935' }) },
  'cat-white': { name: 'White cat', draw: () => cat({ fur: '#ffffff', dark: '#9e9e9e', eyeColor: '#64b5f6', bow: '#ff80ab' }) },
  'cat-tuxedo': { name: 'Tuxedo cat', draw: () => cat({ fur: '#2b2b2b', dark: '#000000', chest: '#ffffff', paws: '#ffffff', eyeColor: '#9ccc65', whiskers: '#999' }) },
  'cat-calico': { name: 'Calico cat', draw: () => cat({ fur: '#ffffff', dark: '#8d6e63', patchesA: '#f6a04d', patchesB: '#3e3e3e', eyeColor: '#ffb300' }) },
  'cat-siamese': { name: 'Siamese cat', draw: () => cat({ fur: '#f3e6cf', dark: '#8d6e4f', points: '#5d4037', eyeColor: '#4fc3f7', whiskers: '#ddd' }) },
  'cat-fluffy': { name: 'Fluffy cat', draw: () => cat({ fur: '#f5deb3', dark: '#a0825a', fluffy: true, eyeColor: '#ff9800' }) },
  'cat-kitten': { name: 'Kitten', draw: () => cat({ fur: '#bdbdbd', dark: '#616161', chest: '#ffffff', paws: '#ffffff', kitten: true, eyeColor: '#80deea' }) },
};

// ---------- knights ----------

const STEEL = '#cfd8dc', STEEL_DARK = '#607d8b';

const KNIGHT_EMBLEMS = {
  cross: c => `<path d="M95 100 h10 v12 h12 v10 h-12 v22 h-10 v-22 h-12 v-10 h12 Z" fill="${c}"/>`,
  star: c => `<polygon points="${starPoints(100, 120, 15, 6.5)}" fill="${c}"/>`,
  crown: c => `<path d="M84 128 L84 108 L92 118 L100 104 L108 118 L116 108 L116 128 Z" fill="${c}" stroke="${shade(c.startsWith('#') ? c : '#ffd23f', -0.3)}" stroke-width="2"/>`,
  dragon: c => `<path d="M86 128 C84 114 94 104 104 106 L116 100 L112 110 C118 116 114 128 104 128 C100 122 94 122 92 128 Z" fill="${c}"/><circle cx="108" cy="108" r="1.6" fill="#fff"/>`,
  lion: c => `<circle cx="100" cy="118" r="13" fill="${c}"/><circle cx="100" cy="119" r="7" fill="${shade(c.startsWith('#') ? c : '#ffd23f', 0.4)}"/><circle cx="97" cy="117" r="1.3" fill="#333"/><circle cx="103" cy="117" r="1.3" fill="#333"/>`,
};

function shieldPath(x, y, w, hh) {
  return `M${x} ${y} L${x + w} ${y} L${x + w} ${y + hh * 0.5} C${x + w} ${y + hh * 0.85} ${x + w / 2} ${y + hh} ${x + w / 2} ${y + hh} C${x + w / 2} ${y + hh} ${x} ${y + hh * 0.85} ${x} ${y + hh * 0.5} Z`;
}

function knight(o) {
  const st = outline(STEEL_DARK);
  const p = [];
  // Sword, held up in the right hand (our right).
  p.push(`<path d="M146 112 L160 22 L168 24 L156 114 Z" fill="#eceff1" stroke="#78909c" stroke-width="2.5" stroke-linejoin="round"/>`);
  p.push(`<path d="M160 24 L164 10 L168 24 Z" fill="#eceff1" stroke="#78909c" stroke-width="2"/>`);
  p.push(`<path d="M138 112 L166 116" stroke="#8d6e63" stroke-width="7" stroke-linecap="round"/><path d="M151 117 L148 134" stroke="#5d4037" stroke-width="7" stroke-linecap="round"/><circle cx="147" cy="137" r="5" fill="#ffd23f"/>`);
  // Cape
  if (o.cape) p.push(`<path d="M74 84 C60 120 56 160 52 190 L148 190 C144 160 140 120 126 84 Z" fill="${o.cape}" stroke="${shade(o.cape, -0.35)}" stroke-width="3"/>`);
  // Legs
  p.push(`<rect x="80" y="150" width="17" height="34" rx="6" fill="${STEEL}" ${st}/><rect x="103" y="150" width="17" height="34" rx="6" fill="${STEEL}" ${st}/>`);
  p.push(`<circle cx="88.5" cy="164" r="5" fill="${STEEL}" ${st}/><circle cx="111.5" cy="164" r="5" fill="${STEEL}" ${st}/>`);
  p.push(`<path d="M76 180 h24 v10 h-28 Z M100 180 h24 l4 10 h-28 Z" fill="#546e7a" ${st}/>`);
  // Chainmail and tabard
  p.push(`<rect x="70" y="84" width="60" height="70" rx="14" fill="#b0bec5" ${st}/>`);
  p.push(`<path d="M74 88 L126 88 L130 156 L100 148 L70 156 Z" fill="${o.tabard}" stroke="${shade(o.tabard, -0.35)}" stroke-width="3" stroke-linejoin="round"/>`);
  p.push(KNIGHT_EMBLEMS[o.emblem](o.emblemColor || '#ffd23f'));
  p.push(`<rect x="72" y="138" width="56" height="8" fill="#5d4037"/><rect x="95" y="136" width="10" height="12" rx="2" fill="#ffd23f"/>`);
  // Arms in armor
  p.push(limb('M74 92 L60 118', STEEL, 15) + limb('M126 92 L146 120', STEEL, 15));
  p.push(`<circle cx="74" cy="92" r="11" fill="${STEEL}" ${st}/><circle cx="126" cy="92" r="11" fill="${STEEL}" ${st}/>`);
  p.push(`<circle cx="148" cy="122" r="8" fill="#90a4ae" ${st}/>`);
  // Shield on the left arm
  p.push(`<path d="${shieldPath(26, 96, 50, 66)}" fill="${o.shield}" stroke="${shade(o.shield, -0.4)}" stroke-width="3.5"/>`);
  p.push(`<path d="${shieldPath(32, 102, 38, 52)}" fill="none" stroke="${o.shieldTrim || '#ffd23f'}" stroke-width="3"/>`);
  p.push(`<g transform="translate(-49 4)">${KNIGHT_EMBLEMS[o.emblem](o.shieldTrim || '#ffd23f')}</g>`);
  // Head
  if (o.closed) {
    p.push(`<path d="M74 70 C72 34 128 34 126 70 L126 82 C112 88 88 88 74 82 Z" fill="${o.helmet || STEEL}" ${st}/>`);
    p.push(`<rect x="80" y="56" width="40" height="6" rx="3" fill="#263238"/><path d="M100 40 V82" stroke="${STEEL_DARK}" stroke-width="2.5"/>`);
    p.push([88, 94, 106, 112].map(x => `<circle cx="${x}" cy="72" r="1.6" fill="#263238"/>`).join(''));
    if (o.eyes) p.push(`<circle cx="90" cy="59" r="2" fill="${o.eyes}"/><circle cx="110" cy="59" r="2" fill="${o.eyes}"/>`);
  } else {
    if (o.braid) p.push(`<path d="M122 64 C138 74 134 96 140 110" stroke="${o.hair}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="140" cy="112" r="5" fill="${o.bow || '#e91e63'}"/>`);
    p.push(`<circle cx="100" cy="60" r="22" fill="${o.skin}" stroke="${shade(o.skin, -0.3)}" stroke-width="2"/>`);
    p.push(eye(92, 60, 4.5) + eye(108, 60, 4.5));
    p.push(`<path d="M92 70 Q100 77 108 70" stroke="#6d3b1f" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
    p.push(`<path d="M74 62 C72 26 128 26 126 62 L126 82 L116 82 L116 52 C112 44 88 44 84 52 L84 82 L74 82 Z" fill="${o.helmet || STEEL}" ${st}/>`);
    p.push(`<path d="M97 34 h6 v18 h-6 Z" fill="${STEEL_DARK}"/>`);
  }
  // Plume
  p.push(`<path d="M100 32 C104 14 124 8 136 16 C124 16 114 22 108 34 Z" fill="${o.plume}" stroke="${shade(o.plume, -0.35)}" stroke-width="2"/>`);
  return svgDoc(p.join(''));
}

function knightOnHorse(o) {
  const st = outline('#5d4037');
  return svgDoc(`
    <path d="M38 112 C20 116 12 132 10 150 C20 140 28 134 40 132 Z" fill="#6d4c41" ${st}/>
    <rect x="52" y="140" width="13" height="44" rx="5" fill="#8d6e63" ${st}/><rect x="124" y="140" width="13" height="44" rx="5" fill="#8d6e63" ${st}/>
    <ellipse cx="94" cy="128" rx="58" ry="28" fill="#a1887f" ${st}/>
    <path d="M40 118 L148 118 L152 160 L136 154 L124 162 L108 154 L94 162 L80 154 L66 162 L52 154 L38 160 Z" fill="${o.cloth}" stroke="${shade(o.cloth, -0.35)}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${starPoints(96, 138, 10, 4.4)}" fill="#ffd23f"/>
    <rect x="66" y="146" width="13" height="40" rx="5" fill="#a1887f" ${st}/><rect x="138" y="146" width="13" height="40" rx="5" fill="#a1887f" ${st}/>
    <path d="M136 112 C144 92 148 74 158 62 L176 70 C170 84 160 104 152 126 Z" fill="#a1887f" ${st}/>
    <path d="M156 60 C166 50 184 52 194 64 C198 72 192 80 184 78 L170 76 Z" fill="#a1887f" ${st}/>
    <path d="M162 56 L160 44 L170 52 Z" fill="#a1887f" ${st}/>
    <path d="M152 64 C142 76 138 92 134 108" stroke="#5d4037" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="176" cy="62" r="2.6" fill="#222"/><circle cx="191" cy="70" r="1.6" fill="#5d4037"/>
    <path d="M168 66 L154 92 L130 98" stroke="#5d4037" stroke-width="2.5" fill="none"/>
    <path d="M86 110 C84 92 88 80 100 76 C112 80 116 92 114 110 Z" fill="${o.cloth}" stroke="${shade(o.cloth, -0.35)}" stroke-width="3"/>
    <rect x="94" y="104" width="10" height="26" rx="4" fill="${STEEL}" stroke="${STEEL_DARK}" stroke-width="2.5"/>
    <path d="M86 70 C84 46 116 46 114 70 L114 80 C106 84 94 84 86 80 Z" fill="${STEEL}" stroke="${STEEL_DARK}" stroke-width="3"/>
    <rect x="90" y="62" width="22" height="5" rx="2.5" fill="#263238"/>
    <path d="M100 50 C104 34 120 30 130 36 C120 36 112 42 108 52 Z" fill="${o.plume}"/>
    <path d="M80 96 L196 20" stroke="#8d6e63" stroke-width="5" stroke-linecap="round"/>
    <path d="M190 24 L200 16 L196 28 Z" fill="#cfd8dc"/>
    <path d="M70 98 L84 92 L86 104 Z" fill="#eceff1" stroke="#78909c" stroke-width="2"/>
    <path d="${shieldPath(66, 88, 26, 34)}" fill="${o.shield}" stroke="${shade(o.shield, -0.4)}" stroke-width="3"/>
    <path d="M79 94 V116 M70 103 H88" stroke="#ffd23f" stroke-width="3"/>`);
}

function shieldSticker(color, trim, emblem) {
  return svgDoc(`
    <path d="${shieldPath(40, 16, 120, 168)}" fill="${color}" stroke="${shade(color, -0.4)}" stroke-width="6"/>
    <path d="${shieldPath(54, 30, 92, 130)}" fill="none" stroke="${trim}" stroke-width="6"/>
    <g transform="translate(-100 -150) scale(2)">${KNIGHT_EMBLEMS[emblem](trim)}</g>`);
}

function swordSticker() {
  return svgDoc(`
    <path d="M92 150 L92 30 L100 8 L108 30 L108 150 Z" fill="#eceff1" stroke="#78909c" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 14 V146" stroke="#b0bec5" stroke-width="2"/>
    <rect x="62" y="146" width="76" height="12" rx="6" fill="#ffb300" stroke="#a66b00" stroke-width="3"/>
    <rect x="93" y="158" width="14" height="28" rx="4" fill="#6d4c41" stroke="#3e2723" stroke-width="3"/>
    <circle cx="100" cy="190" r="8" fill="#ffb300" stroke="#a66b00" stroke-width="3"/>
    <circle cx="100" cy="152" r="4" fill="#e53935"/>`);
}

function bannerSticker(color) {
  return svgDoc(`
    <rect x="46" y="12" width="8" height="182" rx="4" fill="#8d6e63" stroke="#5d4037" stroke-width="2.5"/>
    <circle cx="50" cy="12" r="7" fill="#ffd23f" stroke="#a66b00" stroke-width="2"/>
    <path d="M54 24 C90 14 120 34 170 22 L160 58 L170 94 C120 106 90 86 54 96 Z" fill="${color}" stroke="${shade(color, -0.35)}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${starPoints(110, 60, 18, 8)}" fill="#ffd23f"/>`);
}

export const KNIGHTS = {
  'knight-red': { name: 'Red knight', draw: () => knight({ tabard: '#e53935', emblem: 'lion', shield: '#e53935', plume: '#ffd23f', skin: '#f1c27d', cape: '#8e1b1b' }) },
  'knight-blue': { name: 'Blue knight', draw: () => knight({ tabard: '#1e63c6', emblem: 'star', shield: '#1e63c6', plume: '#e53935', skin: '#e0ac69' }) },
  'knight-gold': { name: 'Gold knight', draw: () => knight({ tabard: '#ffb300', emblem: 'crown', emblemColor: '#ffffff', shield: '#ffb300', shieldTrim: '#ffffff', plume: '#8e24aa', skin: '#8d5524', helmet: '#ffe082', cape: '#6a1b9a' }) },
  'knight-green': { name: 'Green knight', draw: () => knight({ tabard: '#2e7d32', emblem: 'dragon', shield: '#2e7d32', plume: '#ffd23f', skin: '#ffdbac', braid: true, hair: '#f9a825' }) },
  'knight-white': { name: 'Brave knight', draw: () => knight({ tabard: '#fafafa', emblem: 'cross', emblemColor: '#e53935', shield: '#fafafa', shieldTrim: '#e53935', plume: '#e53935', closed: true }) },
  'knight-black': { name: 'Black knight', draw: () => knight({ tabard: '#212121', emblem: 'dragon', emblemColor: '#b71c1c', shield: '#212121', shieldTrim: '#b71c1c', plume: '#b71c1c', closed: true, helmet: '#546e7a', eyes: '#ff1744', cape: '#4a148c' }) },
  'knight-horse': { name: 'Knight on a horse', draw: () => knightOnHorse({ cloth: '#1e63c6', shield: '#e53935', plume: '#e53935' }) },
  'knight-horse-red': { name: 'Charging knight', draw: () => knightOnHorse({ cloth: '#e53935', shield: '#ffb300', plume: '#ffd23f' }) },
  'shield-lion': { name: 'Lion shield', draw: () => shieldSticker('#e53935', '#ffd23f', 'lion') },
  'shield-dragon': { name: 'Dragon shield', draw: () => shieldSticker('#2e7d32', '#ffd23f', 'dragon') },
  'sword': { name: 'Sword', draw: swordSticker },
  'banner': { name: 'Banner', draw: () => bannerSticker('#1e63c6') },
};

// ---------- people ----------
//
// Everyday people standing on the ground (y = 192). Their right hand (on
// our right) is held out at HAND, so a dog's leash loop can be put in it.

export const HAND = { x: 146, y: 108 };   // for a full-size grown-up

const HAIR_BACK = {
  long: c => `<path d="M78 46 C76 20 124 20 122 46 L126 96 L112 92 L112 52 L88 52 L88 92 L74 96 Z" fill="${c}"/>`,
  curly: c => [[80, 38], [88, 26], [100, 22], [112, 26], [120, 38], [124, 52], [76, 52], [78, 64], [122, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/>`).join(''),
  scarf: c => `<path d="M76 48 C74 18 126 18 124 48 L128 84 C114 92 86 92 72 84 Z" fill="${c}"/>`,
  ponytail: c => `<path d="M118 34 C138 36 140 60 132 76 C128 62 124 50 116 44 Z" fill="${c}"/>`,
};

const HAIR_TOP = {
  short: c => `<path d="M80 44 C80 22 120 22 120 44 C114 36 106 32 100 34 C92 32 86 36 80 44 Z" fill="${c}"/>`,
  spiky: c => `<path d="M80 44 L80 30 L88 34 L90 22 L98 30 L102 18 L108 30 L114 24 L116 34 L120 32 L120 44 C112 36 88 36 80 44 Z" fill="${c}"/>`,
  long: c => `<path d="M80 46 C78 22 122 22 120 46 C112 34 100 32 92 38 C88 40 84 42 80 46 Z" fill="${c}"/>`,
  bun: c => `<circle cx="100" cy="22" r="9" fill="${c}"/><path d="M80 44 C80 24 120 24 120 44 C112 36 88 36 80 44 Z" fill="${c}"/>`,
  curly: c => [[86, 30], [96, 26], [106, 26], [114, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/>`).join(''),
  bald: c => `<path d="M79 52 C78 42 80 36 84 34 L86 50 Z M121 52 C122 42 120 36 116 34 L114 50 Z" fill="${c}"/>`,
  cap: c => `<path d="M80 40 C80 22 120 22 120 40 Z" fill="${c}"/><path d="M78 40 L60 42 C62 38 70 36 80 36 Z" fill="${shade(c, -0.25)}"/>`,
  scarf: c => `<path d="M80 50 C78 24 122 24 120 50 C112 38 88 38 80 50 Z" fill="${c}"/>`,
  pigtails: c => `<path d="M80 44 C80 24 120 24 120 44 C112 36 88 36 80 44 Z" fill="${c}"/><circle cx="74" cy="46" r="8" fill="${c}"/><circle cx="126" cy="46" r="8" fill="${c}"/>`,
  ponytail: c => `<path d="M80 44 C80 24 120 24 120 44 C112 36 88 36 80 44 Z" fill="${c}"/>`,
};

function person(o) {
  const st = outline(o.line || '#5d4037');
  const s = o.scale || 1;
  const skinLine = shade(o.skin, -0.3);
  const p = [];
  if (o.backpack) p.push(`<rect x="76" y="70" width="48" height="46" rx="10" fill="${o.backpack}" ${st}/>`);
  if (HAIR_BACK[o.hair]) p.push(HAIR_BACK[o.hair](o.hairColor));
  // Legs: trousers, shorts, or bare legs under a skirt or dress.
  const legTop = o.bottom === 'dress' || o.bottom === 'skirt' ? 140 : 118;
  if (o.bottom === 'pants') {
    p.push(`<rect x="84" y="118" width="15" height="64" rx="6" fill="${o.bottomColor}" ${st}/><rect x="101" y="118" width="15" height="64" rx="6" fill="${o.bottomColor}" ${st}/>`);
  } else {
    p.push(`<rect x="86" y="${legTop}" width="11" height="${182 - legTop}" rx="5" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/><rect x="103" y="${legTop}" width="11" height="${182 - legTop}" rx="5" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/>`);
    if (o.bottom === 'shorts') p.push(`<path d="M82 116 L118 116 L120 146 L101 146 L100 132 L99 146 L80 146 Z" fill="${o.bottomColor}" ${st}/>`);
  }
  p.push(`<ellipse cx="90" cy="186" rx="10" ry="6" fill="${o.shoes || '#3e2723'}"/><ellipse cx="110" cy="186" rx="10" ry="6" fill="${o.shoes || '#3e2723'}"/>`);
  // Body
  if (o.bottom === 'dress') {
    p.push(`<path d="M84 70 L116 70 L132 148 L68 148 Z" fill="${o.top}" ${st}/>`);
  } else {
    if (o.bottom === 'skirt') p.push(`<path d="M80 112 L120 112 L130 146 L70 146 Z" fill="${o.bottomColor}" ${st}/>`);
    if (o.bottom === 'overalls') {
      p.push(`<rect x="84" y="118" width="15" height="58" rx="6" fill="${o.bottomColor}" ${st}/><rect x="101" y="118" width="15" height="58" rx="6" fill="${o.bottomColor}" ${st}/>`);
    }
    p.push(`<rect x="80" y="68" width="40" height="${o.bottom === 'skirt' ? 48 : 56}" rx="12" fill="${o.top}" ${st}/>`);
    if (o.bottom === 'overalls') p.push(`<rect x="86" y="90" width="28" height="32" rx="4" fill="${o.bottomColor}"/><path d="M88 90 L86 70 M112 90 L114 70" stroke="${o.bottomColor}" stroke-width="5"/>`);
  }
  if (o.stripe) p.push(`<rect x="80" y="88" width="40" height="8" fill="${o.stripe}"/>`);
  // Arms: left one down (or waving), right one out a little to hold a leash.
  const sleeve = o.top;
  p.push(o.wave ? limb('M83 76 L66 58 L64 40', sleeve, 11) : limb('M83 76 L72 96 L70 112', sleeve, 11));
  p.push(limb('M117 76 L132 94 L142 104', sleeve, 11));
  p.push(o.wave ? `<circle cx="64" cy="36" r="6.5" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/>`
    : `<circle cx="70" cy="114" r="6.5" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/>`);
  p.push(`<circle cx="${HAND.x}" cy="${HAND.y}" r="6.5" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/>`);
  if (o.cane) p.push(`<path d="M70 114 L70 186 M70 114 C70 104 80 104 80 112" stroke="#8d6e63" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  // Head
  p.push(`<rect x="95" y="60" width="10" height="10" fill="${o.skin}"/>`);
  p.push(`<circle cx="100" cy="46" r="20" fill="${o.skin}" stroke="${skinLine}" stroke-width="2"/>`);
  p.push(HAIR_TOP[o.hair](o.hairColor));
  p.push(`<circle cx="93" cy="47" r="2.4" fill="#2b2b2b"/><circle cx="107" cy="47" r="2.4" fill="#2b2b2b"/>`);
  p.push(`<ellipse cx="88" cy="54" rx="3.5" ry="2.2" fill="#ff8a80" opacity="0.5"/><ellipse cx="112" cy="54" rx="3.5" ry="2.2" fill="#ff8a80" opacity="0.5"/>`);
  if (o.glasses) p.push(`<circle cx="93" cy="47" r="5.5" fill="none" stroke="#424242" stroke-width="1.8"/><circle cx="107" cy="47" r="5.5" fill="none" stroke="#424242" stroke-width="1.8"/><path d="M98.5 47 H101.5" stroke="#424242" stroke-width="1.8"/>`);
  if (o.beard) p.push(`<path d="M82 50 C84 70 116 70 118 50 C112 62 88 62 82 50 Z" fill="${o.beard}"/>`);
  if (o.mustache) p.push(`<path d="M92 56 C96 53 104 53 108 56 C104 58 96 58 92 56 Z" fill="${o.mustache}"/>`);
  p.push(`<path d="M94 57 Q100 62 106 57" stroke="#6d3b1f" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  if (o.bow) p.push(`<path d="M100 28 L92 22 L92 34 Z M100 28 L108 22 L108 34 Z" fill="${o.bow}"/>`);
  // Smaller people stand on the same ground.
  const body = p.join('');
  return svgDoc(s === 1 ? body : `<g transform="translate(100 192) scale(${s}) translate(-100 -192)">${body}</g>`);
}

const PEOPLE_LIST = [
  ['person-woman', 'Woman', { skin: '#f1c27d', hair: 'long', hairColor: '#6d4c41', top: '#26a69a', bottom: 'dress', shoes: '#c62828' }],
  ['person-man-beard', 'Man with beard', { skin: '#8d5524', hair: 'short', hairColor: '#212121', beard: '#212121', top: '#1e63c6', bottom: 'pants', bottomColor: '#37474f' }],
  ['person-boy', 'Boy', { scale: 0.74, skin: '#ffdbac', hair: 'spiky', hairColor: '#f9a825', top: '#e53935', bottom: 'shorts', bottomColor: '#1565c0', shoes: '#455a64' }],
  ['person-girl', 'Girl', { scale: 0.74, skin: '#e0ac69', hair: 'pigtails', hairColor: '#212121', top: '#8e24aa', bottom: 'dress', shoes: '#ff4081', bow: '#ff4081' }],
  ['person-grandma', 'Grandma', { scale: 0.95, skin: '#f1c27d', hair: 'bun', hairColor: '#bdbdbd', glasses: true, top: '#f48fb1', bottom: 'skirt', bottomColor: '#5d4037' }],
  ['person-grandpa', 'Grandpa', { skin: '#c68642', hair: 'bald', hairColor: '#e0e0e0', glasses: true, mustache: '#e0e0e0', top: '#558b2f', bottom: 'pants', bottomColor: '#6d4c41', cane: true }],
  ['person-teen', 'Teen', { scale: 0.9, skin: '#8d5524', hair: 'cap', hairColor: '#e53935', top: '#ff9800', bottom: 'pants', bottomColor: '#3949ab', shoes: '#fafafa', wave: true }],
  ['person-woman-curly', 'Woman with curls', { skin: '#6d4c41', hair: 'curly', hairColor: '#2b1b12', top: '#fdd835', bottom: 'pants', bottomColor: '#1e88e5' }],
  ['person-man', 'Man', { skin: '#ffdbac', hair: 'short', hairColor: '#8d6e63', top: '#43a047', stripe: '#a5d6a7', bottom: 'pants', bottomColor: '#bcaaa4', wave: true }],
  ['person-toddler', 'Toddler', { scale: 0.58, skin: '#f1c27d', hair: 'curly', hairColor: '#a1887f', top: '#fff176', bottom: 'overalls', bottomColor: '#4fc3f7', shoes: '#e53935' }],
  ['person-kid-backpack', 'Kid with backpack', { scale: 0.78, skin: '#c68642', hair: 'ponytail', hairColor: '#3e2723', top: '#00acc1', bottom: 'pants', bottomColor: '#5e35b1', backpack: '#ff7043' }],
  ['person-woman-scarf', 'Woman with headscarf', { skin: '#e0ac69', hair: 'scarf', hairColor: '#7e57c2', top: '#ec407a', bottom: 'dress', shoes: '#5d4037' }],
];

// Where a person's leash hand is, in sticker units (0..200), after
// shrinking them toward the ground.
const handAt = s => [100 + (HAND.x - 100) * s, 192 + (HAND.y - 192) * s];

export const PEOPLE = Object.fromEntries(PEOPLE_LIST.map(([id, name, opts]) =>
  [id, { name, draw: () => person(opts), hand: handAt(opts.scale || 1) }]));

// Where the loop of a walking dog's leash is, in sticker units.
export const LEASH_LOOP = [9, HAND.y];

// ---------- dogs out for a walk (side view, facing right) ----------
//
// The leash runs from the collar to a loop at the left edge, at the height
// of a grown-up's hand, so the dog can stand next to a person and the loop
// goes in their hand.

function walkingDog(o) {
  const s = o.size || 1;
  const st = outline(o.dark);
  const far = shade(o.fur, -0.2);
  const ground = 188;
  const T = (x, y) => [100 + (x - 100) * s, ground + (y - ground) * s];  // where a body point ends up
  const p = [];
  p.push(`<path d="M68 134 C54 122 52 104 60 94" fill="none" stroke="${o.dark}" stroke-width="11" stroke-linecap="round"/><path d="M68 134 C54 122 52 104 60 94" fill="none" stroke="${o.tail || o.fur}" stroke-width="7" stroke-linecap="round"/>`);
  const legH = o.short ? 22 : 36;
  p.push(`<rect x="86" y="${ground - legH}" width="9" height="${legH}" rx="4" fill="${far}" ${st}/><rect x="136" y="${ground - legH}" width="9" height="${legH}" rx="4" fill="${far}" ${st}/>`);
  p.push(`<ellipse cx="112" cy="${ground - legH - 8}" rx="${o.long ? 50 : 42}" ry="18" fill="${o.fur}" ${st}/>`);
  if (o.belly) p.push(`<ellipse cx="114" cy="${ground - legH - 1}" rx="30" ry="7" fill="${o.belly}"/>`);
  if (o.spots) p.push([[96, -12, 4], [116, -6, 5], [130, -16, 3.5], [104, -2, 3]].map(([x, dy, r]) => `<circle cx="${x}" cy="${ground - legH - 8 + dy}" r="${r}" fill="${o.spots}"/>`).join(''));
  p.push(`<rect x="76" y="${ground - legH}" width="9" height="${legH}" rx="4" fill="${o.fur}" ${st}/><rect x="126" y="${ground - legH}" width="9" height="${legH}" rx="4" fill="${o.fur}" ${st}/>`);
  if (o.paws) p.push([80.5, 130.5].map(x => `<ellipse cx="${x}" cy="${ground - 2}" rx="6" ry="3" fill="${o.paws}"/>`).join(''));
  // Head and neck
  const hy = ground - legH - 32;
  p.push(`<path d="M138 ${hy + 26} C142 ${hy + 12} 148 ${hy + 6} 156 ${hy + 4} L162 ${hy + 22} C156 ${hy + 28} 148 ${hy + 34} 140 ${hy + 36} Z" fill="${o.fur}" ${st}/>`);
  if (o.ears === 'pointy') p.push(`<path d="M150 ${hy - 4} L152 ${hy - 26} L164 ${hy - 6} Z" fill="${o.earColor || o.fur}" ${st}/>`);
  p.push(`<circle cx="160" cy="${hy}" r="16" fill="${o.fur}" ${st}/>`);
  p.push(`<ellipse cx="176" cy="${hy + 6}" rx="${o.flat ? 8 : 13}" ry="8.5" fill="${o.muzzle || o.fur}" ${st}/>`);
  if (o.mask) p.push(`<path d="M146 ${hy + 4} C152 ${hy + 16} 170 ${hy + 16} 176 ${hy + 10} L176 ${hy + 2} C168 ${hy + 6} 156 ${hy + 4} 146 ${hy + 4} Z" fill="${o.mask}"/>`);
  if (o.ears !== 'pointy') p.push(`<path d="M152 ${hy - 10} C140 ${hy - 6} 138 ${hy + 8} 144 ${hy + 18} C150 ${hy + 14} 154 ${hy + 2} 156 ${hy - 6} Z" fill="${o.earColor || o.fur}" ${st}/>`);
  p.push(`<circle cx="${o.flat ? 182 : 188}" cy="${hy + 3}" r="4" fill="#222"/>`);
  p.push(`<circle cx="164" cy="${hy - 4}" r="2.8" fill="#222"/><circle cx="165" cy="${hy - 5}" r="0.9" fill="#fff"/>`);
  if (o.tongue) p.push(`<path d="M172 ${hy + 12} Q176 ${hy + 22} 180 ${hy + 12} Z" fill="#ff7096"/>`);
  p.push(`<path d="M143 ${hy + 16} C146 ${hy + 26} 152 ${hy + 30} 158 ${hy + 26}" stroke="${o.collar || '#e53935'}" stroke-width="6" fill="none" stroke-linecap="round"/>`);
  const body = p.join('');
  const [cx, cy] = T(150, hy + 28);  // the collar ring
  const leash = o.leash || '#d84315';
  // The leash rises from the collar, over the dog's back, then droops to
  // the loop; it goes under the dog so it never cuts across the body.
  return svgDoc(`
    <path d="M${cx} ${cy} C${cx - 24} ${cy - 46} 70 ${HAND.y - 22} 14 ${HAND.y + 2}" fill="none" stroke="${leash}" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="9" cy="${HAND.y}" rx="6" ry="8" fill="none" stroke="${leash}" stroke-width="4"/>
    <g transform="translate(100 ${ground}) scale(${s}) translate(-100 -${ground})">${body}</g>
    <circle cx="${cx}" cy="${cy}" r="3.5" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>`);
}

function leashSticker() {
  return svgDoc(`
    <path d="M22 70 C60 150 140 150 178 96" fill="none" stroke="#d84315" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="16" cy="60" rx="10" ry="14" fill="none" stroke="#d84315" stroke-width="6" transform="rotate(-20 16 60)"/>
    <path d="M176 98 L186 86 C190 82 196 86 192 92 L184 102 Z" fill="#b0bec5" stroke="#607d8b" stroke-width="2.5"/>
    <circle cx="182" cy="94" r="3" fill="#607d8b"/>`);
}

export const WALKING_DOGS = {
  'walk-golden': { name: 'Golden on a leash', draw: () => walkingDog({ size: 1.1, fur: '#f0b85a', dark: '#a0682a', muzzle: '#f7d59a', earColor: '#d99a3e', tongue: true }) },
  'walk-dalmatian': { name: 'Dalmatian on a leash', draw: () => walkingDog({ fur: '#ffffff', dark: '#666666', earColor: '#222222', spots: '#222222', collar: '#1e88e5', leash: '#1e88e5' }) },
  'walk-husky': { name: 'Husky on a leash', draw: () => walkingDog({ fur: '#7f8c99', dark: '#3c4a56', ears: 'pointy', belly: '#ffffff', muzzle: '#ffffff', mask: '#ffffff', paws: '#ffffff', collar: '#ff9800', leash: '#ff9800' }) },
  'walk-corgi': { name: 'Corgi on a leash', draw: () => walkingDog({ size: 0.85, short: true, long: true, fur: '#f29b4b', dark: '#a8581b', ears: 'pointy', belly: '#ffffff', muzzle: '#ffffff', paws: '#ffffff', tongue: true, collar: '#1e88e5', leash: '#43a047' }) },
  'walk-puppy': { name: 'Puppy on a leash', draw: () => walkingDog({ size: 0.75, fur: '#bcaaa4', dark: '#6d4c41', earColor: '#6d4c41', muzzle: '#efebe9', tongue: true, collar: '#fdd835', leash: '#8e24aa' }) },
  'walk-lab': { name: 'Black lab on a leash', draw: () => walkingDog({ size: 1.1, fur: '#333333', dark: '#111111', muzzle: '#444444', earColor: '#222222', collar: '#e53935', leash: '#e53935', tongue: true }) },
  'walk-pug': { name: 'Pug on a leash', draw: () => walkingDog({ size: 0.75, short: true, flat: true, fur: '#e8c79a', dark: '#8d6e47', muzzle: '#4a3b2f', earColor: '#4a3b2f', collar: '#43a047', leash: '#ff4081' }) },
  'leash': { name: 'Leash', draw: leashSticker },
};

// ---------- Christmas ----------

const SANTA_RED = '#d32f2f', SANTA_DARK = '#8e1b1b', FUR = '#ffffff', FUR_LINE = '#cfd8dc';

// Santa's head and hat, centered on (100, 62).
function santaHead() {
  return `
    <circle cx="100" cy="62" r="22" fill="#ffd7b5" stroke="#d9a680" stroke-width="2"/>
    ${[[78, 72], [84, 86], [94, 92], [106, 92], [116, 86], [122, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="1.5"/>`).join('')}
    <path d="M76 66 C78 92 122 92 124 66 C116 80 84 80 76 66 Z" fill="${FUR}"/>
    <path d="M100 70 C92 64 82 66 80 74 C88 74 94 74 100 72 C106 74 112 74 120 74 C118 66 108 64 100 70 Z" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="1.5"/>
    <circle cx="100" cy="66" r="5.5" fill="#ff8a80"/>
    <ellipse cx="85" cy="67" rx="5" ry="3" fill="#ff8a80" opacity="0.6"/><ellipse cx="115" cy="67" rx="5" ry="3" fill="#ff8a80" opacity="0.6"/>
    <circle cx="92" cy="57" r="2.6" fill="#2b2b2b"/><circle cx="108" cy="57" r="2.6" fill="#2b2b2b"/>
    <path d="M86 51 Q92 47 97 51 M103 51 Q108 47 114 51" stroke="${FUR}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M78 42 C80 16 112 4 136 18 L148 36 C138 28 126 26 122 42 Z" fill="${SANTA_RED}" stroke="${SANTA_DARK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="72" y="36" width="56" height="13" rx="6.5" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="1.5"/>
    <circle cx="149" cy="38" r="9" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="1.5"/>`;
}

function present({ box, ribbon, shape = 'cube', x = 0, y = 0, s = 1, dots = null, stripes = null }) {
  const w = shape === 'tall' ? 76 : 104, hgt = shape === 'tall' ? 112 : 92;
  const bx = 100 - w / 2, by = 190 - hgt;
  const line = shade(box, -0.35), rline = shade(ribbon, -0.35);
  const id = `p${Math.round(Math.random() * 1e6)}`;
  const pattern = dots ? `<g clip-path="url(#${id})">${[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3, 4].map(c => `<circle cx="${bx + 10 + c * (w / 4.6)}" cy="${by + 30 + r * 20}" r="4" fill="${dots}"/>`)).join('')}</g>`
    : stripes ? `<g clip-path="url(#${id})">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${bx - 40 + i * 24} ${by + 120} L${bx + i * 24} ${by}" stroke="${stripes}" stroke-width="9"/>`).join('')}</g>` : '';
  const body = `
    <defs><clipPath id="${id}"><rect x="${bx}" y="${by + 16}" width="${w}" height="${hgt - 16}"/></clipPath></defs>
    <rect x="${bx}" y="${by + 16}" width="${w}" height="${hgt - 16}" rx="4" fill="${box}" stroke="${line}" stroke-width="3"/>
    ${pattern}
    <rect x="${bx - 6}" y="${by}" width="${w + 12}" height="22" rx="4" fill="${shade(box, 0.08)}" stroke="${line}" stroke-width="3"/>
    <rect x="${92}" y="${by}" width="16" height="${hgt}" fill="${ribbon}" stroke="${rline}" stroke-width="2"/>
    <path d="M100 ${by} C84 ${by - 30} 62 ${by - 18} 72 ${by - 4} C78 ${by + 2} 92 ${by} 100 ${by} Z" fill="${ribbon}" stroke="${rline}" stroke-width="2.5"/>
    <path d="M100 ${by} C116 ${by - 30} 138 ${by - 18} 128 ${by - 4} C122 ${by + 2} 108 ${by} 100 ${by} Z" fill="${ribbon}" stroke="${rline}" stroke-width="2.5"/>
    <path d="M96 ${by + 2} L86 ${by + 20} M104 ${by + 2} L114 ${by + 20}" stroke="${ribbon}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="100" cy="${by}" r="7" fill="${ribbon}" stroke="${rline}" stroke-width="2"/>`;
  return s === 1 && !x && !y ? body : `<g transform="translate(${x} ${y}) translate(100 190) scale(${s}) translate(-100 -190)">${body}</g>`;
}

function santa({ wave = false, sack = false } = {}) {
  const st = `stroke="${SANTA_DARK}" stroke-width="3" stroke-linejoin="round"`;
  const p = [];
  if (sack) {
    p.push(`<path d="M150 64 C186 70 196 120 182 150 C170 172 128 172 122 146 C116 116 126 70 150 64 Z" fill="#a1887f" stroke="#6d4c41" stroke-width="3"/>`);
    p.push(present({ box: '#43a047', ribbon: '#fdd835', x: 52, y: -104, s: 0.32 }) + present({ box: '#1e88e5', ribbon: '#e53935', x: 78, y: -110, s: 0.28 }));
    p.push(`<path d="M138 70 C146 62 158 62 166 70" stroke="#6d4c41" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  }
  p.push(`<rect x="84" y="140" width="15" height="36" fill="${SANTA_RED}" ${st}/><rect x="101" y="140" width="15" height="36" fill="${SANTA_RED}" ${st}/>`);
  p.push(`<path d="M76 170 h24 v20 h-30 c0 -10 2 -20 6 -20 Z M100 170 h24 c4 0 6 10 6 20 h-30 Z" fill="#212121"/>`);
  p.push(`<ellipse cx="100" cy="124" rx="44" ry="40" fill="${SANTA_RED}" ${st}/>`);
  p.push(`<rect x="94" y="88" width="12" height="74" fill="${FUR}"/>`);
  p.push(`<rect x="58" y="150" width="84" height="15" rx="7.5" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="1.5"/>`);
  p.push(`<rect x="57" y="118" width="86" height="12" fill="#212121"/><rect x="91" y="115" width="18" height="18" rx="2" fill="#ffd23f" stroke="#a66b00" stroke-width="2"/><rect x="96" y="120" width="8" height="8" fill="#212121"/>`);
  p.push(limb('M64 102 L50 136', SANTA_RED, 15));
  p.push(wave ? limb('M136 100 L154 74 L158 56', SANTA_RED, 15) : limb('M136 102 L150 86 L148 70', SANTA_RED, 15));
  p.push(`<circle cx="50" cy="140" r="9" fill="#212121"/>`);
  p.push(wave ? `<circle cx="158" cy="52" r="9" fill="#212121"/>` : `<circle cx="148" cy="66" r="9" fill="#212121"/>`);
  p.push(santaHead());
  // A little smaller, so the boots and pompom have room.
  return svgDoc(`<g transform="translate(100 104) scale(0.92) translate(-100 -104)">${p.join('')}</g>`);
}

// Sized so the hat's pompom and the beard both fit.
const santaFace = () => svgDoc(`<g transform="translate(100 100) scale(1.85) translate(-112 -56)">${santaHead()}</g>`);

function reindeerBody({ red = false, flying = false } = {}) {
  const fur = '#8d6e63', dark = '#4e342e', st = outline(dark);
  const legs = flying
    ? `<path d="M80 140 L60 156 M92 142 L76 162 M128 142 L150 156 M140 138 L164 146" stroke="${dark}" stroke-width="10" stroke-linecap="round"/><path d="M80 140 L60 156 M92 142 L76 162 M128 142 L150 156 M140 138 L164 146" stroke="${fur}" stroke-width="6" stroke-linecap="round"/>`
    : `<rect x="78" y="140" width="9" height="46" rx="4" fill="${shade(fur, -0.2)}" ${st}/><rect x="128" y="140" width="9" height="46" rx="4" fill="${shade(fur, -0.2)}" ${st}/><rect x="90" y="140" width="9" height="46" rx="4" fill="${fur}" ${st}/><rect x="140" y="140" width="9" height="46" rx="4" fill="${fur}" ${st}/>`;
  return `
    ${legs}
    <path d="M66 122 C58 116 56 108 62 104" stroke="${dark}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <ellipse cx="108" cy="128" rx="46" ry="20" fill="${fur}" ${st}/>
    <ellipse cx="110" cy="138" rx="30" ry="7" fill="#d7ccc8"/>
    <path d="M144 120 C148 102 152 90 158 82 L170 92 C164 102 160 116 156 128 Z" fill="${fur}" ${st}/>
    <path d="M156 70 C150 50 140 42 132 36 M148 54 L140 58 M144 46 L150 36 M164 70 C172 48 180 40 190 34 M172 52 L180 56 M178 44 L172 34" stroke="#6d4c41" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M150 74 L142 64 L156 70 Z M170 76 L180 68 L174 82 Z" fill="${fur}" ${st}/>
    <ellipse cx="164" cy="82" rx="15" ry="13" fill="${fur}" ${st}/>
    <ellipse cx="180" cy="88" rx="11" ry="8" fill="#a1887f" ${st}/>
    <circle cx="190" cy="86" r="${red ? 7 : 4.5}" fill="${red ? '#e53935' : '#3e2723'}"/>
    ${red ? '<circle cx="188" cy="84" r="2" fill="#ffcdd2"/>' : ''}
    <circle cx="164" cy="78" r="2.6" fill="#222"/><circle cx="165" cy="77" r="0.9" fill="#fff"/>
    <path d="M144 112 C150 120 160 120 164 112" stroke="#c62828" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="154" cy="120" r="4.5" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>`;
}

const reindeer = opts => svgDoc(reindeerBody(opts));

function sleigh() {
  return svgDoc(`
    <path d="M18 172 L166 172 C184 172 192 160 188 146" fill="none" stroke="#ffb300" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 152 L46 172 M130 152 L134 172" stroke="#ffb300" stroke-width="5"/>
    ${present({ box: '#43a047', ribbon: '#fdd835', x: -54, y: -64, s: 0.42 })}
    ${present({ box: '#8e24aa', ribbon: '#ff80ab', shape: 'tall', x: -28, y: -60, s: 0.4 })}
    <ellipse cx="114" cy="104" rx="26" ry="24" fill="${SANTA_RED}" stroke="${SANTA_DARK}" stroke-width="3"/>
    <g transform="translate(114 66) scale(0.82) translate(-100 -62)">${santaHead()}</g>
    ${limb('M132 100 L152 92 L162 98', SANTA_RED, 11)}<circle cx="164" cy="99" r="7" fill="#212121"/>
    <path d="M24 112 L148 112 C166 112 172 96 168 84 L184 80 C192 108 180 152 148 152 L54 152 C34 152 22 132 24 112 Z" fill="${SANTA_RED}" stroke="${SANTA_DARK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M32 122 L146 122 C158 122 164 112 164 100" fill="none" stroke="#ffb300" stroke-width="4"/>
    <circle cx="60" cy="136" r="7" fill="#ffb300"/><circle cx="96" cy="136" r="7" fill="#ffb300"/><circle cx="132" cy="136" r="7" fill="#ffb300"/>`);
}

function presentPile() {
  return svgDoc(`
    ${present({ box: '#e53935', ribbon: '#43a047', x: -42, y: 0, s: 0.62, dots: '#ffffff' })}
    ${present({ box: '#1e88e5', ribbon: '#fdd835', shape: 'tall', x: 46, y: 0, s: 0.58 })}
    ${present({ box: '#fdd835', ribbon: '#e53935', x: 0, y: -66, s: 0.5, stripes: '#ff8f00' })}`);
}

// ---------- more Christmas things ----------

function christmasTree() {
  const lights = [[86, 70, '#e53935'], [116, 82, '#fdd835'], [74, 110, '#1e88e5'], [104, 104, '#e53935'], [130, 120, '#8e24aa'],
    [64, 150, '#fdd835'], [94, 140, '#43a047'], [120, 152, '#1e88e5'], [146, 156, '#e53935'], [82, 166, '#ff80ab']];
  return svgDoc(`
    <rect x="88" y="168" width="24" height="24" fill="#6d4c41" stroke="#3e2723" stroke-width="3"/>
    <path d="M100 74 L150 172 L50 172 Z" fill="#2e7d32" stroke="#1b5e20" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 48 L140 132 L60 132 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 24 L128 92 L72 92 Z" fill="#43a047" stroke="#1b5e20" stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 84 Q100 96 122 80 M66 124 Q100 140 134 120 M58 162 Q100 178 144 158" stroke="#ffd23f" stroke-width="3" fill="none"/>
    ${lights.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}" stroke="#ffffff" stroke-width="1.5"/>`).join('')}
    <polygon points="${starPoints(100, 22, 16, 7)}" fill="#ffd23f" stroke="#c79100" stroke-width="2"/>`);
}

function stocking() {
  return svgDoc(`
    <path d="M70 52 L126 52 L126 124 C126 140 150 144 160 156 C172 172 156 194 134 190 C112 186 92 172 78 160 C68 150 70 136 70 124 Z" fill="${SANTA_RED}" stroke="${SANTA_DARK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M126 160 C140 156 156 164 160 174" stroke="${FUR}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <polygon points="${starPoints(98, 108, 14, 6)}" fill="#ffd23f"/>
    <rect x="62" y="28" width="72" height="30" rx="10" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="2"/>
    <path d="M128 30 C140 18 150 22 146 34" stroke="#ffb300" stroke-width="4" fill="none"/>`);
}

function candyCane() {
  const d = 'M118 176 L118 64 C118 26 66 26 66 60';
  return svgDoc(`
    <path d="${d}" fill="none" stroke="#b71c1c" stroke-width="30" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#e53935" stroke-width="24" stroke-dasharray="13 13"/>
    <path d="M110 180 L110 70" stroke="#ffffff" stroke-width="4" opacity="0.5" stroke-linecap="round"/>`);
}

function snowman() {
  return svgDoc(`
    <path d="M66 112 L30 86 M40 94 L30 100 M134 112 L170 86 M160 94 L172 98" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="152" r="40" fill="#ffffff" stroke="#b0bec5" stroke-width="3"/>
    <circle cx="100" cy="102" r="30" fill="#ffffff" stroke="#b0bec5" stroke-width="3"/>
    <circle cx="100" cy="60" r="24" fill="#ffffff" stroke="#b0bec5" stroke-width="3"/>
    <path d="M80 80 Q100 92 120 80 L122 90 Q100 100 78 90 Z" fill="#e53935"/>
    <path d="M114 86 L124 118 L132 116 L120 84 Z" fill="#c62828"/>
    <circle cx="100" cy="100" r="4" fill="#263238"/><circle cx="100" cy="116" r="4" fill="#263238"/><circle cx="100" cy="148" r="4.5" fill="#263238"/><circle cx="100" cy="166" r="4.5" fill="#263238"/>
    <circle cx="92" cy="56" r="3" fill="#263238"/><circle cx="108" cy="56" r="3" fill="#263238"/>
    <path d="M100 62 L122 66 L100 68 Z" fill="#ff9800"/>
    <path d="M90 72 Q100 77 110 72" stroke="#263238" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="1 4"/>
    <rect x="80" y="36" width="40" height="8" rx="2" fill="#212121"/><rect x="86" y="8" width="28" height="30" rx="3" fill="#212121"/>
    <rect x="86" y="30" width="28" height="6" fill="#e53935"/>`);
}

function gingerbread() {
  return svgDoc(`
    <path d="M100 20 C118 20 128 34 126 50 C124 60 118 64 116 66 L152 74 C168 78 166 98 150 98 L126 96 L130 140 L150 172 C158 186 140 196 130 184 L100 150 L70 184 C60 196 42 186 50 172 L70 140 L74 96 L50 98 C34 98 32 78 48 74 L84 66 C82 64 76 60 74 50 C72 34 82 20 100 20 Z" fill="#c68642" stroke="#8d5524" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M44 86 q6 -6 12 0 q6 6 12 0 M132 86 q6 -6 12 0 q6 6 12 0 M56 176 q5 -6 10 0 M134 176 q5 -6 10 0" stroke="#ffffff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="92" cy="40" r="4" fill="#ffffff"/><circle cx="108" cy="40" r="4" fill="#ffffff"/>
    <path d="M90 52 Q100 60 110 52" stroke="#ffffff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="88" r="6" fill="#e53935"/><circle cx="100" cy="108" r="6" fill="#43a047"/><circle cx="100" cy="128" r="6" fill="#1e88e5"/>`);
}

function ornament() {
  return svgDoc(`
    <path d="M100 14 C88 14 88 34 100 34 C112 34 112 14 100 14" fill="none" stroke="#9e9e9e" stroke-width="3"/>
    <rect x="86" y="32" width="28" height="18" rx="3" fill="#ffd23f" stroke="#a66b00" stroke-width="2.5"/>
    <circle cx="100" cy="116" r="66" fill="#e53935" stroke="#8e1b1b" stroke-width="4"/>
    <path d="M38 104 Q100 124 162 104 L162 124 Q100 144 38 124 Z" fill="#ffd23f"/>
    ${[56, 78, 100, 122, 144].map(x => `<circle cx="${x}" cy="${x === 100 ? 126 : 120}" r="4" fill="#ffffff"/>`).join('')}
    <ellipse cx="74" cy="80" rx="16" ry="10" fill="#ffffff" opacity="0.4" transform="rotate(-30 74 80)"/>`);
}

export const CHRISTMAS = {
  'santa': { name: 'Santa', draw: () => santa({ wave: true }) },
  'santa-sack': { name: 'Santa with sack', draw: () => santa({ sack: true }) },
  'santa-face': { name: 'Santa face', draw: santaFace },
  'santa-sleigh': { name: 'Santa’s sleigh', draw: sleigh },
  'rudolph': { name: 'Rudolph', draw: () => reindeer({ red: true }) },
  'reindeer-flying': { name: 'Flying reindeer', draw: () => reindeer({ flying: true }) },
  'present-red': { name: 'Red present', draw: () => svgDoc(present({ box: '#e53935', ribbon: '#43a047', dots: '#ffffff' })) },
  'present-blue': { name: 'Blue present', draw: () => svgDoc(present({ box: '#1e88e5', ribbon: '#fdd835' })) },
  'present-green': { name: 'Green present', draw: () => svgDoc(present({ box: '#43a047', ribbon: '#e53935', stripes: '#a5d6a7' })) },
  'present-purple': { name: 'Tall present', draw: () => svgDoc(present({ box: '#8e24aa', ribbon: '#ff80ab', shape: 'tall', dots: '#ffd23f' })) },
  'present-pile': { name: 'Pile of presents', draw: presentPile },
  'christmas-tree': { name: 'Christmas tree', draw: christmasTree },
  'stocking': { name: 'Stocking', draw: stocking },
  'candy-cane': { name: 'Candy cane', draw: candyCane },
  'snowman': { name: 'Snowman', draw: snowman },
  'gingerbread': { name: 'Gingerbread man', draw: gingerbread },
  'ornament': { name: 'Ornament', draw: ornament },
};

// ---------- Hanukkah ----------

const GOLD = '#ffc107', GOLD_DARK = '#b07800', HANUKKAH_BLUE = '#1e63c6';

const flame = (x, y, s = 1) =>
  `<path d="M${x} ${y - 14 * s} C${x + 7 * s} ${y - 4 * s} ${x + 6 * s} ${y + 4 * s} ${x} ${y + 5 * s} C${x - 6 * s} ${y + 4 * s} ${x - 7 * s} ${y - 4 * s} ${x} ${y - 14 * s} Z" fill="#ff9800"/>` +
  `<path d="M${x} ${y - 6 * s} C${x + 3 * s} ${y - 1 * s} ${x + 3 * s} ${y + 3 * s} ${x} ${y + 3.5 * s} C${x - 3 * s} ${y + 3 * s} ${x - 3 * s} ${y - 1 * s} ${x} ${y - 6 * s} Z" fill="#ffeb3b"/>`;

// A hanukkiah: eight candles and the taller helper candle (shamash) in the
// middle. lit = how many of the eight are burning, counting from the right.
function menorah(lit = 8) {
  const xs = [20, 40, 60, 80, 120, 140, 160, 180];
  const arms = [20, 40, 60, 80].map(d =>
    `<path d="M${100 - d} 86 C${100 - d} ${86 + d * 0.95} ${100 + d} ${86 + d * 0.95} ${100 + d} 86" fill="none" stroke="${GOLD_DARK}" stroke-width="9"/>` +
    `<path d="M${100 - d} 86 C${100 - d} ${86 + d * 0.95} ${100 + d} ${86 + d * 0.95} ${100 + d} 86" fill="none" stroke="${GOLD}" stroke-width="5"/>`).join('');
  const candle = (x, top, i, isLit) => `
    <rect x="${x - 4.5}" y="${top}" width="9" height="22" rx="2" fill="${i % 2 ? '#ffffff' : '#64b5f6'}" stroke="#1565c0" stroke-width="1.5"/>
    ${isLit ? flame(x, top - 6) : `<path d="M${x} ${top} V${top - 5}" stroke="#424242" stroke-width="1.5"/>`}`;
  return svgDoc(`
    <path d="M66 188 L134 188 L122 172 L78 172 Z" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="95" y="64" width="10" height="110" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2.5"/>
    ${arms}
    ${xs.map(x => `<rect x="${x - 7}" y="80" width="14" height="8" rx="2" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2"/>`).join('')}
    <rect x="93" y="60" width="14" height="8" rx="2" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2"/>
    ${xs.map((x, i) => candle(x, 58, i, i >= 8 - lit)).join('')}
    ${candle(100, 38, 1, true)}`);
}

function dreidel(body, letterColor, letter) {
  const dark = shade(body, -0.35), side = shade(body, -0.18);
  return svgDoc(`
    <rect x="90" y="14" width="20" height="40" rx="6" fill="${body}" stroke="${dark}" stroke-width="3"/>
    <path d="M128 56 L150 48 L150 124 L128 132 Z" fill="${side}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M58 56 L128 56 L150 48 L82 48 Z" fill="${shade(body, 0.15)}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="58" y="56" width="70" height="76" fill="${body}" stroke="${dark}" stroke-width="3"/>
    <path d="M58 132 L128 132 L94 188 Z" fill="${body}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 132 L150 124 L94 188 Z" fill="${side}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <text x="93" y="116" font-size="54" font-weight="bold" font-family="Arial Hebrew, 'Noto Sans Hebrew', 'Noto Serif Hebrew', David, sans-serif" fill="${letterColor}" text-anchor="middle">${letter}</text>
    <path d="M64 62 L72 62 L72 124" stroke="#ffffff" stroke-width="3" opacity="0.35" fill="none"/>`);
}

function latkes() {
  const latke = (cx, cy, rx = 48, ry = 15) => {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, bump = i % 2 ? 1 : 0.92;
      pts.push(`${(cx + Math.cos(a) * rx * bump).toFixed(1)},${(cy + Math.sin(a) * ry * bump).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="#d4892a" stroke="#8d5a1a" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="${cx}" cy="${cy - 2}" rx="${rx * 0.7}" ry="${ry * 0.5}" fill="#e8a64a"/>
      ${[[-20, -3], [6, 2], [22, -4], [-6, -6]].map(([dx, dy]) => `<path d="M${cx + dx} ${cy + dy} l8 -2" stroke="#8d5a1a" stroke-width="2" stroke-linecap="round"/>`).join('')}`;
  };
  return svgDoc(`
    <ellipse cx="100" cy="150" rx="92" ry="36" fill="#e3f2fd" stroke="#90caf9" stroke-width="4"/>
    <ellipse cx="100" cy="146" rx="70" ry="24" fill="#ffffff"/>
    ${latke(86, 148)}${latke(108, 134)}${latke(94, 118)}
    <path d="M132 112 C130 98 150 96 156 104 C166 104 166 118 156 120 C148 124 134 122 132 112 Z" fill="#e6b15c" stroke="#a87a2c" stroke-width="2"/>
    <path d="M76 104 C76 92 96 88 100 98 C108 96 110 108 102 110 C94 114 78 112 76 104 Z" fill="#ffffff" stroke="#b0bec5" stroke-width="2"/>
    <path d="M70 60 C62 48 78 40 70 26 M100 54 C92 42 108 34 100 20 M130 60 C122 48 138 40 130 26" stroke="#b0bec5" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
}

function sufganiyah() {
  return svgDoc(`
    <ellipse cx="100" cy="168" rx="82" ry="16" fill="#e3f2fd" stroke="#90caf9" stroke-width="3"/>
    <ellipse cx="100" cy="120" rx="68" ry="52" fill="#d68a3c" stroke="#8d5524" stroke-width="3"/>
    <ellipse cx="100" cy="106" rx="56" ry="34" fill="#e9a457"/>
    <path d="M52 106 C64 78 136 78 148 106" fill="none" stroke="#ffffff" stroke-width="10" stroke-dasharray="2 7" stroke-linecap="round" opacity="0.9"/>
    ${[[70, 92], [96, 84], [122, 90], [84, 104], [110, 102], [134, 108], [62, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#ffffff"/>`).join('')}
    <path d="M150 116 C164 112 172 124 166 136 C162 146 168 154 162 158 C156 162 152 150 152 142 C150 132 142 124 150 116 Z" fill="#d81b60" stroke="#880e4f" stroke-width="2"/>
    <circle cx="160" cy="124" r="2.5" fill="#f8bbd0"/>`);
}

function gelt() {
  const coin = (cx, cy, rx, ry, gold = true, star = false) => {
    const face = gold ? '#ffca28' : '#cfd8dc', rim = gold ? '#b07800' : '#78909c';
    return `<ellipse cx="${cx}" cy="${cy + 5}" rx="${rx}" ry="${ry}" fill="${rim}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${face}" stroke="${rim}" stroke-width="2.5"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.78}" fill="none" stroke="${rim}" stroke-width="1.5" opacity="0.6"/>
      ${star ? `<g transform="translate(${cx} ${cy}) scale(${rx / 60} ${ry / 60})"><polygon points="0,-34 29,16 -29,16" fill="none" stroke="${rim}" stroke-width="6"/><polygon points="0,34 -29,-16 29,-16" fill="none" stroke="${rim}" stroke-width="6"/></g>` : ''}
      <path d="M${cx - rx * 0.5} ${cy - ry * 0.45} q${rx * 0.2} ${-ry * 0.2} ${rx * 0.4} 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  };
  return svgDoc(`
    ${coin(64, 160, 40, 16, false)}${coin(138, 162, 40, 16)}${coin(100, 140, 42, 17, false)}
    ${coin(72, 120, 40, 16)}${coin(128, 116, 40, 16, false)}
    <g transform="rotate(-12 100 74)">${coin(100, 74, 54, 54, true, true)}</g>`);
}

function starOfDavid(color = HANUKKAH_BLUE) {
  return svgDoc(`
    <polygon points="100,18 172,142 28,142" fill="none" stroke="${shade(color, -0.35)}" stroke-width="18" stroke-linejoin="round"/>
    <polygon points="100,182 28,58 172,58" fill="none" stroke="${shade(color, -0.35)}" stroke-width="18" stroke-linejoin="round"/>
    <polygon points="100,18 172,142 28,142" fill="none" stroke="${color}" stroke-width="12" stroke-linejoin="round"/>
    <polygon points="100,182 28,58 172,58" fill="none" stroke="${color}" stroke-width="12" stroke-linejoin="round"/>`);
}

// ---------- Thanksgiving ----------

function mapleLeaf(cx, cy, s, color, rot = 0) {
  const right = [[0, -50], [9, -30], [22, -38], [18, -14], [40, -22], [34, -6], [50, 2], [28, 12], [32, 26], [10, 18], [4, 24]];
  const pts = [...right, ...right.slice(1).reverse().map(([x, y]) => [-x, y])];
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})">
    <path d="M0 22 L0 50" stroke="${shade(color, -0.4)}" stroke-width="4" stroke-linecap="round"/>
    <polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${color}" stroke="${shade(color, -0.35)}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M0 22 L0 -36 M0 0 L28 -14 M0 0 L-28 -14 M0 10 L22 18 M0 10 L-22 18" stroke="${shade(color, -0.3)}" stroke-width="2" fill="none"/></g>`;
}

const apple = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e53935" stroke="#8e1b1b" stroke-width="2"/><path d="M${x} ${y - r + 2} q2 -8 6 -9" stroke="#5d4037" stroke-width="2.5" fill="none"/><path d="M${x + 3} ${y - r - 3} q8 -6 12 0 q-6 6 -12 0 Z" fill="#43a047"/><ellipse cx="${x - r * 0.4}" cy="${y - r * 0.35}" rx="${r * 0.25}" ry="${r * 0.15}" fill="#ffffff" opacity="0.5"/>`;

function pumpkinShape(cx, cy, s = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M-2 -40 C-4 -52 6 -60 12 -58 C8 -52 6 -46 6 -40 Z" fill="#6d4c41" stroke="#3e2723" stroke-width="2"/>
    <path d="M6 -48 C18 -60 34 -56 34 -46 C26 -44 16 -44 6 -48 Z" fill="#43a047" stroke="#1b5e20" stroke-width="2"/>
    <ellipse cx="-30" cy="0" rx="30" ry="40" fill="#f57c00" stroke="#bf5f00" stroke-width="3"/>
    <ellipse cx="30" cy="0" rx="30" ry="40" fill="#f57c00" stroke="#bf5f00" stroke-width="3"/>
    <ellipse cx="0" cy="0" rx="28" ry="42" fill="#fb8c00" stroke="#bf5f00" stroke-width="3"/>
    <ellipse cx="-10" cy="-18" rx="6" ry="12" fill="#ffb74d" opacity="0.6"/></g>`;
}

function cornCob(x, y, s = 1, rot = 0) {
  const kernels = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) kernels.push(`<ellipse cx="${-9 + c * 9}" cy="${-40 + r * 11}" rx="4.2" ry="5" fill="#ffd54f" stroke="#f9a825" stroke-width="1"/>`);
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <ellipse cx="0" cy="-6" rx="17" ry="48" fill="#ffca28" stroke="#f9a825" stroke-width="2"/>
    ${kernels.join('')}
    <path d="M-4 40 C-30 20 -32 -20 -22 -40 C-20 -10 -12 20 0 44 Z" fill="#9ccc65" stroke="#558b2f" stroke-width="2"/>
    <path d="M4 40 C30 20 32 -20 22 -40 C20 -10 12 20 0 44 Z" fill="#7cb342" stroke="#558b2f" stroke-width="2"/>
    <path d="M0 42 L0 56" stroke="#689f38" stroke-width="5" stroke-linecap="round"/></g>`;
}

function cornucopia() {
  const weave = [40, 62, 84, 106, 126].map(x => {
    const t = (x - 18) / 130;
    const top = 46 + t * 36, bot = 46 + t * 112;
    return `<path d="M${x} ${top + 2} C${x + 8} ${(top + bot) / 2} ${x + 8} ${(top + bot) / 2} ${x} ${bot - 2}" stroke="#8d5524" stroke-width="3" fill="none"/>`;
  }).join('');
  return svgDoc(`
    <path d="M14 44 C60 46 110 56 144 80 L150 160 C110 158 56 108 14 44 Z" fill="#c68642" stroke="#8d5524" stroke-width="3" stroke-linejoin="round"/>
    ${weave}
    <path d="M30 56 C70 62 110 74 142 96 M40 72 C76 84 112 104 146 126" stroke="#a0662f" stroke-width="2.5" fill="none"/>
    <ellipse cx="148" cy="120" rx="22" ry="42" fill="#8d5524" stroke="#6d4c41" stroke-width="3"/>
    ${[[150, 92], [160, 98], [144, 100], [156, 106], [148, 110], [162, 112], [152, 118]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#7b1fa2" stroke="#4a148c" stroke-width="1.5"/>`).join('')}
    ${cornCob(178, 96, 0.6, 28)}
    <path d="M180 132 C196 132 198 154 186 160 C176 166 166 158 170 146 C172 138 176 132 180 132 Z" fill="#c0ca33" stroke="#827717" stroke-width="2"/>
    ${pumpkinShape(134, 170, 0.36)}
    ${apple(170, 174, 13)}
    <circle cx="104" cy="178" r="12" fill="#fb8c00" stroke="#bf5f00" stroke-width="2"/>
    ${mapleLeaf(76, 172, 0.36, '#e53935', -30)}${mapleLeaf(190, 184, 0.28, '#fdd835', 20)}`);
}

function turkey() {
  const colors = ['#8d5524', '#e53935', '#fb8c00', '#fdd835', '#fb8c00', '#e53935', '#8d5524'];
  const feathers = colors.map((c, i) => {
    const a = (-150 + i * 20) * Math.PI / 180;
    const x = 100 + Math.cos(a) * 70, y = 120 + Math.sin(a) * 70;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="18" ry="40" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="2.5" transform="rotate(${(-150 + i * 20 + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  return svgDoc(`
    ${feathers}
    <path d="M86 176 L82 190 M82 190 L74 194 M82 190 L84 196 M114 176 L118 190 M118 190 L126 194 M118 190 L116 196" stroke="#ff9800" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="100" cy="134" rx="40" ry="44" fill="#8d5524" stroke="#5d3a1a" stroke-width="3"/>
    <ellipse cx="100" cy="146" rx="26" ry="26" fill="#a1683a"/>
    <path d="M62 128 C54 146 64 166 80 164 C76 150 74 138 74 126 Z M138 128 C146 146 136 166 120 164 C124 150 126 138 126 126 Z" fill="#6d4c41" stroke="#4e342e" stroke-width="2"/>
    <circle cx="100" cy="82" r="24" fill="#a1683a" stroke="#5d3a1a" stroke-width="3"/>
    <circle cx="91" cy="76" r="5" fill="#ffffff"/><circle cx="109" cy="76" r="5" fill="#ffffff"/><circle cx="92" cy="77" r="2.6" fill="#222"/><circle cx="108" cy="77" r="2.6" fill="#222"/>
    <path d="M92 86 L108 86 L100 98 Z" fill="#ffb300" stroke="#e65100" stroke-width="1.5"/>
    <path d="M102 96 C110 100 108 114 102 112 C98 110 100 102 102 96 Z" fill="#e53935"/>`);
}

function roastTurkey() {
  const drum = (x, y, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">
    <path d="M0 0 C-14 -10 -30 -4 -32 8 C-34 22 -18 28 -6 20 Z" fill="#b5651d" stroke="#7a3e0f" stroke-width="2.5"/>
    <path d="M-30 6 L-44 -2" stroke="#f5f5f5" stroke-width="7" stroke-linecap="round"/>
    <path d="M-44 -2 l-6 -6 M-44 -2 l-8 2 M-44 -2 l-4 7" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/></g>`;
  return svgDoc(`
    <ellipse cx="100" cy="160" rx="94" ry="30" fill="#eceff1" stroke="#b0bec5" stroke-width="3"/>
    <ellipse cx="100" cy="156" rx="78" ry="22" fill="#ffffff"/>
    ${[[34, 150], [166, 150], [52, 170], [148, 170]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="7" fill="#7cb342"/>`).join('')}
    <circle cx="44" cy="162" r="6" fill="#e53935"/><circle cx="156" cy="162" r="6" fill="#e53935"/>
    <path d="M40 132 C40 86 80 70 100 70 C120 70 160 86 160 132 C160 152 140 160 100 160 C60 160 40 152 40 132 Z" fill="#c8732a" stroke="#7a3e0f" stroke-width="3"/>
    <path d="M60 104 C70 88 92 82 104 84" stroke="#e8a25a" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.7"/>
    ${drum(58, 132, false)}${drum(142, 132, true)}
    <path d="M80 64 C76 52 86 46 84 36 M100 60 C96 48 106 42 104 32 M120 64 C116 52 126 46 124 36" stroke="#b0bec5" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}

function pumpkinPie() {
  return svgDoc(`
    <ellipse cx="100" cy="136" rx="88" ry="42" fill="#c98a4b" stroke="#8d5524" stroke-width="3"/>
    <path d="M12 136 L16 152 C40 178 160 178 184 152 L188 136" fill="#b5763a" stroke="#8d5524" stroke-width="3"/>
    ${Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2; return `<circle cx="${(100 + Math.cos(a) * 82).toFixed(1)}" cy="${(136 + Math.sin(a) * 38).toFixed(1)}" r="7" fill="#d89a5a" stroke="#8d5524" stroke-width="1.5"/>`; }).join('')}
    <ellipse cx="100" cy="134" rx="72" ry="31" fill="#e07b1f"/>
    <ellipse cx="86" cy="126" rx="34" ry="10" fill="#ec9440" opacity="0.6"/>
    <path d="M78 118 C74 102 92 92 100 100 C104 88 124 94 120 108 C132 112 128 126 114 126 C104 132 86 130 78 118 Z" fill="#ffffff" stroke="#cfd8dc" stroke-width="2"/>
    <path d="M100 100 C96 92 104 84 102 78" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
    <path d="M92 114 C98 108 108 110 110 116" stroke="#cfd8dc" stroke-width="2" fill="none"/>`);
}

export const HOLIDAYS = {
  'menorah': { name: 'Menorah', draw: () => menorah(8) },
  'menorah-first': { name: 'Menorah, first night', draw: () => menorah(1) },
  'dreidel-blue': { name: 'Dreidel', draw: () => dreidel(HANUKKAH_BLUE, '#ffffff', 'ש') },
  'dreidel-gold': { name: 'Gold dreidel', draw: () => dreidel(GOLD, HANUKKAH_BLUE, 'נ') },
  'latkes': { name: 'Latkes', draw: latkes },
  'sufganiyah': { name: 'Jelly doughnut', draw: sufganiyah },
  'gelt': { name: 'Gelt', draw: gelt },
  'star-of-david': { name: 'Star of David', draw: () => starOfDavid() },
  'present-hanukkah': { name: 'Hanukkah present', draw: () => svgDoc(present({ box: HANUKKAH_BLUE, ribbon: '#e0e0e0', dots: '#ffffff' })) },
  'cornucopia': { name: 'Horn of plenty', draw: cornucopia },
  'turkey': { name: 'Turkey', draw: turkey },
  'roast-turkey': { name: 'Turkey dinner', draw: roastTurkey },
  'pumpkin-pie': { name: 'Pumpkin pie', draw: pumpkinPie },
  'pumpkin': { name: 'Pumpkin', draw: () => svgDoc(pumpkinShape(100, 120, 1.25)) },
  'corn': { name: 'Corn', draw: () => svgDoc(cornCob(100, 104, 1.45, 18)) },
  'autumn-leaves': { name: 'Autumn leaves', draw: () => svgDoc(mapleLeaf(70, 80, 0.95, '#e53935', -20) + mapleLeaf(132, 96, 0.9, '#fb8c00', 25) + mapleLeaf(96, 144, 0.8, '#fdd835', 5)) },
};

// ---------- dragons ----------

function dragon(o) {
  const st = outline(o.dark);
  const bone = !!o.bone;
  const p = [];
  // Drawn smaller when breathing, to leave room for the breath.
  const breath = o.breath;
  const tr = breath ? 'translate(-4 22) scale(0.8)' : 'translate(0 6) scale(0.94)';
  p.push(`<g transform="${tr}">`);
  p.push(`<path d="M72 138 C44 146 34 172 12 168 C22 184 50 182 62 166 C68 158 76 154 86 152 Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M16 162 L0 156 L8 176 Z" fill="${o.dark}"/>`);
  p.push(`<path d="M96 110 C84 70 60 44 32 30 C44 52 48 66 48 78 C58 72 70 72 76 82 C80 66 92 60 104 60 C100 74 104 88 114 102 Z" fill="${o.wing}" ${st} ${bone ? 'opacity="0.75"' : ''}/>`);
  p.push(`<path d="M96 110 L32 30 M96 110 L48 78 M98 108 L76 82 M104 104 L104 60" stroke="${o.dark}" stroke-width="2.5" fill="none"/>`);
  p.push(`<path d="M80 146 C74 160 76 172 70 184 L90 184 C90 172 94 160 98 150 Z" fill="${shade(o.body, -0.2)}" ${st}/>`);
  p.push(`<path d="M118 118 C128 98 136 84 142 74 L160 84 C152 96 144 112 134 130 Z" fill="${o.body}" ${st}/>`);
  p.push(`<ellipse cx="100" cy="134" rx="38" ry="27" fill="${o.body}" ${st}/>`);
  if (bone) {
    p.push([76, 88, 100, 112, 124].map(x => `<path d="M${x} 116 C${x - 4} 128 ${x - 4} 140 ${x} 152" stroke="${o.dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`).join(''));
    p.push(`<path d="M68 134 L130 134" stroke="${o.dark}" stroke-width="3"/>`);
  } else {
    p.push(`<path d="M74 144 C88 162 118 162 134 148 C118 152 92 152 74 144 Z" fill="${o.belly}"/>`);
    p.push([84, 96, 108, 120].map(x => `<path d="M${x} 150 L${x + 2} 157" stroke="${shade(o.belly, -0.25)}" stroke-width="2"/>`).join(''));
  }
  p.push([[112, 114], [120, 102], [128, 90], [136, 80], [96, 108], [80, 110]].map(([x, y]) =>
    `<path d="M${x - 6} ${y + 2} L${x - 4} ${y - 9} L${x + 4} ${y} Z" fill="${o.spikes || o.dark}"/>`).join(''));
  p.push(`<path d="M118 146 C120 160 122 172 118 184 L138 184 C138 172 136 158 134 144 Z" fill="${o.body}" ${st}/>`);
  p.push(claws([118, 127], 184));
  p.push(`<path d="M150 62 C146 50 140 42 130 38 C142 40 152 46 158 56 Z" fill="${o.horns}" ${st}/>`);
  p.push(`<path d="M161 58 C159 46 157 38 150 28 C160 34 166 44 169 56 Z" fill="${o.horns}" ${st}/>`);
  p.push(`<path d="M140 72 C146 58 164 54 178 60 L196 70 C198 78 192 84 184 86 L160 90 C150 90 142 84 140 72 Z" fill="${o.body}" ${st}/>`);
  p.push(`<path d="M160 82 L194 78" stroke="${o.dark}" stroke-width="2.5"/>`);
  if (bone) {
    p.push(`<ellipse cx="166" cy="68" rx="7" ry="6" fill="#212121"/><circle cx="167" cy="68" r="2.8" fill="#ff1744"/>`);
    p.push(`<path d="M166 82 L169 88 L172 82 L175 88 L178 81 L181 87 L184 80" stroke="#212121" stroke-width="1.5" fill="none"/>`);
  } else {
    p.push(`<ellipse cx="166" cy="68" rx="6" ry="5" fill="${o.eye || '#ffd23f'}" stroke="${o.dark}" stroke-width="1.5"/><ellipse cx="167" cy="68" rx="1.8" ry="4" fill="#222"/>`);
    if (o.smile) p.push(`<path d="M170 84 Q180 90 190 82" stroke="${o.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  }
  p.push(`<circle cx="190" cy="72" r="2.2" fill="${o.dark}"/>`);
  p.push('</g>');
  // Breath comes out of the mouth, near (152, 82) after shrinking.
  if (breath === 'fire') {
    p.push(`<path d="M150 84 C164 70 176 76 186 62 C186 72 196 70 200 60 C198 80 200 98 190 112 C186 100 178 106 174 96 C166 102 158 94 150 88 Z" fill="#ff7043"/>`);
    p.push(`<path d="M154 86 C166 80 174 84 182 76 C182 84 190 84 192 78 C190 92 188 100 182 104 C178 96 172 100 168 94 C162 96 158 90 154 88 Z" fill="#ffd23f"/>`);
  } else if (breath === 'ice') {
    p.push(`<circle cx="164" cy="84" r="9" fill="#e1f5fe" stroke="#81d4fa" stroke-width="2"/><circle cx="178" cy="78" r="12" fill="#e1f5fe" stroke="#81d4fa" stroke-width="2"/><circle cx="188" cy="94" r="10" fill="#e1f5fe" stroke="#81d4fa" stroke-width="2"/>`);
    p.push([[178, 78, 7], [188, 94, 6], [170, 104, 5], [194, 66, 4]].map(([x, y, r]) =>
      `<path d="M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r} M${x - r * 0.7} ${y - r * 0.7} L${x + r * 0.7} ${y + r * 0.7} M${x + r * 0.7} ${y - r * 0.7} L${x - r * 0.7} ${y + r * 0.7}" stroke="#4fc3f7" stroke-width="2" stroke-linecap="round"/>`).join(''));
  } else if (breath === 'water') {
    p.push(`<path d="M150 84 C166 76 180 80 196 70 C192 86 196 100 186 112 C180 100 168 102 160 94 C156 92 152 90 150 88 Z" fill="#4fc3f7" opacity="0.85"/>`);
    p.push([[184, 62, 4], [194, 84, 3], [176, 108, 4], [196, 104, 3]].map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#b3e5fc" stroke="#0288d1" stroke-width="1.5"/>`).join(''));
  }
  return svgDoc(p.join(''));
}

export const DRAGONS = {
  'dragon-fire': { name: 'Fire dragon', draw: () => dragon({ body: '#e53935', dark: '#7f1010', belly: '#ffcc80', wing: '#ff8a65', horns: '#fff8e1', breath: 'fire', spikes: '#ffb300' }) },
  'dragon-ice': { name: 'Ice dragon', draw: () => dragon({ body: '#4fc3f7', dark: '#01579b', belly: '#e1f5fe', wing: '#b3e5fc', horns: '#ffffff', breath: 'ice', eye: '#e1f5fe', spikes: '#e1f5fe' }) },
  'dragon-sea': { name: 'Sea dragon', draw: () => dragon({ body: '#26a69a', dark: '#004d40', belly: '#b2dfdb', wing: '#80cbc4', horns: '#e0f2f1', breath: 'water', spikes: '#80deea' }) },
  'dragon-bone': { name: 'Bone dragon', draw: () => dragon({ body: '#eeeeee', dark: '#424242', belly: '#eeeeee', wing: '#7e57c2', horns: '#bdbdbd', bone: true, spikes: '#9e9e9e' }) },
  'dragon-green': { name: 'Friendly dragon', draw: () => dragon({ body: '#7cb342', dark: '#33691e', belly: '#fff59d', wing: '#aed581', horns: '#fff8e1', smile: true, spikes: '#ffb300' }) },
  'dragon-purple': { name: 'Purple dragon', draw: () => dragon({ body: '#7e57c2', dark: '#311b92', belly: '#d1c4e9', wing: '#b39ddb', horns: '#fff8e1', breath: 'fire', spikes: '#f06292' }) },
  'dragon-gold': { name: 'Gold dragon', draw: () => dragon({ body: '#ffb300', dark: '#8d5a00', belly: '#fff8e1', wing: '#ffe082', horns: '#ffffff', smile: true, spikes: '#e65100' }) },
};

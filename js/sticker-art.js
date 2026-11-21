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

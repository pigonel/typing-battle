// ランクのアイコン(SVG)。ティアごとに形・色・飾りが変わる。区分(1〜3)は下の菱形で表す
export const TIER_NAMES = ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤ', 'マスター'];
const PAL = [
  { hi: '#ffd7ae', mid: '#cc7a3e', lo: '#6b3414', glow: '#ff9a55' },
  { hi: '#ffffff', mid: '#b9c3d8', lo: '#586480', glow: '#cfe0ff' },
  { hi: '#fff6b8', mid: '#f4b92f', lo: '#8c5806', glow: '#ffd24a' },
  { hi: '#f2fffc', mid: '#74d9d2', lo: '#27727c', glow: '#8ff6ee' },
  { hi: '#f4fcff', mid: '#6cc4ff', lo: '#2459c9', glow: '#8fd3ff' },
  { hi: '#ffe3ff', mid: '#c25cff', lo: '#58209a', glow: '#e07dff' },
  { hi: '#fff1c2', mid: '#ff5b4a', lo: '#7d0f20', glow: '#ff8a5a' },
];
const UNR = { hi: '#e3e7f5', mid: '#8d95b4', lo: '#3f4766', glow: '#aab2d4' };
export const rankColor = ({ placed, tier, gm }) => (!placed ? UNR : PAL[gm ? 6 : Math.min(tier, 5)]).mid;

const O = 'stroke="#10122e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const SHIELD = 'M50 4 L88 17 L86 60 Q84 87 50 104 Q16 87 14 60 L12 17 Z';
const PLATE = 'M50 14 L78 24 L76.5 59 Q75 80 50 93 Q25 80 23.5 59 L22 24 Z';
const WING = 'M14 28 C-6 20 -18 34 -15 56 L-4 48 L-7 64 L7 55 L6 71 L16 57 Z';
const star = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R; return `${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`; }).join(' ');
const grad = (u, n, a, b, c) => `<linearGradient id="${u}${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
const sparkle = (x, y, s, d) => `<path class="ri-sp" style="animation-delay:${d}s" d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="#fff"/>`;

// 中央の紋章(ティアごと)
function emblem(t, u, P) {
  const m = `url(#${u}m)`, f = `fill="${m}" ${O}`;
  if (t === 0) return `<path d="M50 34 L69 58 L60 58 L50 46 L40 58 L31 58 Z" ${f}/><path d="M50 52 L69 76 L60 76 L50 64 L40 76 L31 76 Z" ${f} opacity=".55"/>`;
  if (t === 1) return `<path d="M50 30 L70 52 L61 52 L50 41 L39 52 L30 52 Z" ${f}/><path d="M50 46 L70 68 L61 68 L50 57 L39 68 L30 68 Z" ${f}/><path d="M50 62 L70 84 L61 84 L50 73 L39 84 L30 84 Z" ${f} opacity=".6"/>`;
  if (t === 2) return `<polygon points="${star(50, 56, 25, 11)}" ${f}/><polygon points="${star(50, 56, 13, 5.5)}" fill="${P.hi}" opacity=".85"/><path d="M26 74 Q24 58 32 46 M74 74 Q76 58 68 46" fill="none" stroke="${P.lo}" stroke-width="4" stroke-linecap="round"/>`;
  if (t === 3) return `<circle cx="50" cy="56" r="25" fill="none" stroke="${P.lo}" stroke-width="3"/><circle cx="50" cy="56" r="25" fill="none" stroke="${P.hi}" stroke-width="1.5" stroke-dasharray="4 5"/><polygon points="${star(50, 56, 18, 8)}" ${f}/><circle cx="26" cy="56" r="3.5" fill="${P.hi}" ${O}/><circle cx="74" cy="56" r="3.5" fill="${P.hi}" ${O}/>`;
  if (t === 4) return `<polygon points="50,32 70,46 70,66 50,84 30,66 30,46" ${f}/><polygon points="38,46 62,46 70,56 30,56" fill="${P.hi}" opacity=".9" ${O}/><path d="M30 56 L50 84 L70 56 M41 56 L50 84 L59 56 M50 32 L38 46 M50 32 L62 46" fill="none" stroke="${P.hi}" stroke-width="1.6" opacity=".9"/>`;
  if (t === 5) return `<path d="M28 70 L28 42 L39 54 L50 34 L61 54 L72 42 L72 70 Z" ${f}/><circle cx="28" cy="40" r="4" fill="${P.hi}" ${O}/><circle cx="50" cy="31" r="4.5" fill="${P.hi}" ${O}/><circle cx="72" cy="40" r="4" fill="${P.hi}" ${O}/><polygon points="${star(50, 61, 7.5, 3.2)}" fill="${P.hi}"/>`;
  return `<path d="M26 72 L24 38 L37 52 L43 28 L50 46 L57 28 L63 52 L76 38 L74 72 Z" ${f}/><circle cx="50" cy="60" r="8" fill="${P.hi}" ${O}/><circle cx="50" cy="60" r="3.6" fill="${P.mid}"/><path d="M43 28 L50 14 L57 28" fill="${P.hi}" ${O}/>`;
}

// info = { placed, tier(0..5), div(1..3), gm }
export function rankIcon(info = {}, uid = 'ri') {
  const { placed = false, tier = 0, div = 1, gm = false } = info;
  const t = !placed ? -1 : gm ? 6 : Math.min(tier, 5), P = t < 0 ? UNR : PAL[t], u = `${uid}${t}`;
  const wings = t >= 3 ? `<g class="ri-wing"><path d="${WING}" fill="url(#${u}w)" ${O}/><path d="${WING}" transform="translate(100 0) scale(-1 1)" fill="url(#${u}w)" ${O}/></g>` : '';
  const big = t >= 5 ? `<g transform="translate(50 56) scale(1.22) translate(-50 -56)" class="ri-wing"><path d="${WING}" fill="url(#${u}w)" ${O}/><path d="${WING}" transform="translate(100 0) scale(-1 1)" fill="url(#${u}w)" ${O}/></g>` : '';
  const horns = t >= 5 ? `<path d="M26 12 L18 -3 L36 8 Z M74 12 L82 -3 L64 8 Z" fill="url(#${u}m)" ${O}/>` : '';
  const halo = t === 6 ? `<ellipse cx="50" cy="-2" rx="22" ry="6" fill="none" stroke="#ffd14a" stroke-width="3.5"/>` : '';
  const rivets = t === 0 ? '<circle cx="24" cy="27" r="2.4" fill="#ffe2c4"/><circle cx="76" cy="27" r="2.4" fill="#ffe2c4"/>' : '';
  const gem = t >= 2 && t < 5 ? `<circle cx="50" cy="9" r="4.4" fill="${P.hi}" ${O}/>` : '';
  const sp = t === 4 ? sparkle(8, 20, 6, 0) + sparkle(94, 40, 5, 0.9) + sparkle(78, 4, 4.5, 1.6) : t === 6 ? sparkle(10, 14, 5, 0) + sparkle(92, 30, 6, 0.8) : t === 5 ? sparkle(88, 12, 4.5, 0.5) : '';
  const pips = t < 0 || t >= 5 ? '' : [38, 50, 62].map((x, i) => `<path d="M${x} 108 l5 5.5 l-5 5.5 l-5 -5.5 z" fill="${i < div ? P.hi : '#10122e66'}" stroke="#10122e" stroke-width="2" stroke-linejoin="round"/>`).join('');
  const q = t < 0 ? '<text x="50" y="72" text-anchor="middle" font-size="46" font-weight="900" fill="#e3e7f5" stroke="#10122e" stroke-width="2.5" paint-order="stroke" font-family="sans-serif">?</text>' : '';
  return `<svg class="ri ${t >= 5 ? 'hot' : ''}" viewBox="-30 -14 160 142" role="img" aria-label="${t < 0 ? '未配置' : t === 6 ? 'グランドマスター' : `${TIER_NAMES[t]}${t < 5 ? div : ''}`}">
    <defs>${grad(u, 'm', P.hi, P.mid, P.lo)}${grad(u, 'p', P.lo, P.mid, P.hi)}${grad(u, 'w', P.hi, P.mid, P.lo)}<filter id="${u}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    ${t >= 3 ? `<ellipse class="ri-glow" cx="50" cy="56" rx="46" ry="48" fill="${P.glow}" opacity=".5" filter="url(#${u}b)"/>` : ''}
    ${big || wings}${halo}${horns}
    <path d="${SHIELD}" fill="url(#${u}m)" ${O}/>
    <path d="${PLATE}" fill="url(#${u}p)" ${O}/>
    <path d="M50 14 L78 24 L76.5 40 Q50 34 23.5 40 L22 24 Z" fill="#fff" opacity=".18"/>
    ${rivets}${gem}${t < 0 ? q : emblem(t, u, P)}${sp}${pips}
  </svg>`;
}

// 「ゴールド2」「マスター」「グランドマスター」のような名前から、アイコン用の情報を作る
export function parseRank(name = '') {
  if (name.startsWith('グランドマスター')) return { placed: true, tier: 5, div: 0, gm: true };
  if (name.startsWith('マスター')) return { placed: true, tier: 5, div: 0, gm: false };
  const i = TIER_NAMES.findIndex(n => n !== 'マスター' && name.startsWith(n));
  return i < 0 ? { placed: false, tier: 0, div: 1, gm: false } : { placed: true, tier: i, div: Math.min(3, Math.max(1, +name.slice(TIER_NAMES[i].length, TIER_NAMES[i].length + 1) || 1)), gm: false };
}

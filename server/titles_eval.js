// 称号の獲得判定(サーバー側)。m=その試合の記録
const CPM = { s150: 150, s200: 200, s250: 250, s300: 300, s350: 350, s400: 400, s450: 450, s500: 500 };
const STREAK = { w3: 3, w5: 5, w10: 10, w20: 20, w30: 30 };
const WINS = { t10: 10, t50: 50, t100: 100, t500: 500, t1000: 1000 };
const TIER = { r2: 1, r3: 2, r4: 3, r5: 4, r6: 5 };
const CHARS = 8, FORMATS = 5;

export function evalTitles(u, m, { event = null, isGm = false } = {}) {
  const owned = new Set(u.titles), fresh = [];
  const add = id => { if (!owned.has(id)) { owned.add(id); fresh.push(id); } };
  for (const [id, v] of Object.entries(CPM)) if (m.cpm >= v) add(id);
  for (const [id, v] of Object.entries(STREAK)) if (u.streak >= v) add(id);
  for (const [id, v] of Object.entries(WINS)) if (u.wins >= v) add(id);
  for (const [id, v] of Object.entries(TIER)) if (u.maxTier >= v) add(id);
  if (isGm) add('r7');
  if (event === 'placed' && u.rank.pw === 5) add('place');
  if (event === 'demo_stay') add('demote');
  const s = u.stats;
  if (s.formatsWon.length >= FORMATS) add('c5');
  if (Object.keys(s.charsWon).length >= CHARS) add('c8');
  if (s.formatsNoMiss.length >= FORMATS) add('cm');
  if (Object.keys(s.charsWon).length >= CHARS && Object.values(s.charsWon).every(n => n >= 10)) add('ca');
  if (m.win) {
    if (m.miss === 0) add('p1');
    if (m.mode === 'ranked' && m.firstTo > 1 && m.roundsLost === 0 && m.miss === 0) add('p2');
    if (m.minHp <= 0.10) add('p3');
    if (m.lastReason === 'time') add('p4');
    if (m.lastReason === 'count') add('p5');
    if (m.mirror) add('p6');
    if (m.skills >= 2) add('p7');
    if (m.pickRandom) add('p8');
  }
  if (m.maxCombo >= 100) add('k100');
  if (m.maxCombo >= 300) add('k300');
  u.titles.push(...fresh);
  return fresh;
}

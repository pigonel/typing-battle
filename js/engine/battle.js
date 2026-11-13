// 1ラウンドの進行(UI非依存)。時間は step(dt) で進め、入力は hit / miss / skill で渡す。
// サーバー権威にする場合も、このファイルをそのままサーバー側で動かせる。
import { RULES } from './rules.js';
const R = RULES;

const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const otherSide = s => (s === 'p1' ? 'p2' : 'p1');

export function createBattle({ chars, rng, duration = R.DURATION }) {
  const mk = c => ({ c, hp: c.hp, max: c.hp, combo: 0, gauge: 0, fx: [], hits: 0, miss: 0 });
  const P = { p1: mk(chars[0]), p2: mk(chars[1]) };
  let t = 0, over = null, events = [];

  const sum = (p, k) => p.fx.reduce((a, f) => a + (f.k === k && f.until > t ? f.v : 0), 0);
  const prod = (p, k) => p.fx.reduce((a, f) => a * (f.k === k && f.until > t ? f.v : 1), 1);
  const active = (p, k) => p.fx.some(f => f.k === k && f.until > t);
  const fxOf = p => [...new Set(p.fx.filter(f => f.until > t).map(f => f.k))];
  const pas = (p, k) => (p.c.passive?.k === k ? p.c.passive : null); // パッシブ(常時効果)
  const push = e => events.push({ t, ...e });
  const hurt = (s, amount) => { P[s].hp = Math.max(0, P[s].hp - amount); };
  const finish = (winner, reason) => { if (!over) { over = { winner, reason }; push({ type: 'end', winner, reason }); } };

  const judge = () => {
    if (over) return;
    const a = P.p1.hp <= 0, b = P.p2.hp <= 0;
    if (a && b) return finish('draw', 'ko');
    if (a) return finish('p2', 'ko');
    if (b) return finish('p1', 'ko');
    if (t >= duration) {
      const ra = P.p1.hp / P.p1.max, rb = P.p2.hp / P.p2.max;
      if (Math.abs(ra - rb) > 1e-9) return finish(ra > rb ? 'p1' : 'p2', 'time');   // HP割合
      if (P.p1.hits !== P.p2.hits) return finish(P.p1.hits > P.p2.hits ? 'p1' : 'p2', 'count'); // 正しく打てた文字数
      finish('draw', 'draw');
    }
  };

  return {
    hit(s) { // 正しい1打鍵
      if (over) return;
      const p = P[s], f = P[otherSide(s)];
      p.hits++; p.combo++;
      const bonus = Math.min(Math.floor(p.combo / (p.c.comboStep ?? R.COMBO_STEP)) * R.COMBO_STEP_BONUS, p.c.comboCap ?? R.COMBO_CAP);
      const op = pas(p, 'opening'), rg = pas(p, 'rage'), cc = pas(p, 'critCombo'), ls = pas(p, 'lifesteal'), fg = pas(f, 'foeGauge');
      const passiveMul = (op && t < op.sec ? op.v : 1) * (rg && p.hp / p.max <= rg.hp ? rg.v : 1);
      const critRate = clampN(p.c.crit + sum(p, 'critUp') + (cc ? Math.min(Math.floor(p.combo / cc.per) * cc.v, cc.cap) : 0), 0, 1);
      const crit = rng() < critRate;
      const wd = pas(f, 'ward');
      const cut = clampN(f.c.def + sum(f, 'shield') + (wd ? wd.v : 0), 0, R.DEF_CAP);
      const dmg = p.c.atk * (1 + bonus) * (crit ? p.c.critMul : 1) * prod(p, 'dmg') * prod(p, 'atkDown') * passiveMul * (1 - cut);
      p.gauge = Math.min(R.GAUGE_MAX, p.gauge + R.GAUGE_PER_HIT * (1 + Math.min(p.combo, R.COMBO_GAUGE_FULL) / R.COMBO_GAUGE_FULL) * prod(p, 'gaugeMul') * (fg ? fg.v : 1));
      hurt(otherSide(s), dmg);
      if (ls) p.hp = Math.min(p.max, p.hp + dmg * ls.v);
      push({ type: 'hit', side: s, dmg, crit, combo: p.combo });
      judge();
    },
    miss(s) { // ミスタイプ: コンボ切れ+自傷
      if (over) return;
      const p = P[s], mc = pas(p, 'missCut'), ck = pas(p, 'comboKeep');
      p.miss++; p.combo = ck ? Math.floor(p.combo * ck.v) : 0;
      const self = active(p, 'guard') ? 0 : p.max * R.MISS_SELF_PCT * (mc ? mc.v : 1);
      if (self) hurt(s, self);
      push({ type: 'miss', side: s, self });
      judge();
    },
    skill(s, idx) { // 発動できたら true
      if (over) return false;
      const p = P[s], f = P[otherSide(s)], sk = p.c.skills[idx];
      if (!sk || p.gauge < sk.cost) return false;
      p.gauge -= sk.cost;
      for (const e of sk.fx) {
        const tgt = e.to === 'foe' ? f : p;
        if (e.t === 'burst') hurt(otherSide(s), f.max * e.pct);
        else if (e.t === 'heal') p.hp = Math.min(p.max, p.hp + p.max * e.pct);
        else if (e.t === 'buff') tgt.fx.push({ k: e.k, v: e.v, until: t + e.dur });
        else if (e.t === 'dot') f.fx.push({ k: 'dot', v: e.pct, until: t + e.dur });
        else if (e.t === 'gaugeCut') f.gauge *= e.v;
        else if (e.t === 'combo') { if (e.add !== undefined) p.combo += e.add; else tgt.combo = e.set; }
      }
      push({ type: 'skill', side: s, idx, name: sk.name });
      judge();
      return true;
    },
    step(dt) { // 時間を進める(継続ダメージ・再生・効果の期限切れ・時間切れ判定)
      if (over) return;
      const before = t;
      t += dt;
      for (const s of ['p1', 'p2']) {
        const p = P[s], rgn = pas(p, 'regen');
        const dot = p.fx.reduce((a, f) => a + (f.k === 'dot' && f.until > before ? f.v : 0), 0);
        if (dot) hurt(s, p.max * dot * dt);
        if (rgn && p.hp > 0) p.hp = Math.min(p.max, p.hp + p.max * rgn.pct * dt);
        p.fx = p.fx.filter(f => f.until > t);
      }
      judge();
    },
    surrender(s) { finish(otherSide(s), 'surrender'); },
    drain() { const e = events; events = []; return e; },
    result: () => over,
    state: () => ({
      t, remaining: Math.max(0, duration - t),
      p1: { hp: P.p1.hp, max: P.p1.max, combo: P.p1.combo, gauge: P.p1.gauge, hits: P.p1.hits, miss: P.p1.miss, fx: fxOf(P.p1) },
      p2: { hp: P.p2.hp, max: P.p2.max, combo: P.p2.combo, gauge: P.p2.gauge, hits: P.p2.hits, miss: P.p2.miss, fx: fxOf(P.p2) },
    }),
  };
}

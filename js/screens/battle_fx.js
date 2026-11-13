// バトル画面の演出(ヒット・スキル・オーラ・KO)。見た目だけを担当し、勝敗や数値には関わらない。
import { ACCENT, charArt } from '../data/art.js';

const POS = { p1: { x: 18, y: 56 }, p2: { x: 82, y: 56 } }; // ステージ上のキャラ中心(%)
const other = s => (s === 'p1' ? 'p2' : 'p1');
const rnd = (a, b) => a + Math.random() * (b - a);
const AURAS = ['dmg', 'shield', 'critUp', 'gaugeMul', 'guard', 'atkDown', 'dot', 'open', 'rage'];
const BUFF_COLOR = { dmg: '#ff8a3a', shield: '#6bd0ff', critUp: '#ffe34d', gaugeMul: '#6beaff', guard: '#ffffff', atkDown: '#9a6bff' };
const BUFF_LABEL = { dmg: '攻撃UP', shield: '防御UP', critUp: '会心UP', gaugeMul: 'ゲージUP', guard: '自傷無効', atkDown: '攻撃DOWN' };

export function createFx({ arena, stage, fighters, chars, banner, chips, on }) {
  const layer = stage.querySelector('.fxl');
  let live = 0, timers = [];
  const after = (fn, ms) => timers.push(setTimeout(fn, ms));

  const spawn = (cls, x, y, css = {}) => {
    if (live > 150) return null;
    const d = document.createElement('i');
    d.className = cls; d.style.left = `${x}%`; d.style.top = `${y}%`; Object.assign(d.style, css);
    layer.append(d); live++;
    return d;
  };
  const play = (d, frames, opt) => {
    if (!d) return;
    d.animate(frames, { fill: 'forwards', ...opt }).onfinish = () => { d.remove(); live--; };
  };
  const burst = (side, { n = 8, color = '#fff', dist = [30, 90], size = [4, 9], life = 520, grav = 30 } = {}) => {
    const p = POS[side];
    for (let k = 0; k < n; k++) {
      const a = rnd(0, Math.PI * 2), r = rnd(dist[0], dist[1]), s = rnd(size[0], size[1]);
      const d = spawn('pt', p.x + rnd(-3, 3), p.y + rnd(-12, 12), { width: `${s}px`, height: `${s}px`, background: color, color });
      play(d, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r + grav}px)) scale(.2)`, opacity: 0 }], { duration: life * rnd(0.7, 1.2), easing: 'ease-out' });
    }
  };
  const rise = (side, glyph, color, n = 8) => {
    const p = POS[side];
    for (let k = 0; k < n; k++) {
      const d = spawn('glyph', p.x + rnd(-8, 8), p.y + rnd(0, 22), { color, fontSize: `${rnd(16, 28)}px` });
      if (d) d.textContent = glyph;
      play(d, [{ transform: 'translate(-50%,0)', opacity: 0 }, { transform: 'translate(-50%,-30px)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-130px)', opacity: 0 }], { duration: 1000 + k * 40, delay: k * 55, easing: 'ease-out' });
    }
  };
  const ring = (side, color, big = 1) => {
    const p = POS[side];
    play(spawn('ring', p.x, p.y, { borderColor: color, boxShadow: `0 0 18px ${color}` }), [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.95 }, { transform: `translate(-50%,-50%) scale(${2.8 * big})`, opacity: 0 }], { duration: 560, easing: 'ease-out' });
  };
  const slash = (side, color, long = 1) => {
    const p = POS[side];
    play(spawn('slash', p.x + rnd(-3, 3), p.y + rnd(-10, 10), { background: `linear-gradient(90deg,transparent,${color},transparent)`, width: `${170 * long}px` }),
      [{ transform: `translate(-50%,-50%) rotate(${rnd(-40, 40)}deg) scaleX(.2)`, opacity: 1 }, { transform: `translate(-50%,-50%) rotate(${rnd(-40, 40)}deg) scaleX(1)`, opacity: 0 }], { duration: 220, easing: 'ease-out' });
  };
  const pop = (side, text, cls = '', dy = 0) => {
    const p = POS[side], d = spawn(`pop ${cls}`, p.x, p.y - 18 + dy);
    if (d) d.textContent = text;
    play(d, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-80%) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-130%) scale(1)', opacity: 0 }], { duration: 1000, easing: 'ease-out' });
  };
  const wash = (color, a = 0.3, ms = 240) => play(spawn('wash', 0, 0, { background: color }), [{ opacity: a }, { opacity: 0 }], { duration: ms });
  const shake = (amp = 6, ms = 160) => arena.animate([{ transform: `translate(${-amp}px,${amp / 2}px)` }, { transform: `translate(${amp}px,${-amp / 2}px)` }, { transform: `translate(${-amp / 2}px,0)` }, { transform: 'none' }], { duration: ms });
  const hurt = (side, mul = 1) => fighters[side].animate([{ transform: 'translateX(0)', filter: 'brightness(2.2)' }, { transform: `translateX(${(side === 'p1' ? -1 : 1) * 9 * mul}px)`, filter: 'brightness(1.3)' }, { transform: 'translateX(0)', filter: 'none' }], { duration: 110 + 60 * mul });
  const beam = (side, color) => {
    const a = POS[side], b = POS[other(side)], left = Math.min(a.x, b.x) + 6;
    const d = spawn('beam', left, a.y, { width: `${Math.abs(a.x - b.x) - 12}%`, background: `linear-gradient(${side === 'p1' ? 90 : 270}deg,transparent,${color} 40%,#fff)`, transformOrigin: side === 'p1' ? 'left center' : 'right center', boxShadow: `0 0 30px ${color}` });
    play(d, [{ transform: 'translateY(-50%) scaleX(0)', opacity: 1 }, { transform: 'translateY(-50%) scaleX(1)', opacity: 1, offset: 0.35 }, { transform: 'translateY(-50%) scaleX(1)', opacity: 0 }], { duration: 560, easing: 'ease-out' });
    after(() => { const t = other(side); ring(t, color, 1.4); burst(t, { n: 24, color, dist: [40, 150], size: [5, 12], life: 650 }); slash(t, '#fff', 1.8); shake(9, 220); wash(color, 0.32, 280); hurt(t, 2); }, 190);
  };
  const cutin = (side, skill, ch) => {
    const el = document.createElement('div');
    el.className = `cutin ${side === 'p1' ? 'l' : 'r'}`; el.style.setProperty('--c', ACCENT[ch.id]);
    el.innerHTML = `<div class="ci-art">${charArt(ch)}</div><div class="ci-txt"><small>${ch.name}</small><b>${skill.name}</b></div>`;
    arena.append(el);
    const dir = side === 'p1' ? -1 : 1;
    el.animate([{ transform: `translateX(${dir * 105}%)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1, offset: 0.16 }, { transform: 'translateX(0)', opacity: 1, offset: 0.76 }, { transform: `translateX(${-dir * 30}%)`, opacity: 0 }], { duration: 950, easing: 'ease-out' }).onfinish = () => el.remove();
  };

  const SKILL_FX = {
    burst: (side, e, ch) => beam(side, ACCENT[ch.id]),
    heal: side => { rise(side, '✚', '#6dffa0', 9); ring(side, '#6dffa0'); wash('#3dff8a', 0.16, 360); },
    buff: (side, e) => {
      const t = e.to === 'foe' ? other(side) : side, c = BUFF_COLOR[e.k] ?? '#fff';
      ring(t, c); burst(t, { n: 14, color: c, dist: [30, 100], life: 700, grav: -30 }); pop(t, BUFF_LABEL[e.k] ?? '', 'buff', 4);
      if (e.k === 'critUp') for (let k = 0; k < 3; k++) after(() => slash(t, '#ffe34d', 1.3), k * 90);
    },
    dot: side => { rise(other(side), '●', '#7ee06a', 8); pop(other(side), '継続ダメージ', 'buff', 4); },
    gaugeCut: side => { burst(other(side), { n: 14, color: '#6beaff', dist: [30, 90] }); pop(other(side), 'ゲージ減少', 'buff', 4); },
    combo: (side, e) => (e.add !== undefined ? pop(side, `+${e.add} COMBO`, 'buff', 4) : pop(other(side), 'COMBO BREAK', 'buff', 4)),
  };

  return {
    hit(side, e) {
      if (!on) return;
      const def = other(side), crit = e.crit;
      fighters[side].animate([{ transform: 'translateX(0)' }, { transform: `translateX(${(side === 'p1' ? 1 : -1) * (crit ? 20 : 12)}px)` }, { transform: 'translateX(0)' }], { duration: crit ? 130 : 90 });
      hurt(def, crit ? 1.6 : 1);
      burst(def, { n: crit ? 12 : 4, color: crit ? '#ffd23f' : '#fff', dist: crit ? [30, 110] : [14, 46], size: [3, crit ? 9 : 6], life: crit ? 560 : 320 });
      if (crit) { slash(def, '#ffd23f', 1.6); shake(4, 120); } else if (Math.random() < 0.35) slash(def, '#fff', 0.8);
    },
    combo(side, n) {
      if (!on) return;
      pop(side, `${n} COMBO!`, 'combo'); ring(side, '#ffd23f', 0.8);
    },
    skill(side, skill, ch) {
      if (!on) return;
      cutin(side, skill, ch);
      after(() => skill.fx.forEach(e => SKILL_FX[e.t]?.(side, e, ch)), 250);
    },
    auras(s) {
      ['p1', 'p2'].forEach((side, k) => {
        const p = s[side], ps = chars[side].passive, set = new Set(p.fx);
        if (ps?.k === 'opening' && s.t < ps.sec) set.add('open');
        if (ps?.k === 'rage' && p.hp / p.max <= ps.hp) set.add('rage');
        AURAS.forEach(a => fighters[side].classList.toggle(`a-${a}`, on && set.has(a)));
        chips[k]?.classList.toggle('on', set.has('open') || set.has('rage'));
      });
    },
    // 決着の演出。戻り値=結果表示までの待ち時間(ms)
    end(e) {
      if (!on) return 0;
      const loser = e.winner === 'p1' ? 'p2' : e.winner === 'p2' ? 'p1' : null, win = loser && other(loser);
      const say = (txt, ms = 1200) => { banner.textContent = txt; banner.classList.remove('go'); banner.animate([{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' }); return ms; };
      if (e.reason === 'ko' && loser) {
        wash('#fff', 0.85, 520); shake(11, 320); burst(loser, { n: 36, color: '#ffd23f', dist: [60, 190], size: [5, 13], life: 800 });
        fighters[loser].animate([{ transform: 'none', opacity: 1, filter: 'none' }, { transform: `translateX(${loser === 'p1' ? -34 : 34}px) translateY(34px) rotate(${loser === 'p1' ? -14 : 14}deg)`, opacity: 0.35, filter: 'grayscale(1)' }], { duration: 750, fill: 'forwards', easing: 'ease-out' });
        fighters[win].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)' }, { transform: 'translateY(0)' }], { duration: 520, iterations: 2, delay: 500 });
        return say('K.O.!', 1800);
      }
      if (e.reason === 'time') return say('TIME UP', 1400);
      return 0;
    },
    reset() {
      timers.forEach(clearTimeout); timers = [];
      Object.values(fighters).forEach(f => f.getAnimations().forEach(a => a.cancel()));
      layer.innerHTML = ''; live = 0;
      arena.querySelectorAll('.cutin').forEach(c => c.remove());
    },
  };
}

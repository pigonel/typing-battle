import { CHARACTERS, charById } from '../data/characters.js';
import { FORMATS } from '../data/words.js';
import { RANK_PRESETS } from '../data/presets.js';
import { charArt } from '../data/art.js';

const TRAIN_DEFAULT = { me: 'thief', foe: 'golem', format: 'daily', preset: 'gold', cpm: 220, acc: 94, skill: 'ready', limit: 60, dummy: false };
const SKILL_MODES = [['none', '使わない'], ['ready', '溜まり次第'], ['random', 'ランダム']];
const pct = v => `${Math.round(v * 100)}%`;

export default {
  mount(el, { store, go }) {
    const cfg = { ...TRAIN_DEFAULT, ...(store.get().trainingCfg ?? {}) };
    const save = () => store.set({ trainingCfg: { ...cfg } });
    const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">${items.map(([v, t]) => `<button data-v="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div>`;

    const draw = () => {
      const me = charById(cfg.me);
      el.innerHTML = `
        <h1>トレーニング</h1>
        <div class="tr-grid">
          <div class="panel">
            <div class="field"><span>自分のキャラ</span></div>
            <div class="cards" style="margin-top:8px">${CHARACTERS.map(c => `<button class="card" data-me="${c.id}" aria-pressed="${c.id === cfg.me}">${charArt(c)}<b>${c.name}</b><small>${c.role}</small></button>`).join('')}</div>
            <div class="detail"><b>${me.name}</b>(${me.role}) HP ${me.hp} / 攻撃 ${me.atk} / 防御 ${pct(me.def)} / クリ ${pct(me.crit)}×${me.critMul}
              <ul>${me.skills.map((s, i) => `<li>スキル${i + 1}「${s.name}」(ゲージ${s.cost}): ${s.desc}</li>`).join('')}</ul></div>
          </div>
          <div class="panel form" style="max-width:none">
            <label class="field"><span>敵のキャラ</span><select id="foe">${CHARACTERS.map(c => `<option value="${c.id}" ${c.id === cfg.foe ? 'selected' : ''}>${c.name}(${c.role})</option>`).join('')}</select></label>
            <div class="field"><span>単語の形式</span>${seg('format', FORMATS.map(f => [f.id, f.name]), cfg.format)}</div>
            <div class="field"><span>敵の強さ(ランク帯の目安)</span>${seg('preset', RANK_PRESETS.map(p => [p.id, p.name]), cfg.preset)}</div>
            <label class="field"><span>敵のCPM <output id="o-cpm">${cfg.cpm}</output></span><input type="range" id="cpm" min="50" max="600" step="5" value="${cfg.cpm}"></label>
            <label class="field"><span>敵の正確率 <output id="o-acc">${cfg.acc}%</output></span><input type="range" id="acc" min="70" max="100" value="${cfg.acc}"></label>
            <div class="field"><span>敵のスキル</span>${seg('skill', SKILL_MODES, cfg.skill)}</div>
            <div class="field"><span>制限時間</span>${seg('limit', [[60, '60秒'], [0, '無制限']], cfg.limit)}</div>
            <label class="field"><span><input type="checkbox" id="dummy" ${cfg.dummy ? 'checked' : ''}>敵は入力しない(ダミー)</span></label>
          </div>
        </div>
        <div class="row"><button class="btn primary" id="start">バトル開始</button><button class="btn" id="back">メニューへ戻る</button></div>`;
    };
    draw();

    el.addEventListener('click', e => {
      const t = e.target, card = t.closest('[data-me]'), b = t.closest('[data-seg] button');
      if (card) { cfg.me = card.dataset.me; save(); draw(); el.querySelector(`[data-me="${cfg.me}"]`)?.focus(); }
      else if (b) {
        const name = b.parentElement.dataset.seg, v = b.dataset.v;
        if (name === 'preset') { const p = RANK_PRESETS.find(x => x.id === v); Object.assign(cfg, { preset: v, cpm: p.cpm, acc: p.acc }); }
        else cfg[name] = name === 'limit' ? +v : v;
        save(); draw();
      } else if (t.id === 'start') { save(); go('battle', { cfg: { ...cfg } }); }
      else if (t.id === 'back') go('menu');
    });
    el.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'cpm' || t.id === 'acc') {
        cfg[t.id] = +t.value; cfg.preset = '';
        el.querySelector(`#o-${t.id}`).textContent = t.id === 'acc' ? `${t.value}%` : t.value;
        el.querySelectorAll('[data-seg="preset"] button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        save();
      }
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'foe') cfg.foe = t.value;
      else if (t.id === 'dummy') cfg.dummy = t.checked;
      else return;
      save();
    });
    const onKey = e => { if (e.key === 'Escape' && !e.target.closest?.('select')) go('menu'); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  },
};

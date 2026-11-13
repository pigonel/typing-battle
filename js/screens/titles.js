import { TITLES, TITLE_CATS, RARITY } from '../data/titles.js';
import { saveSettings, equippedTitle } from '../core/state.js';
import { esc } from '../core/dom.js';

export default {
  mount(el, { store, go }) {
    let cat = 'all';
    el.innerHTML = `<h1>称号</h1><div class="tt-top"><div class="tt-tabs">${TITLE_CATS.map(([id, n]) => `<button class="seg-b" data-cat="${id}">${n}</button>`).join('')}</div><span class="tt-count"></span></div>
      <div class="tt-list"></div><div class="row"><button class="btn" id="back">メニューへ戻る</button></div>`;
    const $ = q => el.querySelector(q);
    const paint = () => {
      const st = store.get(), own = new Set(st.profile.titles), eq = equippedTitle(st);
      el.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat));
      $('.tt-count').textContent = `獲得 ${own.size} / ${TITLES.length}${eq ? '' : '　装備中: なし'}`;
      $('.tt-list').innerHTML = TITLES.filter(t => cat === 'all' || t.cat === cat).map(t => {
        const has = own.has(t.id), r = RARITY[t.r], hide = t.hidden && !has;
        return `<div class="tt-item ${has ? 'own' : ''} ${eq === t.id ? 'eq' : ''}" style="--rc:${r.color}"><div><small>${r.name}</small><b>${hide ? '？？？？？' : esc(t.name)}</b><span>${hide ? '条件: ？？？' : esc(t.cond)}</span></div>
          ${has ? `<button class="btn ${eq === t.id ? '' : 'primary'}" data-eq="${t.id}">${eq === t.id ? '外す' : '装備'}</button>` : '<em>未獲得</em>'}</div>`;
      }).join('');
    };
    el.addEventListener('click', e => {
      const c = e.target.closest('[data-cat]'), q = e.target.closest('[data-eq]');
      if (c) { cat = c.dataset.cat; paint(); }
      else if (q) { const own = store.get().profile.titles.includes(q.dataset.eq); if (!own) return; const id = equippedTitle(store.get()) === q.dataset.eq ? null : q.dataset.eq; saveSettings({ title: id }); paint(); }
      else if (e.target.id === 'back') go('menu');
    });
    const onKey = e => { if (e.key === 'Escape') go('menu'); };
    addEventListener('keydown', onKey);
    paint();
    return () => removeEventListener('keydown', onKey);
  },
};

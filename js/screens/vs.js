import { charById } from '../data/characters.js';
import { FORMATS } from '../data/words.js';
import { charArt } from '../data/art.js';
import { titleName } from '../data/titles.js';
import { conn } from '../net/conn.js';
import { sfx } from '../core/audio.js';
import { esc } from '../core/dom.js';

export default {
  mount(el, { store, go }) {
    const st = store.get(), v = st.match?.vs;
    if (!v) { go('menu'); return; }
    const me = charById(v.me.char), foe = charById(v.foe.char), ranked = v.mode === 'ranked';
    const info = (c, ign, rank, title, side) => `<div class="vs-nm ${side}"><small>${esc(title ?? '称号なし')}</small><b>${esc(ign)}</b><em>${esc(rank)}</em><span>${c.name}(${c.role})</span></div>`;
    el.innerHTML = `<div class="vs">
      <div class="vs-head">${ranked ? 'ランクマッチ・2先取' : '通常マッチ・1本勝負'}<span>単語形式: ${esc(FORMATS.find(f => f.id === v.format)?.name ?? '')}</span></div>
      <div class="vs-stage"><div class="vs-p l">${charArt(me)}</div><div class="vs-mid"><span>VS</span></div><div class="vs-p r">${charArt(foe)}</div></div>
      <div class="vs-info">${info(me, st.session.ign, st.match.myRank ?? st.profile.rank.split('(')[0].split(' ')[0], titleName(st.settings.title), 'l')}${info(foe, v.foe.ign, v.foe.rank, v.foe.title, 'r')}</div>
      <p class="vs-hint">Enter / クリックで準備完了(相手も準備できたらすぐ開始します)</p></div>`;
    sfx('vs');
    const ready = () => { conn.send({ t: 'ready' }); el.querySelector('.vs-hint').textContent = '準備完了。相手を待っています…'; };
    const offs = [
      conn.on('round', m => go('battle', { cfg: { kind: 'online', mode: v.mode, me: v.me.char, foe: v.foe.char, format: v.format, firstTo: v.firstTo, limit: m.limit, meIgn: st.session.ign, foeIgn: v.foe.ign }, round: m })),
      conn.on('match_end', m => go('result', { summary: m })),
      conn.on('_close', () => go('menu')),
    ];
    const onKey = e => { if (e.key === 'Enter') ready(); };
    addEventListener('keydown', onKey); el.addEventListener('click', ready);
    return () => { offs.forEach(f => f()); removeEventListener('keydown', onKey); };
  },
};

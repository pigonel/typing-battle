import { TITLES } from '../data/titles.js';
import { applyProfile } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { esc } from '../core/dom.js';

const EVENT = {
  placed: '配置戦が終わり、ランクが決まりました!', promoted: '昇格しました!', demo_start: '降格戦が始まります(3試合中2勝で残留)',
  demo_stay: '降格戦に勝って、残留しました', demoted: '降格しました',
};
const WHY = { disconnect: '通信が切れました', surrender: '降参', ko: 'KO', time: '時間切れ(HPの割合で判定)', count: '時間切れ(入力文字数で判定)' };

export default {
  mount(el, { store, go, params }) {
    const s = params.summary;
    if (!s) { go('menu'); return; }
    if (s.profile) applyProfile(s.profile);
    const title = s.win ? '勝利!' : '敗北', r = s.rank, st = s.stats;
    const dl = r?.delta ? `${r.delta > 0 ? '+' : '−'}${Math.abs(r.delta)} LP` : '';
    const names = (s.titles ?? []).map(id => TITLES.find(t => t.id === id)?.name).filter(Boolean);
    el.innerHTML = `<div class="rs ${s.win ? 'win' : ''}"><h1>${title}</h1>${s.firstTo > 1 ? `<p class="rs-score">${s.score[0]} - ${s.score[1]}</p>` : ''}<p class="note">${esc(WHY[s.reason] ?? '')}</p>
      ${r?.ranked ? `<p class="rs-lp">${esc(r.before)} → ${esc(r.after)}${dl ? `<small>${dl}${r.placed ? '' : `(配置戦 ${r.pg}/5)`}</small>` : ''}</p>${r.event ? `<p class="rs-ev">${EVENT[r.event]}</p>` : ''}` : s.mode === 'ranked' ? '' : '<p class="rs-lp"><small>通常マッチではLPは動きません</small></p>'}
      <dl class="rs-stats"><dt>CPM</dt><dd>${st.cpm}</dd><dt>正しい打鍵</dt><dd>${st.hits}</dd><dt>ミス</dt><dd>${st.miss}</dd><dt>最大コンボ</dt><dd>${st.maxCombo}</dd></dl>
      <p class="rs-titles">${names.length ? `獲得した称号: ${names.map(n => `<b>${esc(n)}</b>`).join(' / ')}` : '<span class="note">新しい称号はありません</span>'}</p>
      <div class="row"><button class="btn primary" id="again">もう一度マッチング</button><button class="btn" id="menu">メニューへ</button></div></div>`;
    sfx(s.win ? 'win' : 'lose');
    el.addEventListener('click', e => {
      if (e.target.id === 'again') { store.set({ mode: s.mode }); go('matching'); } else if (e.target.id === 'menu') go('menu');
    });
    el.querySelector('#again').focus();
  },
};

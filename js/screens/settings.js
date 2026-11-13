import { saveSettings } from '../core/state.js';
import { esc } from '../core/dom.js';
import { sfx } from '../core/audio.js';

const HUD = [['ign', 'プレイヤー名'], ['rank', 'ランクとLP'], ['title', '装備中の称号'], ['streak', '連勝数']];
const MODS = ['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight'];
const fmt = c => c.split('+').map(p => p.replace(/^(Key|Digit)/, '')).join(' + ');

export default {
  mount(el, { store, go }) {
    const { settings: s, session } = store.get();
    el.innerHTML = `
      <h1>設定</h1>
      <div class="panel form">
        <label class="field"><span>プレイヤー名</span>
          <input id="ign" maxlength="16" value="${esc(session.ign)}" ${session.guest ? 'disabled' : ''}>
          <small id="ign-msg">${session.guest ? 'ゲストは変更できません(アカウント登録後に変更できます)' : '3〜16文字の英数字と _ - . が使えます'}</small></label>
        <label class="field"><span>BGM音量 <output>${s.bgm}</output></span><input type="range" id="bgm" min="0" max="100" value="${s.bgm}"></label>
        <label class="field"><span>効果音の音量 <output>${s.se}</output></span><input type="range" id="se" min="0" max="100" value="${s.se}"></label>
        <label class="field"><span>演出・カットイン</span><select id="fx"><option value="1">ON</option><option value="0">OFF</option></select></label>
        <label class="field"><span>テーマ</span><select id="theme"><option value="dark">ダーク</option><option value="light">ライト</option></select></label>
        <fieldset class="field"><legend>メニュー上部に表示する項目</legend>${HUD.map(([k, t]) =>
          `<label><input type="checkbox" data-hud="${k}" ${s.hud[k] ? 'checked' : ''}>${t}</label>`).join('')}</fieldset>
        <div class="field"><span>スキルキー</span>
          <div class="row">${[0, 1].map(i => `<button class="btn" data-key="${i}"></button>`).join('')}</div>
          <small id="key-msg">ボタンを押してから、Shift または Alt と組み合わせたキーを押します</small></div>
      </div>
      <div class="row"><button class="btn primary" id="back">メニューへ戻る</button></div>`;
    const $ = q => el.querySelector(q);
    $('#fx').value = s.fx ? '1' : '0';
    $('#theme').value = s.theme;
    let rebind = null;
    const paintKeys = () => el.querySelectorAll('[data-key]').forEach(b => {
      const i = +b.dataset.key;
      b.textContent = `スキル${i + 1}: ${fmt(store.get().settings.skillKeys[i])}`;
    });
    paintKeys();

    el.addEventListener('input', e => {
      const t = e.target; if (t.type !== 'range') return;
      t.previousElementSibling.querySelector('output').textContent = t.value;
      saveSettings({ [t.id]: +t.value });
      if (t.id === 'se') sfx('ui_ok');
    });
    el.addEventListener('change', e => {
      const t = e.target, cur = store.get().settings;
      if (t.id === 'fx') saveSettings({ fx: t.value === '1' });
      else if (t.id === 'theme') saveSettings({ theme: t.value });
      else if (t.dataset.hud) saveSettings({ hud: { ...cur.hud, [t.dataset.hud]: t.checked } });
      else if (t.id === 'ign') {
        const ok = /^[A-Za-z0-9_.-]{3,16}$/.test(t.value);
        $('#ign-msg').textContent = ok ? '変更しました' : '3〜16文字の英数字と _ - . だけ使えます';
        if (ok) { saveSettings({ ign: t.value }); store.set(st => ({ session: { ...st.session, ign: t.value } })); }
      }
    });
    el.addEventListener('click', e => {
      if (e.target.id === 'back') return go('menu');
      const b = e.target.closest('[data-key]'); if (!b) return;
      rebind = +b.dataset.key;
      b.textContent = 'キーを押してください(Escで中止)';
    });

    const onKey = e => {
      if (rebind === null) { if (e.key === 'Escape') go('menu'); return; }
      e.preventDefault();
      if (MODS.includes(e.code)) return;
      const msg = $('#key-msg'), keys = [...store.get().settings.skillKeys];
      if (e.code !== 'Escape') {
        const combo = `${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`;
        if (!(e.shiftKey || e.altKey) || e.ctrlKey || e.metaKey) { msg.textContent = 'Shift または Alt と組み合わせてください'; return; }
        if (keys.some((k, i) => i !== rebind && k === combo)) { msg.textContent = 'もう一方のスキルと同じキーです'; return; }
        keys[rebind] = combo;
        saveSettings({ skillKeys: keys });
        msg.textContent = '変更しました';
      }
      rebind = null;
      paintKeys();
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  },
};

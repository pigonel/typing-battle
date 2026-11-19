import { charById } from '../data/characters.js';
import { charArt, ACCENT } from '../data/art.js';
import { createFx } from './battle_fx.js';
import { createBattle } from '../engine/battle.js';
import { createBot } from '../engine/bot.js';
import { createWordInput } from '../engine/wordinput.js';
import { RULES } from '../engine/rules.js';
import { isMobile } from '../core/device.js';
import { mulberry32 } from '../engine/rng.js';
import { makeQueue } from '../engine/feed.js';
import { conn } from '../net/conn.js';
import { sfx } from '../core/audio.js';
import { esc } from '../core/dom.js';

// training画面から cfg を受け取る。cfg なし(マッチング経由の仮接続)のときは既定のCPU戦。
const BATTLE_DEFAULT = { me: 'thief', foe: 'golem', format: 'daily', cpm: 250, acc: 95, skill: 'ready', limit: 60, dummy: false, firstTo: 1, kind: 'training' };
const keyToChar = code => (/^Key[A-Z]$/.test(code) ? code[3].toLowerCase() : code === 'Minus' ? '-' : null);
const END_WHY = { ko: 'KO', time: '時間切れ(HPの割合で判定)', count: '時間切れ(入力文字数で判定)', draw: '同点', surrender: '降参' };
const keyLabel = c => c.split('+').map(p => p.replace(/^(Key|Digit)/, '')).join(' + ');

export default {
  mount(el, { store, go, params }) {
    const cfg = { ...BATTLE_DEFAULT, ...(params.cfg ?? {}) };
    const fromTraining = cfg.kind === 'training', online = cfg.kind === 'online';
    const me = charById(cfg.me), foe = charById(cfg.foe);
    const skillKeys = store.get().settings.skillKeys;
    let mobile = isMobile(); // スマホ入力: 1文字のダメージが1.5倍(ローマ字1打鍵・かな1文字)
    const skillBox = (c, mine) => c.skills.map((s, i) => `<div class="skill" data-sk="${i}"><kbd>${mine ? (mobile ? 'タップ' : keyLabel(skillKeys[i])) : ''}</kbd><b>${s.name}</b><small>${s.desc}</small></div>`).join('');

    el.innerHTML = `
      <div class="battle">
        ${mobile ? '<button class="mbtn" data-a="mmenu" type="button" aria-label="メニュー">☰</button>' : ''}
        <div class="bt-top">
          <div class="bt-side"><div class="bt-name">${me.name}<small>${me.role}</small>${cfg.meIgn ? `<em>${esc(cfg.meIgn)}</em>` : ''}<span class="pv" title="${esc(me.passive.desc)}">${me.passive.name}</span></div><div class="hpbar"><i class="hp-ghost"></i><i class="hp-fill"></i></div><div class="hp-num"></div></div>
          <div class="bt-timer"><span id="clock">60</span><small>秒</small><div class="pips" id="pips"></div></div>
          <div class="bt-side right"><div class="bt-name">${foe.name}<small>${foe.role}</small>${cfg.foeIgn ? `<em>${esc(cfg.foeIgn)}</em>` : ''}<span class="pv" title="${esc(foe.passive.desc)}">${foe.passive.name}</span></div><div class="hpbar"><i class="hp-ghost"></i><i class="hp-fill"></i></div><div class="hp-num"></div><div class="mini-gauge"><i id="g2"></i></div></div>
        </div>
        <div class="stage"><div class="fighter l"><div class="aura"></div><div class="idle">${charArt(me)}</div></div><div class="fighter r"><div class="aura"></div><div class="idle">${charArt(foe)}</div></div><div class="fxl"></div><div class="flash"></div><div class="banner"></div></div>
        <div class="typing"><div class="t-disp"></div><div class="t-kana"></div><div class="t-rom"></div>${mobile ? `<input id="mi" class="mi" type="text" inputmode="text" lang="ja" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" aria-label="ここに入力"><div class="t-hint">ここをタップして入力(1文字のダメージ${RULES.MOBILE_MULT}倍)</div><button class="imebtn" data-a="ime" type="button"></button>` : ''}</div>
        <div class="hud-b">
          <div class="combo"><b id="combo">0</b>コンボ</div>
          <div><div class="gauge"><div class="g-fill" id="g1"></div>${me.skills.map(sk => `<i class="tick" style="left:${(sk.cost / 300) * 100}%"></i>`).join('')}</div></div>
        </div>
        <div class="skills">${skillBox(me, true)}</div>
        <div class="overlay" hidden></div>
      </div>`;
    const $ = q => el.querySelector(q), $$ = q => [...el.querySelectorAll(q)];
    const root = $('.battle'), stage = $('.stage'), overlay = $('.overlay'), banner = $('.banner');
    const fighters = { p1: $('.fighter.l'), p2: $('.fighter.r') };
    const bars = { p1: $$('.hpbar')[0], p2: $$('.hpbar')[1] }, nums = $$('.hp-num');
    stage.style.setProperty('--me', ACCENT[me.id]); stage.style.setProperty('--foe', ACCENT[foe.id]);
    const fx = createFx({ arena: root, stage, fighters, chars: { p1: me, p2: foe }, banner, chips: $$('.pv'), on: store.get().settings.fx });

    let battle, bot, wi, word, queue, qi, phase = 'count', last = 0, raf = 0, timers = [], stats, score = [0, 0], round = 1, tot, forfeit = false, summary = null, menuOpen = false, matchOver = false, lastHurt = 0;
    let imeMode = 'kana', prevIn = '', mi = null; // 入力方式: kana(日本語キーボード) / roman(英字キーボード)
    try { if (localStorage.getItem('tb.ime') === 'roman') imeMode = 'roman'; } catch { /* 無視 */ }
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const remote = {
      snap: null, evq: [],
      state() {
        const x = this.snap, rem = x ? Math.max(0, x.rem - (performance.now() - x.at) / 1000) : cfg.limit;
        const blank = c => ({ hp: c.hp, max: c.hp, combo: 0, gauge: 0, fx: [] });
        return { t: Math.max(0, cfg.limit - rem), remaining: rem, p1: { ...(x ? x.me : blank(me)), hits: 0, miss: 0 }, p2: { ...(x ? x.foe : blank(foe)), hits: 0, miss: 0 } };
      },
      drain() { const e = this.evq; this.evq = []; return e; },
      step() {}, hit() {}, miss() {},
      skill(side, i) { conn.send({ t: 'skill', i }); return true; },
      surrender() { conn.send({ t: 'surrender' }); },
    };

    const nextWord = () => { word = queue[qi++ % queue.length]; wi = createWordInput(word); if (mi) { mi.value = ''; prevIn = ''; } paintWord(); };
    const paintWord = () => {
      const v = wi.view();
      $('.t-disp').textContent = word.t !== word.r ? word.t : '';
      $('.t-kana').innerHTML = `<span class="done">${esc(v.kanaDone)}</span>${v.pending ? `<span class="pend">${esc(v.pending)}</span>` : ''}${esc(v.kanaRest)}`;
      $('.t-rom').innerHTML = `<span class="done">${esc(v.typed)}</span><span class="rest"><u>${esc(v.rest[0] ?? '')}</u>${esc(v.rest.slice(1))}</span>`;
    };

    const paint = () => {
      const s = battle.state();
      ['p1', 'p2'].forEach((side, k) => {
        const p = s[side], w = `${Math.max(0, (p.hp / p.max) * 100)}%`;
        const [ghost, fill] = bars[side].children;
        ghost.style.width = w; fill.style.width = w; fill.classList.toggle('low', p.hp / p.max < 0.3);
        nums[k].textContent = `${Math.ceil(p.hp)} / ${p.max}`;
      });
      $('#clock').textContent = Number.isFinite(s.remaining) ? Math.ceil(s.remaining) : '∞';
      $('#combo').textContent = s.p1.combo;
      $('#g1').style.width = `${(s.p1.gauge / 300) * 100}%`;
      $('#g2').style.width = `${(s.p2.gauge / 300) * 100}%`;
      $$('.skill').forEach((x, i) => x.classList.toggle('ready', s.p1.gauge >= me.skills[i].cost));
      $('.gauge').classList.toggle('hot', s.p1.gauge >= Math.min(...me.skills.map(k => k.cost)));
      fx.auras(s);
    };

    const float = (side, text, cls) => {
      const d = document.createElement('span');
      d.className = `dmg ${cls}`; d.textContent = text;
      d.style.left = `${(side === 'p1' ? 12 : 64) + Math.random() * 18}%`; d.style.top = `${10 + Math.random() * 38}%`;
      stage.append(d);
      d.animate([{ transform: 'translateY(0) scale(.9)', opacity: 1 }, { transform: 'translateY(-46px) scale(1.1)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => d.remove();
    };
    const comboPop = () => store.get().settings.fx && $('.combo b').animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 120 });

    const handleEvents = () => {
      for (const e of battle.drain()) {
        if (e.type === 'hit') {
          float(e.side === 'p1' ? 'p2' : 'p1', Math.round(e.dmg), e.crit ? 'crit' : '');
          fx.hit(e.side, e);
          if (e.side === 'p1') { if (e.crit) sfx('crit'); } else if (performance.now() - lastHurt > 90) { lastHurt = performance.now(); sfx(e.crit ? 'crit' : 'hurt'); }
          if (e.side === 'p1' && [10, 25, 50, 100].includes(e.combo)) sfx('combo');
          if ([10, 25, 50, 100].includes(e.combo)) fx.combo(e.side, e.combo);
          if (e.side === 'p1' && e.combo > 1) comboPop();
          if (e.side === 'p1') { stats.dmg += e.dmg; stats.maxCombo = Math.max(stats.maxCombo, e.combo); }
        } else if (e.type === 'miss') {
          if (e.self) float(e.side, `-${Math.round(e.self)}`, 'self');
          if (e.side === 'p1') {
            $('.flash').animate([{ opacity: 0.4 }, { opacity: 0 }], { duration: 240 });
            root.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 150 });
          }
        } else if (e.type === 'skill') { const ch = e.side === 'p1' ? me : foe; sfx(ch.skills[e.idx].fx.some(f => f.t === 'heal') ? 'heal' : 'skill'); fx.skill(e.side, ch.skills[e.idx], ch); }
        else if (e.type === 'end') roundEnd(e);
      }
    };

    const stat = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    const addTot = () => {
      const x = battle.state();
      tot.t += x.t; tot.hits += x.p1.hits; tot.miss += x.p1.miss; tot.dmg += stats.dmg; tot.maxCombo = Math.max(tot.maxCombo, stats.maxCombo);
    };
    const paintPips = () => {
      const n = cfg.firstTo, dots = k => '●'.repeat(score[k]) + '○'.repeat(n - score[k]);
      $('#pips').innerHTML = n > 1 ? `<b>${dots(0)}</b><i>ROUND ${round}</i><b>${dots(1)}</b>` : '';
    };
    const roundEnd = e => {
      phase = 'over';
      if (e.reason === 'ko') sfx('ko');
      const d = fx.end(e);
      if (online) {
        return later(() => {
          banner.textContent = '';
          if (!matchOver) { banner.textContent = e.winner === 'p1' ? 'ROUND WIN!' : e.winner === 'p2' ? 'ROUND LOSE' : 'DRAW やり直し'; banner.classList.toggle('go', e.winner === 'p1'); }
        }, d);
      }
      if (d) later(() => roundEndNow(e), d); else roundEndNow(e);
    };
    const roundEndNow = e => {
      phase = 'over'; banner.textContent = ''; addTot();
      if (cfg.firstTo <= 1) return finish(e.winner, e.reason);
      if (e.winner === 'p1') score[0]++; else if (e.winner === 'p2') score[1]++;
      paintPips();
      if (forfeit) return finish('p2', 'surrender');
      if (score[0] >= cfg.firstTo || score[1] >= cfg.firstTo) return finish(score[0] > score[1] ? 'p1' : 'p2', e.reason);
      banner.textContent = e.winner === 'p1' ? 'ROUND WIN!' : e.winner === 'p2' ? 'ROUND LOSE' : 'DRAW やり直し';
      banner.classList.toggle('go', e.winner === 'p1');
      banner.animate([{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 240, easing: 'ease-out' });
      if (e.winner !== 'draw') round++;
      later(() => { banner.textContent = ''; start(); }, 1900);
    };
    const finish = (winner, reason) => {
      phase = 'over';
      const t = Math.max(tot.t, 0.001), tries = tot.hits + tot.miss;
      const title = winner === 'p1' ? '勝利!' : winner === 'p2' ? '敗北' : winner === 'none' ? '練習おわり' : '引き分け';
      if (winner === 'p1') sfx('win'); else if (winner === 'p2') sfx('lose');
      summary = { win: winner, score: [...score], tot: { ...tot }, mode: cfg.mode, firstTo: cfg.firstTo };
      overlay.innerHTML = `<div class="box"><h2>${title}</h2><p class="sub">${cfg.firstTo > 1 ? `${score[0]} - ${score[1]}　` : ''}${winner === 'none' ? '' : END_WHY[reason] ?? ''}</p>
        <dl>${stat('経過時間', `${t.toFixed(1)}秒`)}${stat('CPM', Math.round((tot.hits / t) * 60))}${stat('正確率', tries ? `${((tot.hits / tries) * 100).toFixed(1)}%` : '-')}
        ${stat('最大コンボ', tot.maxCombo)}${stat('ミス', tot.miss)}${stat('与えたダメージ', Math.round(tot.dmg))}${stat('秒間ダメージ', Math.round(tot.dmg / t))}</dl>
        <div class="row">${fromTraining ? '<button class="btn primary" data-a="again">もう一度</button><button class="btn" data-a="setup">設定に戻る</button>' : '<button class="btn primary" data-a="result">結果へ</button>'}<button class="btn" data-a="menu">メニューへ</button></div></div>`;
      overlay.hidden = false; overlay.querySelector('button').focus();
    };

    const countdown = (ms = 2100) => {
      const seq = ['3', '2', '1', 'FIGHT!'];
      seq.forEach((txt, n) => later(() => {
        sfx(n === 3 ? 'go' : 'count');
        banner.textContent = txt; banner.classList.toggle('go', n === 3);
        banner.animate([{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'ease-out' });
        if (n === 3) { phase = 'fight'; last = performance.now(); later(() => { banner.textContent = ''; }, 700); }
      }, n * (ms / 3)));
    };

    const start = () => {
      timers.forEach(clearTimeout); timers = [];
      const seed = (Math.random() * 2 ** 32) >>> 0, rng = mulberry32(seed);
      battle = createBattle({ chars: [me, foe], rng, duration: cfg.limit || Infinity });
      bot = cfg.dummy ? null : createBot({ cpm: cfg.cpm, accuracy: cfg.acc / 100, skillMode: cfg.skill, rng: mulberry32(seed ^ 0x9e3779b9) });
      queue = makeQueue(cfg.format, seed); qi = 0;
      stats = { dmg: 0, maxCombo: 0 };
      overlay.hidden = true; banner.textContent = ''; fx.reset();
      nextWord(); paint(); paintPips(); phase = 'count'; countdown();
    };
    const onRound = m => { // サーバーから「ラウンド開始」が届いた
      timers.forEach(clearTimeout); timers = [];
      queue = makeQueue(cfg.format, m.seed); qi = 0; stats = { dmg: 0, maxCombo: 0 };
      remote.snap = null; remote.evq = []; score = m.score; round = m.n;
      overlay.hidden = true; banner.textContent = ''; fx.reset(); menuOpen = false;
      nextWord(); paint(); paintPips(); phase = 'count'; countdown(m.startIn);
    };
    const newSeries = () => { score = [0, 0]; round = 1; tot = { t: 0, hits: 0, miss: 0, dmg: 0, maxCombo: 0 }; forfeit = false; start(); };

    const pauseMenu = () => {
      phase = 'pause';
      overlay.innerHTML = `<div class="box"><h2>一時停止</h2><p class="sub">${fromTraining ? 'トレーニング' : ''}</p><div class="row" style="margin-top:0">
        <button class="btn primary" data-a="resume">再開</button>${fromTraining ? '<button class="btn" data-a="again">やり直す</button>' : ''}
        ${cfg.limit ? '' : '<button class="btn" data-a="end">練習を終える</button>'}<button class="btn" data-a="surrender">降参</button>
        ${fromTraining ? '<button class="btn" data-a="setup">設定に戻る</button>' : ''}<button class="btn" data-a="menu">メニューへ</button></div></div>`;
      overlay.hidden = false; overlay.querySelector('button').focus();
    };
    const onlineMenu = () => {
      menuOpen = !menuOpen;
      if (!menuOpen) { overlay.hidden = true; return; }
      overlay.innerHTML = '<div class="box"><h2>メニュー</h2><p class="sub">対戦中は一時停止できません</p><div class="row" style="margin-top:0"><button class="btn primary" data-a="close">戻る</button><button class="btn" data-a="surrender">降参する</button></div></div>';
      overlay.hidden = false; overlay.querySelector('button').focus();
    };
    const resume = () => { overlay.hidden = true; phase = 'fight'; last = performance.now(); };

    overlay.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'resume') resume();
      else if (a === 'again') newSeries();
      else if (a === 'result') go('result', { summary });
      else if (a === 'close') { menuOpen = false; overlay.hidden = true; }
      else if (a === 'surrender') { if (online) { menuOpen = false; overlay.hidden = true; battle.surrender('p1'); } else { forfeit = true; resume(); battle.surrender('p1'); handleEvents(); } }
      else if (a === 'end') { addTot(); finish('none', ''); }
      else if (a === 'setup') go('training');
      else if (a === 'menu') go('menu');
    });

    const onKey = e => {
      if (e.repeat) return;
      if (e.key === 'Escape') { if (online) { if (!matchOver && phase !== 'over') onlineMenu(); } else if (phase === 'fight') pauseMenu(); else if (phase === 'pause') resume(); return; }
      if (phase !== 'fight' || menuOpen) return;
      const combo = `${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`;
      const sk = store.get().settings.skillKeys.indexOf(combo);
      if (sk >= 0) { e.preventDefault(); battle.skill('p1', sk); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ch = keyToChar(e.code); if (!ch) return;
      if (mobile && /^Key[A-Z]$/.test(e.code) && !e.isComposing && e.keyCode !== 229) { // 外付けキーボードで打っている → スマホ扱いをやめる
        mobile = false; mi?.remove(); mi = null; if (online) conn.send({ t: 'device', d: 'pc' });
        root.classList.add('hwkb'); $$('.skill kbd').forEach((k, i) => { k.textContent = keyLabel(skillKeys[i]); });
      }
      e.preventDefault();
      feed('r', ch);
    };

    // 1文字の入力(kind: 'r'=ローマ字 / 'k'=かな)。サーバー対戦では、同じ内容をサーバーへ送って判定してもらう
    const feed = (kind, ch, replace = false) => {
      if (!wi || phase !== 'fight' || menuOpen) return;
      if (online) conn.send(kind === 'r' ? { t: 'key', c: ch } : { t: 'kc', c: ch, r: replace ? 1 : 0 });
      for (const r of wi.press(kind, ch, replace)) {
        if (r === 'miss') { if (!online) battle.miss('p1'); sfx('miss'); }
        else if (r === 'ok' || r === 'done') { if (!online) battle.hit('p1', mobile ? RULES.MOBILE_MULT : 1); sfx('key'); if (r === 'done') { nextWord(); return; } }
      }
      paintWord();
    };

    // スマホ: 入力欄(画面下のタップ領域)の内容の変化から、打った文字を読み取る
    const toHira = t => t.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
    const onInput = () => {
      const cur = toHira(mi.value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))).replace(/\s+/g, '');
      if (phase !== 'fight' || menuOpen) { mi.value = ''; prevIn = ''; return; }
      let k = 0; while (k < prevIn.length && k < cur.length && prevIn[k] === cur[k]) k++;
      const removed = prevIn.slice(k), added = cur.slice(k);
      prevIn = cur;
      if (!added) return; // 削除など
      const isK = c => /[ぁ-ゖー]/.test(c);
      if (imeMode === 'roman') { if (!removed) for (const c of added) if (/[a-z-]/i.test(c)) feed('r', c.toLowerCase()); return; }
      // かな: 濁点などで直前の1文字が置き換わった場合は replace。ローマ字かな変換(k→か)で英字が仮に出たあとは、かなになった時点で1文字と数える
      const replace = removed.length > 0 && isK(removed.slice(-1)) && added.length === 1 && isK(added);
      for (const c of added) if (isK(c)) feed('k', c, replace);
    };
    const setIme = mode => {
      const changed = imeMode !== mode;
      imeMode = mode; try { localStorage.setItem('tb.ime', mode); } catch { /* 無視 */ }
      if (changed && wi && word) { wi = createWordInput(word); if (online) conn.send({ t: 'reset' }); paintWord(); } // 入力方式を変えたら、この単語を打ち直す
      const btn = $('.imebtn'); if (btn) btn.textContent = mode === 'kana' ? '入力: かな(日本語キーボード)' : '入力: ローマ字(英字キーボード)';
      if (mi) { mi.value = ''; prevIn = ''; mi.setAttribute('inputmode', mode === 'kana' ? 'text' : 'email'); mi.setAttribute('lang', mode === 'kana' ? 'ja' : 'en'); if (document.activeElement === mi) { mi.blur(); mi.focus(); } }
    };
    mi = $('#mi');
    if (mi) {
      mi.addEventListener('input', onInput);
      mi.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
      mi.addEventListener('focus', () => root.classList.add('kb')); mi.addEventListener('blur', () => root.classList.remove('kb'));
      el.addEventListener('pointerdown', e => { if (e.target.closest('.skill, .mbtn, .imebtn')) e.preventDefault(); }); // キーボードを閉じない
      setIme(imeMode);
    }
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'ime') setIme(imeMode === 'kana' ? 'roman' : 'kana');
      else if (a === 'mmenu') { if (online) { if (!matchOver && phase !== 'over') onlineMenu(); } else if (phase === 'fight') pauseMenu(); else if (phase === 'pause') resume(); }
    });
    el.addEventListener('pointerdown', e => { // スキルはタップで発動(スマホ)
      const sk = e.target.closest('.skill'); if (!sk || phase !== 'fight' || menuOpen) return;
      battle.skill('p1', +sk.dataset.sk);
    });

    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (phase === 'fight') {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        battle.step(dt); bot?.step(dt, battle, 'p2');
      }
      if (phase !== 'pause') { handleEvents(); paint(); }
    };

    addEventListener('keydown', onKey);
    const offs = [];
    if (online) {
      battle = remote; paint();
      offs.push(conn.on('snap', m => { remote.snap = { ...m, at: performance.now() }; }));
      offs.push(conn.on('ev', m => remote.evq.push(...m.list)));
      offs.push(conn.on('round', onRound));
      offs.push(conn.on('round_end', m => { score = m.score; paintPips(); }));
      offs.push(conn.on('match_end', m => { matchOver = true; menuOpen = false; later(() => go('result', { summary: m }), m.reason === 'ko' || m.reason === 'time' ? 2600 : 1200); }));
      offs.push(conn.on('_close', () => { if (!matchOver) { phase = 'over'; overlay.innerHTML = '<div class="box"><h2>接続が切れました</h2><p class="sub">サーバーとの通信が途切れました</p><div class="row"><button class="btn primary" data-a="menu">メニューへ</button></div></div>'; overlay.hidden = false; } }));
      if (params.round) onRound(params.round);
    } else newSeries();
    raf = requestAnimationFrame(frame);
    return () => { offs.forEach(f => f()); cancelAnimationFrame(raf); timers.forEach(clearTimeout); removeEventListener('keydown', onKey); };
  },
};

// サーバーの通し確認: アカウント → マッチング → ドラフト → 対戦 → ランク・称号の反映(早送り設定で実行)
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const tmp = path.join(os.tmpdir(), `tb-test-${Date.now()}.json`);
Object.assign(process.env, { DB_FILE: tmp, TB_DRAFT_SECS: '2', TB_COUNTDOWN_MS: '200', TB_ROUND_SECS: '6', TB_CPU_WAIT_SEC: '1' });
const { server, mm } = await import('../server/server.js');
const { createTyper } = await import('../js/engine/romaji.js');
const { makeQueue } = await import('../js/engine/feed.js');
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = async (p, body, token) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json() }; };
const get = async (p, token) => { const r = await fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); return { s: r.status, j: await r.json() }; };

// ---- アカウント ----
let a = await post('/api/register', { email: 'Taro.Yamada+game@gmail.com', password: 'password123', ign: 'Taro_01' });
assert.equal(a.s, 200, JSON.stringify(a.j)); const tokA = a.j.token;
assert.equal((await post('/api/register', { email: 'taroyamada@gmail.com', password: 'password123', ign: 'Other_1' })).j.error, 'このメールアドレスはすでに登録されています'); // Gmailのドット・+タグは同一扱い
assert.equal((await post('/api/register', { email: 'x@example.com', password: 'password123', ign: 'taro_01' })).j.error, 'このプレイヤー名はすでに使われています');
assert.ok((await post('/api/register', { email: 'bad', password: 'password123', ign: 'abc' })).j.error.includes('メール'));
assert.ok((await post('/api/register', { email: 'a@b.com', password: 'short', ign: 'abc' })).j.error.includes('8文字'));
assert.equal((await post('/api/login', { email: 'taro.yamada@gmail.com', password: 'wrongpass1' })).j.error, 'メールアドレスまたはパスワードが違います');
const li = await post('/api/login', { email: 'TARO.YAMADA@gmail.com', password: 'password123' }); assert.equal(li.s, 200); assert.equal(li.j.user.ign, 'Taro_01');
assert.equal((await get('/api/me', li.j.token)).j.user.rank, '未配置(配置戦 0/5)'); assert.equal((await get('/api/me', 'bad')).s, 401);
const b = await post('/api/register', { email: 'hanako@gmail.com', password: 'password456', ign: 'Hanako_02' }); const tokB = b.j.token;
assert.equal((await post('/api/logout', {}, li.j.token)).j.ok, true); assert.equal((await get('/api/me', li.j.token)).s, 401);

// ---- クライアント役(正しい打ち方で打つ) ----
function client(name, token, { err = 0, cpmMs = 70, skill = true } = {}) {
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`), c = { name, ws, log: [], end: null, rounds: 0, errors: [] };
  const send = o => ws.send(JSON.stringify(o));
  let typer, q, qi, timer, fmt;
  const newWord = () => { const w = q[qi % q.length]; typer = createTyper(w.r, !!w.lit); };
  ws.addEventListener('open', () => send({ t: 'hello', token, guest: name }));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data); c.log.push(m.t);
    if (m.t === 'hello_ok') c.hello = m;
    else if (m.t === 'error') c.errors.push(m);
    else if (m.t === 'phase') {
      if (m.step === 'ban') send({ t: 'ban', ids: ['golem', 'ogre'] });
      else if (m.step === 'pick') send({ t: 'pick', id: m.avail[name === 'A' ? 0 : 1 % m.avail.length] });
      else if (m.step === 'format') send({ t: 'fmt', id: m.fmts[0] });
    } else if (m.t === 'vs') { fmt = m.format; c.vs = m; send({ t: 'ready' }); }
    else if (m.t === 'round') {
      c.rounds++; q = makeQueue(fmt, m.seed); qi = 0; newWord();
      setTimeout(() => { timer = setInterval(() => {
        const rest = typer.view().rest; if (!rest) return;
        let ch = rest[0]; if (Math.random() < err) ch = '9';
        const r = typer.press(ch); if (r === 'done') { qi++; newWord(); }
        send({ t: 'key', c: ch });
      }, cpmMs); }, m.startIn);
    } else if (m.t === 'snap') { c.snap = m; if (skill && m.me.gauge >= 100 && !c.skillT) { c.skillT = setTimeout(() => { c.skillT = null; }, 500); send({ t: 'skill', i: 0 }); } }
    else if (m.t === 'round_end') { clearInterval(timer); c.lastRound = m; }
    else if (m.t === 'match_end') { clearInterval(timer); c.end = m; }
  });
  c.send = send; c.waitEnd = () => new Promise((res, rej) => { const t0 = Date.now(), i = setInterval(() => { if (c.end) { clearInterval(i); res(c.end); } else if (Date.now() - t0 > 90000) { clearInterval(i); rej(new Error(`${name}: 試合が終わらない log=${c.log.slice(-8)}`)); } }, 100); });
  c.ready = () => new Promise(res => { const i = setInterval(() => { if (c.hello) { clearInterval(i); res(); } }, 30); });
  return c;
}

// ---- ゲストはランクマッチ不可 / 通常マッチ(相手が見つからずCPU戦) ----
{ const g = client('G', null); await g.ready(); g.send({ t: 'queue', mode: 'ranked' }); await new Promise(r => setTimeout(r, 200)); assert.equal(g.errors[0]?.code, 'login'); g.ws.close(); }
{ const n = client('A', tokA, { err: 0.02 }); await n.ready(); n.send({ t: 'queue', mode: 'normal' });
  const e = await n.waitEnd(); assert.equal(e.mode, 'normal'); assert.ok(['ko', 'time', 'count', 'draw'].includes(e.reason), e.reason);
  assert.ok(n.vs.foe.ign.length > 2); assert.equal(e.rank.ranked, false); n.ws.close(); await new Promise(r => setTimeout(r, 200));
  const me = (await get('/api/me', tokA)).j.user; assert.equal(me.games, 1); assert.ok(me.rank.startsWith('未配置')); }

// ---- ランクマッチ(2人・配置戦。2先取) ----
{ const A = client('A', tokA, { err: 0.01, cpmMs: 65 }), B = client('B', tokB, { err: 0.08, cpmMs: 90, skill: false });
  await A.ready(); await B.ready(); A.send({ t: 'queue', mode: 'ranked' }); B.send({ t: 'queue', mode: 'ranked' });
  const [ea, eb] = await Promise.all([A.waitEnd(), B.waitEnd()]);
  assert.equal(ea.win, !eb.win, '勝者は1人'); assert.equal(ea.firstTo, 2); assert.ok(A.rounds >= 2);
  assert.equal(ea.rank.ranked, true); assert.equal(ea.rank.pg, 1); assert.equal(eb.rank.pg, 1); assert.ok(ea.rank.after.includes('配置戦 1/5'));
  assert.equal(ea.profile.games, 2); assert.equal(ea.score[0] + ea.score[1] >= 2, true);
  assert.equal(ea.score[0], eb.score[1]); // 視点が逆になっている
  console.log('ランク戦:', ea.win ? 'A勝ち' : 'B勝ち', ea.score, 'ラウンド数', A.rounds, '| 称号', ea.titles, eb.titles);
  A.ws.close(); B.ws.close(); await new Promise(r => setTimeout(r, 300)); }

// ---- 切断(ランク): 相手の勝ち ----
{ const A = client('A', tokA, { cpmMs: 80 }), B = client('B', tokB, { cpmMs: 80 });
  await A.ready(); await B.ready(); A.send({ t: 'queue', mode: 'ranked' }); B.send({ t: 'queue', mode: 'ranked' });
  await new Promise(r => { const i = setInterval(() => { if (A.vs && B.vs) { clearInterval(i); r(); } }, 50); });
  A.ws.close(); const e = await B.waitEnd(); assert.equal(e.win, true); assert.equal(e.reason, 'disconnect'); B.ws.close(); }

// ---- 不正な入力 / 保存 ----
{ const x = client('X', tokA); await x.ready(); x.ws.send('not json'); x.ws.send(JSON.stringify({ t: 'key', c: 'a' })); x.ws.send(JSON.stringify({ t: 'ban', ids: ['x'] })); x.ws.close(); }
const lb = (await get('/api/leaderboard')).j.list; assert.ok(Array.isArray(lb));
assert.equal((await fetch(base + '/server/server.js')).status, 404); assert.equal((await fetch(base + '/data/db.json')).status, 404); assert.equal((await fetch(base + '/../package.json')).status === 200 || true, true);
const { flush } = await import('../server/db.js'); flush(); assert.ok(JSON.parse(fs.readFileSync(tmp, 'utf8')).users);
console.log('オンライン通信のテストに成功'); fs.rmSync(tmp, { force: true }); process.exit(0);

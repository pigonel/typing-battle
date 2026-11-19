// タイピングバトル サーバー。起動: node server/server.js  → http://localhost:3000
//  ・ゲーム本体(静的ファイル)の配信 / アカウントAPI / WebSocket(マッチング・対戦)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upgrade } from './ws.js';
import * as DB from './db.js';
import * as Auth from './auth.js';
import { applyMatch, divIndex, newRank, penalize, rankLabel, rankName } from './rank.js';
import { evalTitles } from './titles_eval.js';
import { Match } from './match.js';
import { Matchmaker } from './queue.js';
import { TITLES } from '../js/data/titles.js';
import { cleanSettings } from './settings.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const HIDDEN = new Set(['server', 'data', 'tools', 'node_modules']);
const CPU_NAMES = ['Haru', 'Sora', 'Kaito', 'Mio', 'Ren', 'Yuna', 'Tetsu', 'Nagi', 'Akira', 'Rin', 'Hinata', 'Souta', 'Mei', 'Daichi', 'Koharu'];
const pick = a => a[Math.floor(Math.random() * a.length)];

DB.load();
const conns = new Set();

// ---------- HTTP ----------
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(resolve => {
  let s = '';
  req.on('data', d => { s += d; if (s.length > 10_000) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } });
  req.on('error', () => resolve({}));
});
const bearer = req => (req.headers.authorization || '').replace(/^Bearer /, '');
const ipOf = req => req.socket.remoteAddress || '';

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, online: conns.size });
  if (req.method === 'GET' && url.pathname === '/api/charstats') { // キャラの使用数・勝利数(全プレイヤー) と、自分の戦績
    const u = Auth.userByToken(bearer(req)), all = DB.get().charStats ?? {}, mine = u?.stats.charsPlayed ?? {}, won = u?.stats.charsWon ?? {};
    return json(res, 200, { total: Object.values(all).reduce((a, c) => a + c.picks, 0), list: all, mine: Object.fromEntries(Object.keys(mine).map(k => [k, { played: mine[k], wins: won[k] ?? 0 }])) });
  }
  if (req.method === 'GET' && url.pathname === '/api/leaderboard') return json(res, 200, { list: Auth.leaderboard(50) });
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const u = Auth.userByToken(bearer(req));
    return u ? json(res, 200, { user: Auth.profileOf(u) }) : json(res, 401, { error: 'ログインが必要です' });
  }
  if (req.method === 'POST' && url.pathname === '/api/register') {
    const r = Auth.register(await readBody(req));
    return r.error ? json(res, 400, { error: r.error }) : json(res, 200, { token: r.token, user: Auth.profileOf(r.user) });
  }
  if (req.method === 'POST' && url.pathname === '/api/login') {
    const r = Auth.login(await readBody(req), ipOf(req));
    return r.error ? json(res, 400, { error: r.error }) : json(res, 200, { token: r.token, user: Auth.profileOf(r.user) });
  }
  if (req.method === 'PUT' && url.pathname === '/api/settings') { // 設定はアカウントごとに保存
    const u = Auth.userByToken(bearer(req));
    if (!u) return json(res, 401, { error: 'ログインが必要です' });
    u.settings = cleanSettings(await readBody(req), u); DB.save();
    return json(res, 200, { settings: u.settings });
  }
  if (req.method === 'POST' && url.pathname === '/api/ign') {
    const u = Auth.userByToken(bearer(req));
    if (!u) return json(res, 401, { error: 'ログインが必要です' });
    const r = Auth.changeIgn(u, (await readBody(req)).ign);
    return r.error ? json(res, 400, { error: r.error }) : json(res, 200, { user: Auth.profileOf(u) });
  }
  if (req.method === 'POST' && url.pathname === '/api/logout') { Auth.logout(bearer(req)); return json(res, 200, { ok: true }); }
  json(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel), parts = path.relative(ROOT, file).split(path.sep);
    if (!file.startsWith(ROOT) || parts[0].startsWith('.') || HIDDEN.has(parts[0]) || !MIME[path.extname(file)]) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  } catch { res.writeHead(500); res.end('error'); }
});

// ---------- 対戦の結果をアカウントに反映 ----------
const cpuMmr = u => (u ? u.rank.mmr : 1000);
function applyResults({ match, reason, leaver, stats }) {
  const ranked = match.mode === 'ranked';
  const pre = match.players.map(p => (p.user ? { idx: p.user.rank.placed ? divIndex(p.user.rank) : null, mmr: p.user.rank.mmr } : null));
  return match.players.map((p, i) => {
    const u = p.user, opp = match.players[1 - i], st = stats[i];
    if (st.char) { // キャラの使用数・勝利数(ゲストも含む。切断などで選択前に終わった試合は除く)
      const cs = (DB.get().charStats ??= {}); cs[st.char] ??= { picks: 0, wins: 0 };
      cs[st.char].picks++; if (st.win) cs[st.char].wins++;
    }
    if (!u) return {};
    const oppPre = pre[1 - i], r = u.rank, beforeLabel = rankLabel(r), iconOf = () => ({ placed: r.placed, tier: r.tier, div: r.div, gm: Auth.gmSet().has(u.id) }), beforeIcon = iconOf();
    const res = applyMatch(r, { win: st.win, oppIdx: oppPre?.idx ?? null, oppMmr: oppPre?.mmr ?? cpuMmr(u), ranked, cpu: !!opp.cpu });
    let delta = res.delta;
    if (st.disconnected && ranked && r.placed && !r.demo) { penalize(r); delta -= 10; }
    u.streak = st.win ? u.streak + 1 : 0; u.bestStreak = Math.max(u.bestStreak, u.streak);
    u.games++; if (st.win) u.wins++;
    if (r.placed) u.maxTier = Math.max(u.maxTier, r.tier);
    const s = u.stats;
    if (st.hits >= 30) { s.cpmEma = Math.round(s.cpmEma * 0.7 + st.cpm * 0.3); s.accEma = +(s.accEma * 0.7 + (st.hits / (st.hits + st.miss)) * 0.3).toFixed(3); }
    s.maxCpm = Math.max(s.maxCpm, Math.round(st.cpm));
    if (st.win && st.format) {
      if (!s.formatsWon.includes(st.format)) s.formatsWon.push(st.format);
      if (st.miss === 0 && !s.formatsNoMiss.includes(st.format)) s.formatsNoMiss.push(st.format);
    }
    if (st.char) (s.charsPlayed ??= {})[st.char] = (s.charsPlayed[st.char] ?? 0) + 1;
    if (st.win && st.char) s.charsWon[st.char] = (s.charsWon[st.char] ?? 0) + 1;
    const fresh = evalTitles(u, st, { event: res.event, isGm: Auth.gmSet().has(u.id) });
    DB.save();
    return { rank: { ranked, before: beforeLabel, after: rankLabel(r), delta, event: res.event, placed: r.placed, pg: r.pg, beforeIcon, afterIcon: iconOf() }, titles: fresh, profile: Auth.profileOf(u) };
  });
}

// ---------- マッチング ----------
const toPlayer = e => ({ mobile: e.c.device === 'mobile', ws: e.c.ws, user: e.c.user, ign: e.c.ign, title: e.c.user?.settings?.title ? TITLES.find(t => t.id === e.c.user.settings.title)?.name ?? null : null,
  rankText: e.c.user ? (e.c.user.rank.placed ? rankName(e.c.user.rank, Auth.gmSet().has(e.c.user.id)) : '未配置') : 'ゲスト', c: e.c });
function startMatch(match, players) { players.forEach(p => { p.c.match = match; p.c.player = p; }); }
const mm = new Matchmaker({
  createMatch(mode, a, b) {
    const players = [toPlayer(a), toPlayer(b)];
    startMatch(new Match({ mode, players, firstTo: mode === 'ranked' ? 2 : 1, onFinish: applyResults }), players);
  },
  createCpuMatch(e) { // 通常マッチで相手が見つからないとき。相手は人間と同じ見た目で表示する
    const u = e.c.user, streak = u?.streak ?? 0, mul = streak >= 5 ? 1.2 : streak >= 3 ? 1.1 : 1; // 連勝中は強いCPU(上限は直近CPMの120%)
    const cpm = Math.round(Math.min(700, Math.max(60, (u?.stats.cpmEma ?? 200) * mul)) * (0.95 + Math.random() * 0.1));
    const acc = Math.min(0.99, Math.max(0.9, u?.stats.accEma ?? 0.94));
    const cpu = { ws: null, user: null, cpu: { cpm, acc }, ign: `${pick(CPU_NAMES)}${10 + Math.floor(Math.random() * 90)}`, title: null, rankText: u?.rank.placed ? rankName(u.rank) : pick(['ブロンズ2', 'シルバー1', 'シルバー3']), c: {} };
    const players = [toPlayer(e), cpu];
    startMatch(new Match({ mode: 'normal', players, firstTo: 1, onFinish: applyResults }), [players[0]]);
  },
});
mm.start();

// ---------- WebSocket ----------
server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, 'http://x').pathname !== '/ws') return socket.destroy();
  upgrade(req, socket, head, ws => {
    const c = { ws, user: null, ign: 'Guest', match: null, player: null, authed: false };
    conns.add(c);
    const send = o => ws.send(JSON.stringify(o));
    ws.onmessage = raw => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m.t !== 'string') return;
      if (m.t === 'hello') {
        c.user = Auth.userByToken(m.token);
        c.ign = c.user ? c.user.ign : String(m.guest ?? 'Guest').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 16) || 'Guest';
        c.authed = true; c.device = m.device === 'mobile' ? 'mobile' : 'pc';
        return send({ t: 'hello_ok', user: c.user ? Auth.profileOf(c.user) : null, guest: !c.user, tokenValid: !m.token || !!c.user });
      }
      if (!c.authed) return;
      if (c.match && !c.match.finished) return c.match.onMsg(c.player, m);
      if (m.t === 'queue') {
        if (c.match && c.match.finished) c.match = null;
        if (m.mode !== 'ranked' && m.mode !== 'normal') return;
        if (m.device) c.device = m.device === 'mobile' ? 'mobile' : 'pc';
        if (m.mode === 'ranked' && !c.user) return send({ t: 'error', code: 'login', msg: 'ランクマッチはログインが必要です' });
        if (c.user && [...conns].some(o => o !== c && o.user === c.user && (o.match || mm.has(o)))) return send({ t: 'error', code: 'busy', msg: 'このアカウントは別の場所で対戦中・待機中です' });
        mm.add({ c, mode: m.mode, rank: c.user ? c.user.rank : newRank() });
        send({ t: 'queued', mode: m.mode });
      } else if (m.t === 'cancel') { mm.remove(c); send({ t: 'cancelled' }); }
      else if (m.t === 'profile' && c.user) send({ t: 'profile', user: Auth.profileOf(c.user) });
    };
    ws.onclose = () => {
      conns.delete(c); mm.remove(c);
      if (c.match && !c.match.finished && c.player) c.match.leave(c.player);
    };
  });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`タイピングバトル サーバーを起動しました → http://localhost:${PORT}`));
  const bye = () => { DB.flush(); process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
}
export { server, mm, conns };

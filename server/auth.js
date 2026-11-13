// アカウント(メール+パスワード)。Gmailなど任意のメールアドレスで登録できる
import crypto from 'node:crypto';
import { get, save } from './db.js';
import { newRank, rankLabel, rankName, rankValue, grandMasters } from './rank.js';

export const IGN_RE = /^[A-Za-z0-9_.-]{3,16}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const NG = ['fuck', 'shit', 'admin', 'moderator', 'nigger'];
const DAYS30 = 30 * 24 * 3600 * 1000;

// Gmailは「ドット」と「+タグ」を無視して同じアカウントとして扱う(重複登録の防止)
export function normEmail(e) {
  let [l, d] = e.trim().toLowerCase().split('@');
  if (d === 'googlemail.com') d = 'gmail.com';
  if (d === 'gmail.com') l = l.split('+')[0].replace(/\./g, '');
  return `${l}@${d}`;
}
export function validate({ email = '', password = '', ign = '' }, register) {
  if (!EMAIL_RE.test(email.trim())) return 'メールアドレスの形式が正しくありません';
  if (register && !IGN_RE.test(ign)) return 'プレイヤー名は3〜16文字の英数字と _ - . だけ使えます';
  if (register && NG.some(w => ign.toLowerCase().includes(w))) return 'このプレイヤー名は使えません';
  if (typeof password !== 'string' || password.length < 8 || password.length > 100) return 'パスワードは8文字以上にしてください';
  return '';
}
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

const fails = new Map(); // ログイン失敗の回数制限(メール+IP単位)
const throttled = key => { const f = fails.get(key); return f && f.n >= 8 && Date.now() - f.t < 10 * 60 * 1000; };
const noteFail = key => { const f = fails.get(key); fails.set(key, { n: (f && Date.now() - f.t < 10 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() }); };

export function register({ email, password, ign }) {
  const err = validate({ email, password, ign }, true);
  if (err) return { error: err };
  const db = get(), ne = normEmail(email);
  if (db.emails[ne]) return { error: 'このメールアドレスはすでに登録されています' };
  if (db.igns[ign.toLowerCase()]) return { error: 'このプレイヤー名はすでに使われています' };
  const salt = crypto.randomBytes(16).toString('hex'), id = crypto.randomUUID();
  db.users[id] = {
    id, email: email.trim(), ign, salt, hash: hashPw(password, salt), created: Date.now(), seasonId: db.season.id,
    rank: newRank(), streak: 0, bestStreak: 0, wins: 0, games: 0, maxTier: 0, titles: [],
    stats: { maxCpm: 0, cpmEma: 200, accEma: 0.94, formatsWon: [], formatsNoMiss: [], charsWon: {} },
  };
  db.emails[ne] = id; db.igns[ign.toLowerCase()] = id;
  save();
  return { user: db.users[id], token: newToken(id) };
}
export function login({ email, password }, ip = '') {
  const err = validate({ email, password }, false);
  if (err) return { error: err };
  const key = `${normEmail(email)}|${ip}`;
  if (throttled(key)) return { error: '試行回数が多すぎます。10分ほど待ってからお試しください' };
  const db = get(), u = db.users[db.emails[normEmail(email)]];
  const ok = u && crypto.timingSafeEqual(Buffer.from(hashPw(password, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) { noteFail(key); return { error: 'メールアドレスまたはパスワードが違います' }; }
  fails.delete(key);
  return { user: u, token: newToken(u.id) };
}
function newToken(uid) {
  const db = get(), token = crypto.randomBytes(32).toString('hex'), now = Date.now();
  for (const [h, s] of Object.entries(db.sessions)) if (s.exp < now) delete db.sessions[h]; // 期限切れを掃除
  db.sessions[sha(token)] = { uid, exp: now + DAYS30 };
  save();
  return token;
}
export function userByToken(token) {
  if (!token) return null;
  const db = get(), s = db.sessions[sha(token)];
  return s && s.exp > Date.now() ? db.users[s.uid] ?? null : null;
}
export function logout(token) { if (token) { delete get().sessions[sha(token)]; save(); } }

let gmCache = { t: 0, set: new Set() };
export function gmSet() {
  if (Date.now() - gmCache.t > 5000) gmCache = { t: Date.now(), set: grandMasters(Object.values(get().users).map(u => ({ id: u.id, r: u.rank }))) };
  return gmCache.set;
}
// クライアントへ渡す公開情報(パスワード等は含めない)
export function profileOf(u) {
  const gm = gmSet().has(u.id);
  return { ign: u.ign, email: u.email, rank: rankLabel(u.rank, gm), rankName: rankName(u.rank, gm), placed: u.rank.placed, lp: u.rank.lp, demo: u.rank.demo, pg: u.rank.pg,
    streak: u.streak, bestStreak: u.bestStreak, wins: u.wins, games: u.games, titles: u.titles, gm, equipped: u.equipped ?? null };
}
export function leaderboard(n = 50) {
  const gm = gmSet();
  return Object.values(get().users).filter(u => u.rank.placed).sort((a, b) => rankValue(b.rank) - rankValue(a.rank)).slice(0, n)
    .map(u => ({ ign: u.ign, rank: rankName(u.rank, gm.has(u.id)), lp: u.rank.lp, wins: u.wins }));
}

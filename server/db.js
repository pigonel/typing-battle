// 保存先: JSONファイル(小規模向け)。大きくなったらSQLiteやPostgreSQLに置き換える
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = process.env.DB_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'db.json');
let db = { users: {}, emails: {}, igns: {}, sessions: {}, season: { id: 1, startedAt: Date.now() } };
let timer = null;

export function load() { try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* 初回は空 */ } return db; }
export const get = () => db;
export function flush() {
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(db)); fs.renameSync(`${FILE}.tmp`, FILE); }
  catch (e) { console.error('保存に失敗:', e.message); }
}
export function save() { if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 300); }

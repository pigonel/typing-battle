// 出題の順番。同じ種(seed)なら、サーバーとクライアントで同じ順に出る
import { WORDS } from '../data/words.js';
import { shuffled, mulberry32 } from './rng.js';
export const makeQueue = (format, seed) => shuffled(WORDS[format], mulberry32((seed ^ 0x85ebca6b) >>> 0));

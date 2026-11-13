// def=防御カット率, crit=会心率, critMul=会心倍率。passive=常時効果(engine/battle.js が解釈)。スキル効果(fx):
//  burst:相手の最大HPに対する割合ダメージ / heal:HP回復 / buff:効果付与(to:'foe'で相手に) / dot:継続ダメージ
//  gaugeCut:相手のゲージに倍率 / combo:コンボを加算(add)・設定(set)
//  comboStep/comboBonus/comboCap: コンボ何回ごとに、何%ダメージが上がるか / 上限(キャラ固有。省略時は rules.js)
export const CHARACTERS = [
  { id: 'thief', name: 'シーフ', role: '速攻', hp: 1260, atk: 4.00, def: 0.05, crit: 0.15, critMul: 1.6,
    passive: { k: 'opening', sec: 12, v: 1.15, name: '先手必勝', desc: '開始から12秒間、与ダメージ1.15倍' },
    lore: '影から影へ渡り歩く、元・盗賊ギルドの斥候。先手を取れば、誰にも負けない。',
    skills: [
      { name: '連撃', cost: 100, desc: '5秒間、与ダメージ1.75倍', fx: [{ t: 'buff', k: 'dmg', v: 1.75, dur: 5 }] },
      { name: '疾風迅雷', cost: 250, desc: '最大HP8%のダメージ+6秒間、与ダメージ1.45倍', fx: [{ t: 'burst', pct: 0.08 }, { t: 'buff', k: 'dmg', v: 1.45, dur: 6 }] },
    ] },
  { id: 'golem', name: 'ゴーレム', role: '防御', hp: 1700, atk: 2.73, def: 0.15, crit: 0.05, critMul: 1.5,
    passive: { k: 'regen', pct: 0.0010, name: '岩肌の再生', desc: '毎秒、最大HPの0.10%を回復' },
    lore: '古代遺跡を守り続ける岩の巨兵。打たれ強く、傷ついた体も少しずつ再生する。',
    skills: [
      { name: '鉄壁', cost: 100, desc: '5秒間、被ダメージ33%カット', fx: [{ t: 'buff', k: 'shield', v: 0.33, dur: 5 }] },
      { name: '不動', cost: 250, desc: 'HP10%回復+6秒間、被ダメージ28%カット', fx: [{ t: 'heal', pct: 0.10 }, { t: 'buff', k: 'shield', v: 0.28, dur: 6 }] },
    ] },
  { id: 'saint', name: '聖女', role: '回復', hp: 1380, atk: 3.42, def: 0.10, crit: 0.08, critMul: 1.5,
    passive: { k: 'ward', v: 0.05, name: '聖なる加護', desc: '受けるダメージを常に5%カット' },
    lore: '小さな村を救った祈りの乙女。祝福の力で、失敗の痛みもやわらげる。',
    skills: [
      { name: '癒しの舞', cost: 75, desc: 'HPを8%回復', fx: [{ t: 'heal', pct: 0.03 }] },
      { name: '浄化の祈り', cost: 175, desc: 'HP10%回復+8秒間、ミスの自傷を無効', fx: [{ t: 'heal', pct: 0.10 }, { t: 'buff', k: 'guard', v: 1, dur: 8 }] },
    ] },
  { id: 'wolf', name: '雷狼', role: 'クリティカル', hp: 1330, atk: 3.40, def: 0.05, crit: 0.25, critMul: 2.0,
    passive: { k: 'critCombo', per: 10, v: 0.03, cap: 0.15, name: '疾雷', desc: 'コンボ10ごとに会心率+3%(最大+15%)' },
    lore: '嵐の夜に生まれた雷の獣。走るほどに、稲妻が研ぎ澄まされていく。',
    skills: [
      { name: '雷鳴', cost: 100, desc: '6秒間、会心率+40%', fx: [{ t: 'buff', k: 'critUp', v: 0.40, dur: 6 }] },
      { name: '落雷', cost: 250, desc: '相手の最大HP11%のダメージ', fx: [{ t: 'burst', pct: 0.11 }] },
    ] },
  { id: 'witch', name: '魔女', role: '持続妨害', hp: 1470, atk: 3.36, def: 0.10, crit: 0.10, critMul: 1.5,
    passive: { k: 'lifesteal', v: 0.06, name: '吸命', desc: '与えたダメージの6%をHPとして吸収' },
    lore: '毒と呪いを操る森の魔女。傷つけた分だけ、その命を吸い取っていく。',
    skills: [
      { name: '毒針', cost: 125, desc: '8秒間、相手に毎秒最大HP1.0%の継続ダメージ', fx: [{ t: 'dot', pct: 0.010, dur: 8 }] },
      { name: '霧隠れ', cost: 200, desc: '8秒間、相手の与ダメージ0.62倍', fx: [{ t: 'buff', k: 'atkDown', v: 0.62, dur: 8, to: 'foe' }] },
    ] },
  { id: 'ogre', name: 'オーガ', role: '一撃', hp: 1120, atk: 4.61, def: 0.0, crit: 0.10, critMul: 1.5,
    passive: { k: 'rage', hp: 0.3, v: 1.3, name: '窮鼠の怒り', desc: 'HPが30%以下のとき、与ダメージ1.3倍' },
    lore: '怪力自慢の鬼族の戦士。追い詰められるほど、怒りが力に変わる。',
    skills: [
      { name: '剛断', cost: 100, desc: '相手の最大HP10%のダメージ', fx: [{ t: 'burst', pct: 0.10 }] },
      { name: '鬼気', cost: 250, desc: '8秒間、与ダメージ1.55倍', fx: [{ t: 'buff', k: 'dmg', v: 1.55, dur: 8 }] },
    ] },
  { id: 'monk', name: '武闘家', role: 'コンボ', hp: 1400, atk: 3.60, def: 0.08, crit: 0.10, critMul: 1.5, comboCap: 0.45, comboStep: 5, comboBonus: 0.02,
    passive: { k: 'comboLoss', n: 10, name: '不屈の連打', desc: 'ミスしてもコンボは0に戻らず、10減るだけ。さらにコンボが続くほど、ダメージが大きく伸びる(5コンボごとに+3%、最大+75%)' },
    lore: '拳ひとつで旅をする修行僧。倒れても、積み上げた連打の流れは途切れない。',
    skills: [
      { name: '加速', cost: 100, desc: '7秒間、ゲージ獲得2.8倍', fx: [{ t: 'buff', k: 'gaugeMul', v: 2.8, dur: 7 }] },
      { name: '連鎖', cost: 250, desc: 'コンボを+30する', fx: [{ t: 'combo', add: 30 }] },
    ] },
  { id: 'phantom', name: 'ファントム', role: '妨害', hp: 1540, atk: 3.24, def: 0.12, crit: 0.12, critMul: 1.6,
    passive: { k: 'foeGauge', v: 0.85, name: '亡霊の囁き', desc: '相手のスキルゲージ獲得が0.85倍' },
    lore: '古城をさまよう亡霊。囁きひとつで、相手の力の流れを乱してしまう。',
    skills: [
      { name: '封鎖', cost: 125, desc: '相手のスキルゲージを25%まで減らす', fx: [{ t: 'gaugeCut', v: 0.25 }] },
      { name: '寸断', cost: 250, desc: '相手の最大HPの6%のダメージを与え、相手のコンボを0にして、スキルゲージを25%まで減らす。さらに5秒間、相手の与ダメージを0.6倍にする', fx: [{ t: 'burst', pct: 0.06 }, { t: 'gaugeCut', v: 0.25 }, { t: 'combo', set: 0, to: 'foe' }, { t: 'buff', k: 'atkDown', v: 0.6, dur: 5, to: 'foe' }] },
    ] },
];
export const charById = id => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];

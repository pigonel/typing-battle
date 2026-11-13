// バトルの基本数値。調整はここだけ触る
export const RULES = {
  DURATION: 60,          // 1ラウンドの最大秒数
  GAUGE_MAX: 300,        // スキルゲージの最大値(1本を2つのスキルで共有)
  GAUGE_PER_HIT: 1,      // 1打鍵ごとのゲージ加算
  COMBO_GAUGE_FULL: 50,  // このコンボ数で加算量が2倍(上限)
  COMBO_STEP: 10,        // コンボ何回ごとにダメージが上がるか
  COMBO_STEP_BONUS: 0.02,// 1段階あたりのダメージ増加
  COMBO_CAP: 0.30,       // コンボによるダメージ増加の上限
  MISS_SELF_PCT: 0.015,  // ミス時の自傷(最大HPの割合。旧3%→1.5%)
  DEF_CAP: 0.8,          // 防御カット率の上限
};

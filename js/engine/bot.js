// CPU。CPM・正確率・スキルの使い方(none / ready=溜まり次第 / random)で動く
export function createBot({ cpm, accuracy, skillMode = 'ready', rng }) {
  let carry = 0, nextSkill = 0;
  return {
    step(dt, battle, side) {
      carry += (cpm / 60) * dt;
      const n = Math.floor(carry);
      carry -= n;
      for (let k = 0; k < n; k++) (rng() < accuracy ? battle.hit(side) : battle.miss(side));
      if (skillMode === 'ready') { if (battle.skill(side, nextSkill)) nextSkill = 1 - nextSkill; }
      else if (skillMode === 'random' && rng() < 0.03) battle.skill(side, rng() < 0.5 ? 0 : 1);
    },
  };
}

// needs: 'online' = ネット接続が必要 / 'account' = アカウント登録が必要
export const MENU_ITEMS = [
  { id: 'ranked', label: 'ランクマッチ', en: 'ranked', screen: 'matching', mode: 'ranked', needs: ['online', 'account'],
    desc: 'LPをかけた真剣勝負。', points: ['2先取・1ラウンド最大60秒', 'キャラBAN/PICK → 単語形式BAN', '勝敗でLPが増減'] },
  { id: 'normal', label: '通常マッチ', en: 'casual', screen: 'matching', mode: 'normal', needs: ['online'],
    desc: '気軽に遊べる1本勝負。ログイン不要。', points: ['キャラPICK → 単語形式BAN', 'LPは動かない'] },
  { id: 'training', label: 'トレーニング', en: 'training', screen: 'training',
    desc: '敵の強さや動きを自由に設定して練習。', points: ['CPM・正確率・スキルを設定', 'オフラインで遊べる', '戦績・称号には影響しない'] },
  { id: 'titles', label: '称号', en: 'titles', screen: 'titles',
    desc: '獲得した称号を確認して装備。', points: ['装備できるのは1つ', '隠し称号もある'] },
  { id: 'codex', label: 'キャラ図鑑', en: 'fighters', screen: 'codex',
    desc: '全8キャラの性能を確認。', points: ['ステータスとスキル', '使用率・勝率'] },
  { id: 'settings', label: '設定', en: 'options', screen: 'settings',
    desc: '名前・演出・音量・キーの設定。', points: ['スキルキーの変更', 'テーマの切り替え'] },
];

// スマホ(タッチ操作が主)かどうか。URLに ?mobile=1 を付けると、PCでもスマホ扱いにできる(確認用)
const q = s => matchMedia(s).matches;
export const isMobile = () => new URLSearchParams(location.search).has('mobile') || (q('(any-pointer: coarse)') && !q('(any-pointer: fine)'));

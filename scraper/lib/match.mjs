// WAM NET の事業所とハローワークの求人を結び付けるための関数群。
// merge.mjs から使う。ファイルの読み書きをしないので、単体テストできる（web/src/... ではなく web/tests/unit/match.test.ts）。
// 結び付けの規則は web/docs/design.md の4章にまとめている。規則を変えたら、そちらも更新すること。

/** @typedef {Record<string, string>} CsvRow CSV の1行（列名 → 値） */

const nfkc = (s) => (s ?? '').normalize('NFKC');

const KANJI_NUM = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/**
 * 「条」「丁目」の前にある漢数字を算用数字にする。
 * 例：「南七条」→「南7条」、「北十五条」→「北15条」、「二十四軒」はそのまま（後ろが条・丁目ではないため）
 * 住所に出てくる数は小さいので、「十」を1つだけ含む形（十一〜九十九）まで対応すれば足りる。
 * @param {string} s
 * @returns {string}
 */
export const kanjiToNum = (s) =>
  s.replace(/([一二三四五六七八九十]+)(?=条|丁目)/g, (m) => {
    if (!m.includes('十')) return [...m].map((c) => KANJI_NUM[c]).join('');
    const [a, b] = m.split('十');
    return String((a ? KANJI_NUM[a] : 1) * 10 + (b ? KANJI_NUM[b] : 0));
  });

/**
 * 住所を比較用のキーにする。「区＋番地の数字部分」までを残し、建物名・階数を落とす。
 * 例：
 *   「北海道札幌市豊平区月寒西１条１１丁目３番１０号」       → 「豊平区月寒西1条11-3-10」
 *   「北海道札幌市中央区南七条西１丁目２−３ＦＣ南７条３０１」 → 「中央区南7条西1-2-3」
 *   「北海道札幌市南区真駒内上町１丁目３番地　２階」          → 「南区真駒内上町1-3」
 *   「北海道札幌市中央区」（番地なし）                        → 「中央区」
 * @param {string} addr
 * @returns {string}
 */
export function addressKey(addr) {
  // 空白は区切りとして残し（建物名の前で止めるため）、階数は先に落とす。
  // 「3F」は階数だが「2-3FC…」の「3」は番地なので、直前が数字・ハイフンでなく、後ろに英字が続かないものだけを階数とみなす
  let s = kanjiToNum(nfkc(addr)).replace(/\s+/g, ' ').trim().replace(/(?<![\d-])\d+(階|F(?![A-Z]))/gi, '');
  s = s.replace(/^北海道/, '').replace(/^札幌市/, '');
  // ハイフンに見える文字（全角ハイフン・長音記号・マイナスなど）を「-」にそろえる
  s = s.replace(/[‐‑‒–—―−ーｰ－]/g, '-');
  s = s.replace(/丁目|番地|番|の(?=\d)/g, '-').replace(/号/g, '');
  // 「南7条西1-2-3」「月寒西1条11-3-10」のような番地部分まで（後ろの建物名は落とす）
  const m = s.match(/^\D*\d+(?:条[東西南北]*\d*)?(?:-\d+)*/);
  return m ? m[0] : s;
}

/**
 * 事業所名・法人名を比較用にそろえる。法人格（株式会社など）・空白・括弧・記号を除く。
 * 例：「株式会社　Ｓｅｅｄ」→「Seed」、「就労支援事業所「マーム」」→「就労支援事業所マーム」
 * @param {string} s
 * @returns {string}
 */
export const nameKey = (s) =>
  nfkc(s)
    .replace(/株式会社|有限会社|合同会社|一般社団法人|社会福祉法人|特定非営利活動法人|NPO法人|医療法人(社団|財団)?/g, '')
    .replace(/[\s　「」『』()（）・,.、。\-]/g, '');

/**
 * 住所から札幌市の区名を取り出す。札幌市以外や区がない場合は空文字。
 * 例：「北海道札幌市中央区南1条」→「中央区」
 * @param {string} addr
 * @returns {string}
 */
export const ward = (addr) => nfkc(addr).match(/札幌市(.+?区)/)?.[1] ?? '';

/**
 * 2つの住所キー（addressKey の結果）が同じ場所を指すか。
 * 「3-4」と「3-4-1」のように片方が番地まで書いていない場合も、
 * 短い方に数字が2組以上あり、長い方の先頭と区切り位置（-）で一致すれば同じとみなす。
 * 数字を含まないキー（「中央区」だけなど）は、範囲が広すぎるので一致させない。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameAddress(a, b) {
  if (!/\d/.test(a) || !/\d/.test(b)) return false;
  if (a === b) return true;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.split('-').length >= 2 && l.startsWith(s + '-');
}

// 候補が複数あるときの優先順（求人の多い順ではなく、ハローワークに求人を出しやすい順）
const SERVICE_ORDER = ['就労継続支援A型', '就労継続支援B型', '就労移行支援', '就労定着支援', '就労選択支援'];

/**
 * WAM NET の事業所の一覧から、求人を事業所に結び付ける関数を作る。
 * 一覧の各行には、比較用の値（_addr・_name・_service）を書き足す。
 * @param {CsvRow[]} wamRows wam.mjs が作った wam_sapporo.csv の行
 * @returns {(job: CsvRow) => { facility: CsvRow | null, how: string }}
 *   facility … 結び付いた事業所の行（なければ null）、how … 結び付けの確かさ（設計書4章の `match` の値）
 */
export function createMatcher(wamRows) {
  const byCorp = new Map();
  for (const f of wamRows) {
    f._addr = addressKey(f['事業所住所（市区町村）'] + f['事業所住所（番地以降）']);
    f._name = nameKey(f['事業所の名称']);
    f._service = nfkc(f['サービス種別']);
    if (!f['法人番号']) continue;
    if (!byCorp.has(f['法人番号'])) byCorp.set(f['法人番号'], []);
    byCorp.get(f['法人番号']).push(f);
  }

  // 候補が複数あるとき（同じ住所でA型とB型を併設など）は、求人がA型ならA型を、それ以外は SERVICE_ORDER の順で選ぶ
  const pick = (cands, job) => {
    const wantA = job['A型/B型'] === 'A型';
    return [...cands].sort((a, b) => {
      if (wantA && (a._service === '就労継続支援A型') !== (b._service === '就労継続支援A型')) {
        return a._service === '就労継続支援A型' ? -1 : 1;
      }
      return SERVICE_ORDER.indexOf(a._service) - SERVICE_ORDER.indexOf(b._service);
    })[0];
  };

  return function match(job) {
    const addr = addressKey(job['就業場所']);
    const jn = nameKey(job['事業所名']);
    const cands = byCorp.get(job['法人番号']) ?? [];
    // A型の求人がA型以外に結び付いたとき、同じ法人に同じ名前のA型事業所があればそちらにする
    // （多機能型で、A型の方だけ住所が番地まで書かれていない場合など）
    const preferA = (f) =>
      job['A型/B型'] === 'A型' && f._service !== '就労継続支援A型'
        ? (cands.find((c) => c._service === '就労継続支援A型' && c._name === f._name) ?? f)
        : f;

    // 1・2：法人番号が同じ事業所の中から、住所 → 名称の順で探す
    if (cands.length) {
      const byAddr = cands.filter((f) => sameAddress(f._addr, addr));
      if (byAddr.length) return { facility: preferA(pick(byAddr, job)), how: '住所一致' };
      const byName = cands.filter((f) => f._name.length >= 3 && jn.includes(f._name));
      if (byName.length) return { facility: pick(byName, job), how: '名称が近い' };
    }
    // 3：WAM NET 側の法人番号が空欄・誤記の場合に備え、全事業所から住所＋法人名（または事業所名）で探す
    const byAddrName = wamRows.filter((f) => {
      const corp = nameKey(f['法人の名称']);
      return (
        sameAddress(f._addr, addr) &&
        ((corp.length >= 2 && jn.includes(corp)) || (f._name.length >= 3 && jn.includes(f._name)))
      );
    });
    if (byAddrName.length) return { facility: pick(byAddrName, job), how: '住所＋法人名一致（法人番号不一致）' };
    // 4：施設外就労などで就業場所が事業所の住所と違う場合。A型の求人で、法人内のA型事業所が1つだけならそこに結び付ける
    const aInCorp = cands.filter((f) => f._service === '就労継続支援A型');
    if (job['A型/B型'] === 'A型' && aInCorp.length === 1) return { facility: aInCorp[0], how: '法人内で唯一のA型事業所' };
    if (cands.length) return { facility: null, how: '法人のみ一致' };
    return { facility: null, how: job['法人番号'] ? 'なし（法人番号の該当なし）' : 'なし（法人番号なし）' };
  };
}

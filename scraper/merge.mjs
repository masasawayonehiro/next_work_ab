// WAM NETの事業所（メイン）とハローワークの求人を法人番号＋住所／名称で結び付け、3つのCSVを出力する
//   output/facilities.csv … 事業所の一覧（1行=1事業所）。求人件数を追加
//   output/jobs.csv       … 求人の一覧（1行=1求人）。結び付いた事業所のNOと結び付けの確かさを追加
//   output/combined.csv   … 上の2つをまとめたもの（1行=事業所×求人。求人のない事業所・事業所のない求人も含む）
// 使い方: node merge.mjs （先に wam.mjs と scrape.mjs を実行しておく）
// 結び付けの規則そのものは lib/match.mjs にある（テストしやすいよう分けている）
import { readCsv, writeCsv } from './lib/csv.mjs';
import { createMatcher, ward } from './lib/match.mjs';

const wam = readCsv('output/raw/wam_sapporo.csv');
const hw = readCsv('output/raw/hellowork_jobs.csv');
const hwFetchedAt = hw.rows.map((r) => r['取得日時']).sort().at(-1)?.slice(0, 10) ?? '';
const nfkc = (s) => (s ?? '').normalize('NFKC');
const shortService = (s) => nfkc(s).replace('就労継続支援A型', 'A型').replace('就労継続支援B型', 'B型');
const match = createMatcher(wam.rows);

const jobs = hw.rows.map((j) => {
  const { facility, how } = match(j);
  return { ...j, 'WAM事業所NO': facility?.['NO（※システム内の固有の番号、連番）'] ?? '', '結び付け': how, _facility: facility };
});

// ---- facilities.csv ----
const NO = 'NO（※システム内の固有の番号、連番）';
const jobsByFacility = new Map();
for (const j of jobs) {
  if (!j._facility) continue;
  const k = j._facility[NO];
  if (!jobsByFacility.has(k)) jobsByFacility.set(k, []);
  jobsByFacility.get(k).push(j);
}
const wamCols = wam.header.filter((c) => c !== '出典');
const facilities = wam.rows.map((f) => ({ ...f, '区': ward(f['事業所住所（市区町村）']), '求人件数': jobsByFacility.get(f[NO])?.length ?? 0 }));
writeCsv('output/facilities.csv', [...wamCols, '区', '求人件数', '出典'], facilities);

// ---- jobs.csv ----
const jobCols = [...hw.header, 'WAM事業所NO', '結び付け'];
writeCsv('output/jobs.csv', jobCols, jobs);

// ---- combined.csv ----
const JOB_FIELDS = ['職種', '仕事の内容', '賃金', '賃金形態', '就業時間', '休日', '雇用形態', '雇用期間', '週所定労働日数', '加入保険',
  '通勤手当', '求人数', '受付年月日', '紹介期限日', '受理安定所', '求人番号', '求人票URL'];
const wamVersion = wam.rows[0]?.['出典'].match(/\d{4}年\d+月版/)?.[0] ?? '';
const combined = [];
const fromFacility = (f) => ({
  '種別': shortService(f['サービス種別']),
  '区': ward(f['事業所住所（市区町村）']),
  '事業所名': f['事業所の名称'],
  '事業所名かな': f['事業所の名称_かな'],
  '法人名': f['法人の名称'],
  '住所': f['事業所住所（市区町村）'] + f['事業所住所（番地以降）'],
  '電話番号': f['事業所電話番号'],
  '事業所URL': f['事業所URL'],
  '緯度': f['事業所緯度'],
  '経度': f['事業所経度'],
  '定員': f['定員'],
  '利用可能な時間帯（平日）': f['利用可能な時間帯（平日）'],
  '定休日': f['定休日'],
  'WAM事業所NO': f[NO],
  '法人番号': f['法人番号'],
});
for (const f of wam.rows) {
  const fj = jobsByFacility.get(f[NO]) ?? [];
  const base = { ...fromFacility(f), '求人の有無': fj.length ? 'あり' : 'なし', '求人件数': fj.length };
  if (!fj.length) combined.push({ ...base, '結び付け': '' });
  for (const j of fj) combined.push({ ...base, ...Object.fromEntries(JOB_FIELDS.map((k) => [k, j[k]])), '結び付け': j['結び付け'] });
}
// WAM NETの事業所に結び付かなかった求人
for (const j of jobs.filter((x) => !x._facility)) {
  combined.push({
    '種別': j['A型/B型'] === 'A型' ? 'A型（事業所未特定）' : '一般の障害者求人',
    '区': ward(j['就業場所']),
    '事業所名': j['事業所名'],
    '住所': j['就業場所'],
    '法人番号': j['法人番号'],
    '求人の有無': 'あり',
    '求人件数': 1,
    ...Object.fromEntries(JOB_FIELDS.map((k) => [k, j[k]])),
    '結び付け': j['結び付け'],
  });
}
const SOURCE = `障害福祉サービス情報公表システム（WAM NET オープンデータ ${wamVersion}）を加工して作成。求人情報はハローワークインターネットサービスより取得`;
for (const r of combined) {
  r['WAMデータ時点'] = wamVersion;
  r['ハローワーク取得日'] = hwFetchedAt;
  r['出典'] = SOURCE;
}
const combinedCols = ['種別', '区', '事業所名', '事業所名かな', '法人名', '住所', '電話番号', '事業所URL', '定員', '利用可能な時間帯（平日）', '定休日',
  '求人の有無', '求人件数', ...JOB_FIELDS, '結び付け', '緯度', '経度', 'WAM事業所NO', '法人番号', 'WAMデータ時点', 'ハローワーク取得日', '出典'];
writeCsv('output/combined.csv', combinedCols, combined);

// ---- 集計 ----
const count = (arr, key) => arr.reduce((m, x) => ((m[x[key]] = (m[x[key]] ?? 0) + 1), m), {});
console.log(`事業所: ${facilities.length}件（求人あり ${facilities.filter((f) => f['求人件数'] > 0).length}件）`);
console.log(`求人: ${jobs.length}件`, count(jobs, '結び付け'));
console.log(`combined: ${combined.length}行`, count(combined, '種別'));

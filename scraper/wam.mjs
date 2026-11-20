// WAM NETのオープンデータ（訓練系・就労系サービス5種類）から札幌市（全区）の事業所を抜き出す
// 使い方: node wam.mjs [データの版=202609]
// 事前に data/wam/<版>/<番号>/csvdownloadXXX.csv を用意しておく
//   ダウンロード元: https://www.wam.go.jp/content/wamnet/pcpub/top/sfkopendata/
import path from 'node:path';
import { readCsv, writeCsv } from './lib/csv.mjs';

const VERSION = process.argv[2] ?? '202609';
const CITY = '北海道札幌市';
// 訓練系・就労系サービスのうち対象とする5種類（番号はオープンデータのファイル番号）
const SERVICES = { 43: '就労選択支援', 60: '就労移行支援', 45: '就労継続支援A型', 46: '就労継続支援B型', 62: '就労定着支援' };

let header;
const out = [];
for (const [no, name] of Object.entries(SERVICES)) {
  const file = path.join('data', 'wam', VERSION, no, `csvdownload${no.padStart(3, '0')}.csv`);
  const { header: h, rows } = readCsv(file);
  if (!header) header = h;
  else if (h.join() !== header.join()) throw new Error(`${file} の列が他のファイルと異なります`);
  const hits = rows.filter((r) => r['事業所住所（市区町村）'].startsWith(CITY));
  console.log(`${name}: 全国${rows.length}件 / 札幌市${hits.length}件`);
  out.push(...hits);
}

const source = `出典：障害福祉サービス情報公表システム（WAM NET オープンデータ ${VERSION.slice(0, 4)}年${Number(VERSION.slice(4))}月版）`;
for (const r of out) r['出典'] = source;
const dest = path.join('output', 'raw', 'wam_sapporo.csv');
writeCsv(dest, [...header, '出典'], out);
console.log(`\n合計${out.length}件を ${dest} に保存しました`);

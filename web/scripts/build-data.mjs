// scraper/output の CSV をサイト用の JSON（src/data/*.json）に変換する
// 使い方: npm run data （先に scraper で wam.mjs → scrape.mjs → merge.mjs を実行しておく）
// 変換の中身は scripts/lib/convert.mjs にある（テストしやすいよう、ファイルの読み書きと分けている）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCsv } from "../../scraper/lib/csv.mjs";
import { convert } from "./lib/convert.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "..", "scraper", "output");
const dest = path.join(root, "src", "data");

const { facilities, jobs, meta } = convert(
  readCsv(path.join(src, "facilities.csv")).rows,
  readCsv(path.join(src, "jobs.csv")).rows,
);

fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "facilities.json"), JSON.stringify(facilities));
fs.writeFileSync(path.join(dest, "jobs.json"), JSON.stringify(jobs));
fs.writeFileSync(path.join(dest, "meta.json"), JSON.stringify(meta, null, 2));
const kb = (f) => Math.round(fs.statSync(path.join(dest, f)).size / 1024);
console.log(`事業所 ${facilities.length}件 (${kb("facilities.json")}KB) / 求人 ${jobs.length}件 (${kb("jobs.json")}KB)`);
console.log(`WAM NET ${meta.wamVersion} / ハローワーク取得日 ${meta.hwFetchedAt}`);

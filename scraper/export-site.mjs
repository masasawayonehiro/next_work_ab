// 公開サイト用のデータ（site/data・web/public/data の items.js）を書き出す
// 使い方: node export-site.mjs （先に merge.mjs を実行しておく）
// file:// で開いても動くよう、JSONではなく window.NW_DATA = {...} の形のJSとして出力する
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteData } from "./lib/site-items.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const { meta, items } = buildSiteData(root);

const payload = `window.NW_DATA=${JSON.stringify({ meta, items })};\n`;
const outs = [
  path.resolve(root, "../site/data/items.js"),
  // Next.js（web）は public/ 配下を静的配信。ローカル開発・API 未接続時のフォールバック用。
  path.resolve(root, "../web/public/data/items.js"),
];
for (const out of outs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, payload);
  console.log(`${items.length}件 → ${out} (${(fs.statSync(out).size / 1024).toFixed(0)}KB)`);
}

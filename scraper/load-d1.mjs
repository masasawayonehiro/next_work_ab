/**
 * combined.csv + jobs.csv を Cloudflare D1（next-work-sapporo）へ投入する。
 * 毎回スナップショット置換（DELETE → INSERT）。古い求人を残さない。
 *
 * 使い方:
 *   node load-d1.mjs --remote   … 本番 D1
 *   node load-d1.mjs --local    … ローカル .wrangler の D1
 *
 * web/ から: npm run data:d1 / npm run data:d1:local
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildSiteData } from "./lib/site-items.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(root, "../web");
const useRemote = process.argv.includes("--remote");
const useLocal = process.argv.includes("--local");

if (useRemote === useLocal) {
  console.error("使い方: node load-d1.mjs --remote | --local");
  process.exit(1);
}

const { meta, items } = buildSiteData(root);
console.log(`${items.length}件を D1（${useRemote ? "remote" : "local"}）へ投入します…`);

/** SQL 文字列リテラル */
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

const BATCH = 80;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nw-d1-"));
const files = [];

{
  const sql = [
    "DELETE FROM items;",
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('snapshot', ${q(JSON.stringify(meta))});`,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('updatedAt', ${q(new Date().toISOString())});`,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('count', ${q(String(items.length))});`,
  ].join("\n");
  const f = path.join(tmpDir, "00_meta.sql");
  fs.writeFileSync(f, sql);
  files.push(f);
}

for (let i = 0; i < items.length; i += BATCH) {
  const chunk = items.slice(i, i + BATCH);
  const stmts = chunk.map((it) => {
    const hasJob = it.job ? 1 : 0;
    const daysMin = it.job?.daysMin ?? null;
    const emp = it.job?.emp ?? "";
    const wageType = it.job?.wageType ?? "";
    const wamNo = it.wamNo ?? null;
    return (
      "INSERT INTO items (id, type, ward, wam_no, has_job, days_min, emp, wage_type, json) VALUES (" +
      [
        q(it.id),
        q(it.type ?? ""),
        q(it.ward ?? ""),
        wamNo == null || wamNo === "" ? "NULL" : q(wamNo),
        String(hasJob),
        daysMin == null ? "NULL" : String(Number(daysMin)),
        q(emp),
        q(wageType),
        q(JSON.stringify(it)),
      ].join(", ") +
      ");"
    );
  });
  const f = path.join(tmpDir, `items_${String(i).padStart(5, "0")}.sql`);
  fs.writeFileSync(f, stmts.join("\n"));
  files.push(f);
}

function runFile(file) {
  const args = ["wrangler", "d1", "execute", "next-work-sapporo", "--file", file, "--yes"];
  if (useRemote) args.push("--remote");
  else args.push("--local");
  const r = spawnSync("npx", args, {
    cwd: webDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    throw new Error(`wrangler failed on ${path.basename(file)} (exit ${r.status})`);
  }
  process.stdout.write(".");
}

try {
  for (const f of files) runFile(f);
  console.log(`\n完了: ${items.length}件 → D1 (${useRemote ? "remote" : "local"})`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

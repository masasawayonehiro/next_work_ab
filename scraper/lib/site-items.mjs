/**
 * combined.csv + jobs.csv から、画面用の NW_DATA 形（meta + items）を組み立てる。
 * export-site.mjs（静的 JS）と load-d1.mjs（D1 投入）で共有する。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCsv } from "./csv.mjs";

export const WARDS = ["中央区", "北区", "東区", "白石区", "厚別区", "豊平区", "清田区", "南区", "西区", "手稲区"];

const TYPE = {
  A型: "A",
  "A型（事業所未特定）": "A",
  B型: "B",
  就労移行支援: "transition",
  就労定着支援: "retention",
  就労選択支援: "selection",
  一般の障害者求人: "general",
};

const nfkc = (s) => (s ?? "").normalize("NFKC").trim();
const wardOf = (r) => WARDS.find((w) => r["区"] === w) ?? WARDS.find((w) => nfkc(r["住所"]).includes(w)) ?? "";
const num = (s) => {
  const m = nfkc(s)
    .replace(/,/g, "")
    .match(/\d+/);
  return m ? Number(m[0]) : null;
};
const minDays = (s) => {
  const m = nfkc(s).match(/週(\d)日/);
  return m ? Number(m[1]) : null;
};
const wageText = (s) => {
  const m = s.match(/^(.+?)〜(.+)$/);
  return m && m[1] === m[2] ? m[1] : s;
};
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

const defaultScraperRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} [scraperRoot] scraper/ の絶対パス
 * @returns {{ meta: object, items: object[] }}
 */
export function buildSiteData(scraperRoot = defaultScraperRoot) {
  const combined = readCsv(path.join(scraperRoot, "output", "combined.csv")).rows;
  const jobs = readCsv(path.join(scraperRoot, "output", "jobs.csv")).rows;
  return buildSiteDataFromRows(combined, jobs);
}

/**
 * @param {Record<string, string>[]} combinedRows
 * @param {Record<string, string>[]} jobRows
 */
export function buildSiteDataFromRows(combinedRows, jobRows) {
  const jobs = new Map(jobRows.map((j) => [j["求人番号"], j]));
  const items = combinedRows.map((r) => {
    const jobNo = r["求人番号"];
    const j = jobs.get(jobNo) ?? {};
    const job = jobNo
      ? compact({
          no: jobNo,
          title: nfkc(r["職種"]).replace(/^\(障\)\s*/, ""),
          desc: (r["仕事の内容"] ?? "").trim(),
          wage: wageText(r["賃金"] ?? ""),
          wageType: r["賃金形態"],
          wageMin: num(r["賃金"]),
          time: r["就業時間"],
          holiday: r["休日"],
          emp: r["雇用形態"],
          period: r["雇用期間"],
          days: r["週所定労働日数"],
          daysMin: minDays(r["週所定労働日数"]),
          insurance: r["加入保険"],
          commute: r["通勤手当"],
          car: j["マイカー通勤"],
          count: r["求人数"],
          accepted: r["受付年月日"],
          expires: r["紹介期限日"],
          office: r["受理安定所"],
          kind: j["求人区分"],
          place: j["就業場所"],
          station: j["最寄り駅"],
          access: j["駅からの交通手段"],
          trial: j["試用期間"],
          exp: j["必要な経験"],
          license: j["必要な資格"],
          age: j["年齢"],
          business: j["事業内容"]?.trim(),
          notes: j["求人に関する特記事項"]?.trim(),
          url: r["求人票URL"],
        })
      : null;
    return compact({
      id: `${r["WAM事業所NO"] || "hw"}:${jobNo}`,
      type: TYPE[r["種別"]] ?? "general",
      typeLabel: r["種別"],
      ward: wardOf(r),
      name: nfkc(r["事業所名"]).replace(/\s+/g, " "),
      kana: r["事業所名かな"],
      corp: nfkc(r["法人名"]).replace(/\s+/g, " "),
      addr: nfkc(r["住所"]),
      tel: r["電話番号"],
      url: r["事業所URL"],
      cap: num(r["定員"]),
      hours: r["利用可能な時間帯（平日）"],
      closed: r["定休日"],
      jobCount: Number(r["求人件数"]) || 0,
      lat: Number(r["緯度"]) || null,
      lng: Number(r["経度"]) || null,
      wamNo: r["WAM事業所NO"],
      job,
    });
  });

  const meta = {
    wamVersion: combinedRows[0]?.["WAMデータ時点"] ?? "",
    helloworkDate: combinedRows[0]?.["ハローワーク取得日"] ?? "",
    source: combinedRows[0]?.["出典"] ?? "",
    wards: WARDS,
  };

  return { meta, items };
}

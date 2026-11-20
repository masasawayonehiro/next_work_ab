// scraper の CSV の行を、サイト用のデータ（src/lib/data.ts の Facility / Job 型）に変換する関数群。
// ファイルの読み書きはしない（読み書きは scripts/build-data.mjs が行う）ので、そのまま単体・結合テストできる。

/** @typedef {Record<string, string>} CsvRow CSV の1行（列名 → 値） */

/**
 * 表示用の文字列をそろえる。
 * - WAM NET のオープンデータは改行を「（改行）」に置き換えているので、本当の改行に戻す。
 * - 全角英数字（「ｈｉｂｉｎｏ」など）は読みにくいので、NFKC で半角にそろえる（行ごとに行い、改行は残す）。
 * - 行末と全体の前後の空白を取る。
 * @param {string | undefined} s
 * @returns {string}
 */
export const text = (s) =>
  (s ?? "")
    .replace(/（改行）/g, "\n")
    .split("\n")
    .map((line) => line.normalize("NFKC").trimEnd())
    .join("\n")
    .trim();

/**
 * 住所から札幌市の区名を取り出す。例：「北海道札幌市中央区南1条」→「中央区」。見つからなければ空文字。
 * @param {string | undefined} addr
 * @returns {string}
 */
export const ward = (addr) =>
  (addr ?? "")
    .normalize("NFKC")
    .match(/札幌市(.+?区)/)?.[1] ?? "";

/** WAM NET のサービス種別（NFKC 後）→ サイトで使うキー。ここにない種別が来たら変換を止める */
export const SERVICE = {
  就労選択支援: "sentaku",
  就労移行支援: "ikou",
  就労継続支援A型: "a",
  就労継続支援B型: "b",
  就労定着支援: "teichaku",
};

/**
 * 緯度・経度の文字列を数値にする。空・0・数値でないものは null（地図リンクを住所検索に切り替えるため）。
 * @param {string | undefined} s
 * @returns {number | null}
 */
const coord = (s) => {
  const n = Number(s);
  return s && Number.isFinite(n) && n !== 0 ? n : null;
};

/**
 * 定員の文字列を数値にする。空や数値でないものは null。
 * @param {string | undefined} s
 * @returns {number | null}
 */
const capacity = (s) => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};

/**
 * ハローワークの求人の行（merge.mjs が作る jobs.csv）を Job に変換する。
 * @param {CsvRow} j
 */
export function toJob(j) {
  return {
    id: j["求人番号"],
    title: text(j["職種"]),
    description: text(j["仕事の内容"]),
    isA: j["A型/B型"] === "A型",
    employer: text(j["事業所名"]),
    place: text(j["就業場所"]),
    ward: ward(j["就業場所"]),
    wage: text(j["賃金"]),
    wageType: j["賃金形態"] ?? "",
    hours: text(j["就業時間"]),
    holidays: text(j["休日"]),
    employment: j["雇用形態"] ?? "",
    term: j["雇用期間"] ?? "",
    daysPerWeek: j["週所定労働日数"] ?? "",
    insurance: j["加入保険"] ?? "",
    commute: j["通勤手当"] ?? "",
    myCar: j["マイカー通勤"] ?? "",
    station: text(j["最寄り駅"]),
    access: text(j["駅からの交通手段"]),
    trial: text(j["試用期間"]),
    experience: j["必要な経験"] ?? "",
    license: j["必要な資格"] ?? "",
    age: j["年齢"] ?? "",
    business: text(j["事業内容"]),
    notes: text(j["求人に関する特記事項"]),
    openings: j["求人数"] ?? "",
    receivedAt: j["受付年月日"] ?? "",
    expiresAt: j["紹介期限日"] ?? "",
    office: j["受理安定所"] ?? "",
    category: j["求人区分"] ?? "",
    url: j["求人票URL"] ?? "",
    facilityId: j["WAM事業所NO"] || null,
    match: j["結び付け"] ?? "",
  };
}

/**
 * WAM NET の事業所の行（merge.mjs が作る facilities.csv）を Facility に変換する。
 * @param {CsvRow} f
 * @param {string[]} jobIds この事業所に結び付いた求人の求人番号
 */
export function toFacility(f, jobIds) {
  const serviceName = (f["サービス種別"] ?? "").normalize("NFKC").trim();
  const service = SERVICE[serviceName];
  if (!service) throw new Error(`未知のサービス種別: ${f["サービス種別"]}`);
  return {
    id: f["NO（※システム内の固有の番号、連番）"],
    service,
    name: text(f["事業所の名称"]),
    kana: text(f["事業所の名称_かな"]),
    corpName: text(f["法人の名称"]),
    corpNo: f["法人番号"] ?? "",
    ward: f["区"] || ward(f["事業所住所（市区町村）"]),
    address: text((f["事業所住所（市区町村）"] ?? "") + (f["事業所住所（番地以降）"] ?? "")),
    tel: f["事業所電話番号"] ?? "",
    fax: f["事業所FAX番号"] ?? "",
    url: f["事業所URL"] ?? "",
    lat: coord(f["事業所緯度"]),
    lng: coord(f["事業所経度"]),
    hours: {
      weekday: f["利用可能な時間帯（平日）"] ?? "",
      sat: f["利用可能な時間帯（土曜）"] ?? "",
      sun: f["利用可能な時間帯（日曜）"] ?? "",
      holiday: f["利用可能な時間帯（祝日）"] ?? "",
    },
    closed: text(f["定休日"]),
    hoursNote: text(f["利用可能曜日特記事項（留意事項）"]),
    capacity: capacity(f["定員"]),
    jobIds,
  };
}

/**
 * 事業所と求人の CSV の行をまとめて変換し、サイトが読む3つのデータを作る。
 * @param {CsvRow[]} facilityRows facilities.csv の行
 * @param {CsvRow[]} jobRows jobs.csv の行
 * @returns {{ facilities: ReturnType<typeof toFacility>[], jobs: ReturnType<typeof toJob>[], meta: { wamVersion: string, hwFetchedAt: string } }}
 */
export function convert(facilityRows, jobRows) {
  const jobs = jobRows.map(toJob);
  // 事業所ごとに、結び付いた求人の求人番号を集める
  const jobsByFacility = new Map();
  for (const j of jobs) {
    if (!j.facilityId) continue;
    if (!jobsByFacility.has(j.facilityId)) jobsByFacility.set(j.facilityId, []);
    jobsByFacility.get(j.facilityId).push(j.id);
  }
  const facilities = facilityRows.map((f) => toFacility(f, jobsByFacility.get(f["NO（※システム内の固有の番号、連番）"]) ?? []));
  // データの時点：WAM NET は「出典」列の「◯年◯月版」、ハローワークは最も新しい取得日
  const wamVersion = facilityRows[0]?.["出典"]?.match(/\d{4}年\d+月版/)?.[0] ?? "";
  const hwFetchedAt = jobRows.map((r) => r["取得日時"] ?? "").sort().at(-1)?.slice(0, 10) ?? "";
  return { facilities, jobs, meta: { wamVersion, hwFetchedAt } };
}

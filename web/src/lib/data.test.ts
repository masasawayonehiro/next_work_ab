// src/lib/data.ts の単体テスト。
// 実データ（src/data/*.json）を使うが、データ更新で壊れないよう、件数は固定で書かず
// 「全件が条件を満たす」「0件より多い」のように確かめる（テストルール 4章）。
import { describe, expect, it } from "vitest";
import {
  facilities,
  getFacility,
  getJob,
  jobs,
  mapUrl,
  parseFilters,
  search,
  SERVICE_ORDER,
  SERVICES,
  WARDS,
  type Facility,
  type ListItem,
} from "./data";

const facilityItems = (items: ListItem[]) =>
  items.filter((i): i is Extract<ListItem, { kind: "facility" }> => i.kind === "facility");
const jobItems = (items: ListItem[]) => items.filter((i): i is Extract<ListItem, { kind: "job" }> => i.kind === "job");

describe("parseFilters", () => {
  it("何も指定しないとき、全種類と一般の障害者求人を対象にし、区・求人ありの絞り込みはしない", () => {
    const f = parseFilters({});
    expect(f).toEqual({ q: "", services: SERVICE_ORDER, general: true, wards: [], hiring: false });
  });

  it("種類を1つ指定したとき、その種類だけを対象にし、一般の障害者求人は含めない", () => {
    const f = parseFilters({ type: "b" });
    expect(f.services).toEqual(["b"]);
    expect(f.general).toBe(false);
  });

  it("一般の障害者求人だけを指定したとき、事業所のサービスは1つも対象にしない", () => {
    const f = parseFilters({ type: "general" });
    expect(f.services).toEqual([]);
    expect(f.general).toBe(true);
  });

  it("種類と区は複数指定でき、知らない値は無視する", () => {
    const f = parseFilters({ type: ["a", "zzz", "ikou"], ward: ["中央区", "存在しない区", "北区"] });
    expect(f.services).toEqual(["a", "ikou"]);
    expect(f.wards).toEqual(["中央区", "北区"]);
  });

  it("キーワードの前後の空白を取り、複数渡されたときは最初のものを使う", () => {
    expect(parseFilters({ q: "  パソコン  " }).q).toBe("パソコン");
    expect(parseFilters({ q: ["清掃", "事務"] }).q).toBe("清掃");
  });

  it("hiring=1 のときだけ、求人のある事業所に絞る", () => {
    expect(parseFilters({ hiring: "1" }).hiring).toBe(true);
    expect(parseFilters({ hiring: "true" }).hiring).toBe(false);
  });
});

describe("search", () => {
  it("条件なしのとき、全事業所と、事業所に結び付かなかった全求人を返す", () => {
    const items = search(parseFilters({}));
    expect(facilityItems(items)).toHaveLength(facilities.length);
    expect(jobItems(items)).toHaveLength(jobs.filter((j) => !j.facilityId).length);
  });

  it("種類で絞ったとき、その種類の事業所だけを返す", () => {
    for (const s of SERVICE_ORDER) {
      const items = facilityItems(search(parseFilters({ type: s })));
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.facility.service === s)).toBe(true);
    }
  });

  it("A型で絞ったとき、事業所に結び付かなかったA型の求人も含め、一般の障害者求人は含めない", () => {
    const js = jobItems(search(parseFilters({ type: "a" })));
    expect(js.length).toBeGreaterThan(0);
    expect(js.every((i) => i.job.isA)).toBe(true);
  });

  it("一般の障害者求人だけで絞ったとき、事業所は含めず、A型でない求人だけを返す", () => {
    const items = search(parseFilters({ type: "general" }));
    expect(facilityItems(items)).toHaveLength(0);
    expect(items.length).toBeGreaterThan(0);
    expect(jobItems(items).every((i) => !i.job.isA && !i.job.facilityId)).toBe(true);
  });

  it("区で絞ったとき、その区の事業所・求人だけを返す", () => {
    const items = search(parseFilters({ ward: ["手稲区", "清田区"] }));
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      const w = i.kind === "facility" ? i.facility.ward : i.job.ward;
      expect(["手稲区", "清田区"]).toContain(w);
    }
  });

  it("求人ありで絞ったとき、求人が1件以上結び付いた事業所だけを返す", () => {
    const fs = facilityItems(search(parseFilters({ hiring: "1" })));
    expect(fs.length).toBeGreaterThan(0);
    expect(fs.every((i) => i.facility.jobIds.length > 0 && i.jobCount === i.facility.jobIds.length)).toBe(true);
  });

  it("キーワードは全角・半角や大文字・小文字の違いを無視して探す", () => {
    // WAM NET の名称は NFKC で半角にしてあるので、全角・大文字で入力しても見つかること
    const half = search(parseFilters({ q: "hibino" }));
    const full = search(parseFilters({ q: "ＨＩＢＩＮＯ" }));
    expect(half.length).toBeGreaterThan(0);
    expect(full.map((i) => i.kind)).toEqual(half.map((i) => i.kind));
  });

  it("空白で区切った複数のキーワードは、すべてを含むものだけを返す（AND 検索）", () => {
    const one = search(parseFilters({ q: "札幌市" }));
    const two = search(parseFilters({ q: "札幌市 中央区" }));
    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeLessThan(one.length);
  });

  it("事業所は、結び付いた求人の仕事の内容でも見つかる", () => {
    const fac = facilities.find((f) => f.jobIds.length > 0)!;
    const job = getJob(fac.jobIds[0])!;
    // 求人の仕事の内容の一部（空白を除いた先頭6文字。検索も空白を無視するので、そのまま一致する）で探すと、その事業所が含まれる
    const word = job.description.replace(/\s+/g, "").slice(0, 6);
    const ids = facilityItems(search(parseFilters({ q: word }))).map((i) => i.facility.id);
    expect(ids).toContain(fac.id);
  });

  it("どれにも当てはまらないキーワードのとき、0件を返す", () => {
    expect(search(parseFilters({ q: "該当しないはずのキーワードxyz123" }))).toHaveLength(0);
  });
});

describe("getFacility / getJob", () => {
  it("存在する id で取り出せ、存在しない id では undefined を返す", () => {
    expect(getFacility(facilities[0].id)).toBe(facilities[0]);
    expect(getJob(jobs[0].id)).toBe(jobs[0]);
    expect(getFacility("NOPE")).toBeUndefined();
    expect(getJob("NOPE")).toBeUndefined();
  });
});

describe("mapUrl", () => {
  const base: Facility = facilities[0];

  it("緯度・経度があるとき、座標で Google マップを開く URL を返す", () => {
    expect(mapUrl({ ...base, lat: 43.05, lng: 141.35 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=43.05,141.35",
    );
  });

  it("緯度・経度がないとき、住所で検索する URL を返す（住所は URL エンコードする）", () => {
    const url = mapUrl({ ...base, lat: null, lng: null, address: "北海道札幌市中央区南1条西1丁目" });
    expect(url).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("北海道札幌市中央区南1条西1丁目")}`,
    );
  });
});

describe("データの整合性", () => {
  it("事業所の id と求人番号は重複しない", () => {
    expect(new Set(facilities.map((f) => f.id)).size).toBe(facilities.length);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
  });

  it("事業所の jobIds と、求人の facilityId は互いに対応している", () => {
    for (const f of facilities) {
      for (const id of f.jobIds) expect(getJob(id)?.facilityId).toBe(f.id);
    }
    for (const j of jobs.filter((x) => x.facilityId)) {
      expect(getFacility(j.facilityId!)?.jobIds).toContain(j.id);
    }
  });

  it("すべての事業所が、定義済みのサービス・札幌市の区に属している", () => {
    for (const f of facilities) {
      expect(Object.keys(SERVICES)).toContain(f.service);
      expect(WARDS).toContain(f.ward);
    }
  });
});

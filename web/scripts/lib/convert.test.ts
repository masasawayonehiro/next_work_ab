// scripts/lib/convert.mjs（CSV の行 → サイト用データ）の単体テスト。
import { describe, expect, it } from "vitest";
import { convert, text, toFacility, toJob, ward } from "./convert.mjs";

describe("text", () => {
  it("「（改行）」を本当の改行に戻す", () => {
    expect(text("1行目（改行）2行目")).toBe("1行目\n2行目");
  });

  it("全角英数字を半角にそろえ、行末と前後の空白を取る", () => {
    expect(text("  ｈｉｂｉｎｏ－ｓｈｉｇｏｔｏ　 ")).toBe("hibino-shigoto");
    expect(text("Ａ型　（改行）ＰＣ作業")).toBe("A型\nPC作業");
  });

  it("undefined や空文字のとき、空文字を返す", () => {
    expect(text(undefined)).toBe("");
    expect(text("")).toBe("");
  });
});

describe("ward", () => {
  it("札幌市の住所から区名を取り出す（全角でもよい）", () => {
    expect(ward("北海道札幌市中央区南1条西1丁目")).toBe("中央区");
    expect(ward("北海道札幌市厚別区もみじ台南３丁目")).toBe("厚別区");
  });

  it("札幌市以外や区がないとき、空文字を返す", () => {
    expect(ward("北海道北広島市中央6丁目")).toBe("");
    expect(ward("北海道札幌市")).toBe("");
    expect(ward(undefined)).toBe("");
  });
});

const facilityRow = (over: Record<string, string> = {}) => ({
  "NO（※システム内の固有の番号、連番）": "A0000000001",
  サービス種別: "就労継続支援Ａ型",
  事業所の名称: "ｈｉｂｉｎｏ",
  事業所の名称_かな: "ひびの",
  法人の名称: "株式会社　テスト",
  法人番号: "1234567890123",
  "事業所住所（市区町村）": "北海道札幌市中央区",
  "事業所住所（番地以降）": "南１条西１丁目１",
  事業所電話番号: "011-000-0000",
  事業所FAX番号: "",
  事業所URL: "https://example.com/",
  事業所緯度: "43.05",
  事業所経度: "141.35",
  "利用可能な時間帯（平日）": "09:00-17:00",
  "利用可能な時間帯（土曜）": "",
  "利用可能な時間帯（日曜）": "",
  "利用可能な時間帯（祝日）": "",
  定休日: "土日（改行）祝日",
  "利用可能曜日特記事項（留意事項）": "",
  定員: "20",
  区: "中央区",
  出典: "出典：…（WAM NET オープンデータ 2026年9月版）",
  ...over,
});

describe("toFacility", () => {
  it("サービス種別（全角のＡ型）をキーに変換し、名称・住所を表示用にそろえる", () => {
    const f = toFacility(facilityRow(), ["01010-00000001"]);
    expect(f.service).toBe("a");
    expect(f.name).toBe("hibino");
    expect(f.address).toBe("北海道札幌市中央区南1条西1丁目1");
    expect(f.closed).toBe("土日\n祝日");
    expect(f.capacity).toBe(20);
    expect(f.lat).toBe(43.05);
    expect(f.jobIds).toEqual(["01010-00000001"]);
  });

  it("5種類のサービス種別をすべて変換できる", () => {
    const pairs: [string, string][] = [
      ["就労選択支援", "sentaku"],
      ["就労移行支援", "ikou"],
      ["就労継続支援Ａ型", "a"],
      ["就労継続支援Ｂ型", "b"],
      ["就労定着支援", "teichaku"],
    ];
    for (const [name, key] of pairs) expect(toFacility(facilityRow({ サービス種別: name }), []).service).toBe(key);
  });

  it("知らないサービス種別のとき、エラーにする（取り込み対象の間違いに気付くため）", () => {
    expect(() => toFacility(facilityRow({ サービス種別: "生活介護" }), [])).toThrow("未知のサービス種別");
  });

  it("緯度・経度が空・0・数値でないとき null にし、定員が空のとき null にする", () => {
    expect(toFacility(facilityRow({ 事業所緯度: "", 事業所経度: "0" }), []).lat).toBeNull();
    expect(toFacility(facilityRow({ 事業所経度: "0" }), []).lng).toBeNull();
    expect(toFacility(facilityRow({ 事業所緯度: "abc" }), []).lat).toBeNull();
    expect(toFacility(facilityRow({ 定員: "" }), []).capacity).toBeNull();
    expect(toFacility(facilityRow({ 定員: "不明" }), []).capacity).toBeNull();
  });

  it("「区」の列が空のとき、住所から区を取り出す", () => {
    expect(toFacility(facilityRow({ 区: "", "事業所住所（市区町村）": "北海道札幌市西区" }), []).ward).toBe("西区");
  });
});

describe("toJob", () => {
  it("A型の判定・事業所の結び付けを変換し、結び付いていなければ facilityId を null にする", () => {
    const base = { 求人番号: "01010-00000001", 職種: "（障）軽作業", 就業場所: "北海道札幌市北区北7条西2丁目" };
    expect(toJob({ ...base, "A型/B型": "A型", WAM事業所NO: "A1" })).toMatchObject({ isA: true, facilityId: "A1", ward: "北区" });
    expect(toJob({ ...base, "A型/B型": "", WAM事業所NO: "" })).toMatchObject({ isA: false, facilityId: null });
  });

  it("列が足りないときも、文字列の項目は空文字にする（画面で undefined を出さないため）", () => {
    const j = toJob({ 求人番号: "1" });
    expect(j.wageType).toBe("");
    expect(j.url).toBe("");
    expect(j.description).toBe("");
  });
});

describe("convert", () => {
  it("求人を事業所の jobIds に集め、データの時点（WAM NET の版と最新の取得日）を取り出す", () => {
    const { facilities, jobs, meta } = convert(
      [facilityRow(), facilityRow({ "NO（※システム内の固有の番号、連番）": "A2" })],
      [
        { 求人番号: "J1", WAM事業所NO: "A0000000001", 取得日時: "2026-11-18T10:00:00Z" },
        { 求人番号: "J2", WAM事業所NO: "A0000000001", 取得日時: "2026-11-19T10:00:00Z" },
        { 求人番号: "J3", WAM事業所NO: "", 取得日時: "2026-11-17T10:00:00Z" },
      ],
    );
    expect(facilities[0].jobIds).toEqual(["J1", "J2"]);
    expect(facilities[1].jobIds).toEqual([]);
    expect(jobs.map((j) => j.facilityId)).toEqual(["A0000000001", "A0000000001", null]);
    expect(meta).toEqual({ wamVersion: "2026年9月版", hwFetchedAt: "2026-11-19" });
  });

  it("行が0件のとき、空のデータを返す", () => {
    expect(convert([], [])).toEqual({ facilities: [], jobs: [], meta: { wamVersion: "", hwFetchedAt: "" } });
  });
});

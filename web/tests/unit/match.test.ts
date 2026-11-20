// ../scraper/lib/match.mjs（事業所と求人の結び付け）の単体テスト。
// scraper 側にはテストの仕組みがないため、web 側の Vitest から実行している。
// 規則は docs/design.md の4章。実際に見つかった表記ゆれの例を、そのままテストにしている。
import { describe, expect, it } from "vitest";
import { addressKey, createMatcher, kanjiToNum, nameKey, sameAddress, ward } from "../../../scraper/lib/match.mjs";

describe("kanjiToNum", () => {
  it("「条」「丁目」の前の漢数字を算用数字にする", () => {
    expect(kanjiToNum("南七条西一丁目")).toBe("南7条西1丁目");
    expect(kanjiToNum("北十五条東十六丁目")).toBe("北15条東16丁目");
    expect(kanjiToNum("北二十条")).toBe("北20条");
    expect(kanjiToNum("北十条")).toBe("北10条");
  });

  it("後ろが「条」「丁目」でない漢数字はそのままにする（地名の一部のため）", () => {
    expect(kanjiToNum("二十四軒1条")).toBe("二十四軒1条");
  });
});

describe("addressKey", () => {
  it.each([
    ["北海道札幌市豊平区月寒西１条１１丁目３番１０号", "豊平区月寒西1条11-3-10"],
    // 「2-3FC南7条301」：3F は階数ではなく番地の続き（後ろに英字 C が続く）
    ["北海道札幌市中央区南七条西１丁目２−３ＦＣ南７条３０１", "中央区南7条西1-2-3"],
    ["北海道札幌市中央区南７条西１丁目２番３号", "中央区南7条西1-2-3"],
    ["北海道札幌市東区北十五条東１６丁目１－１", "東区北15条東16-1-1"],
    // 「3番地　2階」：空白の後ろの階数は落とす
    ["北海道札幌市南区真駒内上町１丁目３番地　２階", "南区真駒内上町1-3"],
    ["北海道札幌市北区北７条西２丁目８−１　札幌北ビル３Ｆ", "北区北7条西2-8-1"],
    ["北海道札幌市中央区南３条西１０丁目１００１番地５福山南三条ビル７階", "中央区南3条西10-1001-5"],
  ])("「%s」→「%s」", (input, expected) => {
    expect(addressKey(input)).toBe(expected);
  });

  it("番地がない住所のとき、区名までを返す", () => {
    expect(addressKey("北海道札幌市中央区")).toBe("中央区");
  });
});

describe("sameAddress", () => {
  it("同じキーのとき、同じ住所とみなす", () => {
    expect(sameAddress("中央区南7条西1-2-3", "中央区南7条西1-2-3")).toBe(true);
  });

  it("片方が番地まで書いていないとき、数字が2組以上あり先頭が一致すれば同じとみなす", () => {
    // 光生舎：WAM NET「3丁目4番地」とハローワーク「3丁目4番1号」
    expect(sameAddress("厚別区もみじ台南3-4", "厚別区もみじ台南3-4-1")).toBe(true);
  });

  it("数字が1組だけの短いキーは、範囲が広すぎるので一致させない", () => {
    expect(sameAddress("西区二十四軒1条4", "西区二十四軒1条4-6-3")).toBe(false);
  });

  it("区切り位置でない前方一致（3-4 と 3-41）は同じとみなさない", () => {
    expect(sameAddress("北区北7条西3-4", "北区北7条西3-41")).toBe(false);
  });

  it("数字を含まないキー（区名だけ）は、何とも一致させない", () => {
    expect(sameAddress("中央区", "中央区")).toBe(false);
  });
});

describe("nameKey / ward", () => {
  it("法人格・空白・括弧を除き、全角を半角にそろえる", () => {
    expect(nameKey("株式会社　Ｓｅｅｄ")).toBe("Seed");
    expect(nameKey("就労支援事業所「マーム」")).toBe("就労支援事業所マーム");
    expect(nameKey("特定非営利活動法人ＱＯＬ")).toBe("QOL");
  });

  it("札幌市の住所から区名を取り出す", () => {
    expect(ward("北海道札幌市清田区北野6条")).toBe("清田区");
    expect(ward("北海道北広島市中央")).toBe("");
  });
});

// ---- createMatcher：テスト用の小さな事業所一覧 ----
const fac = (no: string, over: Record<string, string>) => ({
  "NO（※システム内の固有の番号、連番）": no,
  法人番号: "",
  法人の名称: "",
  事業所の名称: "",
  サービス種別: "就労継続支援Ａ型",
  "事業所住所（市区町村）": "北海道札幌市中央区",
  "事業所住所（番地以降）": "",
  ...over,
});
const facilityRows = () => [
  // 同じ法人・同じ建物に A型 と B型（多機能型）。A型の方だけ番地が書かれていない
  fac("F-A", { 法人番号: "111", 法人の名称: "株式会社アリエッタ", 事業所の名称: "アリエッタ", "事業所住所（番地以降）": "南1条西1丁目" }),
  fac("F-B", {
    法人番号: "111",
    法人の名称: "株式会社アリエッタ",
    事業所の名称: "アリエッタ",
    サービス種別: "就労継続支援Ｂ型",
    "事業所住所（番地以降）": "南1条西1丁目2番3号",
  }),
  // 法人番号が空欄の事業所（WAM NET 側の入力漏れ）
  fac("F-SEED", { 法人の名称: "株式会社Ｓｅｅｄ", 事業所の名称: "多機能型事業所　Ｓｅｅｄ", "事業所住所（市区町村）": "北海道札幌市西区", "事業所住所（番地以降）": "山の手１条６丁目２−１５" }),
  // A型事業所が1つだけの法人
  fac("F-ONE", { 法人番号: "222", 法人の名称: "株式会社ユーリード", 事業所の名称: "ユーリード", "事業所住所（番地以降）": "南1条西5丁目16" }),
  // A型事業所が2つある法人
  fac("F-TWO1", { 法人番号: "333", 事業所の名称: "ぐろーあっぷ福住", "事業所住所（市区町村）": "北海道札幌市豊平区", "事業所住所（番地以降）": "月寒西1条11丁目3番10号" }),
  fac("F-TWO2", { 法人番号: "333", 事業所の名称: "ぐろーあっぷ美香保", "事業所住所（市区町村）": "北海道札幌市東区", "事業所住所（番地以降）": "北20条東1丁目1番1号" }),
];
const job = (over: Record<string, string>) => ({ 法人番号: "", 事業所名: "", 就業場所: "", "A型/B型": "", ...over });
const no = (r: { facility: Record<string, string> | null }) => r.facility?.["NO（※システム内の固有の番号、連番）"] ?? null;

describe("createMatcher", () => {
  it("1：法人番号が同じで住所が一致する事業所に結び付ける", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "333", 就業場所: "北海道札幌市豊平区月寒西１条１１丁目３番１０号" }));
    expect(r).toMatchObject({ how: "住所一致" });
    expect(no(r)).toBe("F-TWO1");
  });

  it("多機能型で、A型の求人がB型に住所一致したとき、同じ法人・同じ名前のA型に付け替える", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "111", "A型/B型": "A型", 就業場所: "北海道札幌市中央区南1条西1丁目2番3号" }));
    expect(no(r)).toBe("F-A");
    expect(r.how).toBe("住所一致");
  });

  it("A型でない求人は、住所一致したB型のままにする", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "111", 就業場所: "北海道札幌市中央区南1条西1丁目2番3号" }));
    expect(no(r)).toBe("F-B");
  });

  it("2：住所が違っても、法人番号が同じで事業所名が求人の事業所名に含まれれば結び付ける", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "333", 事業所名: "株式会社〇〇 ぐろーあっぷ美香保", 就業場所: "北海道札幌市中央区" }));
    expect(r).toMatchObject({ how: "名称が近い" });
    expect(no(r)).toBe("F-TWO2");
  });

  it("3：WAM NET 側の法人番号が空欄でも、住所＋法人名が一致すれば結び付ける", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "999", 事業所名: "株式会社Ｓｅｅｄ", 就業場所: "北海道札幌市西区山の手１条６丁目２－１５　セピア山の手" }));
    expect(r).toMatchObject({ how: "住所＋法人名一致（法人番号不一致）" });
    expect(no(r)).toBe("F-SEED");
  });

  it("4：施設外就労のA型求人は、法人内のA型事業所が1つだけならそこに結び付ける", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "222", "A型/B型": "A型", 就業場所: "北海道札幌市中央区北1条西3丁目3 北豆印商店内" }));
    expect(r).toMatchObject({ how: "法人内で唯一のA型事業所" });
    expect(no(r)).toBe("F-ONE");
  });

  it("法人内のA型事業所が2つ以上あり、住所・名称で決められないときは結び付けない", () => {
    const match = createMatcher(facilityRows());
    const r = match(job({ 法人番号: "333", "A型/B型": "A型", 就業場所: "北海道札幌市北区北8条西5丁目" }));
    expect(r).toEqual({ facility: null, how: "法人のみ一致" });
  });

  it("法人番号が一致しない・ないときは結び付けず、理由を分けて返す", () => {
    const match = createMatcher(facilityRows());
    expect(match(job({ 法人番号: "999", 就業場所: "北海道札幌市北区" }))).toEqual({
      facility: null,
      how: "なし（法人番号の該当なし）",
    });
    expect(match(job({ 事業所名: "（事業所の意向により公開していません）", 就業場所: "北海道札幌市中央区" }))).toEqual({
      facility: null,
      how: "なし（法人番号なし）",
    });
  });
});

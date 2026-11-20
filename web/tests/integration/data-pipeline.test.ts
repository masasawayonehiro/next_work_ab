// データ変換の結合テスト。
// scraper/lib/csv.mjs で CSV を書き出し → 読み込み → scripts/lib/convert.mjs で変換、を通しで行い、
// BOM・カンマ・改行・ダブルクォートを含むデータでも、サイト用データに正しく変換されることを確かめる。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readCsv, writeCsv } from "../../../scraper/lib/csv.mjs";
import { convert } from "../../scripts/lib/convert.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shuro-navi-test-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const NO = "NO（※システム内の固有の番号、連番）";
const facilityCols = [NO, "サービス種別", "事業所の名称", "法人の名称", "事業所住所（市区町村）", "事業所住所（番地以降）", "定員", "区", "出典"];
const jobCols = ["求人番号", "職種", "仕事の内容", "A型/B型", "就業場所", "賃金", "求人票URL", "WAM事業所NO", "結び付け", "取得日時"];

describe("CSV → サイト用データ", () => {
  it("カンマ・改行・ダブルクォートを含む値も崩れずに変換され、求人が事業所に集まる", () => {
    const facFile = path.join(dir, "facilities.csv");
    const jobFile = path.join(dir, "jobs.csv");
    writeCsv(facFile, facilityCols, [
      {
        [NO]: "A1",
        サービス種別: "就労継続支援Ａ型",
        事業所の名称: 'ｈｉｂｉｎｏ "しごと", 本店',
        法人の名称: "株式会社　テスト",
        "事業所住所（市区町村）": "北海道札幌市中央区",
        "事業所住所（番地以降）": "南１条西１丁目",
        定員: "20",
        区: "中央区",
        出典: "出典：障害福祉サービス情報公表システム（WAM NET オープンデータ 2026年9月版）",
      },
      {
        [NO]: "B1",
        サービス種別: "就労継続支援Ｂ型",
        事業所の名称: "工房（改行）みらい",
        法人の名称: "",
        "事業所住所（市区町村）": "北海道札幌市北区",
        "事業所住所（番地以降）": "",
        定員: "",
        区: "北区",
        出典: "",
      },
    ]);
    writeCsv(jobFile, jobCols, [
      {
        求人番号: "01010-00000001",
        職種: "（障）軽作業",
        仕事の内容: "・袋詰め\n・検品, 梱包",
        "A型/B型": "A型",
        就業場所: "北海道札幌市中央区南１条西１丁目",
        賃金: "1,131円〜1,131円",
        求人票URL: "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?a=1&b=2",
        WAM事業所NO: "A1",
        結び付け: "住所一致",
        取得日時: "2026-11-19T13:00:00.000Z",
      },
      {
        求人番号: "01010-00000002",
        職種: "事務",
        仕事の内容: "",
        "A型/B型": "",
        就業場所: "北海道札幌市東区",
        賃金: "",
        求人票URL: "",
        WAM事業所NO: "",
        結び付け: "なし（法人番号なし）",
        取得日時: "2026-11-18T13:00:00.000Z",
      },
    ]);

    // writeCsv は Excel 用に BOM を付ける。readCsv はそれを取り除いて読めること
    expect(fs.readFileSync(facFile, "utf8").charCodeAt(0)).toBe(0xfeff);
    const { facilities, jobs, meta } = convert(readCsv(facFile).rows, readCsv(jobFile).rows);

    expect(facilities.map((f) => [f.id, f.service, f.name, f.jobIds])).toEqual([
      ["A1", "a", 'hibino "しごと", 本店', ["01010-00000001"]],
      ["B1", "b", "工房\nみらい", []],
    ]);
    expect(facilities[1].capacity).toBeNull();
    expect(jobs[0]).toMatchObject({
      isA: true,
      ward: "中央区",
      description: "・袋詰め\n・検品, 梱包",
      wage: "1,131円〜1,131円",
      url: "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?a=1&b=2",
      facilityId: "A1",
    });
    expect(jobs[1]).toMatchObject({ isA: false, ward: "東区", facilityId: null });
    expect(meta).toEqual({ wamVersion: "2026年9月版", hwFetchedAt: "2026-11-19" });
  });
});

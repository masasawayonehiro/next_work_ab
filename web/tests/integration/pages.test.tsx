// ページの結合テスト：SSR で出るシェル（見出し・検索フォーム・マイページ）を確かめる。
// 一覧の中身やモーダルはクライアント JS（E2E）で確かめる。
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MyPage from "@/app/mypage/page";
import RootLayout from "@/app/layout";
import Home from "@/app/page";

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("さがすページ（/）", () => {
  it("ヒーロー見出しと検索フォーム・結果枠がある", () => {
    const html = renderToStaticMarkup(<Home />);
    const t = textOf(html);
    expect(t).toContain("やさしく");
    expect(html).toContain('id="searchForm"');
    expect(html).toContain('id="q"');
    expect(html).toContain('id="resultList"');
    expect(html).toContain('id="detailModal"');
    expect(html).toContain("くわしい条件でしぼりこむ");
    expect(html).toContain("週に働ける日数");
    expect(html).toContain("雇用形態・お給料");
    expect(html).toContain("こだわり");
  });
});

describe("マイページ（/mypage）", () => {
  it("気になるリストとデータ管理の枠がある", () => {
    const html = renderToStaticMarkup(<MyPage />);
    const t = textOf(html);
    expect(t).toContain("気になるリスト");
    expect(html).toContain('id="favList"');
    expect(html).toContain('id="exportBtn"');
    expect(html).toContain("データの管理");
  });
});

describe("共通レイアウト", () => {
  it("子要素を描画できる", () => {
    const html = renderToStaticMarkup(
      RootLayout({ children: <p>本文</p>, params: Promise.resolve({}) } as never),
    );
    expect(textOf(html)).toContain("本文");
  });
});

describe("フッター出典", () => {
  it("さがすページに WAM NET とハローワークへの別タブリンクがある", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('href="https://www.wam.go.jp/sfkohyoout/COP000100E0000.do"');
    expect(html).toContain('href="https://www.hellowork.mhlw.go.jp/index.html"');
    expect(html).toMatch(
      /href="https:\/\/www\.wam\.go\.jp\/sfkohyoout\/COP000100E0000\.do"[^>]*target="_blank"/,
    );
    expect(html).toMatch(
      /href="https:\/\/www\.hellowork\.mhlw\.go\.jp\/index\.html"[^>]*target="_blank"/,
    );
    expect(textOf(html)).toContain("障害福祉サービス情報公表システム");
    expect(textOf(html)).toContain("ハローワークインターネットサービス");
  });
});

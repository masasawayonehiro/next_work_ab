// 総合テスト（E2E）：site と同じ UI（検索・モーダル・マイページ）を Workers 環境で確かめる。
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function expectNoSeriousA11yViolations(page: Page) {
  // 入場アニメの途中半透明でコントラストが落ちないよう、動きを減らした状態で検査する
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** データと search.js の初期描画が終わるまで待つ */
async function waitForResults(page: Page) {
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll("#resultList .rt-item").length;
      const count = Number((document.querySelector("#resultCount")?.textContent || "0").replace(/,/g, ""));
      return n > 0 && count > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
}

test.describe("検索から詳細モーダル", () => {
  test("キーワード検索でき、行を押すと詳細モーダルが開く", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("やさしく");
    await waitForResults(page);

    await page.locator("#q").fill("パソコン");
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.locator("#resultCount")).not.toHaveText("0", { timeout: 15_000 });

    await page.locator("#resultList .rt-item").first().click();
    await expect(page.locator("#detailModal")).toBeVisible();
    await expect(page.locator("#modalBody")).toContainText(/住所|電話|仕事/);
    // 長い詳細でもパネルが画面内に収まり、閉じるボタンが押せる／本文だけスクロールできること
    const close = page.locator("#detailModal .modal__close");
    await expect(close).toBeInViewport();
    const bodyScroll = await page.locator("#modalBody").evaluate((el) => ({
      canScroll: el.scrollHeight > el.clientHeight + 1,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(bodyScroll.overflowY).toMatch(/auto|scroll/);
    if (bodyScroll.canScroll) {
      await page.locator("#modalBody").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(close).toBeInViewport();
    }
    await close.click();
    await expect(page.locator("#detailModal")).toBeHidden();
  });

  test("くわしい条件（区・求人あり）でしぼりこめる", async ({ page }) => {
    await page.goto("/");
    await waitForResults(page);
    await page.locator("#advToggle").click();
    await expect(page.locator("#advPanel")).toBeVisible();
    await page.locator('#fType .chip input[value="A"]').check({ force: true });
    await page.locator('#fWard .chip input[value="豊平区"]').check({ force: true });
    await page.locator('#fJob input[value="yes"]').check({ force: true });
    await page.locator("#advPanel button[type='submit']").click();

    await expect(page).toHaveURL(/type=A/, { timeout: 10_000 });
    await expect(page).toHaveURL(/ward=/);
    await expect(page).toHaveURL(/job=yes/);
    await expect(page.locator("#resultList .rt-item").first()).toBeVisible();
  });

  test("該当がないときは空の案内を出す", async ({ page }) => {
    await page.goto("/");
    await waitForResults(page);
    await page.locator("#q").fill("該当しないはずのキーワードxyz123");
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.locator("#emptyState")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("条件に合う結果が見つかりませんでした")).toBeVisible();
  });
});

test.describe("マイページ・お気に入り", () => {
  test("詳細で星を付けるとマイページに出る", async ({ page }) => {
    await page.goto("/");
    await waitForResults(page);
    await page.locator("#resultList .rt-item").first().click();
    await expect(page.locator("#detailModal")).toBeVisible();
    await page.locator("#modalBody .star-btn").nth(2).click();
    await page.goto("/mypage");
    await expect(page.getByRole("heading", { name: "気になるリスト" })).toBeVisible();
    await expect(page.locator(".fav-card").first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("表示とアクセシビリティ", () => {
  for (const { name, path } of [
    { name: "さがす", path: "/" },
    { name: "マイページ", path: "/mypage" },
  ]) {
    test(`${name}：横スクロールが出ず、重大なアクセシビリティの問題がない`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      if (path === "/") await waitForResults(page);
      else await expect(page.getByRole("heading", { name: "気になるリスト" })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectNoSeriousA11yViolations(page);
    });
  }

  test("フッターに出典が表示される", async ({ page }) => {
    await page.goto("/");
    await waitForResults(page);
    await expect(page.locator("[data-source]")).not.toBeEmpty();
    await expect(page.locator("footer")).toContainText(/WAM NET|ハローワーク|加工/);
    const wam = page.locator('footer a[href="https://www.wam.go.jp/sfkohyoout/COP000100E0000.do"]');
    const hw = page.locator('footer a[href="https://www.hellowork.mhlw.go.jp/index.html"]');
    await expect(wam).toHaveText("障害福祉サービス情報公表システム");
    await expect(wam).toHaveAttribute("target", "_blank");
    await expect(hw).toHaveText("ハローワークインターネットサービス");
    await expect(hw).toHaveAttribute("target", "_blank");
  });
});

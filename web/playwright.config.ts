// Playwright の設定（総合テスト／E2E）。
// Cloudflare Pages と同じく静的書き出し（out/）をビルドし、ローカルで配信してブラウザ操作する。
// 開発中の preview（8787番）と混ざらないよう、テストでは 8788番を使い、毎回ビルドし直す。
import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 2,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ja-JP",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Pages 本番と同じ静的出力を、簡易 HTTP サーバーで配信する
    command: `npx next build && npx --yes serve out -l ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});

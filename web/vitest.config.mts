// Vitest の設定。単体テストと結合テストを別の「プロジェクト」に分け、片方だけ実行できるようにしている。
//   npm run test:unit         … 単体テスト（関数1つ1つ）
//   npm run test:integration  … 結合テスト（ページを実データで描画する、CSV → JSON の変換を通しで確かめる）
// 総合テスト（E2E）は Playwright で行う（playwright.config.ts）。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const alias = {
  "@": path.resolve(root, "src"),
  // 結合テストで layout を描画するとき、next/font/google の実関数は使えないためモックに差し替える
  "next/font/google": path.resolve(root, "tests/mocks/next-font-google.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});

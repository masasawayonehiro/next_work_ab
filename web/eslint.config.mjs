import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 自動で作られるファイル（OpenNext・wrangler のビルド結果、テスト結果）は対象外
    ".open-next/**",
    ".wrangler/**",
    "test-results/**",
    "playwright-report/**",
    "cloudflare-env.d.ts",
    // site から移植したクライアント JS（ESLint の Next 向けルール対象外）
    "public/assets/js/**",
  ]),
]);

export default eslintConfig;

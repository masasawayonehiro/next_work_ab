# Agent.md

このリポジトリで作業するエージェント向けの方針です。

## 構成

| フォルダ | 役割 |
|---|---|
| `scraper/` | データ取得（WAM NET オープンデータ・ハローワーク求人の取得と結び付け） |
| `site/` | デザインの見本（静的 HTML / CSS / JS） |
| `web/` | サイト本体（Next.js 静的書き出しで Cloudflare Pages に公開） |

## 方針

### 1. scraper で取得したデータは Cloudflare D1 に格納する

- `scraper/` で取得・加工したデータ（事業所・求人・その結び付け）は Cloudflare D1 に格納する。
- ローカルの CSV / JSON（`scraper/output/`、`web/src/data/` など）は中間生成物として扱い、最終的な保存先は D1 とする。
- テーブル定義はマイグレーションファイルで管理し、`wrangler d1 migrations` で適用する。
- データ投入は再実行しても重複しないようにする（求人番号・事業所番号などをキーに upsert する）。

### 2. site のデザインを web に適用し、Cloudflare にデプロイする

- `site/` で作成したデザイン（`index.html`、`mypage.html`、`assets/` の CSS・画像など）を `web/` の Next.js のページ・コンポーネントに移植する。
- `web/` は Cloudflare Pages にデプロイする（`npm run deploy` → https://next-work-sapporo.pages.dev）。
- 表示データは D1 → `GET /api/data`（Pages Function）。`public/data/items.js` はフォールバックとして残す（削除しない）。
- ローカルで D1 を使うときは `npm run data:d1:local` のあと `npm run dev:pages`（`wrangler pages dev`）。`npm run dev`（`next dev`）では `/api/data` が無いので `items.js` に落ちる。
- D1 は `web/wrangler.jsonc` の `DB` バインディング。本番投入は `npm run data:d1`（`scraper/load-d1.mjs`）。

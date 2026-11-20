# さっぽろ就労支援ナビ（web）

札幌市の就労系障害福祉サービス（就労選択支援・就労移行支援・就労継続支援A型／B型・就労定着支援）の事業所と、
ハローワークの障害者求人を、1つの画面で探せるサイトです。

- 技術：Next.js 16（App Router）・React 19・TypeScript・Tailwind CSS 4
- 公開先：Cloudflare Pages（`https://next-work-sapporo.pages.dev`）
- データ：WAM NET オープンデータ（事業所）とハローワークインターネットサービス（求人）。正本は Cloudflare D1 → `/api/data`。`public/data/items.js` はフォールバック用に残します。

## ドキュメント

| 文書 | 内容 |
|---|---|
| [docs/requirements.md](docs/requirements.md) | 要件定義書（目的・対象範囲・機能要件・非機能要件） |
| [docs/design.md](docs/design.md) | 設計書（構成・データモデル・結び付けの規則・画面とレンダリング方式） |
| [.cursor/rules/](.cursor/rules/) | 開発のルール（コーディング規約・テスト・Git・アクセシビリティ・データの取り扱い） |
| [Agent.md](Agent.md) | AI エージェント向けの作業の進め方 |

## 必要なもの

- Node.js 24 以上（動作確認：v24.12.0）
- データを更新する場合：`../scraper/` の依存パッケージ（Playwright）

## はじめに

```powershell
npm install
npm run data:d1:local   # 初回：ローカル D1 に投入（D1 経路を見る場合）
npm run dev:pages       # Pages 相当＋D1（http://localhost:8787）
```

UI だけ素早く触るなら `npm run dev`（http://localhost:3000）。この場合データは `items.js` フォールバックです。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | Next 開発サーバー（http://localhost:3000）。`/api/data` 無し → `items.js` |
| `npm run dev:pages` | 静的ビルド＋`wrangler pages dev`（http://localhost:8787）。D1 付き |
| `npm run preview` | `dev:pages` の別名 |
| `npm run build` | Next.js のビルド |
| `npm run deploy` | Cloudflare Pages（next-work-sapporo）にビルド・公開 |
| `npm run data` | CSV → JSON とフォールバック用 `public/data/items.js` を更新 |
| `npm run data:d1` | 同じデータを本番 D1 へ投入 |
| `npm run data:d1:local` | ローカル D1（`.wrangler`）へ投入 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 型チェック |
| `npm test` | 単体テスト＋結合テスト（Vitest） |
| `npm run test:unit` | 単体テストだけ |
| `npm run test:integration` | 結合テストだけ |
| `npm run test:e2e` | 総合テスト（Playwright）。Workers 環境を 8788番でビルド・起動してから実行（2分ほど） |

## テスト

テストの決まりは [テストルール](.cursor/rules/testing.mdc) にあります。コードを変えたら、次をすべて実行してください。

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
```

| 種類 | 置き場所 | 主な内容 |
|---|---|---|
| 単体 | `src/**/*.test.ts`、`scripts/**/*.test.ts`、`tests/unit/` | 検索の絞り込み、CSV → JSON の変換、事業所と求人の結び付け（`../scraper/lib/match.mjs`） |
| 結合 | `tests/integration/` | ページを実データで描画（件数・リンク・404・出典）、CSV の書き出し → 読み込み → 変換の通し |
| 総合 | `tests/e2e/` | 検索 → 事業所 → 求人の流れ、JavaScript 無効時、キーボード操作、スマホ幅、axe によるアクセシビリティ検査 |

初めて総合テストを実行する前に、ブラウザを入れておきます：`npx playwright install chromium`

## データを更新する

データ集めは `web/` の外の `../scraper/` で行います。

```powershell
cd ..\scraper
node wam.mjs       # WAM NET のオープンデータから札幌市・5種類の事業所を抜き出す
node scrape.mjs    # ハローワークの札幌市の障害者求人を全件取得（30分ほど）
node merge.mjs     # 事業所と求人を結び付け、facilities.csv・jobs.csv・combined.csv を作る
cd ..\web
npm run data          # JSON とフォールバック用 items.js
npm run data:d1       # 本番 D1
npm run data:d1:local # ローカル D1（dev:pages 用）
```

- WAM NET のオープンデータは年2回（3月・9月）更新されます。新しい版は
  [配布ページ](https://www.wam.go.jp/content/wamnet/pcpub/top/sfkopendata/) から
  ファイル番号 43・60・45・46・62 の ZIP をダウンロードし、`../scraper/data/wam/<版>/<番号>/` に展開して
  `node wam.mjs <版>`（例：`202603`）を実行します。
- 本番反映は `npm run data:d1` のあと、必要なら `npm run deploy`（Functions / 静的の変更時）。

## 公開する

```powershell
npx wrangler login   # 初回のみ。Cloudflare アカウントにログイン
npm run deploy
```

- プロジェクト名：`next-work-sapporo`
- 公開 URL：https://next-work-sapporo.pages.dev
- 公開前に `npm run dev:pages`（または `npm run preview`）で D1 経路を確認してください。

## フォルダ構成

```
web/
├─ docs/            要件定義書・設計書
├─ .cursor/rules/   開発のルール
├─ public/          静的資産（CSS・JS・フォールバック用 items.js）
├─ functions/       Pages Functions（/api/data）
├─ migrations/      D1 スキーマ
├─ scripts/         ビルド用スクリプト（CSV → JSON）
├─ out/             next build（output: export）の出力（Pages に上げる）
└─ src/
   ├─ app/          ページ（/、/mypage）
   ├─ components/   画面部品
   ├─ lib/data.ts   旧 JSON 用の型・変換テスト用
   └─ data/         npm run data が作る JSON
```

## 出典・ライセンス

- 事業所の情報：障害福祉サービス情報公表システム（WAM NET オープンデータ）を加工して作成。
  [公共データ利用規約（第1.0版）](https://www.wam.go.jp/content/wamnet/pcpub/syogai/shofukupubsys/shofukupubsys02.html)に基づき、
  出典と加工した旨をサイトの全ページに表示しています。
- 求人の情報：ハローワークインターネットサービスから取得しています。

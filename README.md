# next work 札幌

札幌市の就労系障害福祉サービス（就労選択支援・就労移行支援・就労継続支援A型/B型・就労定着支援）の事業所と、
ハローワークの障害者求人をまとめて探せるサイトです。

<img width="1920" height="4664" alt="image" src="https://github.com/user-attachments/assets/2ea2c1d5-bfc5-4c92-94de-9d1a90945ad1" />


| フォルダ | 中身 |
|---|---|
| `scraper/` | データ集め（WAM NET オープンデータの抽出、ハローワークの取得、結び付け） |
| `site/` | 静的プロトタイプ（デザイン・クライアントJSの元） |
| `web/` | サイト本体（Next.js 16 → 静的書き出しで Cloudflare Pages に公開） |

## データを更新する

```powershell
cd scraper
node wam.mjs        # WAM NET のオープンデータから札幌市の事業所を抜き出す
node scrape.mjs     # ハローワークの札幌市の障害者求人を全件取得（30分ほど）
node merge.mjs      # 結び付けて output/facilities.csv・jobs.csv・combined.csv を作る
cd ../web
npm run data        # CSV → JSON と、フォールバック用 public/data/items.js を作る
npm run data:d1     # 同じデータを Cloudflare D1（本番）へ投入
```

画面の正本は D1 → `/api/data` です。`items.js` は API が使えないときのフォールバックとして残します。

## サイトを確認・公開する

```powershell
cd web
npm run dev         # Next だけ（http://localhost:3000）。データは items.js フォールバック
npm run data:d1:local   # 初回や CSV 更新後：ローカル D1 に投入
npm run dev:pages   # Pages 相当＋D1（http://localhost:8787）。本番に近い確認はこちら
npx wrangler login  # 初回のみ：Cloudflare アカウントにログイン
npm run deploy      # Cloudflare Pages に公開
```

- `npm run dev` … UI の素早い確認用。`/api/data` が無いので `items.js` に落ちる。
- `npm run dev:pages`（別名 `npm run preview`）… `wrangler pages dev`。Functions とローカル D1 が使える。

公開 URL：https://next-work-sapporo.pages.dev  
画面は `/`（さがす）と `/mypage`（気になるリスト）の2つです。詳細はモーダルで開きます。

## 出典・ライセンス

- 事業所の情報：障害福祉サービス情報公表システム（WAM NET オープンデータ）を加工して作成。
  [公共データ利用規約（第1.0版）](https://www.wam.go.jp/content/wamnet/pcpub/syogai/shofukupubsys/shofukupubsys02.html)に基づき、出典と加工した旨をサイトに表示しています。
- 求人の情報：ハローワークインターネットサービスから取得。取得時は1件ごとに2秒の間隔を空けています。

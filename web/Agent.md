# Agent.md：AI エージェント向けの作業ガイド

このファイルは、このプロジェクト（`web/`）で作業する AI エージェント（Cursor・Claude Code など）向けの案内です。
**作業を始める前に、必ず下の文書とルールを読み、それに従って作業してください。**

## 1. 必ず参照するもの

| 順 | ファイル | 何が書いてあるか |
|---|---|---|
| 1 | [README.md](README.md) | 起動・データ更新・公開の手順、コマンド一覧 |
| 2 | [docs/requirements.md](docs/requirements.md) | 要件定義書：目的・利用者・対象範囲・機能要件（FR）・非機能要件（NFR） |
| 3 | [docs/design.md](docs/design.md) | 設計書：構成・データモデル・結び付けの規則・レンダリング方式・デプロイ |
| 4 | [.cursor/rules/project.mdc](.cursor/rules/project.mdc) | プロジェクトの前提、ドキュメント更新の決まり |
| 5 | [.cursor/rules/coding-standards.mdc](.cursor/rules/coding-standards.mdc) | コーディング規約：TypeScript、SSG → SSR → CSR の順、CSR はアイランド化、コメントは詳しく |
| 6 | [.cursor/rules/testing.mdc](.cursor/rules/testing.mdc) | テストルール：単体・結合・総合テストを作り、コードを作ったら必ず実行する |
| 7 | [.cursor/rules/git.mdc](.cursor/rules/git.mdc) | Git ルール：Push しない、コミット前に確認、コミットメッセージの規約 |
| 8 | [.cursor/rules/accessibility.mdc](.cursor/rules/accessibility.mdc) | アクセシビリティと文言のルール |
| 9 | [.cursor/rules/data-sources.mdc](.cursor/rules/data-sources.mdc) | データの出典・ライセンス・外部サイトへの配慮・個人情報 |
| — | [AGENTS.md](AGENTS.md) | Next.js 16 の注意（コードを書く前に `node_modules/next/dist/docs/` を読む） |

ルール同士が食い違う場合や、依頼の内容がルールと合わない場合は、作業を進める前に利用者（依頼者）に確認してください。

## 2. 作業の進め方

1. **読む**：上の文書を読み、依頼が要件定義書のどの機能（FR-xx）に当たるか、対象範囲の外ではないかを確かめる。
2. **調べる**：関係するコード（`src/lib/data.ts`・`src/app/`・`src/components/`）と設計書の該当章を読む。
   Next.js の API を使う場合は `node_modules/next/dist/docs/` の該当ガイドも読む。
3. **作る**：[コーディング規約](.cursor/rules/coding-standards.mdc)に従って実装する。
   - まず SSG、次に SSR を検討し、CSR は必要な部品だけをアイランドにする。
   - コメントは日本語で、「なぜ」まで詳しく書く。
4. **テストする**：[テストルール](.cursor/rules/testing.mdc)に従い、単体・結合・総合テストを作成・更新して、**必ず実行する**。
   型チェック（`npx tsc --noEmit`）と lint（`npm run lint`）も通す。
5. **確認する**：画面・D1 経路は `npm run data:d1:local`（必要時）のあと `npm run dev:pages`（http://localhost:8787）。`npm run dev` は UI 用でデータは `items.js` フォールバック。
6. **ドキュメントを直す**：機能・画面・データ・コマンドを変えたら、`docs/` と `README.md` を同じ作業の中で更新する。
7. **報告する**：何を変えたか、実行したテストと結果（失敗・未実行も含めて）、残っている課題を伝える。
8. **コミットは確認してから**：[Git ルール](.cursor/rules/git.mdc)に従い、コミット内容とメッセージ案を示して了承を得る。**Push はしない。**

## 3. 特に気をつけること

- 主な利用者は障害のある方です。読みやすさ・分かりやすさ・操作のしやすさを優先してください。
- `src/data/*.json` は `npm run data` が作るファイルです。手で編集しないでください。
- 出典の表示（全ページのフッター）を消したり弱めたりしないでください。
- ハローワーク・WAM NET へのアクセスは、データ更新のスクリプト（`../scraper/`）からだけ行います。
  サイトの実行時やテストからはアクセスしないでください。
- 利用者の個人情報を集める・保存する機能は、作る前に必ず確認してください。
- 公開（`npm run deploy`）は、利用者が頼んだときだけ行ってください。

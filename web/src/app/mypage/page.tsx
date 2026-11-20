import type { Metadata } from "next";
import { DetailModal } from "@/components/DetailModal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteScripts } from "@/components/SiteScripts";

export const metadata: Metadata = { title: "マイページ" };

/** 気になるリスト。見た目・動きは site/mypage.html と同じ（localStorage） */
export default function MyPage() {
  return (
    <>
      <a className="skip-link" href="#favList">
        気になるリストへ移動
      </a>
      <SiteHeader current="mypage" />

      <main className="mypage">
        <section className="page-hero" aria-labelledby="pageTitle">
          <p className="hero__eyebrow" data-hero-anim>
            My page
          </p>
          <h1 className="page-hero__title" id="pageTitle" data-hero-anim>
            気になるリスト
          </h1>
          <p className="page-hero__lead" data-hero-anim>
            星をつけた事業所・求人が、気になる度の高い順にならびます。
            <br className="pc-only" />
            進み具合とメモを記録して、一歩ずつ進めましょう。
          </p>
        </section>

        <section className="progress-board" aria-labelledby="boardTitle" data-hero-anim>
          <div className="progress-board__head">
            <h2 className="section-title" id="boardTitle">
              いまの進み具合
            </h2>
            <p className="progress-board__total">
              <b id="favTotal">0</b> 件
            </p>
          </div>
          <div className="status-filter" id="statusFilter" role="group" aria-label="進捗でしぼりこむ" />
        </section>

        <section className="fav-list" id="favList" aria-label="気になるリスト" tabIndex={-1} />

        <div className="empty empty--mypage" id="favEmpty" hidden>
          <div className="empty__art" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <path d="M60 22l10.6 21.5 23.7 3.4-17.2 16.8 4 23.6L60 76.1 38.9 87.3l4-23.6-17.2-16.8 23.7-3.4z" />
            </svg>
          </div>
          <p className="empty__title">まだ「気になる」がありません</p>
          <p className="empty__text">
            検索結果の詳細で <span className="star-inline">★</span> を押すと、ここに追加されます。
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- フル読み込みが必要 */}
          <a className="btn btn--primary" href="/">
            事業所・求人をさがす
          </a>
        </div>

        <section className="data-panel" id="data" aria-labelledby="dataTitle">
          <h2 className="section-title" id="dataTitle">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" />
              <path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" />
            </svg>
            データの管理
          </h2>
          <p className="data-panel__lead">
            星・進捗・メモは、このブラウザの中（ローカルストレージ）だけに保存されています。
            <br className="pc-only" />
            機種変更やブラウザを変えるときは、ファイルに書き出して読み込んでください。
          </p>

          <div className="data-panel__grid">
            <div className="data-card">
              <h3 className="data-card__title">書き出す（エクスポート）</h3>
              <p className="data-card__text">いまのデータをJSONファイルとして保存します。</p>
              <button type="button" className="btn btn--primary" id="exportBtn">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                ファイルに保存
              </button>
              <p className="data-card__meta" id="lastExport" />
            </div>

            <div className="data-card">
              <h3 className="data-card__title">読み込む（インポート）</h3>
              <div className="segmented segmented--sm" role="radiogroup" aria-label="読み込み方法">
                <label>
                  <input type="radio" name="importMode" value="merge" defaultChecked />
                  <span>今のデータに追加</span>
                </label>
                <label>
                  <input type="radio" name="importMode" value="replace" />
                  <span>すべて置きかえ</span>
                </label>
              </div>
              <label className="dropzone" id="dropzone">
                <input type="file" accept="application/json,.json" id="importFile" className="visually-hidden" />
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
                </svg>
                <span>
                  <b>ファイルを選ぶ</b>か、ここにドロップ
                </span>
              </label>
            </div>
          </div>

          <details className="danger-zone">
            <summary>すべてのデータを消す</summary>
            <p>星・進捗・メモがすべて消えます。消す前に書き出しておくと安心です。</p>
            <button type="button" className="btn btn--danger" id="clearAllBtn">
              このブラウザのデータを消す
            </button>
          </details>
        </section>
      </main>

      <button type="button" className="to-top" id="toTop" aria-label="ページの先頭へ戻る">
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>

      <SiteFooter />
      <DetailModal />

      <div className="modal modal--confirm" id="confirmModal" hidden>
        <div className="modal__backdrop" data-cancel />
        <div
          className="modal__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          tabIndex={-1}
        >
          <div className="confirm">
            <p className="confirm__title" id="confirmTitle" />
            <p className="confirm__text" id="confirmText" />
            <div className="confirm__actions">
              <button type="button" className="btn btn--ghost" data-cancel>
                やめる
              </button>
              <button type="button" className="btn btn--primary" data-ok>
                OK
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="toast-stack" id="toastStack" aria-live="polite" />
      <SiteScripts page="mypage" />
    </>
  );
}

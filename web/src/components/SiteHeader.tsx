/**
 * site と同じヘッダー。
 * お気に入り件数バッジは common.js が data-fav-count を更新する。
 * ページ固有 JS の再実行のため、Next のソフト遷移ではなく通常の <a> でフル読み込みする
 *（SiteScripts がクリックを横取りして location.assign する）。
 */
export function SiteHeader({ current }: { current: "search" | "mypage" }) {
  return (
    <header className="site-header" id="siteHeader">
      <div className="site-header__inner">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- フル読み込みが必要 */}
        <a className="logo" href="/" aria-label="next work 札幌 トップへ">
          <span className="logo__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M16 28s-11-6.6-11-14.2A6.3 6.3 0 0 1 16 10a6.3 6.3 0 0 1 11 3.8C27 21.4 16 28 16 28z" />
            </svg>
          </span>
          <span className="logo__text">
            next work<small>札幌</small>
          </span>
        </a>
        <nav className="gnav" aria-label="メイン">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- フル読み込みが必要 */}
          <a
            className={`gnav__link${current === "search" ? " is-current" : ""}`}
            href="/"
            {...(current === "search" ? { "aria-current": "page" as const } : {})}
          >
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span>さがす</span>
          </a>
          <a
            className={`gnav__link${current === "mypage" ? " is-current" : ""}`}
            href="/mypage"
            id="mypageLink"
            {...(current === "mypage" ? { "aria-current": "page" as const } : {})}
          >
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" />
            </svg>
            <span>マイページ</span>
            <span className="badge" data-fav-count hidden>
              0
            </span>
          </a>
        </nav>
      </div>
    </header>
  );
}

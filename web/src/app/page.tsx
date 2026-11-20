import { DetailModal } from "@/components/DetailModal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteScripts } from "@/components/SiteScripts";

/** さがす画面。見た目・動きは site/index.html と同じ（検索・一覧・詳細モーダルはクライアントJS） */
export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#results">
        検索結果へ移動
      </a>
      <SiteHeader current="search" />

      <main>
        <section className="hero" aria-labelledby="heroTitle">
          <div className="hero__inner">
            <p className="hero__eyebrow" data-hero-anim>
              札幌市の就労支援・障害者求人
            </p>
            <h1 className="hero__title" id="heroTitle" data-hero-anim>
              <span className="hero__line">あなたに合う</span>
              <span className="hero__line">
                「はたらく」を、<em>やさしく</em>探そう。
              </span>
            </h1>
            <p className="hero__stats" data-hero-anim>
              <span>
                <b data-count-to="0" id="statFacilities">
                  0
                </b>{" "}
                事業所
              </span>
              <span className="dot" aria-hidden="true" />
              <span>
                <b data-count-to="0" id="statJobs">
                  0
                </b>{" "}
                件の求人
              </span>
            </p>

            <form className="search" id="searchForm" role="search" data-hero-anim>
              <div className="search__box">
                <svg className="search__icon icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <label className="visually-hidden" htmlFor="q">
                  キーワード
                </label>
                <input
                  className="search__input"
                  id="q"
                  name="q"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="キーワードで探す"
                />
                <span className="search__typing" aria-hidden="true" id="typingHint" />
                <button className="search__clear" type="button" id="clearQ" aria-label="キーワードを消す" hidden>
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                <button className="search__submit btn btn--primary" type="submit">
                  <span>検索</span>
                </button>
              </div>

              <div className="quick-tags" aria-label="よく使われるキーワード">
                <span className="quick-tags__label">たとえば</span>
                <button type="button" className="tag" data-quick="軽作業">
                  軽作業
                </button>
                <button type="button" className="tag" data-quick="パン">
                  パン・お菓子
                </button>
                <button type="button" className="tag" data-quick="パソコン">
                  パソコン
                </button>
                <button type="button" className="tag" data-quick="清掃">
                  清掃
                </button>
                <button type="button" className="tag" data-quick="在宅">
                  在宅
                </button>
              </div>

              <div className="advanced-toggle">
                <button type="button" className="chevron-btn" id="advToggle" aria-expanded="false" aria-controls="advPanel">
                  <span className="chevron-btn__label">くわしい条件でしぼりこむ</span>
                  <span className="chevron-btn__circle">
                    <svg className="chevron-btn__icon" viewBox="0 0 640 640" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"
                      />
                    </svg>
                  </span>
                  <span className="chevron-btn__count" id="advCount" hidden>
                    0
                  </span>
                </button>
              </div>

              <div className="advanced" id="advPanel" hidden>
                <div className="advanced__inner">
                  <fieldset className="filter" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">01</span>サービスの種類
                    </legend>
                    <div className="chips" id="fType" />
                    <details className="filter__help">
                      <summary>種類のちがいは？</summary>
                      <dl className="help-list">
                        <div>
                          <dt>A型</dt>
                          <dd>雇用契約を結んで、お給料をもらいながら働く場所。</dd>
                        </div>
                        <div>
                          <dt>B型</dt>
                          <dd>雇用契約なしで、自分のペースで作業をして工賃をもらう場所。</dd>
                        </div>
                        <div>
                          <dt>就労移行</dt>
                          <dd>一般企業への就職をめざして、訓練やサポートを受ける場所。</dd>
                        </div>
                        <div>
                          <dt>就労定着</dt>
                          <dd>就職したあと、長く働きつづけられるよう支える場所。</dd>
                        </div>
                        <div>
                          <dt>就労選択</dt>
                          <dd>自分に合う働き方を、いっしょに考えて選ぶ場所。</dd>
                        </div>
                        <div>
                          <dt>障害者求人</dt>
                          <dd>一般企業による障害者向けの求人（ハローワーク）。</dd>
                        </div>
                      </dl>
                    </details>
                  </fieldset>

                  <fieldset className="filter" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">02</span>エリア（区）
                    </legend>
                    <div className="chips chips--ward" id="fWard" />
                  </fieldset>

                  <fieldset className="filter filter--half" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">03</span>求人
                    </legend>
                    <div className="segmented" id="fJob" role="radiogroup">
                      <label>
                        <input type="radio" name="job" value="" defaultChecked />
                        <span>すべて</span>
                      </label>
                      <label>
                        <input type="radio" name="job" value="yes" />
                        <span>求人あり</span>
                      </label>
                      <label>
                        <input type="radio" name="job" value="no" />
                        <span>事業所のみ</span>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="filter filter--half" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">04</span>週に働ける日数
                    </legend>
                    <div className="segmented segmented--days" id="fDays" role="radiogroup">
                      <label>
                        <input type="radio" name="days" value="" defaultChecked />
                        <span>指定なし</span>
                      </label>
                      <label>
                        <input type="radio" name="days" value="2" />
                        <span>週2日〜</span>
                      </label>
                      <label>
                        <input type="radio" name="days" value="3" />
                        <span>週3日〜</span>
                      </label>
                      <label>
                        <input type="radio" name="days" value="4" />
                        <span>週4日〜</span>
                      </label>
                    </div>
                    <p className="filter__note">選んだ日数から始められる求人にしぼります</p>
                  </fieldset>

                  <fieldset className="filter" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">05</span>雇用形態・お給料
                    </legend>
                    <div className="chips" id="fEmp" />
                  </fieldset>

                  <fieldset className="filter" data-adv-item>
                    <legend className="filter__title">
                      <span className="filter__num">06</span>こだわり
                    </legend>
                    <div className="chips" id="fPerks" />
                  </fieldset>

                  <div className="advanced__footer" data-adv-item>
                    <button type="button" className="btn btn--ghost" id="advReset">
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
                      </svg>
                      条件をリセット
                    </button>
                    <button type="submit" className="btn btn--primary btn--lg">
                      <span>
                        <b id="advLiveCount">0</b> 件を見る
                      </span>
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M6 13l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="results" id="results" aria-labelledby="resultsTitle" tabIndex={-1}>
          <div className="results__head">
            <h2 className="results__title" id="resultsTitle">
              検索結果{" "}
              <b className="results__count" id="resultCount" aria-live="polite">
                0
              </b>
              <small>件</small>
            </h2>
            <div className="active-filters" id="activeFilters" role="group" aria-label="選択中の条件" />
          </div>

          <p className="results__hint" id="sortHint">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
            </svg>
            項目名を押すと並び替えできます。行を押すと詳しい情報が開きます。
          </p>

          <div className="result-table" id="resultTable">
            <div className="rt-row rt-row--head" id="sortBar" role="group" aria-label="並び替え" />
            <div className="result-table__body" role="list" aria-label="検索結果の一覧" id="resultList" />
          </div>

          <div className="empty" id="emptyState" hidden>
            <div className="empty__art" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="54" cy="54" r="30" />
                <path d="m76 76 22 22" />
                <path d="M44 50h.01M64 50h.01M46 64c4 4 12 4 16 0" />
              </svg>
            </div>
            <p className="empty__title">条件に合う結果が見つかりませんでした</p>
            <p className="empty__text">キーワードを短くしたり、条件をへらしてみてください。</p>
            <button type="button" className="btn btn--soft" id="emptyReset">
              条件をすべてリセット
            </button>
          </div>

          <div className="load-more" id="loadMore" hidden>
            <button type="button" className="btn btn--soft" id="loadMoreBtn">
              もっと見る <small id="loadMoreRest" />
            </button>
          </div>
        </section>
      </main>

      <button type="button" className="to-top" id="toTop" aria-label="ページの先頭へ戻る">
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>

      <SiteFooter />
      <DetailModal />
      <div className="toast-stack" id="toastStack" aria-live="polite" />
      <SiteScripts page="search" />
    </>
  );
}

import { meta } from "@/lib/data";

/** 障害福祉サービス情報公表システムの検索トップ（出典リンク用） */
const WAM_URL = "https://www.wam.go.jp/sfkohyoout/COP000100E0000.do";
/** ハローワークインターネットサービスのトップ（出典リンク用） */
const HELLOWORK_URL = "https://www.hellowork.mhlw.go.jp/index.html";

/**
 * サイト全体のフッター。
 * 出典文はビルド時の meta で先に描画し、JS 無効時もリンクを使えるようにする。
 * common.js は [data-source] を DATA.meta で同じ文言に差し替える（日付の正本は NW_DATA）。
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__logo">
          next work<small>札幌</small>
        </p>
        <p className="site-footer__source" data-source>
          <a href={WAM_URL} target="_blank" rel="noopener">
            障害福祉サービス情報公表システム
          </a>
          （WAM NET オープンデータ {meta.wamVersion}）を加工して作成。求人情報は
          <a href={HELLOWORK_URL} target="_blank" rel="noopener">
            ハローワークインターネットサービス
          </a>
          より取得（求人情報の取得日：{meta.hwFetchedAt}）
        </p>
        <p className="site-footer__note">
          掲載内容は取得時点のものです。最新の情報は各事業所・ハローワークにご確認ください。
          <br />
          「気になる」の設定やメモは、このブラウザの中だけに保存されます。
        </p>
      </div>
    </footer>
  );
}

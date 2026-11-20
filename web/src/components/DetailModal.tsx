/** 詳細は別ページではなく site と同じモーダル。中身は common.js が組み立てる */
export function DetailModal() {
  return (
    <div className="modal" id="detailModal" hidden>
      <div className="modal__backdrop" data-close />
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabIndex={-1}>
        <div className="modal__grip" aria-hidden="true" />
        <button type="button" className="modal__close" data-close aria-label="閉じる">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="modal__body" id="modalBody" />
      </div>
    </div>
  );
}

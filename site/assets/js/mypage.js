/* =========================================================
   マイページ
   ========================================================= */
(() => {
  'use strict';
  const { gsap, $, $$, esc, debounce, fmtDate, TYPES, STAR_LABELS, STATUSES, Store, ICON, byId } = window.NW;
  const Flip = window.Flip;

  let filter = '';        // 進捗でのしぼりこみ
  let selfUpdate = false; // 自分（カード内の操作）で保存したときは描き直さない
  const save = (id, patch, item) => { selfUpdate = true; Store.update(id, patch, item); selfUpdate = false; };

  const CHEVRON = '<svg viewBox="0 0 640 640" aria-hidden="true"><path fill="currentColor" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/></svg>';

  const sorted = () => Store.favorites().sort((a, b) => b.stars - a.stars || (b.updatedAt || 0) - (a.updatedAt || 0));

  // =========================================================
  // 進捗ボード
  // =========================================================
  function renderBoard(animate) {
    const favs = Store.favorites();
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    favs.forEach((f) => { counts[f.status] = (counts[f.status] || 0) + 1; });
    const host = $('#statusFilter');
    const btn = (value, label, n, extra = '') => `
      <button type="button" class="${n ? '' : 'is-zero'} ${extra}" data-filter="${esc(value)}" ${value ? `data-status="${esc(value)}"` : ''} aria-pressed="${filter === value}">
        <span class="sf-label">${esc(label)}</span><b data-n="${n}">${n}</b>
      </button>`;
    host.innerHTML = btn('', 'すべて', favs.length, 'sf-all') + STATUSES.map((s) => btn(s, s, counts[s])).join('');
    const total = $('#favTotal');
    total.textContent = favs.length;
    if (animate) gsap.from($$('button', host), { y: 14, opacity: 0, duration: .45, stagger: .03, ease: 'power2.out', clearProps: 'all' });
  }

  function bumpBoard() {
    // 数字だけ書きかえて、変わったところをポンと弾ませる
    const favs = Store.favorites();
    const counts = { '': favs.length };
    favs.forEach((f) => { counts[f.status] = (counts[f.status] || 0) + 1; });
    $$('#statusFilter button').forEach((b) => {
      const n = counts[b.dataset.filter] || 0;
      const el = b.querySelector('b');
      if (Number(el.dataset.n) !== n) {
        el.dataset.n = n; el.textContent = n;
        gsap.fromTo(el, { scale: 1.5, color: '#ea6c8f' }, { scale: 1, color: '', duration: .6, ease: 'elastic.out(1,.45)', clearProps: 'color' });
      }
      b.classList.toggle('is-zero', !n);
    });
    $('#favTotal').textContent = favs.length;
  }

  // =========================================================
  // 気になるリスト
  // =========================================================
  function cardHTML(f) {
    const it = f.item;
    const snap = f.snap || {};
    const name = it?.name || snap.name || '（名称不明）';
    const type = it?.type || snap.type || 'general';
    const ward = it?.ward || snap.ward || '';
    const title = it?.job?.title || snap.title || '';
    const wage = it?.job?.wage || snap.wage || '';
    const idx = STATUSES.indexOf(f.status);
    const uid = f.id.replace(/[^\w-]/g, '_');
    return `
      <article class="fav-card ${f.status === '入社決定' ? 'is-done' : ''}" data-id="${esc(f.id)}" data-flip-id="${esc(f.id)}">
        <div class="fav-card__top">
          <div class="fav-card__meta">
            <span class="type-badge" data-type="${esc(type)}">${esc(TYPES[type]?.short || '')}</span>
            ${ward ? `<span class="md-head__ward">${ICON.pin}${esc(ward)}</span>` : ''}
          </div>
          <div class="fav-card__stars" data-stars></div>
        </div>
        <div>
          <h3 class="fav-card__title">${it ? `<button type="button" data-detail>${esc(name)}</button>` : esc(name)}</h3>
          ${title || wage ? `<p class="fav-card__job">${esc(title)}${title && wage ? ' ・ ' : ''}${wage ? `<b>${esc(wage)}</b>` : ''}</p>` : '<p class="fav-card__job">求人情報なし（事業所）</p>'}
          ${it ? '' : '<p class="fav-card__job" style="color:var(--danger)">※ 最新のデータに見つかりませんでした（掲載が終わった可能性があります）</p>'}
        </div>
        <div class="progress-field" data-status="${esc(f.status)}">
          <label class="field-label" for="st-${uid}">進み具合 <span data-step>${idx + 1} / ${STATUSES.length}</span></label>
          <div class="status-select">
            <select id="st-${uid}" data-status-select>
              ${STATUSES.map((s) => `<option value="${esc(s)}" ${s === f.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
            ${CHEVRON}
          </div>
          <div class="steps" aria-hidden="true">${STATUSES.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="memo-field">
          <label class="field-label" for="memo-${uid}">メモ <span class="save-state" data-save-state></span></label>
          <textarea id="memo-${uid}" data-memo rows="3" placeholder="例）12/3 14時に見学。持ち物：筆記用具／担当：〇〇さん">${esc(f.memo || '')}</textarea>
        </div>
        <div class="fav-card__foot">
          <div class="fav-card__links">
            ${it ? `<button type="button" class="btn btn--soft btn--sm" data-detail>${ICON.doc}詳細を見る</button>` : ''}
            ${it?.tel ? `<a class="btn btn--ghost btn--sm" href="tel:${esc(it.tel.replace(/[^\d+]/g, ''))}">${ICON.tel}電話</a>` : ''}
            ${it?.job?.url ? `<a class="btn btn--ghost btn--sm" href="${esc(it.job.url)}" target="_blank" rel="noopener">${ICON.ext}求人票</a>` : ''}
            <button type="button" class="btn btn--ghost btn--sm" data-remove>リストから外す</button>
          </div>
          <span class="fav-card__updated" data-updated>更新 ${esc(fmtDate(f.updatedAt))}</span>
        </div>
      </article>`;
  }

  /** @param {'init'|'flip'|'filter'} mode */
  function renderList(mode = 'filter') {
    const host = $('#favList');
    const all = sorted();
    const favs = filter ? all.filter((f) => f.status === filter) : all;
    const flipState = mode === 'flip' && Flip ? Flip.getState($$('.fav-card', host)) : null;

    $('#favEmpty').hidden = all.length > 0;
    host.hidden = all.length === 0;
    if (!all.length) { gsap.from('#favEmpty > *', { y: 16, opacity: 0, duration: .6, stagger: .08, ease: 'power3.out' }); }

    let html = '';
    for (let n = 5; n >= 1; n--) {
      const g = favs.filter((f) => f.stars === n);
      if (!g.length) continue;
      html += `
        <section class="fav-group" aria-labelledby="g${n}">
          <div class="fav-group__head">
            <span class="fav-group__stars" aria-hidden="true">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>
            <h2 class="fav-group__title" id="g${n}">${STAR_LABELS[n]}</h2>
            <span class="fav-group__count">${g.length}</span>
            <span class="fav-group__line"></span>
          </div>
          <div class="fav-grid">${g.map(cardHTML).join('')}</div>
        </section>`;
    }
    if (all.length && !favs.length) {
      html = `<div class="empty"><p class="empty__title">「${esc(filter)}」のものはまだありません</p><p class="empty__text">カードの「進み具合」を変えると、ここに出てきます。</p><button type="button" class="btn btn--soft" data-clear-filter>すべて表示する</button></div>`;
    }
    host.innerHTML = html;
    $$('.fav-card', host).forEach(bindCard);
    $$('textarea[data-memo]', host).forEach(autosize);
    $('[data-clear-filter]', host)?.addEventListener('click', () => setFilter(''));

    if (flipState) {
      Flip.from(flipState, {
        duration: .7, ease: 'power3.inOut', absolute: true, nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .5 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: .9, duration: .4 }),
      });
      gsap.from($$('.fav-group__head', host), { opacity: 0, duration: .5 });
    } else {
      const tl = gsap.timeline();
      tl.from($$('.fav-group__head', host), { x: -16, opacity: 0, duration: .5, stagger: .08, ease: 'power3.out', clearProps: 'all' })
        .from($$('.fav-card', host), { y: 26, opacity: 0, duration: .6, stagger: .06, ease: 'power3.out', clearProps: 'transform,opacity' }, '<.1')
        .from($$('.fav-group__line', host), { scaleX: 0, transformOrigin: 'left', duration: .8, ease: 'power2.out', clearProps: 'all' }, '<');
    }
  }

  function bindCard(card) {
    const id = card.dataset.id;
    const entry = () => Store.get(id);
    const it = byId.get(id);

    // 星（ここで変えるとグループごと移動する）
    NW.mountStars($('[data-stars]', card), {
      value: entry()?.stars || 0, size: 'sm',
      onChange: (n) => {
        save(id, { stars: n }, it);
        NW.toast(`「${STAR_LABELS[n]}」に移動しました`, { icon: 'star', duration: 2200 });
        setTimeout(() => renderList('flip'), 350);
      },
    });

    // 進捗
    const field = $('.progress-field', card);
    const select = $('[data-status-select]', card);
    select.addEventListener('change', () => {
      const s = select.value;
      const idx = STATUSES.indexOf(s);
      save(id, { status: s }, it);
      field.dataset.status = s;
      card.classList.toggle('is-done', s === '入社決定');
      $('[data-step]', card).textContent = `${idx + 1} / ${STATUSES.length}`;
      const steps = $$('.steps i', card);
      steps.forEach((el, i) => el.classList.toggle('on', i <= idx));
      gsap.fromTo(steps.filter((_, i) => i <= idx), { scaleX: 0 }, { scaleX: 1, duration: .35, stagger: .04, ease: 'power2.out' });
      gsap.fromTo(select, { scale: .97 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.5)' });
      $('[data-updated]', card).textContent = `更新 ${fmtDate(Date.now())}`;
      bumpBoard();
      if (s === '入社決定') {
        NW.confetti();
        NW.toast('入社決定、おめでとうございます！', { icon: 'star', duration: 5000 });
      } else {
        NW.toast(`進み具合を「${s}」にしました`, { duration: 1800 });
      }
    });

    // メモ（打つのをやめたら自動で保存）
    const memo = $('[data-memo]', card);
    const st = $('[data-save-state]', card);
    let hideT;
    const showState = (txt, saved) => {
      st.innerHTML = saved ? `${ICON.check}${txt}` : txt;
      st.classList.add('is-shown');
      st.classList.toggle('is-saved', !!saved);
      clearTimeout(hideT);
      if (saved) hideT = setTimeout(() => st.classList.remove('is-shown'), 2400);
    };
    const doSave = () => {
      if ((entry()?.memo || '') === memo.value) return;
      save(id, { memo: memo.value }, it);
      showState('保存しました', true);
      $('[data-updated]', card).textContent = `更新 ${fmtDate(Date.now())}`;
    };
    const later = debounce(doSave, 700);
    memo.addEventListener('input', () => { showState('入力中…'); autosize(memo); later(); });
    memo.addEventListener('blur', doSave);

    // 詳細・外す
    $$('[data-detail]', card).forEach((b) => b.addEventListener('click', () => NW.openDetail(id, b)));
    $('[data-remove]', card).addEventListener('click', () => {
      const prev = entry()?.stars || 1;
      gsap.to(card, {
        opacity: 0, scale: .92, y: -8, duration: .35, ease: 'power2.in',
        onComplete: () => {
          save(id, { stars: 0 }, it);
          renderList('flip');
          renderBoard(false);
          NW.toast('リストから外しました', {
            icon: 'info', duration: 5000,
            action: { label: '元に戻す', onClick: () => { save(id, { stars: prev }, it); renderList('flip'); renderBoard(false); } },
          });
        },
      });
    });
  }

  function autosize(t) { t.style.height = 'auto'; t.style.height = `${Math.max(88, t.scrollHeight + 2)}px`; }

  function setFilter(v) {
    filter = filter === v ? '' : v;
    $$('#statusFilter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    renderList('filter');
  }

  // =========================================================
  // データの管理
  // =========================================================
  function renderLastExport() {
    const t = Store.d.meta?.lastExport;
    $('#lastExport').textContent = t ? `前回の書き出し：${fmtDate(t)}` : 'まだ書き出したことはありません';
  }

  async function handleImport(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { NW.toast('ファイルが大きすぎます（5MBまで）', { icon: 'info' }); return; }
    let clean;
    try { clean = Store.parseImport(await file.text()); }
    catch (err) { NW.toast(err.message, { icon: 'info', duration: 5000 }); return; }
    const mode = $('input[name="importMode"]:checked').value;
    const n = Object.keys(clean).length;
    const favN = Object.values(clean).filter((v) => v.stars > 0).length;
    const ok = await NW.confirmDialog(
      mode === 'replace' ? 'データを置きかえますか？' : 'データを追加しますか？',
      `「${file.name}」に ${n}件（うち星つき ${favN}件）のデータがあります。\n` +
      (mode === 'replace' ? 'いまのデータはすべて消えて、ファイルの内容に置きかわります。' : '同じものがある場合は、新しく更新された方を残します。'),
      mode === 'replace' ? '置きかえる' : '追加する',
    );
    if (!ok) return;
    selfUpdate = true;
    const r = Store.applyImport(clean, mode);
    selfUpdate = false;
    renderBoard(true);
    renderList('init');
    NW.toast(mode === 'replace' ? `${r.added}件のデータを読み込みました` : `追加 ${r.added}件・更新 ${r.updated}件（変更なし ${r.kept}件）`, { duration: 4500 });
  }

  function initData() {
    renderLastExport();
    $('#exportBtn').addEventListener('click', (e) => {
      const { name, count } = Store.exportFile();
      renderLastExport();
      const icon = e.currentTarget.querySelector('.icon');
      gsap.fromTo(icon, { y: -6 }, { y: 0, duration: .6, ease: 'bounce.out' });
      NW.toast(`${count}件を「${name}」に保存しました`, { duration: 4500 });
    });
    const input = $('#importFile');
    input.addEventListener('change', () => { handleImport(input.files[0]); input.value = ''; });
    const dz = $('#dropzone');
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); }));
    dz.addEventListener('drop', (e) => handleImport(e.dataTransfer.files[0]));

    $('#clearAllBtn').addEventListener('click', async () => {
      const n = Object.keys(Store.d.items).length;
      const ok = await NW.confirmDialog('すべてのデータを消しますか？', `${n}件の星・進捗・メモが消えます。元には戻せません。`, '消す');
      if (!ok) return;
      selfUpdate = true; Store.clearAll(); selfUpdate = false;
      renderBoard(false);
      renderList('init');
      NW.toast('このブラウザのデータを消しました', { icon: 'info' });
    });
  }

  // =========================================================
  document.addEventListener('DOMContentLoaded', () => {
    renderBoard(true);
    renderList('init');
    initData();
    $('#statusFilter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      gsap.fromTo(b, { scale: .94 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.5)' });
      setFilter(b.dataset.filter);
    });
    // モーダルや別タブで変わったときは描き直す
    document.addEventListener('nw:change', () => {
      if (selfUpdate) return;
      renderBoard(false);
      renderList('flip');
    });
  });
})();

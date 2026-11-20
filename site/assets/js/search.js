/* =========================================================
   検索ページ
   ========================================================= */
(() => {
  'use strict';
  const { gsap, $, $$, esc, norm, debounce, TYPES, STAR_LABELS, DATA, Store, ICON } = window.NW;
  const Flip = window.Flip;
  const PAGE = 40;
  const WARDS = DATA.meta?.wards || [];

  // ---- 検索しやすいように前処理 ----
  const ITEMS = DATA.items.map((it, i) => {
    const j = it.job || {};
    const t = TYPES[it.type] || TYPES.general;
    const holidays = `${j.holiday || ''} ${it.closed || ''}`;
    const perks = new Set();
    if (/あり/.test(j.commute || '')) perks.add('commute');
    if (/(土.*日|土日)/.test(holidays)) perks.add('weekend');
    if (/マイカー通勤可/.test(j.car || '')) perks.add('car');
    if (/不問/.test(j.exp || '')) perks.add('noexp');
    if (/厚生年金|健康保険/.test(j.insurance || '')) perks.add('social');
    if (/在宅|テレワーク/.test(`${j.title || ''} ${j.desc || ''}`)) perks.add('remote');
    const emp = !it.job ? '' : /^正社員$/.test(j.emp) ? '正社員' : /パート/.test(j.emp || '') ? 'パート' : j.emp ? 'その他' : '';
    return {
      ...it, _i: i, _t: t, _emp: emp, _perks: perks,
      _name: norm(it.name),
      _sortName: norm(it.kana || it.name),
      _text: norm([it.name, it.kana, it.corp, it.addr, it.ward, t.short, t.full, j.title, j.desc, j.business, j.place, j.station].filter(Boolean).join(' ')),
    };
  });

  // ---- 絞り込みの選択肢 ----
  const PERKS = [
    { v: 'commute', label: '通勤手当あり' },
    { v: 'weekend', label: '土日休み' },
    { v: 'noexp', label: '経験不問' },
    { v: 'car', label: 'マイカー通勤OK' },
    { v: 'social', label: '社会保険あり' },
    { v: 'remote', label: '在宅・テレワーク' },
  ];
  const EMPS = [
    { v: 'emp:正社員', label: '正社員' },
    { v: 'emp:パート', label: 'パート' },
    { v: 'emp:その他', label: '契約・有期など' },
    { v: 'wage:時給', label: '時給' },
    { v: 'wage:月給', label: '月給' },
  ];
  const SORTS = [
    { key: 'stars', label: '気になる度', first: 'desc' },
    { key: 'name', label: '事業所名', first: 'asc' },
    { key: 'type', label: '種類', first: 'asc' },
    { key: 'ward', label: '区', first: 'asc' },
    { key: 'job', label: '職種', first: 'asc' },
    { key: 'wage', label: '賃金', first: 'desc' },
  ];

  const state = {
    q: '', types: new Set(), wards: new Set(), job: '', days: '', emp: new Set(), perks: new Set(),
    sort: { key: null, dir: null }, limit: PAGE,
  };

  // =========================================================
  // 絞り込み
  // =========================================================
  function match(it, s, skip) {
    if (s.q) {
      const words = norm(s.q).split(' ').filter(Boolean);
      if (!words.every((w) => it._text.includes(w))) return false;
    }
    if (skip !== 'types' && s.types.size && !s.types.has(it.type)) return false;
    if (skip !== 'wards' && s.wards.size && !s.wards.has(it.ward)) return false;
    if (s.job === 'yes' && !it.job) return false;
    if (s.job === 'no' && it.job) return false;
    if (s.days) { const d = it.job?.daysMin; if (!d || d > Number(s.days)) return false; }
    if (s.emp.size) {
      const emps = [...s.emp].filter((x) => x.startsWith('emp:'));
      const wages = [...s.emp].filter((x) => x.startsWith('wage:'));
      if (emps.length && !emps.includes(`emp:${it._emp}`)) return false;
      if (wages.length && !wages.includes(`wage:${it.job?.wageType}`)) return false;
    }
    for (const p of s.perks) if (!it._perks.has(p)) return false;
    return true;
  }

  const filterAll = (s = state) => ITEMS.filter((it) => match(it, s));

  function sortList(list) {
    const { key, dir } = state.sort;
    if (!key) {
      // 並び替えなし：キーワードが事業所名に入っているもの → 種類の順（A型・B型…）
      const w = state.q ? norm(state.q).split(' ')[0] : '';
      return [...list].sort((a, b) => (w ? b._name.includes(w) - a._name.includes(w) : 0) || a._t.order - b._t.order || a._i - b._i);
    }
    const val = {
      stars: (it) => Store.stars(it.id) || null,
      name: (it) => it._sortName,
      type: (it) => it._t.order,
      ward: (it) => { const i = WARDS.indexOf(it.ward); return i < 0 ? null : i; },
      job: (it) => (it.job?.title ? norm(it.job.title) : null),
      wage: (it) => it.job?.wageMin ?? null,
    }[key];
    const m = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return a._i - b._i;
      if (va == null) return 1; // 空はいつも最後
      if (vb == null) return -1;
      const c = typeof va === 'string' ? va.localeCompare(vb, 'ja') : va - vb;
      return c * m || a._i - b._i;
    });
  }

  // =========================================================
  // 描画
  // =========================================================
  const list = $('#resultList');
  const nodeCache = new Map();
  let current = [];

  function starsMini(n) {
    if (!n) return `<span class="rt-stars rt-stars--empty" aria-label="未設定">－</span>`;
    return `<span class="rt-stars" aria-label="気になる度 星${n}つ">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</span>`;
  }

  function rowHTML(it) {
    const j = it.job;
    const n = Store.stars(it.id);
    const facilityNote = [it.cap ? `定員${it.cap}名` : '', it.hours].filter(Boolean).join(' ・ ');
    return `
      <span class="rt-c-stars">${starsMini(n)}</span>
      <span class="rt-c-name rt-name"><strong>${esc(it.name)}</strong>${it.corp ? `<small>${esc(it.corp)}</small>` : ''}</span>
      <span class="rt-c-type"><span class="type-badge" data-type="${it.type}">${esc(it._t.short)}</span></span>
      <span class="rt-c-ward rt-ward">${it.ward ? `${ICON.pin}${esc(it.ward)}` : '<span style="color:var(--ink-faint)">－</span>'}</span>
      ${j ? `<span class="rt-c-job rt-job"><span>${esc(j.title)}</span></span>`
          : `<span class="rt-c-job rt-job is-none"><span class="none">求人情報なし${facilityNote ? ` ・ ${esc(facilityNote)}` : ''}</span></span>`}
      ${j?.wage ? `<span class="rt-c-wage rt-wage">${j.wageType ? `<small>${esc(j.wageType)}</small>` : ''}${esc(j.wage)}</span>`
                : `<span class="rt-c-wage rt-wage is-none"><span class="none">－</span></span>`}
      <span class="rt-go" aria-hidden="true">${ICON.arrow}</span>`;
  }

  function getNode(it) {
    let li = nodeCache.get(it.id);
    if (!li) {
      li = document.createElement('div');
      li.setAttribute('role', 'listitem');
      li.dataset.id = it.id;
      li.dataset.flipId = it.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rt-item rt-row';
      btn.innerHTML = rowHTML(it);
      btn.setAttribute('aria-label', `${it.name}${it.job ? `、${it.job.title}` : ''}の詳細を開く`);
      li.append(btn);
      nodeCache.set(it.id, li);
    }
    li.firstChild.classList.toggle('is-fav', Store.stars(it.id) > 0);
    return li;
  }

  /**
   * @param {'filter'|'sort'|'more'|'init'} reason 何がきっかけで描き直すか（アニメを変える）
   */
  function render(reason = 'filter') {
    const found = filterAll();
    current = sortList(found);
    const shown = current.slice(0, state.limit);
    const flipState = reason === 'sort' && Flip ? Flip.getState(list.children) : null;
    const before = new Set([...list.children].map((n) => n.dataset.id));

    list.replaceChildren(...shown.map(getNode));

    // 件数のカウント
    tweenNumber($('#resultCount'), found.length);
    tweenNumber($('#advLiveCount'), found.length);
    $('#emptyState').hidden = found.length > 0;
    $('#sortHint').hidden = found.length === 0;
    $('#sortBar').hidden = found.length === 0;
    const rest = current.length - shown.length;
    $('#loadMore').hidden = rest <= 0;
    $('#loadMoreRest').textContent = rest > 0 ? `（残り ${rest}件）` : '';

    // 動き
    const fresh = [...list.children].filter((n) => !before.has(n.dataset.id));
    if (flipState) {
      Flip.from(flipState, {
        duration: .65, ease: 'power3.inOut', stagger: .008, absolute: false, nested: false,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, stagger: .02 }),
      });
    } else if (reason === 'more') {
      gsap.fromTo(fresh, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .5, stagger: .03, ease: 'power2.out', clearProps: 'transform' });
    } else {
      gsap.fromTo(list.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, stagger: { each: .025, amount: .5 }, ease: 'power2.out', clearProps: 'transform' });
    }
    if (!found.length) gsap.from('#emptyState > *', { y: 12, opacity: 0, stagger: .06, duration: .5, ease: 'power2.out' });

    renderActive();
    updateCounts();
    syncUrl();
  }

  function tweenNumber(el, to) {
    if (!el) return;
    const obj = { v: Number(el.dataset.v || 0) };
    el.dataset.v = to;
    gsap.to(obj, { v: to, duration: .6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString(); } });
  }

  // ---- 並び替えバー ----
  function renderSortBar() {
    const bar = $('#sortBar');
    const btn = (s) => `<button type="button" class="sort-btn" data-key="${s.key}" aria-label="${s.label}で並び替え">${s.label}<span class="sort-btn__arrow" aria-hidden="true"></span></button>`;
    const by = Object.fromEntries(SORTS.map((s) => [s.key, btn(s)]));
    // PCの列の並びに合わせる（気になる度｜事業所名｜種類｜区｜職種｜賃金）
    bar.innerHTML = `${by.stars}${by.name}${by.type}${by.ward}${by.job}${by.wage}<span></span>`;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('.sort-btn');
      if (!b) return;
      const s = SORTS.find((x) => x.key === b.dataset.key);
      const { key, dir } = state.sort;
      const second = s.first === 'asc' ? 'desc' : 'asc';
      // 1回目→2回目で向きが逆、3回目で元の並びへ
      state.sort = key !== s.key ? { key: s.key, dir: s.first } : dir === s.first ? { key: s.key, dir: second } : { key: null, dir: null };
      paintSortBar();
      gsap.fromTo(b.querySelector('.sort-btn__arrow'), { scale: 1.6 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
      render('sort');
      const label = state.sort.key ? `${s.label}の${state.sort.dir === 'asc' ? (s.key === 'wage' || s.key === 'stars' ? '低い' : 'あいうえお') : (s.key === 'wage' || s.key === 'stars' ? '高い' : '逆')}順` : 'もとの順番';
      NW.toast(`${label}に並び替えました`, { icon: 'check', duration: 1800 });
    });
    paintSortBar();
  }
  function paintSortBar() {
    $$('#sortBar .sort-btn').forEach((b) => {
      const on = b.dataset.key === state.sort.key;
      b.dataset.dir = on ? state.sort.dir : '';
      b.setAttribute('aria-pressed', String(on));
    });
  }

  // ---- 選択中の条件 ----
  function renderActive() {
    const host = $('#activeFilters');
    const chips = [];
    const add = (label, clear) => chips.push({ label, clear });
    if (state.q) add(`「${state.q}」`, () => { state.q = ''; $('#q').value = ''; onQ(); });
    state.types.forEach((v) => add(TYPES[v].short, () => { state.types.delete(v); syncInputs(); }));
    state.wards.forEach((v) => add(v, () => { state.wards.delete(v); syncInputs(); }));
    if (state.job) add(state.job === 'yes' ? '求人あり' : '事業所のみ', () => { state.job = ''; syncInputs(); });
    if (state.days) add(`週${state.days}日〜`, () => { state.days = ''; syncInputs(); });
    state.emp.forEach((v) => add(EMPS.find((e) => e.v === v)?.label || v, () => { state.emp.delete(v); syncInputs(); }));
    state.perks.forEach((v) => add(PERKS.find((p) => p.v === v)?.label || v, () => { state.perks.delete(v); syncInputs(); }));
    host.innerHTML = '';
    chips.forEach((c) => {
      const el = document.createElement('span');
      el.className = 'active-chip';
      el.innerHTML = `${esc(c.label)}<button type="button" aria-label="${esc(c.label)}の条件を外す"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
      el.querySelector('button').addEventListener('click', () => {
        gsap.to(el, { scale: .6, opacity: 0, duration: .2, onComplete: () => { c.clear(); state.limit = PAGE; render('filter'); } });
      });
      host.append(el);
    });
    if (chips.length > 1) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'rating__clear';
      all.textContent = 'すべて外す';
      all.addEventListener('click', resetAll);
      host.append(all);
    }
    const advN = state.types.size + state.wards.size + (state.job ? 1 : 0) + (state.days ? 1 : 0) + state.emp.size + state.perks.size;
    const badge = $('#advCount');
    const was = badge.hidden ? 0 : Number(badge.textContent);
    badge.hidden = advN === 0;
    badge.textContent = advN;
    if (advN && advN !== was) gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.4)' });
  }

  // ---- チップの横に件数（選んだらどれだけ出るか分かる）----
  function updateCounts() {
    const countBy = (skip, keyFn) => {
      const m = {};
      for (const it of ITEMS) if (match(it, state, skip)) { const k = keyFn(it); m[k] = (m[k] || 0) + 1; }
      return m;
    };
    const tc = countBy('types', (it) => it.type);
    const wc = countBy('wards', (it) => it.ward);
    $$('#fType input').forEach((i) => { i.closest('.chip').querySelector('small').textContent = tc[i.value] || 0; });
    $$('#fWard input').forEach((i) => { i.closest('.chip').querySelector('small').textContent = wc[i.value] || 0; });
  }

  // =========================================================
  // フォーム
  // =========================================================
  function buildFilters() {
    const chip = (name, v, label, extra = '') => `<label class="chip" ${extra}><input type="checkbox" name="${name}" value="${esc(v)}"><span>${label}</span></label>`;
    $('#fType').innerHTML = Object.entries(TYPES).map(([k, t]) => chip('type', k, `<i class="dot-color"></i>${esc(t.short)} <small></small>`, `data-type="${k}"`)).join('');
    $('#fWard').innerHTML = WARDS.map((w) => chip('ward', w, `${esc(w)} <small></small>`)).join('');
    $('#fEmp').innerHTML = EMPS.map((e) => chip('emp', e.v, esc(e.label))).join('');
    $('#fPerks').innerHTML = PERKS.map((p) => chip('perk', p.v, esc(p.label))).join('');

    const form = $('#searchForm');
    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'type') toggle(state.types, t.value, t.checked);
      else if (t.name === 'ward') toggle(state.wards, t.value, t.checked);
      else if (t.name === 'emp') toggle(state.emp, t.value, t.checked);
      else if (t.name === 'perk') toggle(state.perks, t.value, t.checked);
      else if (t.name === 'job') state.job = t.value;
      else if (t.name === 'days') state.days = t.value;
      else return;
      if (t.type === 'checkbox' && t.checked) {
        gsap.fromTo(t.nextElementSibling, { scale: .92 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.5)' });
      }
      state.limit = PAGE;
      render('filter');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      $('#q').blur();
      state.limit = PAGE;
      render('filter');
      goToResults();
    });
    $('#advReset').addEventListener('click', () => {
      Object.assign(state, { types: new Set(), wards: new Set(), job: '', days: '', emp: new Set(), perks: new Set(), limit: PAGE });
      syncInputs();
      gsap.fromTo('#advReset .icon', { rotate: 0 }, { rotate: -360, duration: .6, ease: 'power2.out' });
    });
    $('#emptyReset').addEventListener('click', resetAll);
  }
  const toggle = (set, v, on) => (on ? set.add(v) : set.delete(v));

  function resetAll() {
    Object.assign(state, { q: '', types: new Set(), wards: new Set(), job: '', days: '', emp: new Set(), perks: new Set(), limit: PAGE });
    $('#q').value = '';
    onQ(true);
    syncInputs();
  }

  /** stateに合わせてフォームの見た目を戻す */
  function syncInputs(noRender) {
    $$('#searchForm input[name="type"]').forEach((i) => { i.checked = state.types.has(i.value); });
    $$('#searchForm input[name="ward"]').forEach((i) => { i.checked = state.wards.has(i.value); });
    $$('#searchForm input[name="emp"]').forEach((i) => { i.checked = state.emp.has(i.value); });
    $$('#searchForm input[name="perk"]').forEach((i) => { i.checked = state.perks.has(i.value); });
    $$('#searchForm input[name="job"]').forEach((i) => { i.checked = i.value === state.job; });
    $$('#searchForm input[name="days"]').forEach((i) => { i.checked = i.value === state.days; });
    $$('.tag[data-quick]').forEach((t) => t.classList.toggle('is-active', state.q === t.dataset.quick));
    NW.refreshSegmented();
    $$('.segmented').forEach((s) => s.dispatchEvent(new Event('change')));
    if (!noRender) render('filter');
  }

  function goToResults() {
    const top = $('#results').getBoundingClientRect().top + scrollY - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) - 8;
    scrollTo({ top, behavior: NW.reduced ? 'auto' : 'smooth' });
    gsap.fromTo('#resultCount', { scale: 1.4, color: '#ea6c8f' }, { scale: 1, color: '#b23a60', duration: .7, delay: .35, ease: 'elastic.out(1,.5)' });
  }

  // ---- キーワード ----
  const qInput = $('#q');
  const onQ = (silent) => {
    state.q = qInput.value.trim();
    $('.search__box').classList.toggle('has-value', !!qInput.value);
    $('#clearQ').hidden = !qInput.value;
    $$('.tag[data-quick]').forEach((t) => t.classList.toggle('is-active', state.q === t.dataset.quick));
    state.limit = PAGE;
    if (silent !== true) render('filter');
  };
  const onQDebounced = debounce(onQ, 220);

  function initKeyword() {
    qInput.addEventListener('input', () => {
      $('.search__box').classList.toggle('has-value', !!qInput.value);
      $('#clearQ').hidden = !qInput.value;
      onQDebounced();
    });
    $('#clearQ').addEventListener('click', () => { qInput.value = ''; onQ(); qInput.focus(); });
    $$('.tag[data-quick]').forEach((t) => t.addEventListener('click', () => {
      qInput.value = state.q === t.dataset.quick ? '' : t.dataset.quick;
      onQ();
      gsap.fromTo(t, { scale: .9 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.5)' });
      if (qInput.value) goToResults();
    }));
    typingHint();
  }

  /** 入力欄のヒントを打ち込むように切りかえる（何を入れればいいか伝わるように） */
  function typingHint() {
    const el = $('#typingHint');
    const words = ['事業所名・仕事内容・地域などで検索', '例）パン づくり', '例）中央区 A型', '例）パソコン 入力', '例）清掃 パート'];
    let w = 0, c = 0, del = false;
    if (NW.reduced) { el.textContent = words[0]; return; }
    const tick = () => {
      const word = words[w];
      if (!del) { c++; if (c >= word.length) { del = true; el.textContent = word; return setTimeout(tick, 2200); } }
      else { c--; if (c <= 0) { del = false; w = (w + 1) % words.length; } }
      el.textContent = word.slice(0, c);
      setTimeout(tick, del ? 35 : 90);
    };
    tick();
  }

  // =========================================================
  // 詳細検索の開け閉め（chevron-down）
  // =========================================================
  function initAdvanced() {
    const btn = $('#advToggle');
    const panel = $('#advPanel');
    const icon = $('.chevron-btn__icon', btn);
    const label = $('.chevron-btn__label', btn);
    let open = false;

    // まだ触っていないうちは、そっと上下に揺れて「押せる」ことを伝える
    const hint = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 2 })
      .to(icon, { y: 5, duration: .35, ease: 'power2.out' })
      .to(icon, { y: 0, duration: .6, ease: 'bounce.out' })
      .to(icon, { y: 4, duration: .3, ease: 'power2.out' })
      .to(icon, { y: 0, duration: .5, ease: 'bounce.out' });

    const setOpen = (v) => {
      open = v;
      btn.setAttribute('aria-expanded', String(v));
      label.textContent = v ? '条件をとじる' : 'くわしい条件でしぼりこむ';
      gsap.to(icon, { rotate: v ? 180 : 0, duration: .55, ease: 'back.out(2)' });
      gsap.killTweensOf(panel);
      if (v) {
        panel.hidden = false;
        gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: .65, ease: 'power3.inOut', onComplete: () => gsap.set(panel, { clearProps: 'height' }) });
        gsap.fromTo($$('[data-adv-item]', panel), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .06, delay: .15, ease: 'power3.out' });
        gsap.fromTo($$('.chips .chip', panel), { scale: .85, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, stagger: .012, delay: .25, ease: 'back.out(2)' });
        requestAnimationFrame(() => NW.refreshSegmented(panel));
      } else {
        gsap.to(panel, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { panel.hidden = true; gsap.set(panel, { clearProps: 'height' }); } });
      }
    };
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('is-touched')) { btn.classList.add('is-touched'); hint.kill(); gsap.to(icon, { y: 0, duration: .2 }); }
      gsap.fromTo($('.chevron-btn__circle', btn), { scale: .85 }, { scale: 1, duration: .5, ease: 'elastic.out(1.2,.4)' });
      setOpen(!open);
    });
    return setOpen;
  }

  // =========================================================
  // URLに条件を残す（戻る・共有に強く）
  // =========================================================
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.types.size) p.set('type', [...state.types].join(','));
    if (state.wards.size) p.set('ward', [...state.wards].join(','));
    if (state.job) p.set('job', state.job);
    if (state.days) p.set('days', state.days);
    if (state.emp.size) p.set('emp', [...state.emp].join(','));
    if (state.perks.size) p.set('perk', [...state.perks].join(','));
    if (state.sort.key) p.set('sort', `${state.sort.key}.${state.sort.dir}`);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    const list = (k) => (p.get(k) || '').split(',').filter(Boolean);
    state.q = p.get('q') || '';
    state.types = new Set(list('type').filter((t) => TYPES[t]));
    state.wards = new Set(list('ward').filter((w) => WARDS.includes(w)));
    state.job = ['yes', 'no'].includes(p.get('job')) ? p.get('job') : '';
    state.days = ['2', '3', '4'].includes(p.get('days')) ? p.get('days') : '';
    state.emp = new Set(list('emp').filter((e) => EMPS.some((x) => x.v === e)));
    state.perks = new Set(list('perk').filter((e) => PERKS.some((x) => x.v === e)));
    const [k, d] = (p.get('sort') || '').split('.');
    if (SORTS.some((s) => s.key === k) && ['asc', 'desc'].includes(d)) state.sort = { key: k, dir: d };
    qInput.value = state.q;
    $('.search__box').classList.toggle('has-value', !!state.q);
    $('#clearQ').hidden = !state.q;
    return state.types.size + state.wards.size + state.emp.size + state.perks.size + (state.job ? 1 : 0) + (state.days ? 1 : 0) > 0;
  }

  // =========================================================
  // はじまり
  // =========================================================
  document.addEventListener('DOMContentLoaded', () => {
    // ヒーローの数字
    const facilities = new Set(DATA.items.filter((x) => x.wamNo).map((x) => x.wamNo)).size;
    const jobs = DATA.items.filter((x) => x.job).length;
    [['#statFacilities', facilities], ['#statJobs', jobs]].forEach(([sel, n]) => {
      const el = $(sel), o = { v: 0 };
      gsap.to(o, { v: n, duration: 1.6, delay: .5, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString(); } });
    });

    buildFilters();
    initKeyword();
    const setAdvOpen = initAdvanced();
    renderSortBar();
    const hasAdv = readUrl();
    syncInputs(true);
    paintSortBar();
    if (hasAdv) setAdvOpen(true);
    render('init');

    // 行を押したら詳細
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.rt-item');
      if (btn) NW.openDetail(btn.parentElement.dataset.id, btn);
    });

    // もっと見る（ボタン＋画面に入ったら自動で）
    const more = () => { state.limit += PAGE; render('more'); };
    $('#loadMoreBtn').addEventListener('click', more);
    let auto = false;
    new IntersectionObserver((ents) => {
      if (ents[0].isIntersecting && auto && !$('#loadMore').hidden) more();
    }, { rootMargin: '200px' }).observe($('#loadMore'));
    $('#loadMoreBtn').addEventListener('click', () => { auto = true; }, { once: true }); // 一度押したら次からは自動

    // 星が変わったら、その行の表示だけ更新
    document.addEventListener('nw:change', (e) => {
      const ids = e.detail.id ? [e.detail.id] : [...nodeCache.keys()];
      ids.forEach((id) => {
        const li = nodeCache.get(id);
        if (!li) return;
        const n = Store.stars(id);
        li.firstChild.classList.toggle('is-fav', n > 0);
        li.querySelector('.rt-c-stars').innerHTML = starsMini(n);
      });
    });
    document.addEventListener('nw:modalclose', (e) => {
      const li = nodeCache.get(e.detail.id);
      if (li && Store.stars(e.detail.id)) gsap.fromTo(li.querySelectorAll('.rt-stars .on'), { scale: 0 }, { scale: 1, duration: .5, stagger: .05, ease: 'back.out(3)' });
      if (state.sort.key === 'stars') render('sort');
    });
  });
})();

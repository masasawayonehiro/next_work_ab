/* =========================================================
   next work 札幌 — 両ページ共通
   データ・ローカルストレージ・モーダル・星・トーストなど
   ========================================================= */
(() => {
  'use strict';

  // ---- GSAPが読み込めなかったとき用の最低限の代わり（アニメなしで最終状態にする）----
  if (!window.gsap) {
    const apply = (t, v) => toEls(t).forEach((el) => {
      for (const [k, val] of Object.entries(v || {})) {
        if (k === 'opacity' || k === 'autoAlpha') el.style.opacity = val;
        if (k === 'autoAlpha') el.style.visibility = val ? 'visible' : 'hidden';
      }
    });
    const toEls = (t) => (typeof t === 'string' ? [...document.querySelectorAll(t)] : t instanceof Element ? [t] : t ? [...t].filter((x) => x instanceof Element) : []);
    const done = (v) => { v?.onComplete?.(); return stub; };
    const stub = {
      set: (t, v) => { apply(t, v); return stub; },
      to: (t, v) => { apply(t, v); return done(v); },
      from: (t, v) => done(v),
      fromTo: (t, a, b) => { apply(t, b); return done(b); },
      timeline: (v) => { const tl = { to: (t, x) => (apply(t, x), tl), from: () => tl, fromTo: (t, a, b) => (apply(t, b), tl), set: (t, x) => (apply(t, x), tl), add: () => tl, call: (f) => (f(), tl), play: () => tl, reverse: () => tl, kill: () => tl }; setTimeout(() => v?.onComplete?.()); return tl; },
      killTweensOf: () => {}, registerPlugin: () => {}, quickTo: () => () => {},
      utils: { random: (a, b) => a + Math.random() * (b - a), toArray: toEls },
      matchMedia: () => ({ add: () => {} }),
    };
    window.gsap = stub;
  }
  const gsap = window.gsap;
  if (window.Flip) gsap.registerPlugin(window.Flip);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) gsap.globalTimeline?.timeScale?.(20);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- 定数 ----
  const TYPES = {
    A:          { short: 'A型',       full: '就労継続支援A型', order: 1 },
    B:          { short: 'B型',       full: '就労継続支援B型', order: 2 },
    transition: { short: '就労移行',  full: '就労移行支援',    order: 3 },
    retention:  { short: '就労定着',  full: '就労定着支援',    order: 4 },
    selection:  { short: '就労選択',  full: '就労選択支援',    order: 5 },
    general:    { short: '障害者求人', full: '一般の障害者求人', order: 6 },
  };
  const STAR_LABELS = ['', '一応気になる', 'ちょっと気になる', '気になる', 'かなり気になる', '最優先で気になる'];
  const STATUSES = ['検討中', '連絡済み', '見学予定', '見学完了', '応募予定', '応募中', '面談予定', '面談完了', '連絡待ち', '入社決定'];

  // ---- データ ----
  const DATA = window.NW_DATA || { meta: {}, items: [] };
  const byId = new Map(DATA.items.map((it) => [it.id, it]));
  const byWam = new Map();
  for (const it of DATA.items) {
    if (!it.wamNo) continue;
    if (!byWam.has(it.wamNo)) byWam.set(it.wamNo, []);
    byWam.get(it.wamNo).push(it);
  }

  // ---- 小さな道具 ----
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const norm = (s) => toHira(String(s ?? '').normalize('NFKC').toLowerCase()).replace(/\s+/g, ' ');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6c.4 0 .8.2 1 .6l2.4 4.9 5.4.8c.9.1 1.3 1.3.6 1.9l-3.9 3.8.9 5.4c.2.9-.8 1.6-1.6 1.2L12 18.6l-4.8 2.6c-.8.4-1.8-.3-1.6-1.2l.9-5.4-3.9-3.8c-.7-.6-.3-1.8.6-1.9l5.4-.8L11 3.2c.2-.4.6-.6 1-.6z"/></svg>';
  const ICON = {
    pin: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    briefcase: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12.5h18"/></svg>',
    home: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    doc: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    ext: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    tel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
    map: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    star: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>',
    info: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  };

  // =========================================================
  // ローカルストレージ
  // =========================================================
  const KEY = 'nextwork-sapporo:v1';
  const emptyData = () => ({ version: 1, items: {}, meta: {} });

  const Store = {
    d: emptyData(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        this.d = parsed && typeof parsed === 'object' && parsed.items ? { ...emptyData(), ...parsed } : emptyData();
      } catch { this.d = emptyData(); }
      return this;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.d)); return true; }
      catch { toast('このブラウザでは保存できませんでした（プライベートモードなど）', { icon: 'info' }); return false; }
    },
    get(id) { return this.d.items[id] || null; },
    stars(id) { return this.d.items[id]?.stars || 0; },
    /** 星・進捗・メモを更新。全部が初期値に戻ったら記録ごと消す */
    update(id, patch, item) {
      const now = Date.now();
      const cur = this.d.items[id] || { stars: 0, status: STATUSES[0], memo: '', createdAt: now };
      Object.assign(cur, patch, { updatedAt: now });
      if (item) cur.snap = { name: item.name, type: item.type, ward: item.ward, title: item.job?.title || '', wage: item.job?.wage || '' };
      if (!cur.stars && !cur.memo && cur.status === STATUSES[0]) delete this.d.items[id];
      else this.d.items[id] = cur;
      this.save();
      emit(id);
      return cur;
    },
    favorites() {
      return Object.entries(this.d.items)
        .filter(([, v]) => v.stars > 0)
        .map(([id, v]) => ({ id, ...v, item: byId.get(id) || null }));
    },
    count() { return Object.values(this.d.items).filter((v) => v.stars > 0).length; },

    // ---- エクスポート／インポート ----
    exportFile() {
      const payload = { app: 'next-work-sapporo', version: 1, exportedAt: new Date().toISOString(), items: this.d.items };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const d = new Date();
      const name = `nextwork-sapporo_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      this.d.meta.lastExport = Date.now();
      this.save();
      return { name, count: Object.keys(this.d.items).length };
    },
    /** 読み込み前に中身を確かめ、きれいな形にそろえて返す（不正ならエラー） */
    parseImport(text) {
      let obj;
      try { obj = JSON.parse(text); } catch { throw new Error('JSONファイルとして読めませんでした。'); }
      const items = obj?.items;
      if (!items || typeof items !== 'object' || Array.isArray(items)) throw new Error('このサイトから書き出したファイルではないようです。');
      const clean = {};
      for (const [id, v] of Object.entries(items)) {
        if (typeof id !== 'string' || id.length > 80 || !v || typeof v !== 'object') continue;
        const stars = Math.max(0, Math.min(5, Math.round(Number(v.stars) || 0)));
        const status = STATUSES.includes(v.status) ? v.status : STATUSES[0];
        const memo = typeof v.memo === 'string' ? v.memo.slice(0, 20000) : '';
        const snap = v.snap && typeof v.snap === 'object'
          ? Object.fromEntries(['name', 'type', 'ward', 'title', 'wage'].map((k) => [k, typeof v.snap[k] === 'string' ? v.snap[k].slice(0, 300) : '']))
          : undefined;
        clean[id] = { stars, status, memo, createdAt: Number(v.createdAt) || Date.now(), updatedAt: Number(v.updatedAt) || Date.now(), ...(snap ? { snap } : {}) };
      }
      return clean;
    },
    applyImport(clean, mode) {
      let added = 0, updated = 0, kept = 0;
      if (mode === 'replace') {
        this.d.items = clean;
        added = Object.keys(clean).length;
      } else {
        for (const [id, v] of Object.entries(clean)) {
          const cur = this.d.items[id];
          if (!cur) { this.d.items[id] = v; added++; }
          else if ((v.updatedAt || 0) > (cur.updatedAt || 0)) { this.d.items[id] = v; updated++; }
          else kept++;
        }
      }
      this.save();
      emit(null);
      return { added, updated, kept };
    },
    clearAll() { this.d.items = {}; this.save(); emit(null); },
  };
  Store.load();

  function emit(id) { document.dispatchEvent(new CustomEvent('nw:change', { detail: { id } })); }
  // 別のタブで変更されたときも反映
  window.addEventListener('storage', (e) => { if (e.key === KEY) { Store.load(); emit(null); } });

  // =========================================================
  // ヘッダー・背景・共通の動き
  // =========================================================
  function updateBadge(bump) {
    const n = Store.count();
    $$('[data-fav-count]').forEach((b) => {
      b.hidden = n === 0;
      b.textContent = n > 99 ? '99+' : n;
      if (bump && n) gsap.fromTo(b, { scale: 1.6 }, { scale: 1, duration: .6, ease: 'elastic.out(1.2, .4)' });
    });
  }
  document.addEventListener('nw:change', () => updateBadge(false));

  function initChrome() {
    updateBadge(false);
    const header = $('#siteHeader');
    const toTop = $('#toTop');
    const onScroll = () => {
      header?.classList.toggle('is-scrolled', scrollY > 8);
      toTop?.classList.toggle('is-shown', scrollY > 600);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

    // 出典（文言中のシステム名だけ公式サイトへ別タブでリンク）
    const SOURCE_LINKS = [
      { label: '障害福祉サービス情報公表システム', href: 'https://www.wam.go.jp/sfkohyoout/COP000100E0000.do' },
      { label: 'ハローワークインターネットサービス', href: 'https://www.hellowork.mhlw.go.jp/index.html' },
    ];
    /** 出典文の特定語句を <a target="_blank"> に差し替えて el に入れる（XSS 回避のため textContent で組み立てる） */
    const fillSource = (el, text) => {
      el.replaceChildren();
      let rest = text;
      while (rest) {
        let bestAt = -1;
        let best = null;
        for (const link of SOURCE_LINKS) {
          const at = rest.indexOf(link.label);
          if (at !== -1 && (bestAt === -1 || at < bestAt)) {
            bestAt = at;
            best = link;
          }
        }
        if (!best) {
          el.append(rest);
          break;
        }
        if (bestAt > 0) el.append(rest.slice(0, bestAt));
        const a = document.createElement('a');
        a.href = best.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = best.label;
        el.append(a);
        rest = rest.slice(bestAt + best.label.length);
      }
    };
    $$('[data-source]').forEach((el) => {
      const m = DATA.meta || {};
      fillSource(el, `${m.source || ''}${m.helloworkDate ? `（求人情報の取得日：${m.helloworkDate}）` : ''}`);
    });

    // 背景のふわふわ（ゆっくり漂う＋マウスにすこしついてくる）
    if (!reduced) {
      $$('.blob').forEach((b, i) => {
        gsap.to(b, { x: `random(-80, 80)`, y: `random(-60, 60)`, scale: `random(.9, 1.15)`, duration: 9 + i * 2, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true });
      });
      const layer = $('.bg-blobs');
      if (layer && matchMedia('(pointer: fine)').matches) {
        const qx = gsap.quickTo(layer, 'x', { duration: 1.8, ease: 'power3' });
        const qy = gsap.quickTo(layer, 'y', { duration: 1.8, ease: 'power3' });
        addEventListener('pointermove', (e) => { qx((e.clientX / innerWidth - .5) * 30); qy((e.clientY / innerHeight - .5) * 30); }, { passive: true });
      }
    }

    // ページの入り（見出しは一文字ずつ）
    $$('.hero__title, .page-hero__title').forEach(splitChars);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.site-header', { y: -20, opacity: 0, duration: .6 })
      .from('[data-hero-anim]', { y: 24, opacity: 0, duration: .8, stagger: .08, clearProps: 'transform' }, '-=.3')
      .from('.hero__title .char, .page-hero__title .char', { y: 28, opacity: 0, rotate: 6, duration: .7, stagger: .025, ease: 'back.out(2)' }, '<');
    initSegmented();
  }

  /** テキストを一文字ずつ<span>に分ける（中の<em>などのタグは残す） */
  function splitChars(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            if (!ch.trim()) { frag.append(ch); return; }
            const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ''));
    walk(el);
    $$('.char', el).forEach((c) => c.setAttribute('aria-hidden', 'true'));
  }

  /** セグメントボタンの白い「つまみ」を選択肢の下にすべらせる */
  function initSegmented(root = document) {
    $$('.segmented', root).forEach((seg) => {
      if (seg._thumb) return;
      const thumb = document.createElement('span');
      thumb.className = 'segmented__thumb';
      seg.prepend(thumb);
      seg._thumb = thumb;
      seg.addEventListener('change', () => placeThumb(seg, true));
      placeThumb(seg, false);
    });
  }
  function placeThumb(seg, animate) {
    const checked = seg.querySelector('input:checked')?.closest('label');
    if (!checked || !seg.offsetWidth) return;
    const v = { x: checked.offsetLeft - 4, width: checked.offsetWidth, left: 4 };
    animate ? gsap.to(seg._thumb, { ...v, duration: .45, ease: 'back.out(1.6)' }) : gsap.set(seg._thumb, v);
  }
  const refreshSegmented = (root = document) => $$('.segmented', root).forEach((s) => placeThumb(s, false));
  addEventListener('resize', debounce(() => refreshSegmented(), 150));

  // =========================================================
  // トースト
  // =========================================================
  function toast(msg, { action, icon = 'check', duration = 3600 } = {}) {
    const stack = $('#toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${ICON[icon] || ''}<span class="toast__msg">${esc(msg)}</span>`;
    if (action) {
      const a = document.createElement(action.href ? 'a' : 'button');
      a.className = 'toast__action';
      a.textContent = action.label;
      if (action.href) a.href = action.href;
      a.addEventListener('click', () => { action.onClick?.(); hide(); });
      el.append(a);
    }
    stack.append(el);
    gsap.fromTo(el, { y: 24, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .45, ease: 'back.out(1.8)' });
    let gone = false;
    const hide = () => { if (gone) return; gone = true; gsap.to(el, { y: 12, opacity: 0, duration: .3, onComplete: () => el.remove() }); };
    setTimeout(hide, duration);
    return hide;
  }

  // =========================================================
  // エフェクト：はじける・飛んでいく星・紙吹雪
  // =========================================================
  function burst(x, y, n = 12) {
    if (reduced) return;
    const wrap = document.createElement('div');
    wrap.className = 'burst';
    wrap.style.left = `${x}px`; wrap.style.top = `${y}px`;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      if (i % 3 === 0) p.className = 'heart';
      else p.style.background = ['#ff8aa8', '#ffc0d0', '#f6a5bd', '#ffd9e3'][i % 4];
      wrap.append(p);
      const ang = (Math.PI * 2 * i) / n + Math.random() * .4;
      const dist = 34 + Math.random() * 26;
      gsap.fromTo(p, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, scale: 0, opacity: 0, rotate: Math.random() * 180, duration: .8 + Math.random() * .3, ease: 'power3.out' });
    }
    document.body.append(wrap);
    setTimeout(() => wrap.remove(), 1300);
  }

  /** 星がマイページのボタンまで飛んでいく（どこに保存されたかが分かる） */
  function flyStar(fromEl) {
    const target = $('#mypageLink');
    if (!fromEl || !target || reduced) { updateBadge(true); return; }
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'fly-star';
    s.innerHTML = STAR_SVG;
    document.body.append(s);
    const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
    const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
    gsap.set(s, { x: sx, y: sy });
    const tl = gsap.timeline({ onComplete: () => { s.remove(); updateBadge(true); gsap.fromTo(target, { scale: .92 }, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' }); } });
    tl.to(s, { x: ex, duration: .9, ease: 'power1.inOut' }, 0)
      .to(s, { y: Math.min(sy, ey) - 80, duration: .4, ease: 'power2.out' }, 0)
      .to(s, { y: ey, duration: .5, ease: 'power2.in' }, .4)
      .to(s, { rotate: 360, scale: .6, duration: .9, ease: 'none' }, 0)
      .to(s, { opacity: 0, duration: .15 }, .8);
  }

  function confetti() {
    if (reduced) return;
    const colors = ['#ff8aa8', '#ffc0d0', '#ea6c8f', '#ffe3eb', '#f3b878', '#b9a2ee', '#7fd0b0'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.background = colors[i % colors.length];
      document.body.append(c);
      const x = innerWidth / 2 + (Math.random() - .5) * 160;
      gsap.set(c, { x, y: innerHeight * .35, rotate: Math.random() * 360 });
      gsap.to(c, {
        x: x + (Math.random() - .5) * innerWidth * .9,
        y: `-=${150 + Math.random() * 260}`,
        rotate: '+=' + (Math.random() * 720 - 360),
        duration: .7, ease: 'power2.out',
      });
      gsap.to(c, { y: innerHeight + 40, duration: 1.8 + Math.random(), delay: .6, ease: 'power1.in', rotateX: 720, onComplete: () => c.remove() });
    }
  }

  // =========================================================
  // 星のレーティング部品
  // =========================================================
  /**
   * @param {HTMLElement} host 入れ物
   * @param {{value:number, size?:'sm', meaning?:HTMLElement, onChange:(n:number, btn:HTMLElement)=>void}} opt
   */
  function mountStars(host, opt) {
    let value = opt.value || 0;
    host.classList.add('stars');
    if (opt.size === 'sm') host.classList.add('stars--sm');
    host.setAttribute('role', 'radiogroup');
    host.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn" role="radio" data-n="${n}" aria-label="星${n}つ：${STAR_LABELS[n]}">${STAR_SVG}</button>`).join('');
    const btns = $$('.star-btn', host);
    const meaning = opt.meaning;
    const paint = (shown, preview) => {
      btns.forEach((b, i) => {
        b.classList.toggle('is-on', !preview && i < shown);
        b.classList.toggle('is-preview', !!preview && i < shown);
        b.setAttribute('aria-checked', String(i + 1 === value));
        b.tabIndex = (value ? i + 1 === value : i === 0) ? 0 : -1;
      });
      if (meaning) {
        const n = preview ? shown : value;
        meaning.textContent = n ? `${'★'.repeat(n)}  ${STAR_LABELS[n]}` : '星を押して「気になる度」をつけましょう';
        meaning.classList.toggle('is-placeholder', !n);
      }
    };
    paint(value);
    btns.forEach((b) => {
      const n = Number(b.dataset.n);
      b.addEventListener('pointerenter', () => paint(n, n !== value));
      b.addEventListener('focus', () => paint(value));
      b.addEventListener('click', () => {
        const prev = value;
        value = n;
        paint(value);
        // 押した星までをポンと弾ませる
        gsap.fromTo(btns.slice(0, n).map((x) => x.querySelector('svg')), { scale: .6, rotate: -15 }, { scale: 1, rotate: 0, duration: .6, stagger: .05, ease: 'elastic.out(1.1, .45)' });
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, 8 + n * 2);
        if (prev !== n) opt.onChange(n, b, prev);
      });
      b.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        const next = Math.max(1, Math.min(5, (value || 0) + k));
        btns[next - 1].focus();
        btns[next - 1].click();
      });
    });
    host.addEventListener('pointerleave', () => paint(value));
    return { set(n) { value = n; paint(value); }, get: () => value };
  }

  /** 星を変更したときの共通処理（保存・トースト・飛ぶ星） */
  function rateItem(item, n, btn, prev) {
    Store.update(item.id, { stars: n }, item);
    if (!prev && n) {
      flyStar(btn);
      toast(`マイページに追加しました（${STAR_LABELS[n]}）`, { icon: 'star', action: document.body.dataset.page === 'mypage' ? null : { label: '見にいく', href: 'mypage.html' } });
    } else if (n) {
      toast(`気になる度を「${STAR_LABELS[n]}」にしました`, { icon: 'star' });
    }
  }

  // =========================================================
  // 詳細モーダル
  // =========================================================
  const modal = { el: null, panel: null, body: null, lastFocus: null, open: false, item: null };

  function row(label, value, wide) {
    if (!value) return '';
    return `<div class="${wide ? 'is-wide' : ''}"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  }

  function buildDetail(it) {
    const t = TYPES[it.type] || TYPES.general;
    const j = it.job;
    const stars = Store.stars(it.id);
    const mapUrl = it.lat && it.lng
      ? `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`
      : (it.addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.addr)}` : '');
    const siblings = it.wamNo ? (byWam.get(it.wamNo) || []).filter((x) => x.id !== it.id && x.job) : [];

    const jobSection = j ? `
      <section class="md-section" data-md-anim>
        <h3 class="md-section__title">${ICON.briefcase}求人の内容</h3>
        ${j.wage ? `<p class="md-wage">${j.wageType ? `<small>${esc(j.wageType)}</small>` : ''}<b>${esc(j.wage)}</b></p>` : ''}
        <dl class="md-dl">
          ${row('職種', esc(j.title), true)}
          ${row('雇用形態', esc(j.emp))}
          ${row('雇用期間', esc(j.period))}
          ${row('就業時間', esc(j.time), true)}
          ${row('休日', esc(j.holiday), true)}
          ${row('週の勤務日数', esc(j.days))}
          ${row('求人の区分', esc(j.kind))}
          ${row('加入保険', esc(j.insurance))}
          ${row('通勤手当', esc(j.commute))}
          ${row('マイカー通勤', esc(j.car))}
          ${row('試用期間', esc(j.trial))}
          ${row('必要な経験', esc(j.exp))}
          ${row('必要な資格', esc(j.license))}
          ${row('年齢', esc(j.age))}
          ${row('最寄り駅', esc([j.station, j.access].filter(Boolean).join(' ／ ')))}
          ${row('就業場所', esc(j.place), true)}
          ${row('募集人数', esc(j.count))}
          ${row('受付日 ／ 紹介期限', esc([j.accepted, j.expires].filter(Boolean).join(' 〜 ')))}
          ${row('受理したハローワーク', esc(j.office))}
          ${row('求人番号', esc(j.no))}
        </dl>
      </section>
      ${j.desc ? `<section class="md-section" data-md-anim><h3 class="md-section__title">${ICON.doc}仕事の内容</h3><p class="md-text">${esc(j.desc)}</p></section>` : ''}
      ${j.business ? `<section class="md-section" data-md-anim><h3 class="md-section__title">${ICON.info}事業の内容</h3><p class="md-text">${esc(j.business)}</p></section>` : ''}
      ${j.notes ? `<section class="md-section" data-md-anim><h3 class="md-section__title">${ICON.info}求人についての特記事項</h3><p class="md-text">${esc(j.notes)}</p></section>` : ''}
      ${j.url ? `<div class="md-actions" data-md-anim><a class="btn btn--primary" href="${esc(j.url)}" target="_blank" rel="noopener">ハローワークで求人票を見る ${ICON.ext}</a></div>` : ''}
    ` : '';

    const facility = `
      <section class="md-section" data-md-anim>
        <h3 class="md-section__title">${ICON.home}${it.wamNo ? '事業所の情報' : '会社の情報'}</h3>
        <dl class="md-dl">
          ${row('種類', esc(t.full))}
          ${row('定員', it.cap ? `${it.cap}名` : '')}
          ${row('住所', esc(it.addr), true)}
          ${row('電話番号', it.tel ? `<a href="tel:${esc(it.tel.replace(/[^\d+]/g, ''))}">${esc(it.tel)}</a>` : '')}
          ${row('利用できる時間（平日）', esc(it.hours))}
          ${row('定休日', esc(it.closed), true)}
          ${row('Webサイト', it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.url)}</a>` : '', true)}
          ${!j && it.wamNo ? row('ハローワークの求人', it.jobCount ? `${it.jobCount}件` : '現在、見つかった求人はありません') : ''}
        </dl>
        <div class="md-actions">
          ${mapUrl ? `<a class="btn btn--soft" href="${esc(mapUrl)}" target="_blank" rel="noopener">${ICON.map}地図で見る</a>` : ''}
          ${it.tel ? `<a class="btn btn--soft" href="tel:${esc(it.tel.replace(/[^\d+]/g, ''))}">${ICON.tel}電話する</a>` : ''}
          ${it.url ? `<a class="btn btn--soft" href="${esc(it.url)}" target="_blank" rel="noopener">${ICON.ext}Webサイト</a>` : ''}
        </div>
      </section>`;

    const others = siblings.length ? `
      <section class="md-section" data-md-anim>
        <h3 class="md-section__title">${ICON.briefcase}この事業所のほかの求人</h3>
        <div class="md-other">
          ${siblings.map((s) => `<button type="button" data-open-id="${esc(s.id)}"><span>${esc(s.job.title)}<br><small style="color:var(--ink-faint)">${esc(s.job.wage || '')}</small></span>${ICON.arrow}</button>`).join('')}
        </div>
      </section>` : '';

    return `
      <header class="md-head">
        <div class="md-head__meta">
          <span class="type-badge" data-type="${it.type}">${esc(t.short)}</span>
          ${it.ward ? `<span class="md-head__ward">${ICON.pin}${esc(it.ward)}</span>` : ''}
        </div>
        <h2 class="md-title" id="modalTitle">${esc(it.name || '（名称なし）')}</h2>
        ${it.kana ? `<p class="md-kana">${esc(it.kana)}</p>` : ''}
        ${it.corp ? `<p class="md-corp">運営：${esc(it.corp)}</p>` : ''}
        <div class="rating" data-md-anim>
          <div class="rating__row">
            <span class="rating__label">気になる度</span>
            <div id="mdStars"></div>
            <span class="rating__meaning" id="mdMeaning" aria-live="polite"></span>
          </div>
          <div class="rating__foot" id="mdRatingFoot" ${stars ? '' : 'hidden'}>
            <span>マイページで進み具合やメモを記録できます</span>
            <span>
              <button type="button" class="rating__clear" id="mdClear">星を外す</button>
              ${document.body.dataset.page === 'mypage' ? '' : `&nbsp; <a href="mypage.html">マイページへ ${ICON.arrow}</a>`}
            </span>
          </div>
        </div>
      </header>
      <div class="md-body">
        ${jobSection}
        ${facility}
        ${others}
        <p class="md-source">${esc(DATA.meta?.source || '')}</p>
      </div>`;
  }

  function openDetail(id, originEl) {
    const it = byId.get(id);
    if (!it) { toast('この情報は最新のデータに見つかりませんでした', { icon: 'info' }); return; }
    modal.el ||= $('#detailModal');
    modal.panel ||= $('.modal__panel', modal.el);
    modal.body ||= $('#modalBody');
    const switching = modal.open;
    modal.item = it;
    if (!switching) modal.lastFocus = originEl || document.activeElement;
    modal.body.innerHTML = buildDetail(it);
    modal.body.scrollTop = 0;
    // 2列の表で1つだけ余るマスは横いっぱいに広げる
    $$('.md-dl', modal.body).forEach((dl) => {
      const cells = [...dl.children];
      let col = 0;
      cells.forEach((c, i) => {
        if (c.classList.contains('is-wide')) { col = 0; return; }
        const next = cells[i + 1];
        if (col === 0 && (!next || next.classList.contains('is-wide'))) { c.classList.add('is-wide'); return; }
        col = col ? 0 : 1;
      });
    });

    const stars = mountStars($('#mdStars'), {
      value: Store.stars(it.id),
      meaning: $('#mdMeaning'),
      onChange: (n, btn, prev) => { rateItem(it, n, btn, prev); showFoot(true); },
    });
    const foot = $('#mdRatingFoot');
    const showFoot = (on) => {
      if (on === !foot.hidden) return;
      foot.hidden = !on;
      if (on) gsap.from(foot, { height: 0, opacity: 0, duration: .4, ease: 'power2.out', clearProps: 'all' });
    };
    $('#mdClear').addEventListener('click', () => {
      const prev = Store.stars(it.id);
      Store.update(it.id, { stars: 0 }, it);
      stars.set(0);
      showFoot(false);
      toast('マイページから外しました', { icon: 'info', action: { label: '元に戻す', onClick: () => { Store.update(it.id, { stars: prev }, it); stars.set(prev); showFoot(true); } } });
    });
    $$('[data-open-id]', modal.body).forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.openId)));

    const isSheet = matchMedia('(max-width: 767px)').matches;
    if (switching) {
      gsap.fromTo($$('[data-md-anim], .md-head > *', modal.body), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .4, stagger: .03, ease: 'power2.out' });
      return;
    }
    modal.open = true;
    modal.el.hidden = false;
    document.body.classList.add('is-locked');

    // 押した場所からふわっと広がる
    let origin = '50% 50%';
    if (originEl && !isSheet) {
      const r = originEl.getBoundingClientRect();
      const p = modal.panel.getBoundingClientRect();
      origin = `${r.left + r.width / 2 - p.left}px ${r.top + r.height / 2 - p.top}px`;
    }
    gsap.killTweensOf([modal.panel, $('.modal__backdrop', modal.el)]);
    gsap.fromTo($('.modal__backdrop', modal.el), { opacity: 0 }, { opacity: 1, duration: .35 });
    if (isSheet) gsap.fromTo(modal.panel, { yPercent: 100 }, { yPercent: 0, y: 0, duration: .55, ease: 'power4.out' });
    else gsap.fromTo(modal.panel, { opacity: 0, scale: .9, y: 20, transformOrigin: origin }, { opacity: 1, scale: 1, y: 0, duration: .55, ease: 'expo.out' });
    gsap.from($$('[data-md-anim], .md-head > *', modal.body), { y: 18, opacity: 0, duration: .5, stagger: .045, delay: .12, ease: 'power3.out', clearProps: 'transform,opacity' });
    modal.panel.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!modal.open) return;
    modal.open = false;
    const isSheet = matchMedia('(max-width: 767px)').matches;
    gsap.to($('.modal__backdrop', modal.el), { opacity: 0, duration: .3 });
    gsap.to(modal.panel, {
      ...(isSheet ? { yPercent: 100, duration: .4, ease: 'power3.in' } : { opacity: 0, scale: .95, y: 10, duration: .25, ease: 'power2.in' }),
      onComplete: () => {
        modal.el.hidden = true;
        gsap.set(modal.panel, { clearProps: 'all' });
        document.body.classList.remove('is-locked');
        modal.lastFocus?.focus?.({ preventScroll: true });
        document.dispatchEvent(new CustomEvent('nw:modalclose', { detail: { id: modal.item?.id } }));
      },
    });
  }

  function initModal() {
    const el = $('#detailModal');
    if (!el) return;
    el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDetail(); });
    document.addEventListener('keydown', (e) => {
      if (!modal.open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDetail(); }
      if (e.key === 'Tab') { // フォーカスをモーダルの中に閉じ込める
        const f = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex="0"]', modal.panel).filter((x) => x.offsetParent);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.panel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // スマホ：上のつまみを下に引っぱると閉じる
    const grip = $('.modal__grip', el);
    const panel = $('.modal__panel', el);
    let startY = 0, dy = 0, dragging = false;
    grip.addEventListener('pointerdown', (e) => { dragging = true; startY = e.clientY; dy = 0; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', (e) => { if (!dragging) return; dy = Math.max(0, e.clientY - startY); gsap.set(panel, { y: dy }); });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (dy > 110) closeDetail();
      else gsap.to(panel, { y: 0, duration: .5, ease: 'elastic.out(1, .6)' });
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  // =========================================================
  // 確認ダイアログ（なければ window.confirm）
  // =========================================================
  function confirmDialog(title, text, okLabel = 'OK') {
    const el = $('#confirmModal');
    if (!el) return Promise.resolve(window.confirm(`${title}\n${text}`));
    return new Promise((resolve) => {
      const panel = $('.modal__panel', el);
      const prevFocus = document.activeElement;
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      $('[data-ok]', el).textContent = okLabel;
      el.hidden = false;
      document.body.classList.add('is-locked');
      gsap.fromTo($('.modal__backdrop', el), { opacity: 0 }, { opacity: 1, duration: .25 });
      gsap.fromTo(panel, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .4, ease: 'back.out(1.8)' });
      $('[data-ok]', el).focus();
      const finish = (ok) => {
        el.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey, true);
        gsap.to(panel, { opacity: 0, scale: .96, duration: .18 });
        gsap.to($('.modal__backdrop', el), { opacity: 0, duration: .2, onComplete: () => { el.hidden = true; if (!modal.open) document.body.classList.remove('is-locked'); prevFocus?.focus?.(); } });
        resolve(ok);
      };
      const onClick = (e) => { if (e.target.closest('[data-ok]')) finish(true); else if (e.target.closest('[data-cancel]')) finish(false); };
      const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
      el.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey, true);
    });
  }

  // ---- 公開 ----
  window.NW = {
    gsap, reduced, $, $$, esc, norm, debounce, fmtDate,
    TYPES, STAR_LABELS, STATUSES, STAR_SVG, ICON,
    DATA, byId, Store,
    toast, burst, flyStar, confetti, mountStars, rateItem,
    openDetail, closeDetail, confirmDialog, initSegmented, refreshSegmented, updateBadge,
  };

  document.addEventListener('DOMContentLoaded', () => { initChrome(); initModal(); });
})();

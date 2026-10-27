/* ==========================================================
   Ruu Ceylon - showroom script (no build step, plain JavaScript)
   Everything you see on the page comes from:
     data/site.json      -> texts, contact, slideshow, categories
     data/products.json  -> products, prices, photos, owner feedback
   ========================================================== */
(() => {
  'use strict';

  const S = {
    lang: localStorage.getItem('rc_lang') || 'si',
    cat: 'all', q: '', sort: 'default',
    site: null, products: [], byId: {}, summary: {},
    slideIndex: 0, timer: null,
  };

  const $ = (s, r = document) => r.querySelector(s);
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[S.lang] || o.si || o.en || ''));
  const u = (k) => L(S.site.ui[k]);
  const fmt = (n) => `${u('rs')} ${Number(n).toLocaleString('en-US')}`;

  // wa.me needs digits only with the country code: "076 280 6860" -> "94762806860"
  const waNum = (n) => { const d = String(n || '').replace(/\D/g, ''); return d.startsWith('94') ? d : d.replace(/^0+/, '94'); };

  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
    return n;
  }

  const svg = (inner, fill) =>
    `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    x: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
    left: svg('<path d="M15 5l-7 7 7 7"/>'),
    right: svg('<path d="M9 5l7 7-7 7"/>'),
    chat: svg('<path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.8-.9L3 21l2-5.2A8.4 8.4 0 1121 11.5z"/>'),
    phone: svg('<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>'),
    bag: svg('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>'),
    link: svg('<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>'),
  };

  /* ---------- small helpers ---------- */
  const starsEl = (n) => {
    const r = Math.round(n);
    return el('span', { class: 'stars', role: 'img', 'aria-label': `${n} ${u('stars')}` },
      '★'.repeat(r), el('span', { class: 'off' }, '★'.repeat(5 - r)));
  };
  const dateText = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt) ? String(d) : dt.toLocaleDateString(S.lang === 'si' ? 'si-LK' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const shareUrl = (id) => `${location.origin}${location.pathname}#product=${encodeURIComponent(id)}`;

  /* ---------- load ---------- */
  async function init() {
    try {
      const [site, prod] = await Promise.all([
        fetch('data/site.json').then((r) => r.json()),
        fetch('data/products.json').then((r) => r.json()),
      ]);
      S.site = site;
      S.products = prod.products.filter((p) => !p.hidden);
      S.byId = Object.fromEntries(S.products.map((p) => [p.id, p]));
    } catch (e) {
      document.body.insertAdjacentHTML('afterbegin',
        '<p style="padding:24px;font-family:sans-serif">Could not load data files. If you opened index.html directly from a folder, run a small web server instead (see README) or deploy to Vercel.</p>');
      console.error(e);
      return;
    }
    bindStatic();
    applyLang();
    loadSummary();
    loadRecent();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  function bindStatic() {
    document.querySelectorAll('.lang button').forEach((b) =>
      b.addEventListener('click', () => { S.lang = b.dataset.lang; localStorage.setItem('rc_lang', S.lang); applyLang(); }));
    $('#q').addEventListener('input', (e) => { S.q = e.target.value.trim().toLowerCase(); renderGrid(); });
    $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; renderGrid(); });
    $('#year').textContent = `© ${new Date().getFullYear()}`;
    const dlg = $('#pm');
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeProduct(); });
    dlg.addEventListener('close', () => { if (location.hash.startsWith('#product=')) history.replaceState(null, '', location.pathname + location.search); });
  }

  function applyLang() {
    document.documentElement.lang = S.lang === 'si' ? 'si' : 'en';
    document.querySelectorAll('[data-ui]').forEach((n) => { n.textContent = u(n.dataset.ui); });
    document.querySelectorAll('[data-ui-ph]').forEach((n) => { n.placeholder = u(n.dataset.uiPh); });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
    const b = S.site.brand;
    $('#brandTagline').textContent = L(b.tagline);
    $('#brandMotto').textContent = L(b.motto);
    $('#aboutTitle').textContent = L(S.site.about.title);
    $('#aboutText').textContent = L(S.site.about.text);
    $('#footNote').textContent = L(S.site.footerNote);
    renderSlides();
    renderChips();
    renderGrid();
    renderContact();
    renderMainForm();
    loadRecent();
    const dlg = $('#pm');
    if (dlg.open && dlg.dataset.pid) renderProduct(dlg.dataset.pid);
  }

  /* ---------- slideshow ---------- */
  function renderSlides() {
    const cfg = S.site.slides;
    const items = (cfg.items || []).filter((s) => s.image);
    S.slideItems = items;
    const root = $('#slider');
    root.replaceChildren();
    $('#sDots').replaceChildren();
    $('#sText').replaceChildren();
    root.closest('.stage').hidden = items.length === 0;
    if (!items.length) return;
    if (S.slideIndex >= items.length) S.slideIndex = 0;

    items.forEach((s, i) => {
      const pid = s.product && S.byId[s.product] ? s.product : null;
      root.append(el('div', { class: 'slide' + (i === S.slideIndex ? ' on' : ''), role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} / ${items.length}` },
        el('img', { class: 'bg', src: s.image, alt: '', 'aria-hidden': 'true' }),
        el('img', { class: 'fg', src: s.image, alt: L(s.title), loading: i === 0 ? 'eager' : 'lazy' }),
        s.label ? el('span', { class: 'tag-label' }, L(s.label)) : null,
        pid ? el('button', { class: 'slide-btn', type: 'button', 'aria-label': `${L(s.title)} - ${u('view')}`, onclick: () => openProduct(pid) }) : null));
    });

    if (items.length > 1) {
      root.append(
        el('button', { class: 's-arrow s-prev', type: 'button', 'aria-label': u('prev'), html: ICON.left, onclick: () => goSlide(S.slideIndex - 1, true) }),
        el('button', { class: 's-arrow s-next', type: 'button', 'aria-label': u('next'), html: ICON.right, onclick: () => goSlide(S.slideIndex + 1, true) }));
      $('#sDots').append(...items.map((_, i) =>
        el('button', { type: 'button', 'aria-label': `${u('slide')} ${i + 1}`, 'aria-current': String(i === S.slideIndex), onclick: () => goSlide(i, true) })));
      const stage = root.closest('.stage');
      stage.onmouseenter = stopAuto; stage.onmouseleave = startAuto;
      stage.onfocusin = stopAuto; stage.onfocusout = startAuto;
      let x0 = null;
      root.ontouchstart = (e) => { x0 = e.touches[0].clientX; stopAuto(); };
      root.ontouchend = (e) => {
        if (x0 != null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) goSlide(S.slideIndex + (dx < 0 ? 1 : -1), true); }
        x0 = null; startAuto();
      };
      startAuto();
    }
    showSlideText();
  }
  function showSlideText() {
    const s = (S.slideItems || [])[S.slideIndex];
    const box = $('#sText');
    box.replaceChildren();
    if (!s) return;
    if (s.title) box.append(el('strong', {}, L(s.title)));
    if (s.caption) box.append(el('span', {}, L(s.caption)));
  }
  function goSlide(i, manual) {
    const slides = document.querySelectorAll('#slider .slide');
    const dots = document.querySelectorAll('#sDots button');
    if (!slides.length) return;
    S.slideIndex = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === S.slideIndex));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === S.slideIndex)));
    showSlideText();
    if (manual) startAuto();
  }
  function stopAuto() { clearInterval(S.timer); S.timer = null; }
  function startAuto() {
    stopAuto();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sec = Math.max(2, Number(S.site.slides.intervalSeconds) || 5);
    S.timer = setInterval(() => { if (!document.hidden) goSlide(S.slideIndex + 1); }, sec * 1000);
  }

  /* ---------- categories + grid ---------- */
  function renderChips() {
    const wrap = $('#chips');
    wrap.replaceChildren();
    const list = [{ id: 'all', si: u('all'), en: u('all') }, ...S.site.categories.filter((c) => S.products.some((p) => p.category === c.id))];
    list.forEach((c) => wrap.append(el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(S.cat === c.id),
      onclick: () => { S.cat = c.id; renderChips(); renderGrid(); },
    }, c.id === 'all' ? c.si : L(c))));
  }

  function visibleProducts() {
    let list = S.products.filter((p) => S.cat === 'all' || p.category === S.cat);
    if (S.q) list = list.filter((p) => `${p.name} ${L(p.desc)} ${p.desc?.si || ''} ${p.desc?.en || ''}`.toLowerCase().includes(S.q));
    if (S.sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (S.sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }

  function renderGrid() {
    const list = visibleProducts();
    const grid = $('#grid');
    grid.replaceChildren(...list.map(card));
    $('#count').textContent = `${list.length} ${u('count')}`;
    const empty = $('#empty');
    empty.hidden = list.length > 0;
    empty.textContent = u('noResults');
  }

  function card(p) {
    const sum = S.summary[p.id];
    return el('article', { class: 'card' },
      el('div', { class: 'card-photo' },
        el('img', { src: p.image, alt: p.name, width: 640, height: 640, loading: 'lazy', decoding: 'async' }),
        p.badge ? el('span', { class: 'badge' }, L(p.badge)) : null,
        p.inStock === false ? el('span', { class: 'badge stock' }, u('outOfStock')) : null,
        el('span', { class: 'price-tag' }, fmt(p.price), p.oldPrice ? el('s', {}, fmt(p.oldPrice)) : null),
        el('button', { class: 'open', type: 'button', 'aria-label': `${p.name} - ${u('view')}`, onclick: () => openProduct(p.id) })),
      el('div', { class: 'card-body' },
        el('h3', {}, p.name),
        el('p', {}, L(p.desc)),
        el('div', { class: 'rate-line' }, sum && sum.count ? [starsEl(sum.avg), ` ${sum.avg.toFixed(1)} (${sum.count})`] : '')));
  }

  /* ---------- contact + footer ---------- */
  function renderContact() {
    const c = S.site.contact;
    const ul = $('#contactList');
    ul.replaceChildren();
    const row = (label, node) => ul.append(el('li', {}, el('b', {}, label), node));
    if (c.phone) row(u('phone'), el('a', { href: `tel:${c.phone}` }, c.phone));
    if (c.whatsapp) row(u('whatsapp'), el('a', { href: `https://wa.me/${waNum(c.whatsapp)}`, target: '_blank', rel: 'noopener' }, c.phone || c.whatsapp));
    if (c.email) row(u('emailLabel'), el('a', { href: `mailto:${c.email}` }, c.email));
    const addr = L(c.address);
    if (addr) row(u('addressLabel'), addr);
    if (c.shopUrl) row('Shop', el('a', { href: c.shopUrl, target: '_blank', rel: 'noopener' }, u('visitShop')));
    [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']].forEach(([k, name]) => {
      if (c[k]) row(name, el('a', { href: c[k], target: '_blank', rel: 'noopener' }, name));
    });
  }

  /* ---------- product dialog ---------- */
  function openProduct(id) {
    if (!S.byId[id]) return;
    const dlg = $('#pm');
    dlg.dataset.pid = id;
    renderProduct(id);
    if (!dlg.open) dlg.showModal();
    history.replaceState(null, '', `#product=${encodeURIComponent(id)}`);
  }
  function closeProduct() { const d = $('#pm'); if (d.open) d.close(); delete d.dataset.pid; }
  function openFromHash() {
    const m = location.hash.match(/^#product=(.+)$/);
    if (m) openProduct(decodeURIComponent(m[1]));
  }

  async function renderProduct(id) {
    const p = S.byId[id];
    const c = S.site.contact;
    const body = $('#pmBody');
    const msg = `${u('orderMessage')}\n${p.name} - ${fmt(p.price)}\n${shareUrl(p.id)}`;

    const actions = el('div', { class: 'pm-actions' });
    if (c.whatsapp) actions.append(el('a', { class: 'btn wa', href: `https://wa.me/${waNum(c.whatsapp)}?text=${encodeURIComponent(msg)}`, target: '_blank', rel: 'noopener', html: ICON.chat + `<span>${u('order')}</span>` }));
    if (c.phone) actions.append(el('a', { class: 'btn alt', href: `tel:${c.phone}`, html: ICON.phone + `<span>${u('call')} ${c.phone}</span>` }));
    if (c.shopUrl) actions.append(el('a', { class: 'btn alt', href: c.shopUrl, target: '_blank', rel: 'noopener', html: ICON.bag + `<span>${u('buyOnShop')}</span>` }));
    const copyBtn = el('button', { class: 'btn alt', type: 'button', html: ICON.link + `<span>${u('share')}</span>` });
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(shareUrl(p.id)); copyBtn.lastChild.textContent = u('copied'); setTimeout(() => (copyBtn.lastChild.textContent = u('share')), 1800); } catch { /* ignore */ }
    });
    actions.append(copyBtn);

    const owner = (p.feedbacks || []);
    const ownerSec = owner.length ? el('section', { class: 'pm-section' },
      el('h3', {}, u('ownerFeedback')),
      el('div', { class: 'comment-list' }, owner.map((f) => commentEl({ name: f.name, rating: f.rating, text: f.text, date: f.date }, true)))) : null;

    const list = el('div', { class: 'comment-list', 'aria-live': 'polite' }, el('p', { class: 'muted' }, '…'));
    const formHost = el('div');
    const rateHost = el('div', { class: 'rate-big' });
    const commentsSec = el('section', { class: 'pm-section' }, el('h3', {}, u('visitorComments')), rateHost, list, el('div', { style: 'margin-top:16px' }, formHost));

    body.replaceChildren(
      el('div', { class: 'pm-x-wrap' }, el('button', { class: 'pm-x', type: 'button', 'aria-label': u('close'), html: ICON.x, onclick: closeProduct })),
      el('div', { class: 'pm-top' },
        el('div', { class: 'pm-photo' }, el('img', { src: p.image, alt: p.name })),
        el('div', { class: 'pm-info' },
          p.badge ? el('span', { class: 'badge', style: 'position:static;align-self:flex-start' }, L(p.badge)) : null,
          el('h2', { id: 'pmTitle' }, p.name),
          el('span', { class: 'pm-price' }, fmt(p.price), p.oldPrice ? el('s', {}, fmt(p.oldPrice)) : null),
          p.inStock === false ? el('p', { class: 'muted' }, u('outOfStock')) : null,
          el('p', { class: 'pm-desc' }, L(p.desc)),
          actions)),
      ...[ownerSec, commentsSec].filter(Boolean));

    formHost.append(buildForm({ productId: p.id, onSent: () => refresh() }));

    async function refresh() {
      const comments = await fetchComments(p.id);
      list.replaceChildren(...(comments.length ? comments.map((c) => commentEl(c)) : [el('p', { class: 'muted' }, u('noComments'))]));
      const rated = comments.filter((c) => c.rating);
      rateHost.replaceChildren();
      if (rated.length) {
        const avg = rated.reduce((a, c) => a + c.rating, 0) / rated.length;
        rateHost.append(starsEl(avg), `${avg.toFixed(1)} (${rated.length})`);
      }
      loadSummary();
    }
    refresh();
  }

  function commentEl(c, owner) {
    const head = el('div', { class: 'c-head' }, el('b', {}, c.name || '—'));
    if (c.rating) head.append(starsEl(c.rating));
    if (c.productName) head.append(el('button', { class: 'c-prod', type: 'button', onclick: () => openProduct(c.product) }, c.productName));
    if (c.date) head.append(el('span', { class: 'c-date' }, dateText(c.date)));
    const photo = c.img && c.id ? el('img', { class: 'c-img', src: `/api/image?id=${encodeURIComponent(c.id)}`, alt: '', loading: 'lazy', onclick: () => window.open(`/api/image?id=${encodeURIComponent(c.id)}`, '_blank') }) : null;
    return el('div', { class: 'comment' + (owner ? ' owner' : '') }, head, el('p', {}, typeof c.text === 'string' ? c.text : L(c.text)), photo);
  }

  /* ---------- photo: shrink in the browser so uploads stay small and fast ---------- */
  function shrinkImage(file, max = 1000) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        let q = 0.75, out = c.toDataURL('image/jpeg', q);
        while (out.length > 400000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        out.length > 450000 ? reject(new Error('big')) : resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad')); };
      img.src = url;
    });
  }

  /* ---------- comment form (used in dialog and in the Reviews section) ---------- */
  let formCounter = 0;
  function buildForm({ productId, onSent }) {
    const uid = `f${++formCounter}`;
    const sel = productId ? null : el('select', { id: `${uid}p`, required: true },
      S.products.map((p) => el('option', { value: p.id }, p.name)));
    const name = el('input', { id: `${uid}n`, type: 'text', maxlength: 40, autocomplete: 'name', required: true });
    const text = el('textarea', { id: `${uid}t`, maxlength: 800, required: true, placeholder: u('formText') });
    const hp = el('input', { class: 'hp', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    const msg = el('div', { role: 'status' });
    const btn = el('button', { class: 'btn', type: 'submit' }, u('formSend'));

    let photo = '';
    const file = el('input', { type: 'file', id: `${uid}f`, accept: 'image/*' });
    const prevImg = el('img', { alt: '' });
    const prevDel = el('button', { type: 'button' }, u('formPhotoRemove'));
    const prev = el('div', { class: 'photo-prev', hidden: true }, prevImg, prevDel);
    const clearPhoto = () => { photo = ''; file.value = ''; prev.hidden = true; prevImg.removeAttribute('src'); };
    prevDel.addEventListener('click', clearPhoto);
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return clearPhoto();
      try { photo = await shrinkImage(f); prevImg.src = photo; prev.hidden = false; msg.className = ''; msg.textContent = ''; }
      catch { clearPhoto(); say('errPhoto'); }
    });
    const photoField = el('div', { class: 'photo-pick' }, el('span', {}, u('formPhoto')), file,
      el('label', { class: 'photo-btn', for: `${uid}f` }, u('formPhotoBtn')), prev);

    const pick = el('div', { class: 'stars-pick' });
    for (let i = 5; i >= 1; i--) {
      pick.append(
        el('input', { type: 'radio', name: `${uid}r`, id: `${uid}r${i}`, value: i }),
        el('label', { for: `${uid}r${i}`, title: `${i} ${u('stars')}` }, '★', el('span', { class: 'sr' }, `${i} ${u('stars')}`)));
    }
    const rating = el('fieldset', { class: 'rating-input' }, el('legend', {}, u('formRating')), pick);

    const form = el('form', { novalidate: true },
      sel ? el('label', { class: 'field', for: `${uid}p` }, el('span', {}, u('formProduct')), sel) : null,
      el('label', { class: 'field', for: `${uid}n` }, el('span', {}, u('formName')), name),
      rating,
      el('label', { class: 'field', for: `${uid}t` }, el('span', {}, u('formText')), text),
      photoField,
      hp, btn, msg);

    const say = (k, ok) => { msg.className = `form-msg ${ok ? 'ok' : 'bad'}`; msg.textContent = u(k); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = Number((form.querySelector(`input[name="${uid}r"]:checked`) || {}).value || 0);
      if (!name.value.trim()) return say('errName');
      if (!r) return say('errRating');
      if (text.value.trim().length < 5) return say('errText');
      btn.disabled = true; btn.textContent = u('formSending'); msg.className = ''; msg.textContent = '';
      try {
        const mode = await postComment({ product: productId || sel.value, name: name.value.trim(), rating: r, text: text.value.trim(), website: hp.value, image: photo });
        say(mode === 'pending' ? 'formThanksPending' : mode === 'local' ? 'formThanksLocal' : 'formThanksLive', true);
        form.reset(); clearPhoto();
        if (onSent) onSent();
        loadRecent();
      } catch (err) {
        say(err.message === '429' ? 'errTooMany' : err.message === '400' ? 'errPhoto' : 'errGeneric');
      } finally { btn.disabled = false; btn.textContent = u('formSend'); }
    });
    return form;
  }

  function renderMainForm() {
    const host = $('#mainFormHost');
    host.replaceChildren(el('h3', {}, u('writeComment')), buildForm({ productId: null }));
  }

  /* ---------- comments: talk to /api/comments (falls back to this browser only) ---------- */
  const LOCAL_KEY = 'rc_local_comments';
  const localList = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };

  async function fetchComments(productId) {
    let out = [];
    try {
      const r = await fetch(`/api/comments?product=${encodeURIComponent(productId)}`);
      if (!r.ok) throw new Error(r.status);
      out = (await r.json()).comments || [];
    } catch { /* API not set up yet */ }
    out = out.concat(localList().filter((c) => c.product === productId));
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async function postComment(payload) {
    let res;
    try {
      res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch { res = null; }
    if (res && res.ok) return (await res.json()).status || 'approved';
    if (res && res.status === 429) throw new Error('429');
    if (res && res.status === 400) throw new Error('400');
    // API missing or not configured -> keep it in this browser so the page still works while testing
    const list = localList();
    list.push({ product: payload.product, name: payload.name, rating: payload.rating, text: payload.text, date: new Date().toISOString() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-100)));
    return 'local';
  }

  async function loadSummary() {
    try {
      const r = await fetch('/api/comments?summary=1');
      if (!r.ok) return;
      S.summary = (await r.json()).summary || {};
      renderGrid();
    } catch { /* ignore */ }
  }

  async function loadRecent() {
    const host = $('#recent');
    if (!host) return;
    let list = [];
    try {
      const r = await fetch('/api/comments?recent=1&limit=6');
      if (r.ok) list = (await r.json()).comments || [];
    } catch { /* ignore */ }
    list = list.concat(localList()).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)
      .map((c) => ({ ...c, productName: S.byId[c.product]?.name }));
    host.replaceChildren(...(list.length ? list.map((c) => commentEl(c)) : [el('p', { class: 'muted' }, u('noComments'))]));
  }

  init();
})();

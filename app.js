const $ = (id) => document.getElementById(id);

// ---- 語言 ----
// 路線頁面（由 tools/build-pages.js 產生）會先設定 window.PAGE：
// { from, to, lang, base（回到網站根目錄的相對路徑）, alt（另一種語言的同一頁） }
const page = () => window.PAGE || {};

function initialLang() {
  if (page().lang) return page().lang;
  try {
    const saved = localStorage.getItem('remit-lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch { /* 讀不到就看瀏覽器語言 */ }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let lang = initialLang();
const t = () => UI[lang];
const en = () => lang === 'en';
const fmt = (n, digits = 0) =>
  n.toLocaleString(t().locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

// 資料檔裡的文字：中文在 data.js，英文在 data.en.js
const placeName = (c) => (en() ? (c.code === HOME.code ? EN.home : EN.countries[c.code]).name : c.name);
const curName = (c) => (en() ? (c.code === HOME.code ? EN.home : EN.countries[c.code]).curName : c.curName);
const routeNote = (c, dir) => {
  const key = dir === 'out' ? 'noteOut' : 'noteIn';
  return en() ? EN.countries[c.code][key] : c[key];
};
const methodName = (m) => (en() ? EN.methods[m.id].name : m.name);
const methodType = (m) => (en() ? EN.types[m.type] : m.type);
const cfgText = (m, dir, field) => (en() ? EN.methods[m.id][dir][field] : m[dir][field]);
const infoText = (m, field) => (en() ? EN.methods[m.id][field] : METHOD_INFO[m.id]?.[field]);
const badgesOf = (m, dir) => (en() ? EN.methods[m.id].badges?.[dir] : METHOD_INFO[m.id]?.badges?.[dir]) || [];
const useLabel = (u) => (en() ? EN.uses[u.id] : u.label);
const dataDate = () =>
  new Date(DATA_UPDATED).toLocaleDateString(t().locale, { year: 'numeric', month: 'long', day: 'numeric' });

// 路線頁面的網址，例如 taiwan-to-usa/、en/uk-to-taiwan/
const SLUGS = { TW: 'taiwan', US: 'usa', CN: 'china', HK: 'hong-kong', SG: 'singapore', GB: 'uk', AU: 'australia' };
const routePath = (from, to, language) => `${language === 'en' ? 'en/' : ''}${SLUGS[from]}-to-${SLUGS[to]}/`;
const ROUTES = [
  ...COUNTRIES.map((c) => [HOME, c]),
  ...COUNTRIES.map((c) => [c, HOME]),
];

const SORTS = [
  { id: 'overall', label: () => t().sortOverall, cmp: (a, b) => b.score - a.score, top: (r) => t().points(r.score.toFixed(1)) },
  { id: 'receive', label: () => t().sortReceive, cmp: (a, b) => b.received - a.received, top: (r, q) => `${fmt(r.received)} ${q.to.cur}` },
  { id: 'fee', label: () => t().sortFee, cmp: (a, b) => a.fees - b.fees || a.cost - b.cost, top: (r) => `NT$${fmt(r.fees)}` },
  { id: 'fast', label: () => t().sortFast, cmp: (a, b) => a.cfg.hoursMin - b.cfg.hoursMin || a.cfg.hoursMax - b.cfg.hoursMax, top: (r, q) => cfgText(r.m, q.dir, 'speedText') },
  { id: 'popular', label: () => t().sortPopular, cmp: (a, b) => a.cfg.popularity - b.cfg.popularity, top: (r) => methodName(r.m) },
];

const state = { sort: 'overall', use: 'all', comments: [], other: 'US' };

// ---- 留言的存放（放在線上，所有人共用；這裡的金鑰本來就是公開用的） ----
const COMMENTS_URL = 'https://stfdixjnhmfpqdiasdzd.supabase.co/rest/v1/comments';
const COMMENTS_KEY = 'sb_publishable_BNkC2hmvV6Ws3BYP8l1vVQ_vIoyA3Dx';
const COMMENTS_HEADERS = { apikey: COMMENTS_KEY, Authorization: `Bearer ${COMMENTS_KEY}` };
const COMMENT_CACHE = 'remit-comments-cache-v1';
const COOLDOWN_MS = 30000;
let lastSent = 0;

// 先顯示上次存下來的留言（離線時也看得到），再去拿最新的
function loadCachedComments() {
  try {
    state.comments = JSON.parse(localStorage.getItem(COMMENT_CACHE)) || [];
  } catch {
    state.comments = [];
  }
}

async function refreshComments() {
  try {
    const res = await fetch(
      `${COMMENTS_URL}?select=method_id,nickname,ok,body,route,created_at&order=created_at.desc&limit=1000`,
      { headers: COMMENTS_HEADERS },
    );
    if (!res.ok) return;
    state.comments = await res.json();
    try {
      localStorage.setItem(COMMENT_CACHE, JSON.stringify(state.comments));
    } catch { /* 存不下來也不影響顯示 */ }
    // 正在寫留言時不重畫，免得把打到一半的字清掉
    if (!document.activeElement?.closest?.('.comment-form')) render();
  } catch { /* 沒有網路時沿用存下來的留言 */ }
}

async function sendComment(comment) {
  const res = await fetch(COMMENTS_URL, {
    method: 'POST',
    headers: { ...COMMENTS_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(comment),
  });
  if (!res.ok) throw new Error(await res.text());
}

// 留言的路線存成「TW-US」這種代碼，顯示時再換成目前語言的國名
function routeLabel(route) {
  const places = route.split('-').map((code) => [HOME, ...COUNTRIES].find((c) => c.code === code));
  return places.length === 2 && places.every(Boolean) ? places.map(placeName).join(' → ') : route;
}

// ---- 匿名使用紀錄（只記路線、金額、點了什麼，不記姓名或聯絡方式） ----
const EVENTS_URL = COMMENTS_URL.replace('/comments', '/events');
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

function visitorId() {
  try {
    let id = localStorage.getItem('remit-visitor');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('remit-visitor', id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

function track(type, data = {}) {
  // 在自己電腦上預覽時不記錄，免得把測試算進數據
  if (IS_LOCAL || !navigator.onLine) return;
  fetch(EVENTS_URL, {
    method: 'POST',
    keepalive: true,
    headers: { ...COMMENTS_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      visitor: visitorId(),
      type,
      lang,
      device: innerWidth < 768 ? 'mobile' : 'desktop',
      ...data,
    }),
  }).catch(() => {});
}

const routeData = (q) => ({ from_code: q.from.code, to_code: q.to.code, amount_twd: Math.round(q.twd) });

// 使用者停止調整 2 秒後才算一次查詢，同樣的條件不重複記
let searchTimer;
let lastSearch = '';
// 一打開就顯示的預設結果不算查詢，使用者動過條件才算
let touched = false;
function trackSearch(q) {
  clearTimeout(searchTimer);
  if (!touched || !q.amount) return;
  const data = { ...routeData(q), use_filter: state.use, sort: state.sort };
  const key = JSON.stringify(data);
  searchTimer = setTimeout(() => {
    if (key === lastSearch) return;
    lastSearch = key;
    track('search', data);
  }, 2000);
}

// ---- Google Analytics：訪客按同意之後才啟動 ----
const GA_ID = 'G-1FRMVGRN6Z';
const CONSENT_KEY = 'remit-consent';

function loadAnalytics() {
  if (IS_LOCAL || window.dataLayer) return;
  window.dataLayer = [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  document.head.append(el('script', { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` }));
}

// 還沒選過的人會看到同意提示；換語言時重畫一次
function renderConsent() {
  document.querySelector('.consent')?.remove();
  let choice = null;
  try {
    choice = localStorage.getItem(CONSENT_KEY);
  } catch { /* 讀不到就當作還沒選 */ }
  if (choice === 'yes') loadAnalytics();
  if (choice) return;

  const ui = t();
  const decide = (answer) => {
    try {
      localStorage.setItem(CONSENT_KEY, answer);
    } catch { /* 存不下來就只在這次有效 */ }
    bar.remove();
    if (answer === 'yes') loadAnalytics();
  };
  const accept = el('button', { type: 'button', className: 'accept' }, ui.consentYes);
  const decline = el('button', { type: 'button' }, ui.consentNo);
  accept.onclick = () => decide('yes');
  decline.onclick = () => decide('no');
  const bar = el('div', { className: 'consent' }, el('p', {}, ui.consentText), el('div', {}, decline, accept));
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', ui.consentLabel);
  document.body.append(bar);
}

// ---- 計算（內部一律先換算成新台幣再比較） ----
const USD_RATE = COUNTRIES.find((x) => x.cur === 'USD').rate;

function spreadOf(cfg, c) {
  if (cfg.spreadFlat != null) return cfg.spreadFlat;
  return c.spread * (cfg.spreadMul ?? 1) + (cfg.spreadAdd ?? 0);
}

function feePart(f, c, twd) {
  if (f.only && !f.only.includes(c.code)) return 0;
  if (f.tiersUsd) {
    const tier = f.tiersUsd.find(([upTo]) => twd / USD_RATE <= upTo) || f.tiersUsd.at(-1);
    return tier[1] * USD_RATE + (f.fixed ?? 0);
  }
  const local = (table) => (table?.[c.code] != null ? table[c.code] * c.rate : undefined);
  let pct = Math.min(Math.max(twd * (f.pct ?? 0), f.min ?? 0), f.max ?? Infinity);
  pct = Math.min(Math.max(pct, local(f.minCur) ?? 0), local(f.maxCur) ?? Infinity);
  return pct + (f.fixed ?? 0) + (f.fixedUsd ?? 0) * USD_RATE + (local(f.fixedCur) ?? 0);
}

// q：這次查詢 { dir, c（台灣以外的那個國家）, from, to, amount, twd }
function quote(m, q) {
  const cfg = m[q.dir];
  const c = q.c;
  const fee = Math.round([].concat(cfg.fee).reduce((sum, f) => sum + feePart(f, c, q.twd), 0));
  const fees = fee + cfg.midFee;
  const spread = spreadOf(cfg, c);
  const receivedTwd = Math.max(0, (q.twd - fees) / (1 + spread));
  const out = q.dir === 'out';
  const cost = q.twd - receivedTwd;
  return {
    m, cfg, fee, fees, cost, spread,
    info: METHOD_INFO[m.id] || {},
    received: out ? receivedTwd / c.rate : receivedTwd,
    usedRate: out ? c.rate * (1 + spread) : c.rate / (1 + spread),
    fxCost: Math.max(0, cost - fees),
    overLimit: Boolean(cfg.maxAmount && q.twd > cfg.maxAmount),
    available: !(cfg.maxAmount && q.twd > cfg.maxAmount) && receivedTwd > 0,
  };
}

function addScores(rows) {
  const ok = rows.filter((r) => r.available);
  const range = (vals) => [Math.min(...vals), Math.max(...vals)];
  const [cMin, cMax] = range(ok.map((r) => r.cost));
  const speed = (r) => Math.log10(1 + (r.cfg.hoursMin + r.cfg.hoursMax) / 2);
  const [sMin, sMax] = range(ok.map(speed));
  const norm = (v, lo, hi) => (hi > lo ? 1 - (v - lo) / (hi - lo) : 1);
  rows.forEach((r) => {
    r.score = r.available
      ? 10 * (0.5 * norm(r.cost, cMin, cMax) + 0.3 * norm(speed(r), sMin, sMax) + 0.2 * (r.m.convenience / 5))
      : 0;
  });
}

// ---- 畫面 ----
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function readAmount() {
  return Number($('amount').value.replace(/[^\d]/g, '')) || 0;
}

function readQuery() {
  const dir = $('from').value === HOME.code ? 'out' : 'in';
  const c = COUNTRIES.find((x) => x.code === state.other);
  const amount = readAmount();
  return {
    dir, c, amount,
    from: dir === 'out' ? HOME : c,
    to: dir === 'out' ? c : HOME,
    twd: dir === 'out' ? amount : amount * c.rate,
  };
}

const usesOf = (r, q) => r.info.uses?.[q.dir] || [];
const detailId = () => new URLSearchParams(location.hash.slice(1)).get('m');

// 不會隨查詢改變的文字，換語言時重設一次
function renderStatic() {
  const ui = t();
  document.documentElement.lang = en() ? 'en' : 'zh-Hant';
  if (!window.PAGE) document.title = ui.pageTitle;
  $('title').textContent = ui.title;
  $('subtitle').textContent = ui.subtitle;
  $('offline-badge').textContent = ui.offline;
  $('lang').textContent = ui.switchTo;
  $('from-label').textContent = ui.from;
  $('to-label').textContent = ui.to;
  $('swap').setAttribute('aria-label', ui.swap);
  $('swap').title = ui.swap;
  $('filters').setAttribute('aria-label', ui.usesGroup);
  $('sorts').setAttribute('aria-label', ui.sortsGroup);
  $('foot1').textContent = ui.foot1(dataDate());
  $('foot2').textContent = ui.foot2;
  $('disclaimer-text').textContent = en() ? EN.disclaimer : DISCLAIMER;
  renderConsent();
  $('routes-title').textContent = ui.routesTitle;
  $('routes').replaceChildren(...ROUTES.map(([from, to]) =>
    el('a', { href: (page().base || '') + routePath(from.code, to.code, lang) }, ui.routeLink(placeName(from), placeName(to)))));

  for (const id of ['from', 'to']) {
    const picked = $(id).value;
    $(id).replaceChildren(...[HOME, ...COUNTRIES].map((c) =>
      el('option', { value: c.code }, en() ? `${placeName(c)} (${c.cur})` : `${placeName(c)}（${c.cur}）`)));
    if (picked) $(id).value = picked;
  }
}

function render() {
  const q = readQuery();
  const { c } = q;
  const ui = t();

  $('amount-label').textContent = ui.amount(curName(q.from));
  $('rate-line').textContent = ui.rateLine(curName(c), c.cur, fmt(c.rate, 2), dataDate());
  const note = routeNote(c, q.dir);
  $('route-note').hidden = !note;
  $('route-note').textContent = note || '';
  // 路線頁面的說明文字只對那一條路線有效，改了國家就收起來
  if ($('intro')) $('intro').hidden = q.from.code !== page().from || q.to.code !== page().to || Boolean(detailId());

  const rows = METHODS
    .filter((m) => m[q.dir]?.countries.includes(c.code))
    .map((m) => quote(m, q));
  addScores(rows);
  trackSearch(q);

  const id = detailId();
  $('list-view').hidden = Boolean(id);
  $('detail-view').hidden = !id;
  if (id) {
    $('detail-view').replaceChildren(detailView(id, rows, q));
    return;
  }

  const shown = rows.filter((r) => state.use === 'all' || usesOf(r, q).includes(state.use));
  const ok = shown.filter((r) => r.available);
  const off = shown.filter((r) => !r.available);

  $('filters').replaceChildren(
    ...[{ id: 'all' }, ...USES].map((u) => {
      const btn = el('button', { type: 'button', className: 'chip' }, u.id === 'all' ? ui.allUses : useLabel(u));
      btn.setAttribute('aria-pressed', String(u.id === state.use));
      btn.onclick = () => { state.use = u.id; touched = true; render(); };
      return btn;
    }),
  );

  $('sorts').replaceChildren(
    ...SORTS.map((s) => {
      const best = [...ok].sort(s.cmp)[0];
      const btn = el('button', { type: 'button', className: 'sort' },
        el('b', {}, s.label()),
        el('small', {}, best ? s.top(best, q) : '—'));
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(s.id === state.sort));
      btn.onclick = () => { state.sort = s.id; touched = true; render(); };
      return btn;
    }),
  );

  const best = {
    receive: [...ok].sort(SORTS[1].cmp)[0],
    fast: [...ok].sort(SORTS[3].cmp)[0],
  };
  ok.sort(SORTS.find((s) => s.id === state.sort).cmp);

  const items = [
    ...ok.map((r, i) => card(r, q, i + 1, best)),
    ...off.map((r) => card(r, q, null, best)),
  ];
  if (!items.length) {
    items.push(el('li', { className: 'card' }, el('p', { className: 'empty' }, ui.noMatch)));
  }
  $('results').replaceChildren(...items);
}

function cardHead(r, rank, best, q) {
  const head = el('div', { className: 'card-head' });
  if (rank) head.append(el('span', { className: 'rank' }, String(rank)));
  head.append(el('h2', {}, methodName(r.m)), el('span', { className: 'tag' }, methodType(r.m)));
  if (best?.receive === r) head.append(el('span', { className: 'badge' }, t().badgeMost));
  if (best?.fast === r) head.append(el('span', { className: 'badge' }, t().badgeFast));
  badgesOf(r.m, q.dir).forEach((b) => head.append(el('span', { className: 'badge warn' }, b)));
  return head;
}

function metrics(r, q) {
  const ui = t();
  const metric = (label, value, sub, cls = '') => {
    const dd = el('dd', {}, value);
    if (sub) dd.append(el('small', {}, sub));
    return el('div', { className: cls }, el('dt', {}, label), dd);
  };
  return el('dl', { className: 'metrics' },
    metric(ui.receives, `${fmt(r.received)} ${q.to.cur}`, ui.rateAbout(fmt(r.usedRate, 3)), 'big'),
    metric(ui.totalCost, ui.about(fmt(r.cost)), ui.costSplit(fmt(r.fees), fmt(r.fxCost))),
    metric(ui.speed, cfgText(r.m, q.dir, 'speedText')),
    metric(ui.score, r.score.toFixed(1), ui.outOf),
  );
}

function limitMsg(r) {
  return el('p', { className: 'limit-msg' },
    r.overLimit ? t().overLimit(fmt(r.cfg.maxAmount)) : t().tooSmall);
}

function card(r, q, rank, best) {
  const comments = state.comments.filter((x) => x.method_id === r.m.id);
  const okCount = comments.filter((x) => x.ok).length;
  const feedback = comments.length ? t().feedback(comments.length, okCount) : t().noFeedback;

  return el('li', { className: 'card' + (r.available ? '' : ' unavailable') },
    cardHead(r, rank, best, q),
    r.available ? metrics(r, q) : limitMsg(r),
    el('div', { className: 'card-foot' },
      el('span', {}, feedback),
      el('a', { className: 'more', href: `#m=${r.m.id}` }, t().more)));
}

// ---- 詳細頁 ----
function detailView(id, rows, q) {
  const ui = t();
  const box = el('article', { className: 'detail' },
    el('a', { className: 'back', href: '#' }, ui.back));
  const r = rows.find((x) => x.m.id === id);
  if (!r) {
    box.append(el('p', { className: 'empty' }, ui.notOnRoute(placeName(q.from), placeName(q.to))));
    return box;
  }
  const { m, cfg, info } = r;
  const c = q.c;
  const text = (field) => cfgText(m, q.dir, field);

  box.append(
    cardHead(r, null, null, q),
    el('p', { className: 'route' }, ui.routeLine(placeName(q.from), placeName(q.to), fmt(q.amount), q.from.cur)),
    r.available ? metrics(r, q) : limitMsg(r));

  if (info.url) {
    const go = el('a', { className: 'cta', href: info.url, target: '_blank', rel: 'noopener' }, ui.visit(methodName(m)));
    go.onclick = () => track('outlink', { ...routeData(q), method_id: m.id });
    box.append(go);
  }
  box.append(el('p', { className: 'notice' }, en() ? EN.disclaimer : DISCLAIMER));

  const section = (title, ...children) => box.append(el('section', {}, el('h3', {}, title), ...children));
  const p = (body) => el('p', {}, body);

  if (r.available) {
    const local = (twd) => (q.dir === 'in' ? ui.local(fmt(twd / c.rate, 2), q.from.cur) : '');
    const steps = [
      ui.stepAmount(fmt(q.amount), q.from.cur, q.dir === 'in' ? fmt(q.twd) : ''),
      ui.stepFee(fmt(r.fee), local(r.fee)),
    ];
    if (cfg.midFee) steps.push(ui.stepMid(fmt(cfg.midFee), local(cfg.midFee)));
    steps.push(
      ui.stepFx(c.cur, fmt(r.usedRate, 3), fmt(c.rate, 3), (r.spread * 100).toFixed(2), fmt(r.fxCost)),
      ui.stepResult(fmt(r.received), q.to.cur, fmt(r.cost), (r.cost / q.twd * 100).toFixed(2)),
    );
    const fxNote = infoText(m, 'fxNote');
    section(ui.howTitle, el('ol', { className: 'steps' }, ...steps.map((s) => el('li', {}, s))),
      ...(fxNote ? [p(fxNote)] : []));
  }

  section(ui.secSpeed, p(text('speedText')));
  const uses = usesOf(r, q).map((u) => useLabel(USES.find((x) => x.id === u)));
  if (uses.length) section(ui.secUses, p(uses.join(ui.listSep)));
  section(ui.secLimit, p(cfg.maxAmount ? ui.limitMax(fmt(cfg.maxAmount)) : ui.limitNone));
  section(ui.secNeeds, p(text('needs')));
  section(ui.secPros, p(text('pros')));
  section(ui.secCons, p(text('cons')));
  const safety = infoText(m, 'safety');
  if (safety) section(ui.secSafety, p(safety));
  const note = routeNote(c, q.dir);
  section(ui.secRules, p(en() ? EN.rules[q.dir] : RULES[q.dir]), ...(note ? [p(note)] : []));
  section(ui.secSource, p(text('source')));

  box.append(commentBox(m, q, state.comments.filter((x) => x.method_id === m.id)));
  return box;
}

function commentBox(m, q, comments) {
  const ui = t();
  const box = el('section', { className: 'comments' }, el('h3', {}, ui.comments));

  if (comments.length) {
    box.append(el('ul', { className: 'comment-list' }, ...comments.map((x) =>
      el('li', { className: 'comment' },
        el('div', { className: 'comment-meta' },
          el('span', { className: x.ok ? 'ok' : 'ng' }, x.ok ? ui.worked : ui.problem),
          el('span', {}, x.nickname),
          el('span', {}, routeLabel(x.route)),
          el('span', {}, new Date(x.created_at).toLocaleDateString(ui.locale))),
        el('p', {}, x.body)))));
  } else {
    box.append(el('p', { className: 'empty' }, ui.noComments));
  }

  const group = `ok-${m.id}`;
  const name = el('input', { type: 'text', placeholder: ui.nickname, maxLength: 20 });
  name.setAttribute('aria-label', ui.nicknameLabel);
  const yes = el('input', { type: 'radio', name: group, checked: true });
  const no = el('input', { type: 'radio', name: group });
  const body = el('textarea', { placeholder: ui.commentHint, maxLength: 500, required: true });
  body.setAttribute('aria-label', ui.commentLabel);

  const button = el('button', { type: 'submit' }, ui.send);
  const status = el('p', { className: 'form-status' });
  status.setAttribute('role', 'status');

  const form = el('form', { className: 'comment-form' },
    el('div', { className: 'row' },
      name,
      el('label', {}, yes, ` ${ui.worked}`),
      el('label', {}, no, ` ${ui.problem}`)),
    body,
    button, status);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const content = body.value.trim();
    if (!content) return;
    if (!navigator.onLine) {
      status.textContent = t().errOffline;
      return;
    }
    if (Date.now() - lastSent < COOLDOWN_MS) {
      status.textContent = t().errCooldown;
      return;
    }
    const comment = {
      method_id: m.id,
      nickname: name.value.trim() || t().anonymous,
      ok: yes.checked,
      body: content,
      route: `${q.from.code}-${q.to.code}`,
    };
    button.disabled = true;
    status.textContent = t().sending;
    try {
      await sendComment(comment);
      lastSent = Date.now();
      track('comment', { ...routeData(q), method_id: m.id });
      state.comments.unshift({ ...comment, created_at: new Date().toISOString() });
      render();
      refreshComments();
    } catch {
      button.disabled = false;
      status.textContent = t().errSend;
    }
  };

  box.append(form);
  return box;
}

// ---- 國家選擇：兩邊一定有一邊是台灣 ----
function setRoute(fromCode, toCode) {
  $('from').value = fromCode;
  $('to').value = toCode;
  state.other = fromCode === HOME.code ? toCode : fromCode;
  const c = COUNTRIES.find((x) => x.code === state.other);
  $('amount').value = fmt(fromCode === HOME.code ? 100000 : c.sample);
  render();
}

function onPick(changed) {
  const picked = $(changed).value;
  if (picked === HOME.code) {
    // 這一邊選了台灣，另一邊就放原本的外國
    setRoute(changed === 'from' ? HOME.code : state.other, changed === 'from' ? state.other : HOME.code);
  } else {
    setRoute(changed === 'from' ? picked : HOME.code, changed === 'from' ? HOME.code : picked);
  }
}

// ---- 啟動 ----
function init() {
  renderStatic();

  $('from').onchange = () => { touched = true; onPick('from'); };
  $('to').onchange = () => { touched = true; onPick('to'); };
  $('swap').onclick = () => { touched = true; setRoute($('to').value, $('from').value); };
  $('amount').oninput = () => {
    touched = true;
    const n = readAmount();
    $('amount').value = n ? fmt(n) : '';
    render();
  };
  $('search').onsubmit = (e) => e.preventDefault();
  $('lang').onclick = () => {
    const amount = readAmount();
    const next = en() ? 'zh' : 'en';
    try {
      localStorage.setItem('remit-lang', next);
    } catch { /* 存不下來就只在這次有效 */ }
    // 路線頁面每種語言各有自己的網址，換語言就是換頁
    if (page().alt) {
      location.href = page().alt;
      return;
    }
    lang = next;
    renderStatic();
    $('amount').value = amount ? fmt(amount) : '';
    render();
  };

  // 點進詳細頁、按上一頁回來，都靠網址後面的 #m=...
  addEventListener('hashchange', () => {
    render();
    scrollTo(0, 0);
    if (detailId()) track('detail', { ...routeData(readQuery()), method_id: detailId() });
  });

  const showOffline = () => { $('offline-badge').hidden = navigator.onLine; };
  addEventListener('online', showOffline);
  addEventListener('offline', showOffline);
  showOffline();
  addEventListener('online', refreshComments);

  track('visit');
  loadCachedComments();
  setRoute(page().from || HOME.code, page().to || state.other);
  touched = false;
  refreshComments();

  // 讓網頁在沒有網路時也能開啟
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register(`${page().base || ''}sw.js`);
  }
}

init();

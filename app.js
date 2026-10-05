const $ = (id) => document.getElementById(id);
const fmt = (n, digits = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const SORTS = [
  { id: 'overall', label: '整體推薦', cmp: (a, b) => b.score - a.score, top: (r) => `${r.score.toFixed(1)} 分` },
  { id: 'receive', label: '收到最多', cmp: (a, b) => b.received - a.received, top: (r, q) => `${fmt(r.received)} ${q.to.cur}` },
  { id: 'fee', label: '手續費最低', cmp: (a, b) => a.fees - b.fees || a.cost - b.cost, top: (r) => `NT$${fmt(r.fees)}` },
  { id: 'fast', label: '最快到帳', cmp: (a, b) => a.cfg.hoursMin - b.cfg.hoursMin || a.cfg.hoursMax - b.cfg.hoursMax, top: (r) => r.cfg.speedText },
  { id: 'popular', label: '最多人用', cmp: (a, b) => a.cfg.popularity - b.cfg.popularity, top: (r) => r.m.name },
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
      device: innerWidth < 768 ? 'mobile' : 'desktop',
      ...data,
    }),
  }).catch(() => {});
}

const routeData = (q) => ({ from_code: q.from.code, to_code: q.to.code, amount_twd: Math.round(q.twd) });

// 使用者停止調整 2 秒後才算一次查詢，同樣的條件不重複記
let searchTimer;
let lastSearch = '';
function trackSearch(q) {
  clearTimeout(searchTimer);
  if (!q.amount) return;
  const data = { ...routeData(q), use_filter: state.use, sort: state.sort };
  const key = JSON.stringify(data);
  searchTimer = setTimeout(() => {
    if (key === lastSearch) return;
    lastSearch = key;
    track('search', data);
  }, 2000);
}

// ---- 計算（內部一律先換算成新台幣再比較） ----
const USD_RATE = COUNTRIES.find((x) => x.cur === 'USD').rate;

function spreadOf(cfg, c) {
  if (cfg.spreadFlat != null) return cfg.spreadFlat;
  return c.spread * (cfg.spreadMul ?? 1) + (cfg.spreadAdd ?? 0);
}

function feePart(f, c, twd) {
  if (f.tiersUsd) {
    const tier = f.tiersUsd.find(([upTo]) => twd / USD_RATE <= upTo) || f.tiersUsd.at(-1);
    return tier[1] * USD_RATE + (f.fixed ?? 0);
  }
  let pct = Math.min(Math.max(twd * (f.pct ?? 0), f.min ?? 0), f.max ?? Infinity);
  if (f.maxCur) pct = Math.min(pct, f.maxCur[c.code] * c.rate);
  return pct + (f.fixed ?? 0) + (f.fixedUsd ?? 0) * USD_RATE + (f.fixedCur ? f.fixedCur[c.code] * c.rate : 0);
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

function render() {
  const q = readQuery();
  const { c } = q;

  $('amount-label').textContent = `匯出金額（${q.from.curName}）`;
  $('rate-line').textContent =
    `參考匯率：1 ${c.curName}（${c.cur}）≈ ${fmt(c.rate, 2)} 新台幣（${DATA_UPDATED}的匯率，不會自動更新）`;
  const note = q.dir === 'out' ? c.noteOut : c.noteIn;
  $('route-note').hidden = !note;
  $('route-note').textContent = note || '';

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
    ...[{ id: 'all', label: '全部用途' }, ...USES].map((u) => {
      const btn = el('button', { type: 'button', className: 'chip' }, u.label);
      btn.setAttribute('aria-pressed', String(u.id === state.use));
      btn.onclick = () => { state.use = u.id; render(); };
      return btn;
    }),
  );

  $('sorts').replaceChildren(
    ...SORTS.map((s) => {
      const best = [...ok].sort(s.cmp)[0];
      const btn = el('button', { type: 'button', className: 'sort' },
        el('b', {}, s.label),
        el('small', {}, best ? s.top(best, q) : '—'));
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(s.id === state.sort));
      btn.onclick = () => { state.sort = s.id; render(); };
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
    items.push(el('li', { className: 'card' }, el('p', { className: 'empty' }, '這條路線目前沒有符合這個用途的匯款方式，請改選「全部用途」。')));
  }
  $('results').replaceChildren(...items);
}

function cardHead(r, rank, best, q, tag = 'h2') {
  const head = el('div', { className: 'card-head' });
  if (rank) head.append(el('span', { className: 'rank' }, String(rank)));
  head.append(el(tag, {}, r.m.name), el('span', { className: 'tag' }, r.m.type));
  if (best?.receive === r) head.append(el('span', { className: 'badge' }, '收到最多'));
  if (best?.fast === r) head.append(el('span', { className: 'badge' }, '最快'));
  (r.info?.badges?.[q.dir] || []).forEach((b) => head.append(el('span', { className: 'badge warn' }, b)));
  return head;
}

function metrics(r, q) {
  const metric = (label, value, sub, cls = '') => {
    const dd = el('dd', {}, value);
    if (sub) dd.append(el('small', {}, sub));
    return el('div', { className: cls }, el('dt', {}, label), dd);
  };
  return el('dl', { className: 'metrics' },
    metric('對方大約收到', `${fmt(r.received)} ${q.to.cur}`, `匯率約 ${fmt(r.usedRate, 3)}`, 'big'),
    metric('總成本', `約 NT$${fmt(r.cost)}`, `手續費 ${fmt(r.fees)}＋匯差 ${fmt(r.fxCost)}`),
    metric('到帳時間', r.cfg.speedText),
    metric('推薦分數', r.score.toFixed(1), '滿分 10'),
  );
}

function limitMsg(r) {
  return el('p', { className: 'limit-msg' },
    r.overLimit
      ? `這個金額超過單筆上限（約等值 NT$${fmt(r.cfg.maxAmount)}），無法使用`
      : '金額太小，扣掉手續費後沒有剩餘');
}

function card(r, q, rank, best) {
  const comments = state.comments.filter((x) => x.method_id === r.m.id);
  const okCount = comments.filter((x) => x.ok).length;
  const feedback = comments.length ? `${comments.length} 則回饋，${okCount} 人說能用` : '還沒有回饋';

  return el('li', { className: 'card' + (r.available ? '' : ' unavailable') },
    cardHead(r, rank, best, q),
    r.available ? metrics(r, q) : limitMsg(r),
    el('div', { className: 'card-foot' },
      el('span', {}, feedback),
      el('a', { className: 'more', href: `#m=${r.m.id}` }, '看詳細資料 →')));
}

// ---- 詳細頁 ----
function detailView(id, rows, q) {
  const box = el('article', { className: 'detail' },
    el('a', { className: 'back', href: '#' }, '← 回到比較結果'));
  const r = rows.find((x) => x.m.id === id);
  if (!r) {
    box.append(el('p', { className: 'empty' }, `${q.from.name} → ${q.to.name} 這條路線不能用這個匯款方式，請回到比較結果看其他選擇。`));
    return box;
  }
  const { m, cfg, info } = r;
  const c = q.c;

  box.append(
    cardHead(r, null, null, q, 'h2'),
    el('p', { className: 'route' }, `${q.from.name} → ${q.to.name}，匯出 ${fmt(q.amount)} ${q.from.cur}`),
    r.available ? metrics(r, q) : limitMsg(r));

  if (info.url) {
    const go = el('a', { className: 'cta', href: info.url, target: '_blank', rel: 'noopener' }, `前往 ${m.name} 官方網站`);
    go.onclick = () => track('outlink', { ...routeData(q), method_id: m.id });
    box.append(go);
  }
  box.append(el('p', { className: 'notice' }, DISCLAIMER));

  const section = (title, ...children) => box.append(el('section', {}, el('h3', {}, title), ...children));
  const p = (text) => el('p', {}, text);

  if (r.available) {
    const cur = q.from.cur;
    const inCur = (twd) => (q.dir === 'in' ? `（約 ${fmt(twd / c.rate, 2)} ${cur}）` : '');
    const steps = [
      `匯出金額：${fmt(q.amount)} ${cur}` + (q.dir === 'in' ? `，約等於 NT$${fmt(q.twd)}` : ''),
      `扣掉手續費：約 NT$${fmt(r.fee)}${inCur(r.fee)}`,
    ];
    if (cfg.midFee) steps.push(`扣掉中轉銀行費用：約 NT$${fmt(cfg.midFee)}${inCur(cfg.midFee)}。這是匯款途中經手的銀行可能扣的錢，不一定每次都會扣。`);
    steps.push(
      `換匯：這個方式的匯率大約是 1 ${c.cur} = ${fmt(r.usedRate, 3)} 新台幣，市場匯率是 ${fmt(c.rate, 3)}，相差約 ${(r.spread * 100).toFixed(2)}%。這個價差讓你少拿約 NT$${fmt(r.fxCost)}。`,
      `對方大約收到：${fmt(r.received)} ${q.to.cur}。總成本約 NT$${fmt(r.cost)}，占匯款金額的 ${(r.cost / q.twd * 100).toFixed(2)}%。`,
    );
    section('這個金額是怎麼算出來的', el('ol', { className: 'steps' }, ...steps.map((s) => el('li', {}, s))),
      ...(info.fxNote ? [p(info.fxNote)] : []));
  }

  section('到帳時間', p(cfg.speedText));
  const uses = usesOf(r, q).map((u) => USES.find((x) => x.id === u).label);
  if (uses.length) section('適合的用途', p(uses.join('、')));
  section('金額限制', p(cfg.maxAmount
    ? `單筆上限約等值新台幣 ${fmt(cfg.maxAmount)} 元。`
    : '沒有查到固定的單筆上限，大額匯款請先向業者確認。'));
  section('需要準備', p(cfg.needs));
  section('優點', p(cfg.pros));
  section('注意事項', p(cfg.cons));
  if (info.safety) section('保障與監管', p(info.safety));
  section('相關規定', p(RULES[q.dir]), ...(c[q.dir === 'out' ? 'noteOut' : 'noteIn'] ? [p(c[q.dir === 'out' ? 'noteOut' : 'noteIn'])] : []));
  section('資料來源', p(cfg.source));

  box.append(commentBox(m, q, state.comments.filter((x) => x.method_id === m.id)));
  return box;
}

function commentBox(m, q, comments) {
  const box = el('section', { className: 'comments' }, el('h3', {}, '使用者回饋'));

  if (comments.length) {
    box.append(el('ul', { className: 'comment-list' }, ...comments.map((x) =>
      el('li', { className: 'comment' },
        el('div', { className: 'comment-meta' },
          el('span', { className: x.ok ? 'ok' : 'ng' }, x.ok ? '實際能用' : '遇到問題'),
          el('span', {}, x.nickname),
          el('span', {}, x.route),
          el('span', {}, new Date(x.created_at).toLocaleDateString('zh-TW'))),
        el('p', {}, x.body)))));
  } else {
    box.append(el('p', { className: 'empty' }, '還沒有人留言，歡迎分享你的實際經驗。'));
  }

  const group = `ok-${m.id}`;
  const name = el('input', { type: 'text', placeholder: '暱稱（可不填）', maxLength: 20 });
  name.setAttribute('aria-label', '暱稱');
  const yes = el('input', { type: 'radio', name: group, checked: true });
  const no = el('input', { type: 'radio', name: group });
  const text = el('textarea', { placeholder: '例如：實際花了幾天到帳、被收了多少費用、遇到什麼狀況', maxLength: 500, required: true });
  text.setAttribute('aria-label', '留言內容');

  const button = el('button', { type: 'submit' }, '送出回饋');
  const status = el('p', { className: 'form-status' });
  status.setAttribute('role', 'status');

  const form = el('form', { className: 'comment-form' },
    el('div', { className: 'row' },
      name,
      el('label', {}, yes, ' 實際能用'),
      el('label', {}, no, ' 遇到問題')),
    text,
    button, status);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = text.value.trim();
    if (!body) return;
    if (!navigator.onLine) {
      status.textContent = '目前沒有網路，連上網路後才能送出留言。';
      return;
    }
    if (Date.now() - lastSent < COOLDOWN_MS) {
      status.textContent = '剛剛才留過言，請稍等半分鐘再送出。';
      return;
    }
    const comment = {
      method_id: m.id,
      nickname: name.value.trim() || '匿名',
      ok: yes.checked,
      body,
      route: `${q.from.name} → ${q.to.name}`,
    };
    button.disabled = true;
    status.textContent = '送出中…';
    try {
      await sendComment(comment);
      lastSent = Date.now();
      track('comment', { ...routeData(q), method_id: m.id });
      state.comments.unshift({ ...comment, created_at: new Date().toISOString() });
      render();
      refreshComments();
    } catch {
      button.disabled = false;
      status.textContent = '留言沒有送出成功，請稍後再試一次。';
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
  const options = () => [HOME, ...COUNTRIES].map((c) => el('option', { value: c.code }, `${c.name}（${c.cur}）`));
  $('from').append(...options());
  $('to').append(...options());
  $('updated').textContent = DATA_UPDATED;
  $('disclaimer-text').textContent = DISCLAIMER;

  $('from').onchange = () => onPick('from');
  $('to').onchange = () => onPick('to');
  $('swap').onclick = () => setRoute($('to').value, $('from').value);
  $('amount').oninput = () => {
    const n = readAmount();
    $('amount').value = n ? fmt(n) : '';
    render();
  };
  $('search').onsubmit = (e) => e.preventDefault();

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
  setRoute(HOME.code, state.other);
  refreshComments();

  // 讓網頁在沒有網路時也能開啟
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js');
  }
}

init();

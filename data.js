// 固定資料，不是即時資料。這個檔案只放數字與設定；
// 畫面上的說明文字在 data.zh.js（中文）與 data.en.js（英文）。

const DATA_UPDATED = '2026-10-05';

const HOME = { code: 'TW', name: '台灣', cur: 'TWD', curName: '新台幣' };

// rate：1 單位外幣等於多少新台幣（臺灣銀行 2026/10/5 牌告即期買入與賣出的中間值）
// spread：銀行換匯時加在中間值上的比例（依同一份牌告的買賣價差算出）
// sample：從這個國家匯出時，預設顯示的金額
// noteOut / noteIn：匯往這個國家／從這個國家匯回台灣時的提醒
const COUNTRIES = [
  { code: 'US', name: '美國', cur: 'USD', curName: '美元', rate: 31.765, spread: 0.0016, sample: 3000 },
  {
    code: 'CN', name: '中國', cur: 'CNY', curName: '人民幣', rate: 4.733, spread: 0.0053, sample: 20000,
  },
  { code: 'HK', name: '香港', cur: 'HKD', curName: '港幣', rate: 4.048, spread: 0.0074, sample: 25000 },
  { code: 'SG', name: '新加坡', cur: 'SGD', curName: '新加坡幣', rate: 24.81, spread: 0.0036, sample: 4000 },
  { code: 'GB', name: '英國', cur: 'GBP', curName: '英鎊', rate: 42.0, spread: 0.0048, sample: 2500 },
  { code: 'AU', name: '澳洲', cur: 'AUD', curName: '澳幣', rate: 22.06, spread: 0.0045, sample: 4500 },
];

const ALL = ['US', 'CN', 'HK', 'SG', 'GB', 'AU'];
const NO_CN = ['US', 'HK', 'SG', 'GB', 'AU'];

// 每種方式分成 out（從台灣匯出）和 in（從國外匯回台灣）兩組設定，沒有的方向就不寫。
//
// countries：這個方向支援哪些國家
// fee：手續費，可以是一項或多項加總。每一項：
//      金額 × pct（限制在 min～max 之間，單位新台幣）＋ fixed（新台幣）＋ fixedUsd（美元）
//      only：只適用於哪些國家
//      minCur / maxCur / fixedCur：依國家的下限、上限、固定費用（當地貨幣）
//      tiersUsd：[金額上限（美元）, 手續費（美元）] 的級距表
// midFee：中轉銀行可能從匯款中扣掉的費用（新台幣估計值）
// spreadMul / spreadAdd / spreadFlat：這個方式的匯差，以銀行匯差為基準調整
// hoursMin / hoursMax：到帳需要的時間（小時）
// popularity：估計的使用人數排名（1 = 最多）　maxAmount：單筆上限（等值新台幣）
// convenience（寫在外層）：方便程度 1～5
const METHODS = [
  {
    id: 'bank_online', name: '網路銀行／行動銀行電匯', type: '銀行', convenience: 4,
    out: {
      countries: ALL, popularity: 1,
      fee: { pct: 0.0005, min: 100, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 1,
      hoursMin: 24, hoursMax: 120,
      maxAmount: 499999,
    },
  },
  {
    id: 'bank_counter', name: '銀行臨櫃電匯', type: '銀行', convenience: 2,
    out: {
      countries: ALL, popularity: 2,
      fee: { pct: 0.0005, min: 200, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 1,
      hoursMin: 24, hoursMax: 120,
    },
  },
  {
    id: 'bank_in', name: '國外銀行電匯到台灣帳戶', type: '銀行', convenience: 3,
    in: {
      countries: ALL, popularity: 1,
      fee: [
        { fixedCur: { US: 40, HK: 100, GB: 8, AU: 15 } },
        { only: ['CN'], pct: 0.001, minCur: { CN: 50 }, maxCur: { CN: 260 }, fixedCur: { CN: 80 } },
        { only: ['SG'], pct: 0.00125, minCur: { SG: 10 }, maxCur: { SG: 120 }, fixedCur: { SG: 20 } },
        { pct: 0.0005, min: 200, max: 800 },
      ],
      midFee: 500, spreadMul: 1,
      hoursMin: 24, hoursMax: 120,
    },
  },
  {
    id: 'post', name: '郵局國際匯款', type: '郵局', convenience: 2,
    out: {
      countries: ALL, popularity: 4,
      fee: { pct: 0.0005, min: 100, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 1,
      hoursMin: 48, hoursMax: 96,
    },
  },
  {
    id: 'dbs', name: '星展環星匯（GlobeSend）', type: '線上', convenience: 4,
    out: {
      countries: ALL, popularity: 7,
      fee: {},
      midFee: 0, spreadMul: 1,
      hoursMin: 0, hoursMax: 48,
      maxAmount: 3000000,
    },
  },
  {
    id: 'taishin', name: '台新易匯通', type: '線上', convenience: 4,
    out: {
      countries: NO_CN, popularity: 6,
      fee: { fixed: 300 },
      midFee: 0, spreadMul: 1,
      hoursMin: 0, hoursMax: 48,
      maxAmount: 476000,
    },
  },
  {
    id: 'hsbc', name: '滙豐全球轉帳', type: '銀行', convenience: 3,
    out: {
      countries: ALL, popularity: 5,
      fee: {},
      midFee: 0, spreadMul: 1, spreadAdd: 0.002,
      hoursMin: 0, hoursMax: 0.1,
      maxAmount: 500000,
    },
    in: {
      countries: ALL, popularity: 6,
      fee: {},
      midFee: 0, spreadMul: 1, spreadAdd: 0.002,
      hoursMin: 0, hoursMax: 0.1,
    },
  },
  {
    id: 'wise', name: 'Wise', type: '線上', convenience: 4,
    in: {
      countries: NO_CN, popularity: 2,
      fee: [{ pct: 0.0045, fixedUsd: 6 }, { fixed: 200 }],
      midFee: 0, spreadFlat: 0.0016,
      hoursMin: 0, hoursMax: 48,
    },
  },
  {
    id: 'revolut', name: 'Revolut', type: '線上', convenience: 4,
    in: {
      countries: ['GB', 'AU'], popularity: 5,
      fee: { pct: 0.003 },
      midFee: 0, spreadFlat: 0.01,
      hoursMin: 0, hoursMax: 24,
    },
  },
  {
    id: 'paypal', name: 'PayPal', type: '線上', convenience: 5,
    out: {
      countries: ALL, popularity: 8,
      fee: { pct: 0.015 },
      midFee: 0, spreadFlat: 0.04,
      hoursMin: 0, hoursMax: 0.2,
      maxAmount: 300000,
    },
    in: {
      countries: NO_CN, popularity: 3,
      fee: { pct: 0.05, maxCur: { US: 4.99, HK: 38.99, SG: 6.39, GB: 2.99, AU: 5.99 } },
      midFee: 0, spreadFlat: 0.044,
      hoursMin: 0, hoursMax: 0.2,
      maxAmount: 300000,
    },
  },
  {
    id: 'payoneer', name: 'Payoneer（派安盈）', type: '線上', convenience: 3,
    in: {
      countries: NO_CN, popularity: 7,
      fee: [{ pct: 0.02 }, { fixed: 250 }],
      midFee: 0, spreadFlat: 0,
      hoursMin: 24, hoursMax: 72,
    },
  },
  {
    id: 'wu', name: '西聯匯款（Western Union）', type: '現金匯款', convenience: 2,
    out: {
      countries: ALL, popularity: 3,
      fee: { tiersUsd: [[850, 5], [1700, 6.5], [3400, 10], [15000, 15]], fixed: 100 },
      midFee: 0, spreadMul: 1, spreadAdd: 0.02,
      hoursMin: 0.2, hoursMax: 24,
      maxAmount: 476000,
    },
    in: {
      countries: ALL, popularity: 4,
      fee: { pct: 0.01, min: 125, max: 1500 },
      midFee: 0, spreadFlat: 0.014,
      hoursMin: 0.2, hoursMax: 24,
      maxAmount: 476000,
    },
  },
];

// 匯款用途，首頁用來篩選
const USES = [
  { id: 'family' },
  { id: 'tuition' },
  { id: 'work' },
  { id: 'large' },
  { id: 'cash' },
];

// 每種方式的補充資料：
// url：官方網站　uses：這個方向適合哪些用途
const METHOD_INFO = {
  bank_online: { uses: { out: ['family', 'tuition'] } },
  bank_counter: { uses: { out: ['family', 'tuition', 'large'] } },
  bank_in: {
    uses: { in: ['family', 'work', 'large'] },
  },
  post: {
    url: 'https://www.post.gov.tw/',
    uses: { out: ['family'] },
  },
  dbs: {
    url: 'https://www.dbs.com.tw/',
    uses: { out: ['family', 'tuition', 'large'] },
  },
  taishin: {
    url: 'https://www.taishinbank.com.tw/',
    uses: { out: ['family', 'tuition'] },
  },
  hsbc: {
    url: 'https://www.hsbc.com.tw/',
    uses: { out: ['family', 'tuition'], in: ['family', 'large'] },
  },
  wise: {
    url: 'https://wise.com/',
    uses: { in: ['family', 'work'] },
  },
  revolut: {
    url: 'https://www.revolut.com/',
    uses: { in: ['family'] },
  },
  paypal: {
    url: 'https://www.paypal.com/tw/',
    uses: { out: ['family'], in: ['family', 'work'] },
  },
  payoneer: {
    url: 'https://www.payoneer.com/',
    uses: { in: ['work'] },
  },
  wu: {
    url: 'https://www.westernunion.com/',
    uses: { out: ['family', 'cash'], in: ['family', 'cash'] },
  },
};


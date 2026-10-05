// 第一版的固定資料，不是即時資料。
// 之後要更新數字，只需要改這個檔案。

const DATA_UPDATED = '2026 年 10 月 5 日';

const HOME = { code: 'TW', name: '台灣', cur: 'TWD', curName: '新台幣' };

// rate：1 單位外幣等於多少新台幣（2026/10/5 的市場匯率）
// spread：銀行一般會在市場匯率上多加的比例（匯差，估計值）
// sample：從這個國家匯出時，預設顯示的金額
// noteOut / noteIn：匯往這個國家／從這個國家匯回台灣時的提醒
const COUNTRIES = [
  { code: 'US', name: '美國', cur: 'USD', curName: '美元', rate: 31.87, spread: 0.0016, sample: 3000 },
  {
    code: 'CN', name: '中國', cur: 'CNY', curName: '人民幣', rate: 4.75, spread: 0.005, sample: 20000,
    noteOut: '個人人民幣匯款至中國設有每日限額（約人民幣 8 萬元），實際額度依承作銀行規定。',
    noteIn: '中國個人購匯匯出設有年度額度（每人每年約等值 5 萬美元），且多數線上匯款平台不支援自中國匯出，可用管道有限。',
  },
  { code: 'HK', name: '香港', cur: 'HKD', curName: '港幣', rate: 4.06, spread: 0.007, sample: 25000 },
  { code: 'SG', name: '新加坡', cur: 'SGD', curName: '新加坡幣', rate: 24.89, spread: 0.006, sample: 4000 },
  { code: 'GB', name: '英國', cur: 'GBP', curName: '英鎊', rate: 42.18, spread: 0.006, sample: 2500 },
  { code: 'AU', name: '澳洲', cur: 'AUD', curName: '澳幣', rate: 22.17, spread: 0.006, sample: 4500 },
];

const ALL = ['US', 'CN', 'HK', 'SG', 'GB', 'AU'];
const NO_CN = ['US', 'HK', 'SG', 'GB', 'AU'];

// 每種方式分成 out（從台灣匯出）和 in（從國外匯回台灣）兩組設定，沒有的方向就不寫。
//
// countries：這個方向支援哪些國家
// fee：手續費，可以是一項或多項加總。每一項：
//      金額 × pct（限制在 min～max 之間，單位新台幣）＋ fixed（新台幣）＋ fixedUsd（美元）
//      fixedCur：依國家收的固定費用（當地貨幣）　maxCur：依國家的手續費上限（當地貨幣）
//      tiersUsd：[金額上限（美元）, 手續費（美元）] 的級距表
// midFee：中轉銀行可能從匯款中扣掉的費用（新台幣估計值）
// spreadMul / spreadAdd / spreadFlat：這個方式的匯差，以銀行匯差為基準調整
// hoursMin / hoursMax：到帳需要的時間（小時）
// popularity：估計的使用人數排名（1 = 最多）　maxAmount：單筆上限（等值新台幣）
// source：這些數字是怎麼來的
// convenience（寫在外層）：方便程度 1～5
const METHODS = [
  {
    id: 'bank_online', name: '網路銀行／行動銀行電匯', type: '銀行', convenience: 4,
    out: {
      countries: ALL, popularity: 1,
      fee: { pct: 0.0005, min: 100, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 0.8,
      hoursMin: 24, hoursMax: 72, speedText: '1～3 個工作天',
      maxAmount: 499999,
      needs: '本人的銀行帳戶、事先到銀行設定好的收款帳戶（約定帳戶）',
      pros: '不用跑銀行，部分銀行的網銀手續費或匯率有優惠',
      cons: '單筆未滿新台幣 50 萬元；第一次使用要先到銀行設定收款帳戶；中轉銀行可能另外扣費',
      source: '手續費依多家銀行公告的常見標準（金額的 0.05%，最低約 100～200 元、最高 800 元，另加郵電費 300～400 元）。中轉銀行費用、匯差與到帳時間為估計值。',
    },
  },
  {
    id: 'bank_counter', name: '銀行臨櫃電匯', type: '銀行', convenience: 2,
    out: {
      countries: ALL, popularity: 2,
      fee: { pct: 0.0005, min: 200, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 1,
      hoursMin: 24, hoursMax: 72, speedText: '1～3 個工作天',
      needs: '身分證、收款人姓名與地址、收款銀行名稱與代碼（SWIFT）、收款帳號',
      pros: '金額大也能匯，有行員協助填寫，適合第一次匯款的人',
      cons: '要在營業時間親自跑一趟；中轉銀行可能另外扣費；各家收費不同（例如有銀行固定收 600 元）',
      source: '手續費依多家銀行公告的常見標準（金額的 0.05%，最低約 100～200 元、最高 800 元，另加郵電費 300～400 元）。中轉銀行費用、匯差與到帳時間為估計值。',
    },
  },
  {
    id: 'bank_in', name: '國外銀行電匯到台灣帳戶', type: '銀行', convenience: 3,
    in: {
      countries: ALL, popularity: 1,
      fee: [
        { fixedCur: { US: 45, CN: 200, HK: 150, SG: 30, GB: 15, AU: 20 } },
        { pct: 0.0005, min: 200, max: 800 },
      ],
      midFee: 500, spreadMul: 1,
      hoursMin: 24, hoursMax: 96, speedText: '1～4 個工作天',
      needs: '台灣收款銀行的英文名稱、銀行代碼（SWIFT）、帳號、收款人英文姓名',
      pros: '金額大也能匯，任何銀行帳戶都能收',
      cons: '匯出銀行、中轉銀行、台灣的銀行三邊都可能收費；如果讓國外銀行先換成台幣，匯率通常很差，建議匯原本的外幣到台灣的外幣帳戶再換',
      source: '台灣銀行的入帳手續費依常見公告標準（金額的 0.05%，最低 200 元、最高 800 元）。國外銀行的匯出費用是各國常見收費的估計值，中轉銀行費用、匯差與到帳時間也是估計值。',
    },
  },
  {
    id: 'post', name: '郵局國際匯款', type: '郵局', convenience: 2,
    out: {
      countries: ALL, popularity: 4,
      fee: { pct: 0.0005, min: 100, max: 800, fixed: 300 },
      midFee: 500, spreadMul: 1, spreadAdd: 0.001,
      hoursMin: 72, hoursMax: 120, speedText: '3～5 個工作天',
      needs: '身分證、郵局帳戶、收款人銀行資料',
      pros: '據點多；改用網路郵局或郵局 App 辦理，手續費減半（金額的 0.025%）',
      cons: '到帳比較慢；不是每間郵局都有辦理，要先查有承辦的分局；中轉銀行可能另外扣費',
      source: '手續費依中華郵政公告（臨櫃為金額的 0.05%，最低 100 元、最高 800 元，另加郵電費 300 元）。中轉銀行費用、匯差與到帳時間為估計值。',
    },
  },
  {
    id: 'dbs', name: '星展環星匯（GlobeSend）', type: '線上', convenience: 4,
    out: {
      countries: ALL, popularity: 7,
      fee: {},
      midFee: 0, spreadMul: 1,
      hoursMin: 0, hoursMax: 48, speedText: '當天～2 個工作天',
      maxAmount: 3000000,
      needs: '用星展 GlobeSend App 開立數位帳戶，從新台幣帳戶換匯後匯出',
      pros: '免手續費、免郵電費，也免中轉銀行費用，全程在手機上完成',
      cons: '要另外開星展的數位帳戶；免費是優惠活動，銀行可能隨時調整；單筆不得超過等值新台幣 300 萬元',
      source: '手續費與限額依星展銀行公告的收費標準表（2026/7/20 生效）。匯差與到帳時間為估計值。',
    },
  },
  {
    id: 'taishin', name: '台新易匯通', type: '線上', convenience: 4,
    out: {
      countries: NO_CN, popularity: 6,
      fee: { fixed: 300 },
      midFee: 0, spreadMul: 1,
      hoursMin: 0, hoursMax: 24, speedText: '最快即時～當天',
      maxAmount: 47800,
      needs: '台新銀行帳戶、台新行動銀行 App',
      pros: '固定收 300 元，最快馬上到帳，24 小時都能匯',
      cons: '只能匯小額，每筆 1,500 美元以下；不能匯往中國',
      source: '手續費、限額與國家依台新銀行 2024 年 4 月的新聞稿，之後可能有調整。匯差為估計值。',
    },
  },
  {
    id: 'hsbc', name: '滙豐全球轉帳', type: '銀行', convenience: 3,
    out: {
      countries: ALL, popularity: 5,
      fee: {},
      midFee: 0, spreadMul: 1, spreadAdd: 0.002,
      hoursMin: 0, hoursMax: 0.1, speedText: '幾乎即時',
      maxAmount: 500000,
      needs: '匯款人和收款人都要有滙豐銀行的帳戶（主要提供給卓越理財等級的客戶）',
      pros: '免手續費、幾乎馬上到帳，沒有中轉銀行扣費',
      cons: '雙方都要是滙豐帳戶；卓越理財有存款門檻；每日累計以等值新台幣 50 萬元為限',
      source: '免手續費、即時到帳依滙豐銀行的服務說明；每日限額依理財網站的整理，未在官網查到。匯差為估計值。',
    },
    in: {
      countries: ALL, popularity: 6,
      fee: {},
      midFee: 0, spreadMul: 1, spreadAdd: 0.002,
      hoursMin: 0, hoursMax: 0.1, speedText: '幾乎即時',
      needs: '匯款人在當地、收款人在台灣都要有滙豐銀行的帳戶',
      pros: '免手續費、幾乎馬上到帳，沒有中轉銀行扣費',
      cons: '雙方都要是滙豐帳戶；各國滙豐的限額與資格不同（香港滙豐匯給親友每日上限約 5 萬美元）',
      source: '免手續費、即時到帳與香港的限額依滙豐銀行的服務說明。匯差為估計值。',
    },
  },
  {
    id: 'wise', name: 'Wise', type: '線上', convenience: 4,
    in: {
      countries: NO_CN, popularity: 2,
      fee: [{ pct: 0.006, fixedUsd: 5 }, { fixed: 200 }],
      midFee: 0, spreadFlat: 0.0016,
      hoursMin: 0, hoursMax: 48, speedText: '當天～2 個工作天',
      needs: '匯款人的 Wise 帳號、台灣收款人的「外幣帳戶」資料',
      pros: '換匯用市場匯率、不加匯差，費用在匯款前就看得到',
      cons: 'Wise 不支援新台幣，台灣這邊收到的是美元，要匯進外幣帳戶後自己再換成台幣；台灣的銀行可能另收 200～400 元入帳手續費',
      source: 'Wise 官網的範例：匯 1,000 美元到台灣，用銀行轉帳付款的費用約 9 美元。其他幣別的費用比例、台灣銀行的入帳手續費與換回台幣的匯差為估計值。',
    },
  },
  {
    id: 'revolut', name: 'Revolut', type: '線上', convenience: 4,
    in: {
      countries: ['GB', 'AU'], popularity: 5,
      fee: { pct: 0.005 },
      midFee: 0, spreadFlat: 0.005,
      hoursMin: 0, hoursMax: 24, speedText: '當天',
      needs: '匯款人的 Revolut 帳號、台灣收款人的銀行帳戶',
      pros: '可以直接匯新台幣到台灣的銀行帳戶，通常當天到',
      cons: '只有住在有 Revolut 服務的國家才能開戶；週末換匯和超過每月免費額度會加收費用',
      source: 'Revolut 官網說明可從英國、澳洲匯新台幣到台灣帳戶、通常當天到帳。手續費與匯差沒有查到確切數字，是估計值。',
    },
  },
  {
    id: 'paypal', name: 'PayPal', type: '線上', convenience: 5,
    out: {
      countries: ALL, popularity: 8,
      fee: { pct: 0.015 },
      midFee: 0, spreadFlat: 0.04,
      hoursMin: 0, hoursMax: 0.2, speedText: '數分鐘',
      maxAmount: 300000,
      needs: '雙方都有 PayPal 帳號、匯款人的信用卡（台灣帳戶不能儲值，只能刷卡付款）',
      pros: '只要對方的 Email 就能付款，全程在手機或電腦上完成',
      cons: '成本主要在換匯：PayPal 換匯加收 4%，信用卡銀行再收約 1.5%；如果對方是用收貨款的方式收，對方還要付約 4.4% 加固定費用',
      source: 'PayPal 台灣官網的費用頁（2026/5/28 更新）：付款本身不收手續費，換匯加收 4%。信用卡海外交易手續費約 1.5% 依理財網站的整理。單筆上限為估計值。',
    },
    in: {
      countries: NO_CN, popularity: 3,
      fee: { pct: 0.05, maxCur: { US: 4.99, HK: 38.99, SG: 6.39, GB: 2.99, AU: 5.99 } },
      midFee: 0, spreadFlat: 0.044,
      hoursMin: 0, hoursMax: 0.2, speedText: '數分鐘',
      maxAmount: 300000,
      needs: '雙方都有 PayPal 帳號；台灣收款人要再把錢提領到台灣的銀行帳戶',
      pros: '只要對方的 Email 就能匯，幾分鐘內進到 PayPal 帳戶',
      cons: '手續費看起來不高，但換匯比市場匯率差約 4%～4.6%，金額愈大損失愈多；從 PayPal 提領到台灣的銀行還要另外等幾天',
      source: '手續費（金額的 5%，上限約 4.99 美元）依 PayPal 美國官網（2026/5/19 更新）；各國上限與匯差依 Wise 比價資料庫 2026/10/5 收錄的 PayPal 報價。單筆上限為估計值。',
    },
  },
  {
    id: 'payoneer', name: 'Payoneer（派安盈）', type: '線上', convenience: 3,
    in: {
      countries: NO_CN, popularity: 7,
      fee: [{ pct: 0.012 }, { fixed: 250 }],
      midFee: 0, spreadFlat: 0.005,
      hoursMin: 24, hoursMax: 72, speedText: '1～3 個工作天',
      needs: 'Payoneer 帳號（需要審核）、台灣的銀行帳戶',
      pros: '適合接案、跨境電商收國外客戶或平台（Amazon、eBay 等）的款項，有中文介面與客服',
      cons: '是給工作收款用的，不適合親友之間匯款；一年收款未達 2,000 美元會收約 30 美元年費；中轉銀行可能另外扣費',
      source: '提領手續費最高 1.2%、年費與台灣銀行入帳費依跨境金流網站 2026 年的整理，沒有取得 Payoneer 官網的費用表。匯差與到帳時間為估計值。',
    },
  },
  {
    id: 'wu', name: '西聯匯款（Western Union）', type: '現金匯款', convenience: 2,
    out: {
      countries: ALL, popularity: 3,
      fee: { tiersUsd: [[850, 5], [1700, 6.5], [3400, 10], [15000, 15]], fixed: 100 },
      midFee: 0, spreadMul: 1, spreadAdd: 0.02,
      hoursMin: 0.2, hoursMax: 24, speedText: '數分鐘～1 天',
      maxAmount: 478000,
      needs: '身分證、收款人的護照英文姓名；到京城銀行的櫃檯用新台幣現金辦理',
      pros: '速度快，收款人沒有銀行帳戶也能憑證件領現金',
      cons: '台灣目前只有京城銀行承辦；匯率比較差；單筆上限 15,000 美元',
      source: '手續費級距與上限依遊學代辦網站 2020 年的整理，年代較久，尚未找到京城銀行的最新公告。匯差為估計值。',
    },
    in: {
      countries: ALL, popularity: 4,
      fee: { pct: 0.01, min: 150, max: 1500 },
      midFee: 0, spreadMul: 1, spreadAdd: 0.02,
      hoursMin: 0.2, hoursMax: 24, speedText: '數分鐘～1 天',
      maxAmount: 478000,
      needs: '匯款人在當地的西聯據點或網站匯出；台灣收款人帶身分證和匯款密碼到京城銀行領取',
      pros: '速度快，匯款人不需要銀行帳戶',
      cons: '台灣只有京城銀行可以領；匯率比較差；各國的手續費差異很大',
      source: '台灣只有京城銀行承辦依多個網站的整理。各國匯出的手續費與匯差沒有查到確切數字，是估計值。',
    },
  },
];

// 匯款用途，首頁用來篩選
const USES = [
  { id: 'family', label: '生活費／親友' },
  { id: 'tuition', label: '學費' },
  { id: 'work', label: '接案／電商收款' },
  { id: 'large', label: '大額資金' },
  { id: 'cash', label: '領現金' },
];

// 每種方式的補充資料：
// url：官方網站　safety：保障與監管的說明
// uses：這個方向適合哪些用途　badges：卡片上要特別標示的提醒
// fxNote：匯率怎麼算的補充說明
const BANK_SAFETY = '銀行受當地金融主管機關監管（台灣為金管會）。匯款資料填錯或收款人有問題時，款項可能被退回並扣手續費。';
const METHOD_INFO = {
  bank_online: { safety: BANK_SAFETY, uses: { out: ['family', 'tuition'] } },
  bank_counter: { safety: BANK_SAFETY, uses: { out: ['family', 'tuition', 'large'] } },
  bank_in: {
    safety: BANK_SAFETY,
    uses: { in: ['family', 'work', 'large'] },
    fxNote: '這裡假設匯出的是當地貨幣，到台灣後由台灣的銀行換成新台幣。',
  },
  post: {
    url: 'https://www.post.gov.tw/',
    safety: '中華郵政是國營事業，受金管會與交通部監管。',
    uses: { out: ['family'] },
  },
  dbs: {
    url: 'https://www.dbs.com.tw/',
    safety: '星展（台灣）商業銀行是受金管會監管的銀行。',
    uses: { out: ['family', 'tuition', 'large'] },
  },
  taishin: {
    url: 'https://www.taishinbank.com.tw/',
    safety: '台新銀行是受金管會監管的銀行。',
    uses: { out: ['family'] },
  },
  hsbc: {
    url: 'https://www.hsbc.com.tw/',
    safety: '滙豐（台灣）商業銀行是受金管會監管的銀行，各國的滙豐受當地主管機關監管。',
    uses: { out: ['family', 'tuition'], in: ['family', 'large'] },
  },
  wise: {
    url: 'https://wise.com/',
    safety: 'Wise 是英國上市公司，在英國、美國、新加坡、澳洲、香港等地持有當地的匯款或支付執照。它不是銀行，帳戶裡的錢不適用存款保險。',
    uses: { in: ['family', 'work'] },
    badges: { in: ['須備外幣帳戶', '美元入帳，需自行結匯'] },
    fxNote: 'Wise 不支援新台幣，所以流程是：Wise 用市場匯率（不加匯差）把錢換成美元，匯進台灣收款人的外幣帳戶，收款人再請台灣的銀行把美元換成新台幣。這裡的匯差就是最後這一步銀行換匯的價差，已經算進「對方大約收到」的金額裡。',
  },
  revolut: {
    url: 'https://www.revolut.com/',
    safety: 'Revolut 在英國持有銀行執照，在澳洲等地持有當地的金融服務執照。',
    uses: { in: ['family'] },
  },
  paypal: {
    url: 'https://www.paypal.com/tw/',
    safety: 'PayPal 是美國上市公司，在各國持有支付執照。「親友付款」沒有買家保障；帳戶有可能因為審查被暫時凍結。',
    uses: { out: ['family'], in: ['family', 'work'] },
    badges: { in: ['需另行提領至銀行帳戶'] },
  },
  payoneer: {
    url: 'https://www.payoneer.com/',
    safety: 'Payoneer 是美國上市公司，在美國、歐盟、香港等地持有支付執照。它不是銀行。',
    uses: { in: ['work'] },
    badges: { in: ['限商務收款'] },
  },
  wu: {
    url: 'https://www.westernunion.com/',
    safety: '西聯匯款是美國上市公司，在各國持有匯款執照。現金一旦被領走就無法追回，是詐騙集團常要求使用的管道，千萬不要匯給不認識的人。',
    uses: { out: ['family', 'cash'], in: ['family', 'cash'] },
  },
};

// 各方向通用的規定
const RULES = {
  out: '在台灣把新台幣換成外幣匯出，單筆達新台幣 50 萬元以上需要填寫申報書，通常要到銀行臨櫃辦理；個人每年累積的結匯額度是 500 萬美元。',
  in: '匯回台灣的外幣要換成新台幣時，單筆達新台幣 50 萬元以上同樣需要申報；金額較大時，銀行可能會詢問資金來源。',
};

const DISCLAIMER = '本站只整理公開資訊供比較參考，不經手任何款項，也不是任何銀行或匯款業者的代理人。實際的費用、匯率、到帳時間與交易是否成功，都以各業者為準；因使用這些服務而產生的任何損失或糾紛，本站不負責。匯款前請自行向業者確認，並小心詐騙，不要匯款給不認識的人。';

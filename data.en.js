// 英文版的文字。數字都在 data.js，這裡只放翻譯；改 data.js 的文字時要一起改這裡。

const EN_RATE_SOURCE = ' The exchange-rate margin is taken from the Bank of Taiwan buy/sell spot rates of 5 Oct 2026 and differs slightly between banks.';
const EN_BANK_SAFETY = 'Banks are supervised by the local financial regulator (the Financial Supervisory Commission in Taiwan). If the details are wrong or there is a problem with the recipient, the money may be returned with fees deducted.';
const EN_BANK_SOURCE = 'Fees follow the standard schedules published by E.SUN, Yuanta, Bank of Taiwan and Mega (0.05% of the amount, minimum NT$100–200, maximum NT$800, plus a cable charge of NT$300–400).' + EN_RATE_SOURCE + ' Intermediary bank charges (typically US$0–40) are an estimate.';

const EN = {
  home: { name: 'Taiwan', curName: 'New Taiwan dollar' },
  countries: {
    US: { name: 'United States', curName: 'US dollar' },
    CN: {
      name: 'China', curName: 'Chinese yuan',
      noteOut: 'Personal renminbi remittances to China are capped per day (about CNY 80,000). The exact limit depends on the handling bank.',
      noteIn: 'Individuals in China have an annual foreign-exchange purchase quota (USD 50,000 equivalent per person), and most online transfer platforms cannot send money out of China, so the options are limited.',
    },
    HK: { name: 'Hong Kong', curName: 'Hong Kong dollar' },
    SG: { name: 'Singapore', curName: 'Singapore dollar' },
    GB: { name: 'United Kingdom', curName: 'British pound' },
    AU: { name: 'Australia', curName: 'Australian dollar' },
  },
  types: { 銀行: 'Bank', 郵局: 'Post office', 線上: 'Online', 現金匯款: 'Cash transfer' },
  uses: {
    family: 'Living costs / family',
    tuition: 'Tuition',
    work: 'Freelance / e-commerce income',
    large: 'Large amounts',
    cash: 'Cash pickup',
  },
  rules: {
    out: 'In Taiwan, converting NT$500,000 or more into foreign currency in a single transaction requires a declaration form and usually a visit to a bank branch. An individual may convert up to USD 5 million per year.',
    in: 'Converting incoming foreign currency into New Taiwan dollars also requires a declaration for NT$500,000 or more per transaction. For large amounts the bank may ask about the source of funds.',
  },
  disclaimer: 'This site only compiles public information for comparison. It does not handle any money and is not an agent of any bank or transfer provider. Actual fees, exchange rates, delivery times and whether a transfer succeeds are determined by each provider. This site is not responsible for any loss or dispute arising from the use of these services. Confirm the details with the provider before you send, and beware of scams: never send money to someone you do not know.',
  methods: {
    bank_online: {
      name: 'Online / mobile banking wire transfer',
      safety: EN_BANK_SAFETY,
      out: {
        speedText: '1–5 business days',
        needs: 'Your own bank account and a payee account registered with the bank in advance',
        pros: 'No branch visit; some banks discount the fee or the rate online',
        cons: 'Under NT$500,000 per transfer; the payee must be registered at a branch before first use; intermediary banks may deduct charges',
        source: EN_BANK_SOURCE,
      },
    },
    bank_counter: {
      name: 'Bank wire transfer at a branch',
      safety: EN_BANK_SAFETY,
      out: {
        speedText: '1–5 business days',
        needs: 'ID, the recipient\'s name and address, the receiving bank\'s name and SWIFT code, and the account number',
        pros: 'Handles large amounts; staff help with the form, which suits first-time senders',
        cons: 'Requires a visit during business hours; intermediary banks may deduct charges; fees vary by bank (Fubon, for example, charges a flat NT$600)',
        source: EN_BANK_SOURCE,
      },
    },
    bank_in: {
      name: 'Bank wire from abroad to a Taiwan account',
      safety: EN_BANK_SAFETY,
      fxNote: 'This assumes the money is sent in the local currency and converted into New Taiwan dollars by the bank in Taiwan.',
      in: {
        speedText: '1–5 business days',
        needs: 'The Taiwan bank\'s English name and SWIFT code, the account number, and the recipient\'s name in English',
        pros: 'Handles large amounts; any bank account can receive',
        cons: 'The sending bank, intermediary banks and the Taiwan bank may each charge a fee. If the foreign bank converts to TWD first, the margin is often 2–3%, so it is usually better to send the original currency and convert in Taiwan',
        source: 'Sending fees are typical online charges at large banks: about US$40 in the US (Chase 40, Bank of America 45, Wells Fargo 25), about £5–12 in the UK, about A$9–35 in Australia, HK$70 via HSBC online banking in Hong Kong, 0.125% of the amount (S$10–120) plus a S$20 cable charge in Singapore, and 0.1% (CNY 50–260) plus a CNY 80 cable charge at Bank of China. Taiwan banks charge 0.05% (NT$200–800) to credit the account.' + EN_RATE_SOURCE + ' Intermediary bank charges are an estimate.',
      },
    },
    post: {
      name: 'Chunghwa Post international remittance',
      safety: 'Chunghwa Post is state-owned and supervised by the Financial Supervisory Commission and the Ministry of Transportation and Communications.',
      out: {
        speedText: '2–4 business days',
        needs: 'ID, a post office account and the recipient\'s bank details',
        pros: 'Many branches; the fee is halved (0.025%) through the online post office or the app',
        cons: 'Not every post office offers it, so check first; intermediary banks may deduct charges',
        source: 'Fees follow Chunghwa Post\'s published schedule (0.05% at the counter, minimum NT$100, maximum NT$800, plus a NT$300 cable charge). Delivery time is from personal-finance websites. The exchange-rate margin is estimated from bank board rates and intermediary charges are an estimate.',
      },
    },
    dbs: {
      name: 'DBS GlobeSend',
      safety: 'DBS Bank (Taiwan) is a bank supervised by the Financial Supervisory Commission.',
      out: {
        speedText: 'Same day to 2 business days',
        needs: 'A digital account opened in the DBS GlobeSend app; convert from the TWD account and send',
        pros: 'No transfer fee, no cable charge and no intermediary bank charge; done entirely on a phone',
        cons: 'Requires a separate DBS digital account; the zero fee is a promotion the bank may change; up to NT$3 million equivalent per transfer',
        source: 'Fees and limits follow the DBS tariff effective 20 Jul 2026. DBS does not publish its exchange-rate margin or delivery time; both are estimated from ordinary bank figures.',
      },
    },
    taishin: {
      name: 'Taishin Easy Remit',
      safety: 'Taishin Bank is a bank supervised by the Financial Supervisory Commission.',
      out: {
        speedText: 'Instant to 2 business days',
        needs: 'A Taishin Bank account and the Taishin mobile banking app',
        pros: 'Flat NT$300 per transfer, full amount delivered (no intermediary deductions), can arrive immediately',
        cons: 'US$15,000 per transfer to a pre-registered payee, or US$1,500 otherwise; processed 9:00–15:00 on banking days; not available to China',
        source: 'Fees, limits, countries and delivery time follow Taishin Bank\'s service page (Sep–Dec 2026 campaign). The exchange-rate margin is estimated from bank board rates.',
      },
    },
    hsbc: {
      name: 'HSBC Global Transfers',
      safety: 'HSBC Bank (Taiwan) is supervised by the Financial Supervisory Commission; HSBC entities elsewhere are supervised by their local regulators.',
      out: {
        speedText: 'Near-instant',
        needs: 'Both sender and recipient need HSBC accounts (mainly offered to Premier customers)',
        pros: 'No fee, arrives almost immediately, no intermediary bank charges',
        cons: 'Both sides must bank with HSBC; Premier has a minimum balance; daily total capped at NT$500,000 equivalent',
        source: 'Zero fee and instant delivery follow HSBC\'s service description. The Taiwan daily limit comes from personal-finance websites and was not found on HSBC Taiwan\'s own site. HSBC does not publish its exchange-rate margin; the figure here is an estimate.',
      },
      in: {
        speedText: 'Near-instant',
        needs: 'The sender needs an HSBC account locally and the recipient an HSBC account in Taiwan',
        pros: 'No fee, arrives almost immediately, no intermediary bank charges',
        cons: 'Both sides must bank with HSBC; limits and eligibility differ by country (HSBC Hong Kong allows up to US$50,000 a day to other people)',
        source: 'Zero fee, instant delivery and the Hong Kong limit follow HSBC Hong Kong\'s website. HSBC does not publish its exchange-rate margin; the figure here is an estimate.',
      },
    },
    wise: {
      name: 'Wise',
      safety: 'Wise is listed in the UK and holds money-transfer or payment licences in the UK, US, Singapore, Australia, Hong Kong and elsewhere. It is not a bank, and balances are not covered by deposit insurance.',
      fxNote: 'Wise does not support New Taiwan dollars. Wise converts the money to US dollars at the mid-market rate with no margin and sends it to the recipient\'s foreign-currency account in Taiwan; the recipient then asks their Taiwan bank to convert the dollars to TWD. The margin shown here is the bank\'s spread on that last conversion, and it is already included in the "Recipient gets" amount.',
      badges: { in: ['Foreign-currency account required', 'Paid in USD; recipient converts to TWD'] },
      in: {
        speedText: 'Same day to 2 business days',
        needs: 'The sender\'s Wise account and the recipient\'s foreign-currency account details in Taiwan',
        pros: 'Converts at the mid-market rate with no margin; the fee is shown before you send',
        cons: 'Wise does not support TWD: the recipient gets US dollars in a foreign-currency account and converts them. The Taiwan bank may charge NT$200–400 to credit the account',
        source: 'Wise\'s own example: sending US$1,000 to Taiwan funded by bank transfer costs US$9.03. Conversion fees for other currencies are about 0.3–0.6% according to comparison sites. The Taiwan bank crediting fee (NT$200–400) is from personal-finance websites; the margin on converting back to TWD follows Bank of Taiwan board rates.',
      },
    },
    revolut: {
      name: 'Revolut',
      safety: 'Revolut holds a UK banking licence and local financial-services licences in Australia and other markets.',
      in: {
        speedText: 'Same day',
        needs: 'The sender\'s Revolut account and the recipient\'s bank account in Taiwan',
        pros: 'Sends TWD straight to a Taiwan bank account, usually the same day',
        cons: 'Only residents of countries Revolut serves can open an account; on the free plan, exchange above the monthly allowance (£1,000 in the UK) costs 1%, and weekend exchange adds 1%',
        source: 'Revolut\'s website says TWD can be sent from the UK and Australia to Taiwan accounts, usually the same day. The exchange fee follows the Standard plan terms and is calculated here at 1% (above the monthly allowance); weekday exchange within the allowance has no markup. The transfer fee of about 0.3% is from comparison sites; the app shows the exact amount.',
      },
    },
    paypal: {
      name: 'PayPal',
      safety: 'PayPal is a US-listed company with payment licences in many countries. "Friends and family" payments have no buyer protection, and accounts can be temporarily limited during a review.',
      badges: { in: ['Separate withdrawal to bank required'] },
      out: {
        speedText: 'Minutes',
        needs: 'Both sides need PayPal accounts; the sender needs a credit card (Taiwan accounts cannot hold a balance)',
        pros: 'Only the recipient\'s email is needed; done entirely on a phone or computer',
        cons: 'The cost is in the conversion: PayPal adds 4% and the card issuer about 1.5%. If the recipient receives it as a payment for goods, they pay about 4.4% plus a fixed fee',
        source: 'PayPal Taiwan fee page (updated 28 May 2026): no fee for the payment itself, 4% currency-conversion spread. The roughly 1.5% card foreign-transaction fee is from personal-finance websites. PayPal publishes no fixed per-transfer limit; the limit here is an estimate and depends on the account.',
      },
      in: {
        speedText: 'Minutes',
        needs: 'Both sides need PayPal accounts; the recipient then withdraws to a Taiwan bank account',
        pros: 'Only the recipient\'s email is needed; arrives in the PayPal account within minutes',
        cons: 'The fee looks small, but the exchange rate is about 4–4.6% worse than the market, so larger amounts lose more. Withdrawing from PayPal to a Taiwan bank takes a few more days',
        source: 'The fee (5% of the amount, capped at US$4.99) follows PayPal\'s US fee page (updated 19 May 2026). Caps for other countries and the rate margin come from PayPal quotes in Wise\'s comparison data collected on 5 Oct 2026. PayPal publishes no fixed per-transfer limit; the limit here is an estimate.',
      },
    },
    payoneer: {
      name: 'Payoneer',
      safety: 'Payoneer is a US-listed company with payment licences in the US, EU, Hong Kong and elsewhere. It is not a bank.',
      badges: { in: ['Business receipts only'] },
      in: {
        speedText: '1–3 business days',
        needs: 'A Payoneer account (subject to approval) and a Taiwan bank account',
        pros: 'Built for freelancers and cross-border sellers receiving money from overseas clients or marketplaces (Amazon, eBay and others)',
        cons: 'Meant for business receipts, not transfers between family; a US$29.95 annual fee applies if receipts in 12 months are below the threshold; intermediary banks may deduct charges',
        source: 'Payoneer\'s full fee schedule is only visible after signing in. Figures here follow 2026 summaries on payment and comparison sites: 1.2–3% (including conversion) to withdraw to a bank account in another currency, calculated at 2%; annual fee US$29.95. The Taiwan bank crediting fee of NT$200–300 is from the same kind of summary.',
      },
    },
    wu: {
      name: 'Western Union',
      safety: 'Western Union is a US-listed company with remittance licences worldwide. Cash cannot be recovered once collected, and scammers often ask for this channel: never send money to someone you do not know.',
      badges: { in: ['May pay out in USD; recipient converts to TWD'] },
      out: {
        speedText: 'Minutes to 1 day',
        needs: 'ID and the recipient\'s name as in their passport; pay in TWD cash at a King\'s Town Bank counter',
        pros: 'Fast; the recipient can collect cash with ID and needs no bank account. Small amounts can be sent online through King\'s Town Bank\'s KingsPay service',
        cons: 'King\'s Town Bank is the only agent in Taiwan; the exchange rate is poorer; the online service is capped at NT$50,000 per transfer (NT$30,000 for cash pickup) with a US$10–14 fee',
        source: 'Online fees and limits follow King\'s Town Bank\'s KingsPay website. Counter fee tiers and the US$15,000 limit come from a 2020 summary by a study-abroad agency; the official site only refers to "the Western Union fee table" without figures. Western Union does not publish its rate margin; the figure here is an estimate.',
      },
      in: {
        speedText: 'Minutes to 1 day',
        needs: 'The sender uses a local Western Union location or website; the recipient collects at King\'s Town Bank with ID and the tracking number',
        pros: 'Fast; the sender needs no bank account',
        cons: 'Collection in Taiwan is only at King\'s Town Bank counters; the payout may be in US dollars, which the recipient then converts to TWD; fees depend on country, payment method and payout method, and take a larger share of small transfers',
        source: 'Western Union states that fees and rates vary with the amount, payment method and payout method and are only shown once the details are entered. The figures here draw on one real transfer from the UK to Taiwan in late August 2026: £80 sent, £2.99 fee, US$107.36 received, a rate about 1.2% below the market. Fees and margins for other amounts and countries are extrapolated from that case.',
      },
    },
  },
};

export interface ChartItem {
  id: string;
  title: string;
  description: string;
  section: "crypto" | "macro" | "tradfi";
  category: string;
  subcategory?: string;
  chartType: "line" | "area" | "bar" | "gauge" | "scatter";
  color: string;
  apiEndpoint?: string;
  apiParams?: Record<string, string>;
}

// ─── Crypto Charts ───────────────────────────────────────────────
const CRYPTO_MARKET_CAP: ChartItem[] = [
  { id: "total-market-cap", title: "Total Crypto Market Cap", description: "전체 암호화폐 시가총액 (로그 스케일, 추세선 포함)", section: "crypto", category: "Market Capitalization", chartType: "area", color: "#2962FF", apiEndpoint: "/api/crypto/market-cap", apiParams: { type: "total" } },
  { id: "btc-market-cap", title: "Bitcoin Market Cap", description: "비트코인 시가총액 변화 추이", section: "crypto", category: "Market Capitalization", chartType: "area", color: "#F7931A", apiEndpoint: "/api/crypto/market-cap", apiParams: { type: "btc" } },
  { id: "eth-market-cap", title: "Ethereum Market Cap", description: "이더리움 시가총액 변화 추이", section: "crypto", category: "Market Capitalization", chartType: "area", color: "#627EEA", apiEndpoint: "/api/crypto/market-cap", apiParams: { type: "eth" } },
  { id: "altcoin-market-cap", title: "Altcoin Market Cap", description: "비트코인 제외 알트코인 전체 시가총액", section: "crypto", category: "Market Capitalization", chartType: "area", color: "#00BCD4", apiEndpoint: "/api/crypto/market-cap", apiParams: { type: "altcoin" } },
  { id: "stablecoin-market-cap", title: "Stablecoin Market Cap", description: "스테이블코인(USDT, USDC 등) 총 시가총액", section: "crypto", category: "Market Capitalization", chartType: "area", color: "#26A17B", apiEndpoint: "/api/crypto/market-cap", apiParams: { type: "stablecoin" } },
];

const CRYPTO_RISK: ChartItem[] = [
  { id: "btc-risk-signal", title: "Bitcoin Risk Signal", description: "비트코인 RSI 리스크 지표 (0-100 범위)", section: "crypto", category: "Risk", chartType: "line", color: "#EF4444", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "rsi" } },
  { id: "mvrv-zscore", title: "MVRV Z-Score", description: "Market Value to Realized Value Z-Score", section: "crypto", category: "Risk", chartType: "line", color: "#8B5CF6", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "mvrv" } },
  { id: "reserve-risk", title: "Reserve Risk", description: "장기 보유자 신뢰도 대비 가격 리스크", section: "crypto", category: "Risk", chartType: "line", color: "#F97316", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365" } },
  { id: "fear-greed-index", title: "Fear & Greed Index", description: "공포 & 탐욕 지수 (0=극도 공포, 100=극도 탐욕)", section: "crypto", category: "Risk", chartType: "line", color: "#EAB308", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365" } },
  { id: "nupl", title: "Net Unrealized Profit/Loss", description: "미실현 순이익/손실 비율", section: "crypto", category: "Risk", chartType: "area", color: "#10B981", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365" } },
];

const CRYPTO_LOG_REGRESSION: ChartItem[] = [
  { id: "btc-log-regression", title: "Bitcoin Log Regression", description: "비트코인 로그 회귀 밴드 (장기 공정가치 ±2σ)", section: "crypto", category: "Logarithmic Regression", chartType: "line", color: "#2962FF", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "logreg" } },
  { id: "rainbow-chart", title: "Rainbow Chart", description: "비트코인 레인보우 가격 밴드 (9단계 가치 평가)", section: "crypto", category: "Logarithmic Regression", chartType: "line", color: "#FF6B6B", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "rainbow" } },
  { id: "stock-to-flow", title: "Stock-to-Flow Model", description: "S2F 모델 기반 비트코인 공정가치 비교", section: "crypto", category: "Logarithmic Regression", chartType: "line", color: "#F7931A", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "s2f" } },
  { id: "power-law-corridor", title: "Power Law Corridor", description: "비트코인 거듭제곱 법칙 가격 회랑 (±2σ)", section: "crypto", category: "Logarithmic Regression", chartType: "line", color: "#8B5CF6", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "powerlaw" } },
];

const CRYPTO_ROI: ChartItem[] = [
  { id: "btc-vs-gold-roi", title: "BTC vs Gold ROI", description: "비트코인 대 금 수익률 비교 (정규화)", section: "crypto", category: "Return On Investment", chartType: "line", color: "#F7931A", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "compare_gold" } },
  { id: "btc-vs-sp500-roi", title: "BTC vs S&P 500 ROI", description: "비트코인 대 S&P 500 수익률 비교 (정규화)", section: "crypto", category: "Return On Investment", chartType: "line", color: "#627EEA", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "compare_sp500" } },
];

const CRYPTO_MA: ChartItem[] = [
  { id: "200-week-ma", title: "200-Week Moving Average", description: "200주 이동평균선 (장기 지지선)", section: "crypto", category: "Moving Averages", chartType: "line", color: "#EF4444", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "sma" } },
  { id: "pi-cycle-top", title: "Pi Cycle Top Indicator", description: "111일 MA x 2 와 350일 MA 크로스", section: "crypto", category: "Moving Averages", chartType: "line", color: "#8B5CF6", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "sma" } },
  { id: "golden-ratio-multiplier", title: "Golden Ratio Multiplier", description: "350일 MA x 황금비율 밴드", section: "crypto", category: "Moving Averages", chartType: "line", color: "#F7931A", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "sma" } },
  { id: "2y-ma-multiplier", title: "2-Year MA Multiplier", description: "2년 이동평균 x5 상단 밴드", section: "crypto", category: "Moving Averages", chartType: "line", color: "#10B981", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "sma" } },
];

const CRYPTO_MOMENTUM: ChartItem[] = [
  { id: "btc-rsi", title: "Bitcoin RSI (14D)", description: "14일 상대강도지수", section: "crypto", category: "Momentum", chartType: "line", color: "#2962FF", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "rsi" } },
  { id: "btc-macd", title: "Bitcoin MACD", description: "MACD (12, 26, 9) 시그널", section: "crypto", category: "Momentum", chartType: "bar", color: "#10B981", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "macd" } },
  { id: "stochastic-rsi", title: "Stochastic RSI", description: "스토캐스틱 RSI (14, 14, 3, 3)", section: "crypto", category: "Momentum", chartType: "line", color: "#F97316", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "rsi" } },
];

const CRYPTO_TA: ChartItem[] = [
  { id: "btc-support-resistance", title: "Support & Resistance Levels", description: "주요 지지/저항 레벨", section: "crypto", category: "Technical Analysis", chartType: "line", color: "#EF4444", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365" } },
  { id: "btc-fibonacci", title: "Fibonacci Retracement", description: "피보나치 되돌림 레벨", section: "crypto", category: "Technical Analysis", chartType: "line", color: "#8B5CF6", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365" } },
  { id: "btc-bollinger", title: "Bollinger Bands", description: "볼린저 밴드 (20일, 2 표준편차)", section: "crypto", category: "Technical Analysis", chartType: "line", color: "#2962FF", apiEndpoint: "/api/crypto/history", apiParams: { coin: "bitcoin", days: "365", metric: "bollinger" } },
];

// On-Chain, Derivatives, Social, Advances & Declines categories removed
// These charts lacked real API data and only showed generic BTC price charts

// ─── Macro Charts ────────────────────────────────────────────────
const MACRO_GDP: ChartItem[] = [
  { id: "us-real-gdp", title: "US Real GDP Growth", description: "미국 실질 GDP 성장률 (분기별)", section: "macro", category: "GDP", chartType: "bar", color: "#10B981", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "rgdp" } },
  { id: "global-gdp", title: "Global GDP Growth", description: "세계 주요국 GDP 성장률 비교", section: "macro", category: "GDP", chartType: "bar", color: "#2962FF" },
];

const MACRO_INFLATION: ChartItem[] = [
  { id: "us-cpi", title: "US CPI (YoY)", description: "미국 소비자물가지수 전년대비 변화율", section: "macro", category: "Inflation", chartType: "line", color: "#F97316", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "inflation" } },
  { id: "us-pce", title: "Core PCE", description: "핵심 개인소비지출 물가지수", section: "macro", category: "Inflation", chartType: "line", color: "#EF4444", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "pce" } },
  { id: "breakeven-inflation", title: "Breakeven Inflation Rate", description: "5년 기대 인플레이션율", section: "macro", category: "Inflation", chartType: "line", color: "#EAB308", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "breakeven" } },
];

const MACRO_EMPLOYMENT: ChartItem[] = [
  { id: "us-unemployment", title: "US Unemployment Rate", description: "미국 실업률", section: "macro", category: "Employment", chartType: "line", color: "#EF4444", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "unemployment" } },
  { id: "us-nonfarm-payrolls", title: "Nonfarm Payrolls", description: "비농업 고용 변동 (월별)", section: "macro", category: "Employment", chartType: "bar", color: "#2962FF", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "nonfarm" } },
  { id: "us-initial-claims", title: "Initial Jobless Claims", description: "신규 실업수당 청구건수 (주별)", section: "macro", category: "Employment", chartType: "line", color: "#F97316", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "initialclaims" } },
];

const MACRO_RATES: ChartItem[] = [
  { id: "fed-funds-rate", title: "Federal Funds Rate", description: "미국 연방기금금리", section: "macro", category: "Interest Rates", chartType: "line", color: "#8B5CF6", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "fedfunds" } },
  { id: "us-10y-yield", title: "US 10-Year Treasury Yield", description: "미국 10년 국채 수익률", section: "macro", category: "Interest Rates", chartType: "line", color: "#2962FF", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "t10y" } },
  { id: "us-2y-10y-spread", title: "2Y-10Y Yield Spread", description: "2년-10년 국채 수익률 스프레드 (역전 = 경기침체 신호)", section: "macro", category: "Interest Rates", chartType: "area", color: "#EF4444", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "t10y2y" } },
  { id: "us-dollar-index", title: "US Dollar Index (DXY)", description: "미국 달러 인덱스", section: "macro", category: "Interest Rates", chartType: "line", color: "#10B981", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "dxy" } },
];

const MACRO_MONEY: ChartItem[] = [
  { id: "us-m2-money-supply", title: "M2 Money Supply", description: "미국 M2 통화량", section: "macro", category: "Money Supply", chartType: "area", color: "#2962FF", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "m2" } },
  { id: "fed-balance-sheet", title: "Fed Balance Sheet", description: "연준 대차대조표 규모", section: "macro", category: "Money Supply", chartType: "area", color: "#8B5CF6", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "fedbalance" } },
];

// ─── TradFi Charts ───────────────────────────────────────────────
const TRADFI_FUNDAMENTALS: ChartItem[] = [
  { id: "sp500-pe-ratio", title: "S&P 500 P/E Ratio", description: "S&P 500 주가수익비율", section: "tradfi", category: "Fundamentals", subcategory: "Ratios", chartType: "line", color: "#2962FF" },
  { id: "sp500-earnings", title: "S&P 500 Earnings", description: "S&P 500 기업 실적 추이", section: "tradfi", category: "Fundamentals", subcategory: "Basics", chartType: "bar", color: "#10B981" },
  { id: "buffett-indicator", title: "Buffett Indicator", description: "총시가총액/GDP 비율 (워렌 버핏 지표)", section: "tradfi", category: "Fundamentals", subcategory: "Ratios", chartType: "line", color: "#F7931A" },
  { id: "shiller-cape", title: "Shiller CAPE Ratio", description: "경기조정 주가수익비율 (10년)", section: "tradfi", category: "Fundamentals", subcategory: "Ratios", chartType: "line", color: "#8B5CF6" },
];

const TRADFI_PRICE: ChartItem[] = [
  { id: "sp500-index", title: "S&P 500 Index", description: "S&P 500 지수 추이", section: "tradfi", category: "Price Metrics", chartType: "area", color: "#2962FF", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "sp500" } },
  { id: "nasdaq-composite", title: "Nasdaq Composite", description: "나스닥 종합지수 추이", section: "tradfi", category: "Price Metrics", chartType: "area", color: "#00BCD4", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "nasdaq" } },
  { id: "gold-price", title: "Gold Price (XAU/USD)", description: "금 현물 가격", section: "tradfi", category: "Price Metrics", chartType: "line", color: "#F7931A", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "goldprice" } },
  { id: "silver-price", title: "Silver Price (XAG/USD)", description: "은 현물 가격", section: "tradfi", category: "Price Metrics", chartType: "line", color: "#9CA3AF", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "silverprice" } },
  { id: "crude-oil-price", title: "Crude Oil (WTI)", description: "WTI 원유 가격", section: "tradfi", category: "Price Metrics", chartType: "line", color: "#1F2937", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "oilprice" } },
  { id: "vix-index", title: "VIX Volatility Index", description: "공포지수 (S&P 500 옵션 내재변동성)", section: "tradfi", category: "Price Metrics", chartType: "line", color: "#EF4444", apiEndpoint: "/api/macro/indicators", apiParams: { indicator: "vix" } },
];

// ─── Export All ──────────────────────────────────────────────────
export const CHART_CATALOG: ChartItem[] = [
  ...CRYPTO_MARKET_CAP,
  ...CRYPTO_RISK,
  ...CRYPTO_LOG_REGRESSION,
  ...CRYPTO_ROI,
  ...CRYPTO_MA,
  ...CRYPTO_MOMENTUM,
  ...CRYPTO_TA,
  ...MACRO_GDP,
  ...MACRO_INFLATION,
  ...MACRO_EMPLOYMENT,
  ...MACRO_RATES,
  ...MACRO_MONEY,
  ...TRADFI_FUNDAMENTALS,
  ...TRADFI_PRICE,
];

// Helper: get unique categories for a section
export function getCategoriesForSection(section: "crypto" | "macro" | "tradfi") {
  const charts = CHART_CATALOG.filter((c) => c.section === section);
  const cats = [...new Set(charts.map((c) => c.category))];
  return cats;
}

// Helper: get charts by section and optional category
export function getChartsBySection(
  section: "crypto" | "macro" | "tradfi",
  category?: string
) {
  return CHART_CATALOG.filter(
    (c) => c.section === section && (!category || c.category === category)
  );
}

// Helper: get chart by ID
export function getChartById(id: string) {
  return CHART_CATALOG.find((c) => c.id === id);
}

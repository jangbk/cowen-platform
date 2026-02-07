// Asset types
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "stock" | "index" | "metal" | "commodity";
  iconUrl?: string;
}

export interface AssetPrice extends Asset {
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  fiatRisk: number | null;
  sparkline7d: number[];
}

// Risk metrics
export interface RiskMetric {
  name: string;
  value: number;
  description?: string;
  chartUrl?: string;
}

export interface RiskSummary {
  summary: number;
  price: number;
  onChain: number;
  social: number;
  priceMetrics: RiskMetric[];
  onChainMetrics: RiskMetric[];
  socialMetrics: RiskMetric[];
}

export interface RecessionRisk {
  summary: number;
  employment: number;
  nationalIncome: number;
  productionBusiness: number;
}

// Charts
export interface ChartDefinition {
  id: string;
  title: string;
  description: string;
  category: "crypto" | "macro" | "tradfi";
  section: string;
  subsection: string;
  chartType: "line" | "bar" | "area" | "scatter" | "heatmap" | "gauge";
  metrics: string[];
  assetFilter?: string[];
}

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// Macro
export interface MacroEvent {
  name: string;
  date: string;
  time: string;
  previous?: string;
  forecast?: string;
}

export interface MacroIndicator {
  id: string;
  name: string;
  latestValue: number;
  latestDate: string;
  unit: string;
  history: ChartDataPoint[];
}

// Tools
export interface DCAResult {
  totalInvested: number;
  accumulatedAmount: number;
  averagePrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  portfolioHistory: ChartDataPoint[];
  investedHistory: ChartDataPoint[];
  trades: DCATrade[];
}

export interface DCATrade {
  date: string;
  action: "Buy";
  assetPrice: number;
  accumulatedAmount: number;
  investedAmount: number;
  portfolioValue: number;
}

export interface ExitStrategy {
  riskTolerance: string;
  bands: Record<string, number>;
  total: number;
}

export interface PortfolioSimulation {
  volatility: number;
  expectedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  weights: Record<string, number>;
}

export interface WeightedRiskAsset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  currentPrice: number;
  currentRisk: number;
  percentage: number;
}

// Treasuries
export interface TreasuryHolding {
  rank: number;
  name: string;
  ticker?: string;
  mktPrice: number;
  mktCap: number;
  liabilities: number | null;
  btcAmount: number;
  nav: number;
  mNav: number;
  premDisc: number;
  flow1d: number;
}

// Content
export interface Study {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface PremiumVideo {
  id: string;
  title: string;
  date: string;
  youtubeId: string;
}

export interface Newsletter {
  id: string;
  title: string;
  date: string;
  pdfUrl?: string;
}

export interface ReleaseNote {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  author: string;
  authorAvatar?: string;
  tags: string[];
}

// Navigation
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

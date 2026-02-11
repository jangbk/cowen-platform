"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, Plus, Trash2, Info, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RiskMetric {
  name: string;
  value: number;
  displayValue: string;
  weight: number;
  score: number; // 0-100
  signal: string;
  description: string;
}

interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  price: number;
  risk: number; // 0-1
}

// CoinGecko ID mapping for price fetch
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOGE: "dogecoin",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  DOT: "polkadot",
};

const DEFAULT_METRICS: RiskMetric[] = [
  { name: "MVRV Z-Score", value: 2.14, displayValue: "2.14", weight: 15, score: 55, signal: "Neutral", description: "시장가치/실현가치 비율" },
  { name: "Reserve Risk", value: 0.003, displayValue: "0.003", weight: 15, score: 25, signal: "Low Risk", description: "장기보유자 확신도" },
  { name: "Puell Multiple", value: 1.24, displayValue: "1.24", weight: 10, score: 50, signal: "Fair Value", description: "채굴수익 연평균 대비" },
  { name: "Pi Cycle Top", value: 0, displayValue: "No", weight: 10, score: 10, signal: "Not Triggered", description: "111DMA/350DMA 크로스" },
  { name: "200W MA Multiple", value: 2.58, displayValue: "2.58", weight: 10, score: 65, signal: "Elevated", description: "200주 이동평균 배수" },
  { name: "RHODL Ratio", value: 4821, displayValue: "4,821", weight: 10, score: 55, signal: "Mid-Cycle", description: "Realized HODL 비율" },
  { name: "NUPL", value: 0.58, displayValue: "0.58", weight: 10, score: 60, signal: "Belief", description: "순 미실현 이익/손실" },
  { name: "SOPR", value: 1.04, displayValue: "1.04", weight: 10, score: 35, signal: "In Profit", description: "지출 산출물 수익 비율" },
  { name: "Exchange Reserves", value: -2.4, displayValue: "-2.4%", weight: 10, score: 20, signal: "Outflow", description: "거래소 BTC 30일 변화" },
];

const DEFAULT_PORTFOLIO: PortfolioAsset[] = [
  { id: "1", name: "Bitcoin", symbol: "BTC", quantity: 1.5, price: 0, risk: 0.5 },
  { id: "2", name: "Ethereum", symbol: "ETH", quantity: 15, price: 0, risk: 0.5 },
  { id: "3", name: "Solana", symbol: "SOL", quantity: 100, price: 0, risk: 0.5 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

function formatUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

// Simple donut chart
function PortfolioDonut({ assets }: { assets: PortfolioAsset[] }) {
  const total = assets.reduce((s, a) => s + a.quantity * a.price, 0);
  if (total === 0) return null;

  const size = 180;
  const r = size / 2 - 12;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {assets.map((a, i) => {
          const pct = (a.quantity * a.price) / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={a.id}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 16} className="fill-background" />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-foreground text-sm font-bold" fontSize="14">
          {formatUSD(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          총 포트폴리오
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {assets.map((a, i) => {
          const pct = ((a.quantity * a.price) / total) * 100;
          return (
            <span key={a.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {a.symbol} ({pct.toFixed(1)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WeightedRiskPage() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [showGuide, setShowGuide] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Fetch real risk & price data from API
  const fetchRiskData = useCallback(() => {
    setLoading(true);

    // Fetch risk scores for all assets
    fetch("/api/crypto/risk?asset=all")
      .then((r) => r.json())
      .then((data) => {
        const risks: Record<string, number> = {};
        if (data.risks) {
          for (const [symbol, info] of Object.entries(data.risks)) {
            risks[symbol] = (info as { risk: number }).risk;
          }
        }
        setDataSource(data.source || "unknown");

        // Fetch current prices from CoinGecko simple/price
        const symbols = portfolio.map((a) => a.symbol);
        const geckoIds = symbols
          .map((s) => COINGECKO_IDS[s])
          .filter(Boolean);

        if (geckoIds.length > 0) {
          fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=usd`
          )
            .then((r) => r.json())
            .then((priceData) => {
              setPortfolio((prev) =>
                prev.map((a) => {
                  const geckoId = COINGECKO_IDS[a.symbol];
                  const price = geckoId && priceData[geckoId]?.usd;
                  const risk = risks[a.symbol];
                  return {
                    ...a,
                    ...(price ? { price } : {}),
                    ...(risk !== undefined ? { risk } : {}),
                  };
                })
              );
              setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
              setLoading(false);
            })
            .catch(() => {
              // At least apply risk scores
              setPortfolio((prev) =>
                prev.map((a) => {
                  const risk = risks[a.symbol];
                  return risk !== undefined ? { ...a, risk } : a;
                })
              );
              setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
              setLoading(false);
            });
        } else {
          setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
          setLoading(false);
        }
      })
      .catch(() => {
        setDataSource("fallback");
        setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  // Composite score
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const compositeScore = totalWeight > 0
    ? metrics.reduce((s, m) => s + (m.score * m.weight) / totalWeight, 0)
    : 0;

  // Weighted portfolio risk
  const portfolioValue = portfolio.reduce((s, a) => s + a.quantity * a.price, 0);
  const weightedRisk = portfolioValue > 0
    ? portfolio.reduce((s, a) => s + a.risk * ((a.quantity * a.price) / portfolioValue), 0)
    : 0;

  const riskLevel = compositeScore > 75 ? "High Risk" : compositeScore > 50 ? "Elevated" : compositeScore > 25 ? "Moderate" : "Low Risk";

  const updateWeight = (name: string, weight: number) => {
    setMetrics(metrics.map((m) => (m.name === name ? { ...m, weight } : m)));
  };

  const addAsset = () => {
    const id = Date.now().toString();
    setPortfolio([...portfolio, { id, name: "New Asset", symbol: "???", quantity: 0, price: 0, risk: 0.5 }]);
  };

  const removeAsset = (id: string) => {
    setPortfolio(portfolio.filter((a) => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof PortfolioAsset, value: string | number) => {
    setPortfolio(
      portfolio.map((a) => (a.id === id ? { ...a, [field]: typeof value === "string" ? value : value } : a))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Weighted Risk Assessment</h1>
        </div>
        <p className="text-muted-foreground">
          온체인/시장 지표 가중 리스크 점수 + 포트폴리오 가중 리스크 분석
        </p>
      </div>

      {/* Usage Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            사용법 안내
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Weighted Risk Assessment란?
              </h4>
              <p>
                다양한 온체인/시장 리스크 지표에 <strong>개인화된 가중치</strong>를
                부여하여 복합 리스크 점수를 산출하고, 포트폴리오 각 자산의{" "}
                <strong>비중 가중 리스크</strong>를 실시간으로 분석하는 도구입니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                1. 시장 리스크 점수 (Market Risk Score)
              </h4>
              <p>
                9개 온체인/시장 지표의 가중 평균 점수입니다. 0~100 스케일로 표시되며,
                각 지표의 가중치를 직접 조절하여 <strong>개인 투자 방법론</strong>에
                맞게 커스터마이징할 수 있습니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 포트폴리오 리스크 (Portfolio Risk)
              </h4>
              <p>
                각 자산의 개별 리스크 점수(0~1)를 포트폴리오 비중으로 가중 평균하여
                산출합니다. <strong>CoinGecko 실시간 가격</strong>과{" "}
                <strong>365일 히스토리컬 데이터</strong> 기반으로 자동 계산됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 포트폴리오 자산 관리
              </h4>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <strong>자산 추가/삭제</strong>: 우측 상단 &quot;자산 추가&quot; 버튼으로
                  자산을 추가하고, 휴지통 아이콘으로 삭제합니다.
                </li>
                <li>
                  <strong>수량/가격 편집</strong>: 테이블에서 직접 수정 가능합니다.
                  가격은 API에서 자동 로드되지만 수동 변경도 가능합니다.
                </li>
                <li>
                  <strong>리스크 슬라이더</strong>: 자동 계산된 리스크 값을 수동으로
                  조정할 수 있습니다.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 온체인 지표 가중치 조절
              </h4>
              <p>
                각 지표 행의 가중치 입력란에 원하는 값을 입력하세요. 총 가중치 합과
                무관하게 점수는 자동 정규화됩니다. 중요하다고 판단하는 지표에 더
                높은 가중치를 부여하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                dataSource === "coingecko" ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span>
              데이터 소스: {dataSource === "coingecko" ? "CoinGecko (실시간)" : dataSource === "sample" ? "샘플 데이터" : dataSource}
            </span>
            {lastUpdated && <span>| 업데이트: {lastUpdated}</span>}
          </div>
          <button
            onClick={fetchRiskData}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted text-xs"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
      )}

      {/* Top: Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Market Risk Score</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <GaugeChart
                value={compositeScore / 100}
                label="시장 리스크"
                size="lg"
              />
              <p className={`mt-2 text-sm font-semibold ${
                compositeScore > 75 ? "text-red-500" : compositeScore > 50 ? "text-yellow-500" : compositeScore > 25 ? "text-blue-500" : "text-green-500"
              }`}>
                {riskLevel} ({compositeScore.toFixed(0)}/100)
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Risk</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GaugeChart
              value={weightedRisk}
              label="포트폴리오 가중 리스크"
              size="lg"
              subMetrics={portfolio.map((a, i) => ({
                label: a.symbol,
                value: a.risk,
                color: COLORS[i % COLORS.length],
              }))}
            />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-center">
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PortfolioDonut assets={portfolio} />
          )}
        </div>
      </div>

      {/* Portfolio Holdings */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">포트폴리오 자산</h2>
          <button
            onClick={addAsset}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> 자산 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">자산</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">심볼</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">수량</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가격</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가치</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 (0-1)</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">비중</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((a, i) => {
                const val = a.quantity * a.price;
                const pct = portfolioValue > 0 ? (val / portfolioValue) * 100 : 0;
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateAsset(a.id, "name", e.target.value)}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={a.symbol}
                        onChange={(e) => updateAsset(a.id, "symbol", e.target.value)}
                        className="w-16 bg-transparent text-sm uppercase focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.quantity}
                        onChange={(e) => updateAsset(a.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.price}
                        onChange={(e) => updateAsset(a.id, "price", parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatUSD(val)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(a.risk * 100)}
                          onChange={(e) => updateAsset(a.id, "risk", parseInt(e.target.value) / 100)}
                          className="w-16 accent-primary"
                        />
                        <span className="text-xs font-mono w-8">{a.risk.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono text-white"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeAsset(a.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">온체인/시장 리스크 지표 (가중치 조절 가능)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재값</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">신호</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">리스크 점수</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">가중치</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">기여도</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.name} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{m.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.displayValue}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.score > 65 ? "bg-red-500/10 text-red-500" :
                      m.score > 40 ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-green-500/10 text-green-500"
                    }`}>
                      {m.signal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.score > 65 ? "bg-red-500" : m.score > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-6">{m.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.weight}
                      onChange={(e) => updateWeight(m.name, parseInt(e.target.value) || 0)}
                      className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {totalWeight > 0 ? ((m.score * m.weight) / totalWeight).toFixed(1) : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Criteria */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowCriteria(!showCriteria)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            리스크 점수 기준 및 지표 해석
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showCriteria ? "rotate-180" : ""}`}
          />
        </button>
        {showCriteria && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-4">
            {/* Risk Level Criteria */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">리스크 레벨 기준</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2.5">
                  <p className="text-xs font-bold text-green-500">Low Risk (0~25)</p>
                  <p className="text-[10px] mt-1">시장이 저평가 구간에 있으며, 역사적으로 매수 기회가 될 수 있는 구간입니다.</p>
                </div>
                <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
                  <p className="text-xs font-bold text-blue-500">Moderate (25~50)</p>
                  <p className="text-[10px] mt-1">시장이 적정 가치 범위 내에 있으며, 정상적인 상승 추세 또는 횡보 구간입니다.</p>
                </div>
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
                  <p className="text-xs font-bold text-yellow-500">Elevated (50~75)</p>
                  <p className="text-[10px] mt-1">시장 과열 초기 징후가 나타나며, 리스크 관리와 포지션 축소를 고려해야 합니다.</p>
                </div>
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2.5">
                  <p className="text-xs font-bold text-red-500">High Risk (75~100)</p>
                  <p className="text-[10px] mt-1">시장이 극도로 과열된 상태이며, 역사적으로 고점 형성 구간에 해당합니다.</p>
                </div>
              </div>
            </div>

            {/* Portfolio Risk Criteria */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">포트폴리오 리스크 (0~1) 산출 기준</h4>
              <p className="text-xs mb-2">
                각 자산의 리스크 점수는 CoinGecko 365일 가격 데이터를 기반으로 아래 3가지 요소를 가중 평균하여 자동 산출됩니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">요소</th>
                      <th className="px-3 py-2 text-center font-medium">비중</th>
                      <th className="px-3 py-2 text-left font-medium">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">Price Position</td>
                      <td className="px-3 py-2 text-center">45%</td>
                      <td className="px-3 py-2">365일 최저~최고 범위에서 현재 가격의 위치 (0=바닥, 1=꼭대기)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">Momentum</td>
                      <td className="px-3 py-2 text-center">35%</td>
                      <td className="px-3 py-2">200일 이동평균(SMA) 대비 현재 가격 비율로 과열/저평가 판단</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium">Volatility</td>
                      <td className="px-3 py-2 text-center">20%</td>
                      <td className="px-3 py-2">30일 연환산 변동성 (높을수록 리스크 높음)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* On-chain Metric Explanations */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">온체인 지표 상세 해석</h4>
              <div className="space-y-2 text-xs">
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>MVRV Z-Score</strong> — 시장가치(Market Cap)와 실현가치(Realized Cap)의 차이를 표준편차로 나눈 값. Z &gt; 7이면 고점, Z &lt; 0이면 바닥 신호.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Reserve Risk</strong> — 장기 보유자의 확신도 대비 현재 가격. 낮을수록 보유자 확신이 높아 매수 적기, 높으면 매도 적기.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Puell Multiple</strong> — 일일 채굴 수익을 365일 이동평균으로 나눈 값. 4 이상이면 과열, 0.5 이하면 저평가.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Pi Cycle Top</strong> — 111일 MA가 350일 MA x2를 상향 돌파하면 시장 고점 신호. 역사적으로 고점을 3일 이내 정확도로 예측.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>200W MA Multiple</strong> — 현재 가격을 200주 이동평균으로 나눈 배수. 5 이상이면 극도의 과열, 1 이하면 저평가.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>RHODL Ratio</strong> — 1주 보유자와 1~2년 보유자의 Realized Value 비율. 높으면 신규 투기 자금 유입 과열.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>NUPL</strong> — 네트워크 전체의 미실현 이익/손실. 0.75 이상이면 &quot;탐욕(Euphoria)&quot;, 0 이하면 &quot;항복(Capitulation)&quot;.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>SOPR</strong> — 이동한 코인의 매도 시점 가격 / 매수 시점 가격 비율. 1 이상이면 수익 실현 상태, 1 이하면 손실 매도.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Exchange Reserves</strong> — 거래소 보유 BTC 30일 변화율. 감소(유출)는 매도 압력 감소로 긍정적, 증가(유입)는 매도 압력.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weight customization note */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          가중치를 조절하여 개인 투자 방법론에 맞게 복합 점수를 커스터마이징하세요.
          현재 총 가중치: <strong>{totalWeight}%</strong>. 점수는 총 가중치와 무관하게 정규화됩니다.
        </p>
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>
            <strong>온체인 지표(MVRV, NUPL, SOPR 등)는 현재 샘플 데이터</strong>입니다. Glassnode 등 온체인 API 연동 시 실시간 데이터로 대체됩니다.
          </li>
          <li>
            포트폴리오 자산의 <strong>가격과 리스크 점수</strong>는 CoinGecko API에서 실시간으로 가져옵니다 (1시간 캐시).
          </li>
          <li>
            리스크 점수는 <strong>과거 가격 데이터 기반 통계적 추정치</strong>이며, 미래 수익률이나 손실을 예측하지 않습니다.
          </li>
          <li>
            각 지표의 가중치는 <strong>개인의 투자 철학과 시장 해석</strong>에 따라 달라져야 합니다. 기본 가중치는 참고용입니다.
          </li>
          <li>
            암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산이며, 본 도구는 <strong>교육 및 참고 목적</strong>입니다.
          </li>
          <li>
            본 도구는 투자 조언이 아닙니다. <strong>투자 결정은 본인 책임</strong>입니다.
          </li>
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Plus,
  Trash2,
  Zap,
  Info,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Asset {
  name: string;
  ticker: string;
  allocation: number;
  expectedReturn: number;
  volatility: number;
}

interface SimulatedPortfolio {
  risk: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

// ---------------------------------------------------------------------------
// Preset assets (quick-add)
// ---------------------------------------------------------------------------
interface PresetAsset {
  name: string;
  ticker: string;
  expectedReturn: number;
  volatility: number;
}

const PRESET_ASSETS: PresetAsset[] = [
  { name: "Bitcoin", ticker: "BTC", expectedReturn: 85, volatility: 72 },
  { name: "Ethereum", ticker: "ETH", expectedReturn: 65, volatility: 78 },
  { name: "XRP", ticker: "XRP", expectedReturn: 55, volatility: 85 },
  { name: "Solana", ticker: "SOL", expectedReturn: 75, volatility: 90 },
  { name: "S&P 500", ticker: "SPX", expectedReturn: 10.5, volatility: 15 },
  { name: "Gold", ticker: "XAU", expectedReturn: 8, volatility: 12 },
  { name: "US Bonds", ticker: "AGG", expectedReturn: 4.5, volatility: 5 },
];

const DEFAULT_ASSETS: Asset[] = [
  { name: "Bitcoin", ticker: "BTC", allocation: 30, expectedReturn: 85, volatility: 72 },
  { name: "Ethereum", ticker: "ETH", allocation: 15, expectedReturn: 65, volatility: 78 },
  { name: "S&P 500", ticker: "SPX", allocation: 25, expectedReturn: 10.5, volatility: 15 },
  { name: "Gold", ticker: "XAU", allocation: 15, expectedReturn: 8, volatility: 12 },
  { name: "US Bonds", ticker: "AGG", allocation: 15, expectedReturn: 4.5, volatility: 5 },
];

// ---------------------------------------------------------------------------
// Correlation matrix (expanded)
// ---------------------------------------------------------------------------
const CORRELATIONS: Record<string, Record<string, number>> = {
  BTC: { BTC: 1, ETH: 0.82, XRP: 0.72, SOL: 0.78, SPX: 0.38, XAU: 0.12, AGG: -0.15 },
  ETH: { BTC: 0.82, ETH: 1, XRP: 0.68, SOL: 0.85, SPX: 0.42, XAU: 0.08, AGG: -0.18 },
  XRP: { BTC: 0.72, ETH: 0.68, XRP: 1, SOL: 0.65, SPX: 0.3, XAU: 0.05, AGG: -0.12 },
  SOL: { BTC: 0.78, ETH: 0.85, XRP: 0.65, SOL: 1, SPX: 0.35, XAU: 0.06, AGG: -0.2 },
  SPX: { BTC: 0.38, ETH: 0.42, XRP: 0.3, SOL: 0.35, SPX: 1, XAU: -0.05, AGG: 0.22 },
  XAU: { BTC: 0.12, ETH: 0.08, XRP: 0.05, SOL: 0.06, XAU: 1, AGG: 0.35 },
  AGG: { BTC: -0.15, ETH: -0.18, XRP: -0.12, SOL: -0.2, SPX: 0.22, XAU: 0.35, AGG: 1 },
};

function getCorr(a: string, b: string): number {
  return CORRELATIONS[a]?.[b] ?? CORRELATIONS[b]?.[a] ?? (a === b ? 1 : 0.2);
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------
function runMonteCarlo(
  assets: Asset[],
  numSimulations: number
): SimulatedPortfolio[] {
  const riskFreeRate = 4.5;
  const portfolios: SimulatedPortfolio[] = [];

  for (let s = 0; s < numSimulations; s++) {
    const rawWeights = assets.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map((w) => w / sum);

    const ret = assets.reduce(
      (acc, a, i) => acc + a.expectedReturn * weights[i],
      0
    );

    let variance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const corr = getCorr(assets[i].ticker, assets[j].ticker);
        variance +=
          (weights[i] *
            weights[j] *
            assets[i].volatility *
            assets[j].volatility *
            corr) /
          10000;
      }
    }
    const risk = Math.sqrt(Math.max(0, variance)) * 100;
    const sharpe = risk > 0 ? (ret - riskFreeRate) / risk : 0;

    portfolios.push({ risk, ret, sharpe, weights });
  }

  return portfolios;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// Map tickers to CoinGecko IDs for crypto assets
const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
};

async function fetchRealStats(ticker: string): Promise<{ annualReturn: number; annualVol: number } | null> {
  const cgId = TICKER_TO_COINGECKO[ticker];
  if (!cgId) return null;

  try {
    // Fetch 365 days of daily prices from CoinGecko
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=365&interval=daily`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const prices: number[] = data.prices.map((p: [number, number]) => p[1]);

    if (prices.length < 30) return null;

    // Calculate daily log returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    // Annualized return
    const totalReturn = (prices[prices.length - 1] / prices[0] - 1) * 100;
    const annualReturn = totalReturn; // already ~1 year

    // Annualized volatility (daily std * sqrt(365))
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1);
    const dailyVol = Math.sqrt(variance);
    const annualVol = dailyVol * Math.sqrt(365) * 100;

    return { annualReturn, annualVol };
  } catch {
    return null;
  }
}

export default function ModernPortfolioTheoryPage() {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [numSims, setNumSims] = useState(5000);
  const [hasRun, setHasRun] = useState(false);
  const [simResults, setSimResults] = useState<SimulatedPortfolio[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch real returns/volatility for crypto assets on mount
  useEffect(() => {
    async function loadRealData() {
      const cryptoTickers = ["BTC", "ETH", "XRP", "SOL"];
      let updatedCount = 0;

      const results = await Promise.allSettled(
        cryptoTickers.map((ticker) => fetchRealStats(ticker))
      );

      setAssets((prev) => {
        const updated = [...prev];
        results.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value) {
            const ticker = cryptoTickers[idx];
            const assetIdx = updated.findIndex((a) => a.ticker === ticker);
            if (assetIdx >= 0) {
              updated[assetIdx] = {
                ...updated[assetIdx],
                expectedReturn: Math.round(result.value.annualReturn * 10) / 10,
                volatility: Math.round(result.value.annualVol * 10) / 10,
              };
              updatedCount++;
            }
            // Also update presets reference for later adds
            const presetIdx = PRESET_ASSETS.findIndex((p) => p.ticker === ticker);
            if (presetIdx >= 0) {
              PRESET_ASSETS[presetIdx].expectedReturn = Math.round(result.value.annualReturn * 10) / 10;
              PRESET_ASSETS[presetIdx].volatility = Math.round(result.value.annualVol * 10) / 10;
            }
          }
        });
        return updated;
      });

      setDataSource(updatedCount > 0 ? `CoinGecko (${updatedCount}개 크립토 실제 데이터)` : "기본값");
      setIsLoadingData(false);
    }
    loadRealData();
  }, []);

  const totalAlloc = assets.reduce((s, a) => s + a.allocation, 0);

  const currentMetrics = useMemo(() => {
    const weights = assets.map((a) => a.allocation / 100);
    const ret = assets.reduce(
      (acc, a, i) => acc + a.expectedReturn * weights[i],
      0
    );

    let variance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const corr = getCorr(assets[i].ticker, assets[j].ticker);
        variance +=
          (weights[i] *
            weights[j] *
            assets[i].volatility *
            assets[j].volatility *
            corr) /
          10000;
      }
    }
    const risk = Math.sqrt(Math.max(0, variance)) * 100;
    const sharpe = risk > 0 ? (ret - 4.5) / risk : 0;
    const sortino = risk > 0 ? (ret - 4.5) / (risk * 0.7) : 0;
    const maxDD = risk * 2.2;

    return { ret, risk, sharpe, sortino, maxDD };
  }, [assets]);

  const runSimulation = () => {
    const results = runMonteCarlo(assets, numSims);
    setSimResults(results);
    setHasRun(true);
  };

  const optimal = useMemo(() => {
    if (simResults.length === 0) return null;
    const maxSharpe = simResults.reduce(
      (best, p) => (p.sharpe > best.sharpe ? p : best),
      simResults[0]
    );
    const minVar = simResults.reduce(
      (best, p) => (p.risk < best.risk ? p : best),
      simResults[0]
    );
    return { maxSharpe, minVar };
  }, [simResults]);

  const addPreset = (preset: PresetAsset) => {
    if (assets.some((a) => a.ticker === preset.ticker)) return;
    setAssets([...assets, { ...preset, allocation: 0 }]);
    setShowPresets(false);
  };

  const addCustom = () => {
    setAssets([
      ...assets,
      {
        name: "Custom",
        ticker: "NEW",
        allocation: 0,
        expectedReturn: 10,
        volatility: 20,
      },
    ]);
  };

  const removeAsset = (i: number) => {
    setAssets(assets.filter((_, idx) => idx !== i));
  };

  const normalizeAllocations = () => {
    const total = assets.reduce((s, a) => s + a.allocation, 0);
    if (total === 0 || total === 100) return;
    setAssets(
      assets.map((a, i, arr) => {
        if (i < arr.length - 1) {
          return { ...a, allocation: Math.round((a.allocation / total) * 100) };
        }
        // Last asset gets the remainder to ensure exactly 100
        const sumSoFar = arr.slice(0, -1).reduce((s, x) => s + Math.round((x.allocation / total) * 100), 0);
        return { ...a, allocation: 100 - sumSoFar };
      })
    );
  };

  const distributeEvenly = () => {
    const count = assets.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    setAssets(
      assets.map((a, i) => ({
        ...a,
        allocation: base + (i < remainder ? 1 : 0),
      }))
    );
  };

  const updateAsset = (
    i: number,
    field: keyof Asset,
    value: number | string
  ) => {
    const updated = [...assets];
    updated[i] = { ...updated[i], [field]: value };
    setAssets(updated);
  };

  // SVG scatter plot
  const svgWidth = 600;
  const svgHeight = 440;
  const pad = { top: 20, right: 20, bottom: 70, left: 55 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  const allPoints = hasRun ? simResults : [];

  // Dynamic axis range — use percentile-based range for robustness against outliers
  const allRisks = [...allPoints.map((p) => p.risk), currentMetrics.risk];
  const allRets = [...allPoints.map((p) => p.ret), currentMetrics.ret];

  // Use 1st and 99th percentile to avoid outlier-driven stretching
  const sortedRisks = [...allRisks].sort((a, b) => a - b);
  const sortedRets = [...allRets].sort((a, b) => a - b);
  const p1 = (arr: number[]) => arr[Math.floor(arr.length * 0.01)] ?? arr[0];
  const p99 = (arr: number[]) => arr[Math.floor(arr.length * 0.99)] ?? arr[arr.length - 1];

  const dataMinRisk = allRisks.length > 1 ? p1(sortedRisks) : 0;
  const dataMaxRisk = allRisks.length > 1 ? p99(sortedRisks) : currentMetrics.risk + 20;
  const dataMinRet = allRets.length > 1 ? p1(sortedRets) : 0;
  const dataMaxRet = allRets.length > 1 ? p99(sortedRets) : currentMetrics.ret + 20;

  // Ensure current portfolio & optimal points are always within range
  const effectiveMaxRisk = Math.max(dataMaxRisk, currentMetrics.risk);
  const effectiveMaxRet = Math.max(dataMaxRet, currentMetrics.ret);
  const effectiveMinRisk = Math.min(dataMinRisk, currentMetrics.risk);
  const effectiveMinRet = Math.min(dataMinRet, currentMetrics.ret);

  const riskRange = effectiveMaxRisk - effectiveMinRisk || 20;
  const retRange = effectiveMaxRet - effectiveMinRet || 20;

  const minRisk = Math.max(0, effectiveMinRisk - riskRange * 0.08);
  const maxRisk = effectiveMaxRisk + riskRange * 0.08;
  const minRet = Math.max(0, effectiveMinRet - retRange * 0.08);
  const maxRet = effectiveMaxRet + retRange * 0.08;

  const toX = (risk: number) => pad.left + ((risk - minRisk) / (maxRisk - minRisk)) * plotW;
  const toY = (ret: number) => pad.top + plotH - ((ret - minRet) / (maxRet - minRet)) * plotH;

  // Available presets (not yet added)
  const availablePresets = PRESET_ASSETS.filter(
    (p) => !assets.some((a) => a.ticker === p.ticker)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PieChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Modern Portfolio Theory</h1>
        </div>
        <p className="text-muted-foreground">
          포트폴리오 최적화 - 몬테카를로 시뮬레이션으로 효율적 프론티어 시각화
        </p>
        <div className="mt-1.5">
          {isLoadingData ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 크립토 실제 수익률/변동성 계산 중...
            </span>
          ) : dataSource.includes("CoinGecko") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> {dataSource}
            </span>
          )}
        </div>
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
                Modern Portfolio Theory(MPT)란?
              </h4>
              <p>
                해리 마코위츠가 제안한 <strong>현대 포트폴리오 이론</strong>은,
                여러 자산을 적절한 비율로 조합하면{" "}
                <strong>
                  같은 수익률에서 리스크를 최소화하거나, 같은 리스크에서 수익률을
                  극대화
                </strong>
                할 수 있다는 이론입니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                1. 포트폴리오 구성
              </h4>
              <p>
                좌측 패널에서 자산을 추가/삭제하고, 각 자산의{" "}
                <strong>비중(%), 기대수익률(%), 변동성(%)</strong>을 설정합니다.
                프리셋 버튼으로 BTC, ETH, XRP, SOL 등을 빠르게 추가할 수
                있습니다. 총 비중은 반드시 100%여야 합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 몬테카를로 시뮬레이션
              </h4>
              <p>
                &quot;최적화&quot; 버튼을 누르면 수천~수만 개의 무작위 포트폴리오
                조합을 생성하여 <strong>효율적 프론티어</strong>를 시각화합니다.
                시뮬레이션 횟수가 많을수록 결과가 정밀해지지만 시간이 더
                걸립니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 결과 해석
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Efficient Frontier 차트</strong>: X축은 리스크(변동성),
                  Y축은 기대수익률. 각 점은 하나의 포트폴리오 조합입니다.
                </li>
                <li>
                  <strong>Max Sharpe (노란점)</strong>: 위험 대비 수익이 가장 좋은
                  최적 포트폴리오.
                </li>
                <li>
                  <strong>Min Variance (초록점)</strong>: 리스크가 가장 낮은
                  포트폴리오.
                </li>
                <li>
                  <strong>내 포트폴리오 (빨간점)</strong>: 현재 설정한 비중의
                  포트폴리오 위치.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 주요 지표
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Sharpe Ratio</strong>: (수익률 - 무위험수익률) / 변동성.
                  1 이상이면 양호, 2 이상이면 우수.
                </li>
                <li>
                  <strong>Sortino Ratio</strong>: 하방 변동성만 고려한 위험 조정
                  수익률. Sharpe보다 보수적.
                </li>
                <li>
                  <strong>Max Drawdown</strong>: 예상 최대 낙폭. 고점에서 저점까지
                  하락 폭 추정.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                5. 상관관계 매트릭스
              </h4>
              <p>
                자산 간 가격 움직임의 유사도를 보여줍니다.{" "}
                <strong>음의 상관관계(-)</strong>를 가진 자산을 함께 보유하면
                포트폴리오 리스크를 줄일 수 있습니다. 예: 암호화폐 + 미국 국채.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Portfolio Builder */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">포트폴리오 구성</h2>
              <div className="relative">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  <Plus className="h-3 w-3" /> 추가
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showPresets && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                    {availablePresets.map((p) => (
                      <button
                        key={p.ticker}
                        onClick={() => addPreset(p)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex justify-between"
                      >
                        <span>
                          {p.name} ({p.ticker})
                        </span>
                      </button>
                    ))}
                    {availablePresets.length > 0 && (
                      <div className="border-t border-border my-1" />
                    )}
                    <button
                      onClick={() => {
                        addCustom();
                        setShowPresets(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-muted-foreground"
                    >
                      + 직접 입력
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {assets.map((a, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) =>
                          updateAsset(i, "name", e.target.value)
                        }
                        className="w-24 bg-transparent text-sm font-semibold focus:outline-none"
                      />
                      <input
                        type="text"
                        value={a.ticker}
                        onChange={(e) =>
                          updateAsset(i, "ticker", e.target.value.toUpperCase())
                        }
                        className="w-12 bg-transparent text-xs text-muted-foreground uppercase focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeAsset(i)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-10">
                        비중
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={a.allocation}
                        onChange={(e) =>
                          updateAsset(i, "allocation", parseInt(e.target.value))
                        }
                        className="flex-1 accent-primary"
                      />
                      <span className="w-10 text-right text-xs font-mono">
                        {a.allocation}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">
                          기대수익률 (%)
                        </label>
                        <input
                          type="number"
                          value={a.expectedReturn}
                          onChange={(e) =>
                            updateAsset(
                              i,
                              "expectedReturn",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">
                          변동성 (%)
                        </label>
                        <input
                          type="number"
                          value={a.volatility}
                          onChange={(e) =>
                            updateAsset(
                              i,
                              "volatility",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`mt-3 rounded-md p-2 text-xs ${
                totalAlloc === 100
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  총 비중: {totalAlloc}%{" "}
                  {totalAlloc === 100 ? "✓" : "(100%여야 합니다)"}
                </span>
                {totalAlloc !== 100 && (
                  <button
                    onClick={normalizeAllocations}
                    className="rounded px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                  >
                    자동 맞추기
                  </button>
                )}
              </div>
              {totalAlloc !== 100 && (
                <div className="flex gap-1.5 mt-1.5 justify-end">
                  <button
                    onClick={distributeEvenly}
                    className="rounded px-2 py-0.5 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    균등 분배
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">
                  시뮬레이션 횟수
                </label>
                <select
                  value={numSims}
                  onChange={(e) => setNumSims(parseInt(e.target.value))}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="1000">1,000</option>
                  <option value="5000">5,000</option>
                  <option value="10000">10,000</option>
                  <option value="50000">50,000</option>
                </select>
              </div>
              <button
                onClick={runSimulation}
                className="mt-3 flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="h-3.5 w-3.5" /> 최적화
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">기대수익률</p>
              <p className="text-lg font-bold text-green-500">
                {currentMetrics.ret.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">
                포트폴리오 리스크
              </p>
              <p className="text-lg font-bold">
                {currentMetrics.risk.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
              <p className="text-lg font-bold">
                {currentMetrics.sharpe.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">
                Sortino Ratio
              </p>
              <p className="text-lg font-bold">
                {currentMetrics.sortino.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">예상 Max DD</p>
              <p className="text-lg font-bold text-red-500">
                -{currentMetrics.maxDD.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Efficient Frontier */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Efficient Frontier</h3>
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full"
                style={{ maxHeight: 400 }}
              >
                {/* Grid */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = pad.top + (i / 4) * plotH;
                  const val = maxRet - (i / 4) * (maxRet - minRet);
                  return (
                    <g key={`gy-${i}`}>
                      <line
                        x1={pad.left}
                        y1={y}
                        x2={svgWidth - pad.right}
                        y2={y}
                        stroke="currentColor"
                        className="text-muted/15"
                        strokeWidth="0.5"
                      />
                      <text
                        x={pad.left - 5}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-muted-foreground"
                        fontSize="9"
                      >
                        {val.toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
                {[0, 1, 2, 3, 4].map((i) => {
                  const x = pad.left + (i / 4) * plotW;
                  const val = minRisk + (i / 4) * (maxRisk - minRisk);
                  return (
                    <g key={`gx-${i}`}>
                      <line
                        x1={x}
                        y1={pad.top}
                        x2={x}
                        y2={pad.top + plotH}
                        stroke="currentColor"
                        className="text-muted/15"
                        strokeWidth="0.5"
                      />
                      <text
                        x={x}
                        y={pad.top + plotH + 18}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize="9"
                      >
                        {val.toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
                <text
                  x={pad.left + plotW / 2}
                  y={pad.top + plotH + 45}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="10"
                >
                  리스크 (변동성) →
                </text>
                <text
                  x={14}
                  y={pad.top + plotH / 2}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="10"
                  transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}
                >
                  ↑ 기대수익률
                </text>

                {/* Simulated points */}
                {allPoints.slice(0, 3000).map((p, i) => (
                  <circle
                    key={i}
                    cx={toX(p.risk)}
                    cy={toY(p.ret)}
                    r={1.2}
                    fill={`hsl(${Math.min(p.sharpe * 60, 200)}, 70%, 50%)`}
                    opacity={0.4}
                  />
                ))}

                {/* Optimal portfolios */}
                {optimal && (
                  <>
                    <circle
                      cx={toX(optimal.minVar.risk)}
                      cy={toY(optimal.minVar.ret)}
                      r={5}
                      fill="#10b981"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={toX(optimal.minVar.risk) + 8}
                      y={toY(optimal.minVar.ret) + 3}
                      fontSize="8"
                      className="fill-current font-medium"
                    >
                      Min Var
                    </text>

                    <circle
                      cx={toX(optimal.maxSharpe.risk)}
                      cy={toY(optimal.maxSharpe.ret)}
                      r={5}
                      fill="#f59e0b"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={toX(optimal.maxSharpe.risk) + 8}
                      y={toY(optimal.maxSharpe.ret) + 3}
                      fontSize="8"
                      className="fill-current font-medium"
                    >
                      Max Sharpe
                    </text>
                  </>
                )}

                {/* Current portfolio */}
                <circle
                  cx={toX(currentMetrics.risk)}
                  cy={toY(currentMetrics.ret)}
                  r={6}
                  fill="hsl(var(--destructive, 0 84% 60%))"
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={toX(currentMetrics.risk) + 10}
                  y={toY(currentMetrics.ret) + 4}
                  fontSize="9"
                  className="fill-current font-semibold"
                >
                  내 포트폴리오
                </text>
              </svg>
            </div>
            {!hasRun && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                &laquo;최적화&raquo; 버튼을 눌러 몬테카를로 시뮬레이션을
                실행하세요
              </p>
            )}
          </div>

          {/* Optimal portfolio weights */}
          {optimal && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">
                최적 포트폴리오 비교
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        포트폴리오
                      </th>
                      {assets.map((a) => (
                        <th
                          key={a.ticker}
                          className="px-3 py-2 text-center font-medium text-muted-foreground"
                        >
                          {a.ticker}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        수익률
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        리스크
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Sharpe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-blue-500/5">
                      <td className="px-3 py-2 font-medium">현재</td>
                      {assets.map((a) => (
                        <td
                          key={a.ticker}
                          className="px-3 py-2 text-center font-mono"
                        >
                          {a.allocation}%
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono">
                        {currentMetrics.ret.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {currentMetrics.risk.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {currentMetrics.sharpe.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-border bg-yellow-500/5">
                      <td className="px-3 py-2 font-medium">Max Sharpe</td>
                      {optimal.maxSharpe.weights.map((w, i) => (
                        <td
                          key={i}
                          className="px-3 py-2 text-center font-mono"
                        >
                          {(w * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-green-500">
                        {optimal.maxSharpe.ret.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {optimal.maxSharpe.risk.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {optimal.maxSharpe.sharpe.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-border bg-green-500/5">
                      <td className="px-3 py-2 font-medium">Min Variance</td>
                      {optimal.minVar.weights.map((w, i) => (
                        <td
                          key={i}
                          className="px-3 py-2 text-center font-mono"
                        >
                          {(w * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono">
                        {optimal.minVar.ret.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-green-500">
                        {optimal.minVar.risk.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {optimal.minVar.sharpe.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Correlation Matrix */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">상관관계 매트릭스</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {assets.map((a) => (
                      <th
                        key={a.ticker}
                        className="p-2 text-center font-medium"
                      >
                        {a.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.ticker}>
                      <td className="p-2 font-medium">{a.ticker}</td>
                      {assets.map((b) => {
                        const corr = getCorr(a.ticker, b.ticker);
                        return (
                          <td key={b.ticker} className="p-2 text-center">
                            <span
                              className={`inline-block rounded px-2 py-1 font-mono ${
                                a.ticker === b.ticker
                                  ? "bg-muted text-muted-foreground"
                                  : corr > 0.5
                                  ? "bg-red-500/15 text-red-500"
                                  : corr > 0
                                  ? "bg-yellow-500/15 text-yellow-500"
                                  : "bg-green-500/15 text-green-500"
                              }`}
                            >
                              {corr.toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Correlation Guide */}
            <div className="mt-4 space-y-3">
              {/* Color Legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-red-500/15 border border-red-500/30" />
                  <span className="text-muted-foreground">강한 양의 상관 (&gt;0.5)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-yellow-500/15 border border-yellow-500/30" />
                  <span className="text-muted-foreground">약한 양의 상관 (0~0.5)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-green-500/15 border border-green-500/30" />
                  <span className="text-muted-foreground">음의 상관 (&lt;0) — 분산 효과 큼</span>
                </span>
              </div>

              {/* Interpretation */}
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">해석 방법</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
                  <li><strong>+1.0</strong> = 완전히 같은 방향으로 움직임 (분산 효과 없음)</li>
                  <li><strong>0.0</strong> = 서로 무관하게 움직임 (분산 효과 보통)</li>
                  <li><strong>-1.0</strong> = 완전히 반대로 움직임 (분산 효과 최대)</li>
                </ul>
              </div>

              {/* Real Examples */}
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">실제 예시로 이해하기</p>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <strong className="text-foreground">BTC ↔ ETH = 0.82</strong> (높은 양의 상관)
                      <p className="mt-0.5">비트코인이 10% 오르면 이더리움도 비슷하게 오르는 경향. 둘 다 보유해도 리스크 분산 효과가 적습니다.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    <div>
                      <strong className="text-foreground">BTC ↔ S&P 500 = 0.38</strong> (낮은 양의 상관)
                      <p className="mt-0.5">비트코인이 오를 때 S&P 500도 약간 오르는 편이지만, 항상 같이 움직이진 않습니다. 어느 정도 분산 효과가 있습니다.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <strong className="text-foreground">SOL ↔ 미국채 = -0.20</strong> (음의 상관)
                      <p className="mt-0.5">솔라나가 하락할 때 미국 국채(AGG)는 오르는 경향. 함께 보유하면 한쪽 손실을 다른쪽이 상쇄해주어 <strong>포트폴리오 안정성이 크게 향상</strong>됩니다.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Practical Tip */}
              <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-3">
                <p className="text-xs font-semibold text-foreground mb-1">💡 핵심 포인트</p>
                <p className="text-xs text-muted-foreground">
                  같은 색상(빨간색) 자산끼리만 모아두면 시장 하락 시 동시에 큰 손실을 볼 수 있습니다.
                  <strong> 초록색(음의 상관) 조합</strong>을 포트폴리오에 포함하면 전체 변동성을 낮추면서도 수익률을 유지할 수 있습니다.
                  예: 암호화폐(BTC, ETH) 70% + 미국 국채(AGG) 20% + 금(XAU) 10%
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              주의사항
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
              <li>
                기대수익률과 변동성은{" "}
                <strong>과거 데이터 기반 추정치</strong>이며, 미래를 보장하지
                않습니다.
              </li>
              <li>
                상관관계는 시장 상황에 따라 변동하며, 위기 시{" "}
                <strong>상관관계가 급격히 상승</strong>하여 분산 효과가 줄어들
                수 있습니다.
              </li>
              <li>
                몬테카를로 시뮬레이션은 <strong>무작위 가중치 조합</strong>을
                탐색하는 것으로, 수학적 최적해를 보장하지 않습니다.
              </li>
              <li>
                실제 투자에서는 <strong>거래 비용, 세금, 유동성, 리밸런싱
                비용</strong> 등이 추가로 발생합니다.
              </li>
              <li>
                본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이
                아닙니다. 투자 결정은 본인 책임입니다.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

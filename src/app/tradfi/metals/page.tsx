"use client";

import { useState, useEffect } from "react";
import { Gem, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Metal {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changeAbs: number;
  unit: string;
  high52w: number;
  low52w: number;
}

const FALLBACK_METALS: Metal[] = [
  { name: "Gold", symbol: "GC=F", price: 2842.4, change: 0.84, changeAbs: 23.6, unit: "oz", high52w: 2882, low52w: 1984 },
  { name: "Silver", symbol: "SI=F", price: 32.84, change: 1.42, changeAbs: 0.46, unit: "oz", high52w: 34.82, low52w: 22.14 },
  { name: "Platinum", symbol: "PL=F", price: 1042.8, change: -0.24, changeAbs: -2.5, unit: "oz", high52w: 1082, low52w: 842 },
  { name: "Palladium", symbol: "PA=F", price: 984.2, change: -1.12, changeAbs: -11.1, unit: "oz", high52w: 1242, low52w: 842 },
  { name: "Copper", symbol: "HG=F", price: 4.42, change: 0.62, changeAbs: 0.027, unit: "lb", high52w: 4.82, low52w: 3.62 },
  { name: "Aluminum", symbol: "ALI=F", price: 2684.2, change: 0.34, changeAbs: 9.1, unit: "MT", high52w: 2842, low52w: 2184 },
];

export default function MetalsPage() {
  const [metals, setMetals] = useState<Metal[]>(FALLBACK_METALS);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [sp500Price, setSp500Price] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAll() {
      // Fetch metals, BTC price, and S&P 500 in parallel
      const [metalsRes, btcRes, sp500Res] = await Promise.allSettled([
        fetch("/api/tradfi/quotes?type=metal").then((r) => r.json()),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", { signal: AbortSignal.timeout(6000) }).then((r) => r.json()),
        fetch("/api/macro/indicators?indicator=sp500", { signal: AbortSignal.timeout(6000) }).then((r) => r.json()),
      ]);

      // Metals
      if (metalsRes.status === "fulfilled") {
        const json = metalsRes.value;
        if (json.data && json.data.length > 0) {
          const mapped: Metal[] = json.data.map((d: { symbol: string; name: string; price: number; change: number; changeAbs: number; unit?: string; high52w: number; low52w: number }) => ({
            symbol: d.symbol,
            name: d.name,
            price: d.price,
            change: d.change,
            changeAbs: d.changeAbs,
            unit: d.unit || "oz",
            high52w: d.high52w,
            low52w: d.low52w,
          }));
          setMetals(mapped);
          setDataSource(json.source === "yahoo" ? "Yahoo Finance (실시간)" : "sample");
        } else {
          setDataSource("fallback");
        }
      } else {
        setDataSource("fallback");
      }

      // BTC price
      if (btcRes.status === "fulfilled" && btcRes.value?.bitcoin?.usd) {
        setBtcPrice(btcRes.value.bitcoin.usd);
      }

      // S&P 500
      if (sp500Res.status === "fulfilled" && sp500Res.value?.data) {
        const spData = sp500Res.value.data;
        if (Array.isArray(spData) && spData.length > 0) {
          const lastVal = parseFloat(spData[spData.length - 1].value);
          if (!isNaN(lastVal)) setSp500Price(lastVal);
        }
      }

      setIsLoading(false);
    }
    fetchAll();
  }, []);

  // Calculate ratios dynamically from real data
  const gold = metals.find((m) => m.name === "Gold");
  const silver = metals.find((m) => m.name === "Silver");
  const goldPrice = gold?.price || 2842;
  const silverPrice = silver?.price || 32.84;

  const goldSilverRatio = silverPrice > 0 ? goldPrice / silverPrice : null;
  const goldBtcRatio = btcPrice && btcPrice > 0 ? goldPrice / btcPrice : null;
  const goldSp500Ratio = sp500Price && sp500Price > 0 ? goldPrice / sp500Price : null;

  const RATIOS = [
    {
      name: "Gold/Silver Ratio",
      value: goldSilverRatio ? goldSilverRatio.toFixed(1) : "—",
      desc: `금 1oz 당 은 ${goldSilverRatio ? goldSilverRatio.toFixed(1) : "?"}oz 가치. 역사적 평균 ~60. ${goldSilverRatio && goldSilverRatio > 80 ? "높음 → 은이 상대적 저평가" : goldSilverRatio && goldSilverRatio < 50 ? "낮음 → 은이 상대적 고평가" : "정상 범위"}`,
    },
    {
      name: "Gold/BTC Ratio",
      value: goldBtcRatio ? goldBtcRatio.toFixed(4) : "—",
      desc: btcPrice
        ? `금 1oz = ${goldBtcRatio?.toFixed(4)} BTC (BTC $${btcPrice.toLocaleString()}). ${goldBtcRatio && goldBtcRatio < 0.03 ? "BTC가 금 대비 강세" : goldBtcRatio && goldBtcRatio > 0.05 ? "BTC가 금 대비 약세" : "BTC와 금 간 밸런스 구간"}`
        : "BTC 가격 로딩 실패",
    },
    {
      name: "Gold/S&P 500 Ratio",
      value: goldSp500Ratio ? goldSp500Ratio.toFixed(2) : "—",
      desc: sp500Price
        ? `금/S&P 500 = ${goldSp500Ratio?.toFixed(2)} (S&P ${sp500Price.toFixed(0)}). ${goldSp500Ratio && goldSp500Ratio > 0.6 ? "금이 주식 대비 강세 → 안전자산 선호" : goldSp500Ratio && goldSp500Ratio < 0.4 ? "주식이 금 대비 강세 → 위험자산 선호" : "균형 구간"}`
        : "S&P 500 로딩 실패",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gem className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Precious & Industrial Metals</h1>
        </div>
        <p className="text-muted-foreground">
          Track spot prices, performance, and ratios for precious metals and key industrial commodities.
        </p>
        <div className="mt-1.5">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 데이터 로딩 중...
            </span>
          ) : dataSource.includes("실시간") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> 샘플 데이터 (Yahoo Finance 연결 대기)
            </span>
          )}
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metals.slice(0, 4).map((metal) => (
          <div key={metal.symbol} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{metal.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{metal.symbol}</span>
            </div>
            <p className="text-xl font-bold">${metal.price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{metal.unit}</span></p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {metal.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Ratios */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Key Ratios</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {RATIOS.map((ratio) => (
            <div key={ratio.name} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium">{ratio.name}</p>
              <p className="text-2xl font-bold mt-1">{ratio.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{ratio.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Metals</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metal</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change %</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W High</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W Low</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : metals.map((metal) => (
                <tr key={metal.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{metal.name}</td>
                  <td className="px-4 py-3 font-mono text-primary">{metal.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">${metal.price.toLocaleString()}/{metal.unit}</td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.changeAbs >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.changeAbs >= 0 ? "+" : ""}{metal.changeAbs}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">${metal.high52w.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">${metal.low52w.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

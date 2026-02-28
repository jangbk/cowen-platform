"use client";

import { useState, useMemo } from "react";
import {
  Youtube,
  Search,
  ExternalLink,
  Users,
  Globe,
  Flag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface Channel {
  name: string;
  handle: string;
  url: string;
  description: string;
  tags: string[];
  region: "international" | "korean";
}

const CHANNELS: Channel[] = [
  // ── 해외 ──────────────────────────────────────────────────────────────
  {
    name: "JangBK Crypto",
    handle: "@jangbk",
    url: "https://www.youtube.com/@jangbk",
    description:
      "비트코인 사이클 분석, 온체인 메트릭, 리스크 모델 등 데이터 중심의 장기 투자 관점을 제공.",
    tags: ["Bitcoin", "On-Chain", "Cycles"],
    region: "international",
  },
  {
    name: "Coin Bureau",
    handle: "@CoinBureau",
    url: "https://www.youtube.com/@CoinBureau",
    description:
      "Guy Turner가 운영. 크립토 프로젝트 심층 리뷰, 거래소 비교, 규제 뉴스 분석 등 교육 중심 콘텐츠.",
    tags: ["Education", "Reviews", "News"],
    region: "international",
  },
  {
    name: "Real Vision",
    handle: "@RealVisionFinance",
    url: "https://www.youtube.com/@RealVisionFinance",
    description:
      "Raoul Pal이 설립. 매크로 경제, 기관 투자, 크립토와 전통 금융의 교차점을 다루는 프리미엄 인터뷰 채널.",
    tags: ["Macro", "Institutional", "Interviews"],
    region: "international",
  },
  {
    name: "Altcoin Daily",
    handle: "@AltcoinDaily",
    url: "https://www.youtube.com/@AltcoinDaily",
    description:
      "Aaron & Austin Arnold 형제가 운영. 일일 크립토 뉴스, 알트코인 분석, 시장 전망을 빠르게 전달.",
    tags: ["Altcoins", "Daily News", "Market"],
    region: "international",
  },
  {
    name: "DataDash",
    handle: "@DataDash",
    url: "https://www.youtube.com/@DataDash",
    description:
      "Nicholas Merten이 운영. 차트 기술적 분석, 매크로 환경, DeFi 트렌드에 대한 객관적 시각.",
    tags: ["Technical Analysis", "Macro", "DeFi"],
    region: "international",
  },
  {
    name: "Anthony Pompliano",
    handle: "@AnthonyPompliano",
    url: "https://www.youtube.com/@AnthonyPompliano",
    description:
      "비트코인 낙관론자. 기관 채택, 비트코인 경제학, 창업/벤처 투자 인사이트를 공유.",
    tags: ["Bitcoin", "Institutional", "Venture"],
    region: "international",
  },
  {
    name: "The Crypto Lark",
    handle: "@TheCryptoLark",
    url: "https://www.youtube.com/@TheCryptoLark",
    description:
      "Lark Davis가 운영. 알트코인 발굴, DeFi 투자 전략, NFT/메타버스 트렌드 분석.",
    tags: ["Altcoins", "DeFi", "NFT"],
    region: "international",
  },
  {
    name: "Crypto Banter",
    handle: "@CryptoBanterGroup",
    url: "https://www.youtube.com/@CryptoBanterGroup",
    description:
      "Ran Neuner가 진행. 실시간 시장 분석 라이브, 트레이딩 전략, 게스트 인터뷰 중심 방송.",
    tags: ["Live Trading", "Market", "Interviews"],
    region: "international",
  },
  {
    name: "InvestAnswers",
    handle: "@InvestAnswers",
    url: "https://www.youtube.com/@InvestAnswers",
    description:
      "James가 운영. 정량적 모델 기반 가격 예측, 포트폴리오 전략, 비트코인/이더리움 밸류에이션.",
    tags: ["Quantitative", "Bitcoin", "Ethereum"],
    region: "international",
  },
  {
    name: "Digital Asset News",
    handle: "@DigitalAssetNews",
    url: "https://www.youtube.com/@DigitalAssetNews",
    description:
      "Rob이 운영. ETF 자금 유입, 규제 동향, 기관 투자 뉴스를 정리해서 전달하는 데일리 뉴스 채널.",
    tags: ["ETF", "Regulation", "News"],
    region: "international",
  },

  // ── 국내 ──────────────────────────────────────────────────────────────
  {
    name: "박작가의 크립토연구소",
    handle: "@박작가의크립토연구소",
    url: "https://www.youtube.com/channel/UCqaXPyhWGtS_Vt20GQQDSbg",
    description:
      "박종한 작가 운영. 크립토 시장 심층 리서치, 비트코인 사이클 분석, 알트코인 펀더멘탈, 투자 전략 가이드.",
    tags: ["리서치", "사이클", "전략"],
    region: "korean",
  },
  {
    name: "미그놀렛 크립토",
    handle: "@MignoletCrypto",
    url: "https://www.youtube.com/@MignoletCrypto",
    description:
      "차트, 온체인, 시장 데이터를 종합 분석하는 트레이더. CryptoQuant 공식 애널리스트, 코인니스 칼럼니스트.",
    tags: ["트레이딩", "차트분석", "온체인"],
    region: "korean",
  },
  {
    name: "비트슈아",
    handle: "@bitshua",
    url: "https://www.youtube.com/channel/UCf64J3dPdVRT6OJf57m-uyw",
    description:
      "미국 뉴스 기반 비트코인·알트코인·블록체인 투자 분석. 전략적 투자와 시장 흐름 파악에 초점.",
    tags: ["Bitcoin", "미국뉴스", "매크로"],
    region: "korean",
  },
  {
    name: "코인이슈 경제채널",
    handle: "@코인이슈경제채널",
    url: "https://www.youtube.com/channel/UCvhsQm_E8wx2t5haDnCejMg",
    description:
      "박은성 운영. 글로벌 뉴스 기반 객관적 크립토 시황, 월·수·금 저녁 9시 정기 라이브 방송.",
    tags: ["뉴스", "라이브", "시황"],
    region: "korean",
  },
  {
    name: "토미의 트레이딩TV",
    handle: "@TommyTradingTV",
    url: "https://www.youtube.com/@TommyTradingTV",
    description:
      "전업 트레이더 토미 운영. 비트코인 차트 분석, 매매 전략, 시장 관점, 차트 교육 전문 채널.",
    tags: ["트레이딩", "차트분석", "실전매매"],
    region: "korean",
  },
  {
    name: "킬리만 학파",
    handle: "@Kiliman",
    url: "https://www.youtube.com/@Kiliman",
    description:
      "암호화폐 개인투자자의 학습 기록 공유. 기술적 분석, 패턴 분석, 보조지표 활용법 교육.",
    tags: ["기술적분석", "패턴", "교육"],
    region: "korean",
  },
  {
    name: "비트코인 일루미나티",
    handle: "@비트코인일루미나티",
    url: "https://www.youtube.com/channel/UC3vBufn2MqRFyHk297at70w",
    description:
      "금융 권력의 숨겨진 흐름을 추적. 자본세력 동향, 거시경제 배경 분석, 비트코인 장기 사이클 해석.",
    tags: ["Bitcoin", "사이클", "거시분석"],
    region: "korean",
  },
  {
    name: "크립토퀀트",
    handle: "@CryptoQuant",
    url: "https://www.youtube.com/@CryptoQuant",
    description:
      "주기영 대표의 온체인 데이터 분석 플랫폼. 비트코인 온체인 지표, 거래소 흐름, 고래 동향 분석.",
    tags: ["온체인", "데이터", "Bitcoin"],
    region: "korean",
  },
  {
    name: "슈콘 (코인읽어주는남자)",
    handle: "@슈콘",
    url: "https://www.youtube.com/channel/UCwZwJkJcqh4Ze0qgVfhwnJw",
    description:
      "비트코인 차트를 읽어주는 남자. 매일 비트코인·알트코인 차트 분석과 시황 소통 방송.",
    tags: ["차트분석", "시황", "소통"],
    region: "korean",
  },
  {
    name: "할 수 있다! 알고 투자 (강환국)",
    handle: "@강환국",
    url: "https://www.youtube.com/channel/UCSWPuzlD337Y6VBkyFPwT8g",
    description:
      "퀀트 투자 전문가 강환국 CFA. 데이터 기반 투자 전략, 자산배분, 마켓타이밍, 백테스트 교육.",
    tags: ["퀀트", "전략", "교육"],
    region: "korean",
  },
  {
    name: "백훈종의 전지적 비트코인 시점",
    handle: "@백훈종",
    url: "https://www.youtube.com/@백훈종",
    description:
      "스매시파이 대표 백훈종 운영. 비트코인 철학과 장기 투자 전략, '결국 비트코인' 저자.",
    tags: ["Bitcoin", "장기투자", "철학"],
    region: "korean",
  },
  {
    name: "블록미디어",
    handle: "@Blockmedia",
    url: "https://www.youtube.com/@Blockmedia",
    description:
      "한국 No.1 블록체인 뉴스 매체. 크립토 시장 뉴스, 규제 동향, 인터뷰, 경제 분석.",
    tags: ["뉴스", "블록체인", "규제"],
    region: "korean",
  },
  {
    name: "멘탈이 전부다",
    handle: "@mentalisall",
    url: "https://www.youtube.com/@mentalisall",
    description:
      "신민철 운영. 비트코인, 미국주식, 투자 심리/멘탈 관리. 투자의 심리적 측면에 초점.",
    tags: ["Bitcoin", "투자심리", "미국주식"],
    region: "korean",
  },
  {
    name: "디파이농부 조선생",
    handle: "@Web3World",
    url: "https://www.youtube.com/@Web3World",
    description:
      "DeFi 투자 전문. 크립토 시장 트렌드, 에어드랍 기회, 이더리움 생태계, 알트코인 분석.",
    tags: ["DeFi", "에어드랍", "알트코인"],
    region: "korean",
  },
  {
    name: "신박한 신박사",
    handle: "@amazingdrshin",
    url: "https://www.youtube.com/@amazingdrshin",
    description:
      "비트코인 교양 채널. 경제, 철학, 정치, 역사를 비트코인 렌즈로 해석하는 비트코인 맥시멀리스트.",
    tags: ["Bitcoin", "교양", "철학"],
    region: "korean",
  },
  {
    name: "피셔인베스트",
    handle: "@msparksang",
    url: "https://www.youtube.com/@msparksang",
    description:
      "지표 기반 투자 교육 채널. 주식, 채권, 재테크, 기업 탐방, 매크로 분석.",
    tags: ["투자교육", "주식", "매크로"],
    region: "korean",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRegionColor(region: string) {
  return region === "international"
    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CryptoChannelsPage() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<
    "all" | "international" | "korean"
  >("all");

  const filtered = useMemo(() => {
    let list = [...CHANNELS];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (regionFilter !== "all") {
      list = list.filter((c) => c.region === regionFilter);
    }

    return list;
  }, [search, regionFilter]);

  const international = filtered.filter((c) => c.region === "international");
  const korean = filtered.filter((c) => c.region === "korean");

  const ChannelCard = ({ channel }: { channel: Channel }) => (
    <a
      href={channel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <Youtube className="h-6 w-6 text-red-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {channel.name}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRegionColor(channel.region)}`}
            >
              {channel.region === "international" ? "해외" : "국내"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {channel.handle}
          </p>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {channel.description}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {channel.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              채널 방문 <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Youtube className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold">Crypto Channels</h1>
          </div>
          <p className="text-muted-foreground">
            크립토 투자에 유용한 국내외 유튜브 채널 모음
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          총 {filtered.length}개 채널
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="채널 검색..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all" as const, label: "전체", icon: Users },
          { key: "international" as const, label: "해외", icon: Globe },
          { key: "korean" as const, label: "국내", icon: Flag },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setRegionFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              regionFilter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Youtube className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {/* International Section */}
      {international.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">해외 채널</h2>
            <span className="text-sm text-muted-foreground">
              ({international.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {international.map((ch) => (
              <ChannelCard key={ch.handle} channel={ch} />
            ))}
          </div>
        </div>
      )}

      {/* Korean Section */}
      {korean.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flag className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold">국내 채널</h2>
            <span className="text-sm text-muted-foreground">
              ({korean.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {korean.map((ch) => (
              <ChannelCard key={ch.handle} channel={ch} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

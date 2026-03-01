import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `당신은 경제뉴스 및 투자 기사 분석 전문가입니다. 경제뉴스, 신문기사, X(트위터) 게시물 등을 받아 투자 관점에서 분석하고 구조화된 가이드를 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:

{
  "summary": "핵심 내용을 3~5 문단으로 상세히 요약. 주요 수치, 날짜, 인물, 기관명을 포함. 기사의 맥락과 배경도 설명.",
  "investmentGuide": "1. 단기 전략 (1~4주)\\n구체적인 행동 지침...\\n\\n2. 중기 전략 (1~6개월)\\n...\\n\\n3. 장기 전략 (6~12개월)\\n...\\n\\n4. 리스크 관리\\n주의사항과 리스크 요인...",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "...(최대 10개)"],
  "sentiment": "bullish 또는 bearish 또는 neutral 또는 mixed (전반적인 시장 심리)",
  "affectedAssets": ["이 뉴스에 영향받는 자산명 (예: BTC, ETH, S&P500, 금, 달러 등)"],
  "tags": ["관련 태그1", "태그2", "...(3~6개)"]
}`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { content, url, title } = await request.json();

    let articleText = content || "";
    let articleTitle = title || "";

    // If URL is provided, fetch and extract text via async fetch
    if (url && !content) {
      try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return NextResponse.json(
            { status: "error", message: "http 또는 https URL만 지원합니다." },
            { status: 400 }
          );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const fetchRes = await fetch(parsedUrl.href, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });
        clearTimeout(timeout);

        if (!fetchRes.ok) {
          return NextResponse.json(
            { status: "error", message: `URL 요청 실패 (HTTP ${fetchRes.status}). "텍스트 붙여넣기" 탭으로 기사 본문을 직접 복사해서 붙여넣어 주세요.` },
            { status: 400 }
          );
        }

        const html = await fetchRes.text();

        if (!html || html.length < 100) {
          return NextResponse.json(
            {
              status: "error",
              message: `URL에서 내용을 가져올 수 없습니다. "텍스트 붙여넣기" 탭으로 기사 본문을 직접 복사해서 붙여넣어 주세요.`,
            },
            { status: 400 }
          );
        }

        articleText = stripHtml(html);

        if (!articleTitle) {
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          if (titleMatch) {
            articleTitle = stripHtml(titleMatch[1]);
          }
        }
      } catch (fetchError) {
        const msg =
          fetchError instanceof Error
            ? (fetchError.name === "AbortError" ? "요청 시간 초과 (20초)" : fetchError.message)
            : "URL을 가져올 수 없습니다.";
        return NextResponse.json(
          {
            status: "error",
            message: `URL fetch 실패: ${msg}. "텍스트 붙여넣기" 탭으로 기사 본문을 직접 복사해서 붙여넣어 주세요.`,
          },
          { status: 400 }
        );
      }
    }

    if (!articleText || articleText.length < 20) {
      return NextResponse.json(
        { status: "error", message: "분석할 텍스트가 충분하지 않습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요.",
        },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Truncate if too long
    const maxChars = 100000;
    const truncatedText =
      articleText.length > maxChars
        ? articleText.slice(0, maxChars) + "\n\n[텍스트가 길어 일부 잘림]"
        : articleText;

    const userMessage = `${articleTitle ? `제목: "${articleTitle}"\n\n` : ""}아래는 경제뉴스/기사/게시물 텍스트입니다. 투자 관점에서 분석하고 구조화된 가이드를 생성해주세요.

---
${truncatedText}
---`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { status: "error", message: "AI 응답을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let parsed;
    try {
      let jsonStr = textBlock.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", textBlock.text);
      return NextResponse.json(
        { status: "error", message: "AI 응답 파싱에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      title: articleTitle,
      summary: parsed.summary || "",
      investmentGuide: parsed.investmentGuide || "",
      keyPoints: parsed.keyPoints || [],
      sentiment: parsed.sentiment || "neutral",
      affectedAssets: parsed.affectedAssets || [],
      tags: parsed.tags || [],
    });
  } catch (error) {
    console.error("News analyze API error:", error);
    const msg =
      error instanceof Error ? error.message : "뉴스 분석에 실패했습니다.";
    return NextResponse.json(
      { status: "error", message: msg },
      { status: 500 }
    );
  }
}

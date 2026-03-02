import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/youtube/latest
// Notion에 저장된 최신 영상 요약을 반환합니다.
// Fallback: YouTube RSS feed → 샘플 데이터
// ---------------------------------------------------------------------------

const NOTION_API_URL = "https://api.notion.com/v1";

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  author: string;
  published: string;
  link: string;
}

/** Notion DB에서 최신 영상 요약 가져오기 */
async function fetchFromNotion(): Promise<VideoInfo | null> {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();
  if (!apiKey || !databaseId) return null;

  try {
    const res = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: "Channel",
          rich_text: { does_not_equal: "뉴스 분석" },
        },
        sorts: [{ timestamp: "created_time", direction: "descending" }],
        page_size: 1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const page = data.results?.[0];
    if (!page) return null;

    const props = page.properties;
    const title =
      props.Name?.title?.[0]?.plain_text || "Untitled";
    const videoUrl = props.URL?.url || "";
    const channel =
      props.Channel?.rich_text?.[0]?.plain_text || "";
    const date = props.Date?.date?.start || "";

    // URL에서 videoId 추출
    const videoIdMatch = videoUrl.match(
      /(?:v=|youtu\.be\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = videoIdMatch?.[1] || "";

    if (!videoId) return null;

    return {
      videoId,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      author: channel,
      published: date,
      link: videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // 1. Notion에서 최신 영상 요약
  const notionVideo = await fetchFromNotion();

  if (notionVideo) {
    return NextResponse.json(
      { source: "notion", ...notionVideo },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 2. Fallback: 샘플 데이터
  return NextResponse.json(
    {
      source: "sample",
      videoId: "eAzoXY1GfIo",
      title: "Bitcoin: Dubious Speculation",
      thumbnail: "https://img.youtube.com/vi/eAzoXY1GfIo/mqdefault.jpg",
      author: "Benjamin Cowen",
      published: new Date().toISOString(),
      link: "https://www.youtube.com/watch?v=eAzoXY1GfIo",
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

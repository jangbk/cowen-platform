import { NextResponse } from "next/server";

const NOTION_API_URL = "https://api.notion.com/v1";

/**
 * GET /api/notion/summaries
 * Notion DB에서 저장된 영상 요약 목록을 불러옵니다.
 */
export async function GET() {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();

  if (!apiKey || !databaseId) {
    return NextResponse.json({
      status: "error",
      summaries: [],
      message: "Notion not configured",
    });
  }

  try {
    // 1. Query database (최신순 정렬)
    const dbRes = await fetch(
      `${NOTION_API_URL}/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          sorts: [{ property: "Date", direction: "descending" }],
          page_size: 50,
        }),
      }
    );

    if (!dbRes.ok) throw new Error(`Notion DB query failed: ${dbRes.status}`);
    const dbData = await dbRes.json();
    const pages = dbData.results || [];

    if (pages.length === 0) {
      return NextResponse.json({ status: "ok", summaries: [] });
    }

    // 2. 각 페이지의 블록(내용)을 병렬로 불러오기
    const summaries = await Promise.all(
      pages.map(async (page: Record<string, unknown>) => {
        const props = page.properties as Record<string, Record<string, unknown>>;
        const titleArr = (props.Name as Record<string, unknown>)?.title as Array<{ plain_text: string }> | undefined;
        const title = titleArr?.[0]?.plain_text || "Untitled";
        const videoUrl = ((props.URL as Record<string, unknown>)?.url as string) || "";
        const channelArr = (props.Channel as Record<string, unknown>)?.rich_text as Array<{ plain_text: string }> | undefined;
        const channel = channelArr?.[0]?.plain_text || "";
        const dateObj = (props.Date as Record<string, unknown>)?.date as { start: string } | undefined;
        const date = dateObj?.start || "";
        const tagsArr = (props.Tags as Record<string, unknown>)?.multi_select as Array<{ name: string }> | undefined;
        const tags = (tagsArr || []).map((t) => t.name);

        // URL에서 videoId 추출
        const videoIdMatch = videoUrl.match(
          /(?:v=|youtu\.be\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/
        );
        const videoId = videoIdMatch?.[1] || "";

        // 블록 내용 불러오기
        let summary = "";
        let investmentGuide = "";
        const keyPoints: string[] = [];

        try {
          const blocksRes = await fetch(
            `${NOTION_API_URL}/blocks/${(page as Record<string, string>).id}/children?page_size=100`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Notion-Version": "2022-06-28",
              },
            }
          );

          if (blocksRes.ok) {
            const blocksData = await blocksRes.json();
            let currentSection = "";

            for (const block of blocksData.results || []) {
              if (block.type === "heading_2") {
                const text =
                  block.heading_2?.rich_text
                    ?.map((r: { plain_text: string }) => r.plain_text)
                    .join("") || "";
                if (text.includes("영상 요약")) currentSection = "summary";
                else if (text.includes("투자 가이드"))
                  currentSection = "guide";
                else if (text.includes("핵심 포인트"))
                  currentSection = "keypoints";
                else currentSection = "";
              } else if (block.type === "paragraph") {
                const text =
                  block.paragraph?.rich_text
                    ?.map((r: { plain_text: string }) => r.plain_text)
                    .join("") || "";
                if (currentSection === "summary" && text) {
                  summary += (summary ? "\n\n" : "") + text;
                } else if (currentSection === "guide" && text) {
                  investmentGuide +=
                    (investmentGuide ? "\n\n" : "") + text;
                }
              } else if (
                block.type === "bulleted_list_item" &&
                currentSection === "keypoints"
              ) {
                const text =
                  block.bulleted_list_item?.rich_text
                    ?.map((r: { plain_text: string }) => r.plain_text)
                    .join("") || "";
                if (text) keyPoints.push(text);
              }
            }
          }
        } catch {
          // 블록 로드 실패 시 빈 내용으로 계속
        }

        return {
          id: (page as Record<string, string>).id,
          videoUrl,
          videoId,
          title,
          channel,
          date,
          thumbnailUrl: videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : "",
          summary,
          investmentGuide,
          keyPoints,
          tags,
          savedToNotion: true,
          notionUrl: (page as Record<string, string>).url,
        };
      })
    );

    return NextResponse.json({ status: "ok", summaries });
  } catch (error) {
    console.error("Notion load error:", error);
    return NextResponse.json({
      status: "error",
      summaries: [],
      message:
        error instanceof Error ? error.message : "Failed to load from Notion",
    });
  }
}

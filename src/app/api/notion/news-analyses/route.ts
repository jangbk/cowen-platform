import { NextRequest, NextResponse } from "next/server";

const NOTION_API_URL = "https://api.notion.com/v1";

/**
 * GET /api/notion/news-analyses
 * Notion DB에서 뉴스 분석 목록을 불러옵니다 (Channel = "뉴스 분석").
 */
export async function GET() {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();

  if (!apiKey || !databaseId) {
    return NextResponse.json({
      status: "error",
      analyses: [],
      message: "Notion not configured",
    });
  }

  try {
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
          filter: {
            property: "Channel",
            rich_text: { equals: "뉴스 분석" },
          },
          sorts: [{ property: "Date", direction: "descending" }],
          page_size: 50,
        }),
      }
    );

    if (!dbRes.ok) throw new Error(`Notion DB query failed: ${dbRes.status}`);
    const dbData = await dbRes.json();
    const pages = dbData.results || [];

    if (pages.length === 0) {
      return NextResponse.json({ status: "ok", analyses: [] });
    }

    const analyses = await Promise.all(
      pages.map(async (page: Record<string, unknown>) => {
        const props = page.properties as Record<
          string,
          Record<string, unknown>
        >;
        const titleArr = (props.Name as Record<string, unknown>)
          ?.title as Array<{ plain_text: string }> | undefined;
        const title = titleArr?.[0]?.plain_text || "Untitled";
        const sourceUrl =
          ((props.URL as Record<string, unknown>)?.url as string) || "";
        const dateObj = (props.Date as Record<string, unknown>)
          ?.date as { start: string } | undefined;
        const date = dateObj?.start || "";
        const tagsArr = (props.Tags as Record<string, unknown>)
          ?.multi_select as Array<{ name: string }> | undefined;
        const allTags = (tagsArr || []).map((t) => t.name);

        // 태그에서 sentiment와 affectedAssets 추출
        let sentiment: string = "neutral";
        const affectedAssets: string[] = [];
        const tags: string[] = [];

        for (const tag of allTags) {
          if (tag.startsWith("sentiment:")) {
            sentiment = tag.replace("sentiment:", "");
          } else if (tag.startsWith("asset:")) {
            affectedAssets.push(tag.replace("asset:", ""));
          } else {
            tags.push(tag);
          }
        }

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
                if (text.includes("영상 요약") || text.includes("분석 요약"))
                  currentSection = "summary";
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
                  investmentGuide += (investmentGuide ? "\n\n" : "") + text;
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
          // 블록 로드 실패
        }

        return {
          id: (page as Record<string, string>).id,
          title,
          source: sourceUrl ? ("url" as const) : ("text" as const),
          sourceUrl: sourceUrl || undefined,
          date,
          summary,
          investmentGuide,
          keyPoints,
          sentiment,
          affectedAssets,
          tags,
          savedToNotion: true,
          notionUrl: (page as Record<string, string>).url,
        };
      })
    );

    return NextResponse.json({ status: "ok", analyses });
  } catch (error) {
    console.error("Notion news load error:", error);
    return NextResponse.json({
      status: "error",
      analyses: [],
      message:
        error instanceof Error ? error.message : "Failed to load from Notion",
    });
  }
}

/**
 * DELETE /api/notion/news-analyses?pageId=xxx
 */
export async function DELETE(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const pageId = req.nextUrl.searchParams.get("pageId");

  if (!apiKey || !pageId) {
    return NextResponse.json(
      { status: "error", message: "Missing apiKey or pageId" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ archived: true }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Notion API ${res.status}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete",
      },
      { status: 500 }
    );
  }
}

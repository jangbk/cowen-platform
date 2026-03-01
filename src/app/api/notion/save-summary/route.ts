import { NextResponse } from "next/server";

// Notion API proxy for saving video summaries
// Docs: https://developers.notion.com/

const NOTION_API_URL = "https://api.notion.com/v1";

/** Notion rich_text content limit: 2000 chars per text object */
function splitRichText(
  text: string,
  maxLen = 2000
): { text: { content: string } }[] {
  if (!text) return [{ text: { content: "" } }];
  const chunks: { text: { content: string } }[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push({ text: { content: text.slice(i, i + maxLen) } });
  }
  return chunks;
}

interface SaveSummaryRequest {
  title: string;
  videoUrl: string;
  channel: string;
  publishedDate: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  tags: string[];
}

export async function POST(request: Request) {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();

  if (!apiKey || !databaseId) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "Notion API key or Database ID not configured. Please set NOTION_API_KEY and NOTION_DATABASE_ID in .env.local",
      },
      { status: 400 }
    );
  }

  try {
    const body: SaveSummaryRequest = await request.json();

    // Create a Notion page in the database
    const notionResponse = await fetch(`${NOTION_API_URL}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        icon: { type: "emoji", emoji: "🎬" },
        properties: {
          Name: {
            title: [{ text: { content: body.title } }],
          },
          URL: {
            url: body.videoUrl,
          },
          Channel: {
            rich_text: [{ text: { content: body.channel } }],
          },
          Date: {
            date: { start: body.publishedDate },
          },
          Tags: {
            multi_select: body.tags.map((tag) => ({ name: tag })),
          },
        },
        children: [
          // Header
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "영상 요약" } }],
            },
          },
          // Summary
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: splitRichText(body.summary),
            },
          },
          // Divider
          { object: "block", type: "divider", divider: {} },
          // Investment Guide Header
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "투자 가이드" } }],
            },
          },
          // Investment Guide
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: splitRichText(body.investmentGuide),
            },
          },
          // Divider
          { object: "block", type: "divider", divider: {} },
          // Key Points Header
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "핵심 포인트" } }],
            },
          },
          // Key Points as bulleted list
          ...body.keyPoints.map((point) => ({
            object: "block" as const,
            type: "bulleted_list_item" as const,
            bulleted_list_item: {
              rich_text: [{ text: { content: point } }],
            },
          })),
          // Divider
          { object: "block", type: "divider", divider: {} },
          // Source
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "원본 영상: " } },
                {
                  text: {
                    content: body.videoUrl,
                    link: { url: body.videoUrl },
                  },
                },
              ],
            },
          },
          // Timestamp
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: `저장일: ${new Date().toLocaleDateString("ko-KR")}`,
                  },
                  annotations: { italic: true, color: "gray" },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      throw new Error(
        `Notion API error: ${notionResponse.status} - ${errorData.message}`
      );
    }

    const result = await notionResponse.json();

    return NextResponse.json({
      status: "ok",
      message: "Summary saved to Notion successfully",
      notionPageId: result.id,
      notionUrl: result.url,
    });
  } catch (error) {
    console.error("Notion API error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to save to Notion",
      },
      { status: 500 }
    );
  }
}

// GET: Check Notion connection status
export async function GET() {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();

  if (!apiKey || !databaseId) {
    return NextResponse.json({
      connected: false,
      message: "Notion API key or Database ID not configured",
    });
  }

  try {
    // Verify connection by fetching the database
    const response = await fetch(
      `${NOTION_API_URL}/databases/${databaseId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      connected: true,
      databaseTitle:
        data.title?.[0]?.plain_text || "Untitled Database",
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to connect to Notion",
    });
  }
}

import { NextResponse } from "next/server";

// YouTube transcript extraction API route
// Uses noembed for metadata + youtube-transcript-api for transcript

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { status: "error", message: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { status: "error", message: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Fetch metadata via noembed
    const metaResponse = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const metadata = await metaResponse.json();

    return NextResponse.json({
      status: "ok",
      videoId,
      title: metadata.title || "Unknown Title",
      channel: metadata.author_name || "Unknown Channel",
      thumbnailUrl:
        metadata.thumbnail_url ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch video info",
      },
      { status: 500 }
    );
  }
}

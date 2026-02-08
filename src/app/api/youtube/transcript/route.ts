import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
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
      console.error("Failed to extract video ID from:", url);
      return NextResponse.json(
        { status: "error", message: `유효하지 않은 YouTube URL입니다: ${url}` },
        { status: 400 }
      );
    }

    // Fetch metadata via noembed
    const metaResponse = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const metadata = await metaResponse.json();

    // Fetch transcript using Python youtube-transcript-api
    let transcript = "";
    try {
      const scriptPath = path.join(
        process.cwd(),
        "scripts",
        "fetch-transcript.py"
      );
      const { stdout } = await execFileAsync("python3", [scriptPath, videoId], {
        timeout: 30000,
      });

      const result = JSON.parse(stdout.trim());
      if (result.error) {
        throw new Error(result.error);
      }
      transcript = result.transcript || "";
    } catch (transcriptError) {
      console.error("Transcript fetch error:", transcriptError);
      return NextResponse.json({
        status: "ok",
        videoId,
        title: metadata.title || "Unknown Title",
        channel: metadata.author_name || "Unknown Channel",
        thumbnailUrl:
          metadata.thumbnail_url ||
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        transcript: null,
        message:
          "트랜스크립트를 가져올 수 없습니다. 자막이 없는 영상일 수 있습니다.",
      });
    }

    return NextResponse.json({
      status: "ok",
      videoId,
      title: metadata.title || "Unknown Title",
      channel: metadata.author_name || "Unknown Channel",
      thumbnailUrl:
        metadata.thumbnail_url ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      transcript,
    });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch video info" },
      { status: 500 }
    );
  }
}

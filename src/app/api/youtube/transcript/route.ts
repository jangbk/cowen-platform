import { NextResponse } from "next/server";

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

/**
 * Method 1: Supadata API (reliable, works from cloud/serverless)
 * Free tier: 100 requests/month, no credit card required
 * Sign up: https://dash.supadata.ai?plan=basic
 */
async function fetchTranscriptSupadata(videoId: string): Promise<string | null> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: { "x-api-key": apiKey },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.content || !Array.isArray(data.content)) return null;

  const text = data.content
    .map((segment: { text: string }) => segment.text)
    .join(" ");

  return text || null;
}

/**
 * Method 2: Direct YouTube page scraping (fallback, works locally but not on cloud)
 */
async function fetchTranscriptDirect(videoId: string): Promise<string | null> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!pageRes.ok) return null;
  const html = await pageRes.text();

  const playerMatch = html.match(
    new RegExp(
      "ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\});(?:\\s*var\\s|</script>)",
      "s"
    )
  );
  if (!playerMatch) return null;

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerMatch[1]);
  } catch {
    return null;
  }

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) return null;

  let track = captionTracks.find(
    (t: { languageCode: string }) => t.languageCode === "ko"
  );
  if (!track) {
    track = captionTracks.find(
      (t: { languageCode: string }) => t.languageCode === "en"
    );
  }
  if (!track) {
    track = captionTracks[0];
  }
  if (!track?.baseUrl) return null;

  const captionRes = await fetch(track.baseUrl);
  if (!captionRes.ok) return null;
  const xml = await captionRes.text();

  const textSegments: string[] = [];
  const textRe = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let m;
  while ((m = textRe.exec(xml)) !== null) {
    const decoded = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (decoded) textSegments.push(decoded);
  }

  return textSegments.length > 0 ? textSegments.join(" ") : null;
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
        {
          status: "error",
          message: `유효하지 않은 YouTube URL입니다: ${url}`,
        },
        { status: 400 }
      );
    }

    // Fetch metadata via noembed
    const metaResponse = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const metadata = await metaResponse.json();

    // Try Supadata API first, then fallback to direct scraping
    let transcript: string | null = null;

    try {
      transcript = await fetchTranscriptSupadata(videoId);
    } catch (e) {
      console.error("Supadata transcript error:", e);
    }

    if (!transcript) {
      try {
        transcript = await fetchTranscriptDirect(videoId);
      } catch (e) {
        console.error("Direct transcript error:", e);
      }
    }

    const noApiKey = !process.env.SUPADATA_API_KEY;

    if (!transcript) {
      return NextResponse.json({
        status: "ok",
        videoId,
        title: metadata.title || "Unknown Title",
        channel: metadata.author_name || "Unknown Channel",
        thumbnailUrl:
          metadata.thumbnail_url ||
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        transcript: null,
        message: noApiKey
          ? "트랜스크립트 API 키가 설정되지 않았습니다. .env.local에 SUPADATA_API_KEY를 추가해주세요. (무료: supadata.ai)"
          : "트랜스크립트를 가져올 수 없습니다. 자막이 없는 영상일 수 있습니다.",
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

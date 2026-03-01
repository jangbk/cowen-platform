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
 * Fetch transcript directly from YouTube's internal API.
 * 1. Fetch the video page HTML
 * 2. Extract the serialized player response (ytInitialPlayerResponse)
 * 3. Find caption track URLs
 * 4. Fetch the XML caption track and parse text segments
 */
async function fetchTranscriptDirect(videoId: string): Promise<string | null> {
  // Step 1: Fetch video page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!pageRes.ok) return null;
  const html = await pageRes.text();

  // Step 2: Extract captions from ytInitialPlayerResponse
  const playerMatch = html.match(
    new RegExp("ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\});(?:\\s*var\\s|</script>)", "s")
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

  // Step 3: Find best caption track (prefer ko, then en, then first available)
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

  // Step 4: Fetch caption XML
  const captionRes = await fetch(track.baseUrl);
  if (!captionRes.ok) return null;
  const xml = await captionRes.text();

  // Parse <text> elements from XML
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
        { status: "error", message: `유효하지 않은 YouTube URL입니다: ${url}` },
        { status: 400 }
      );
    }

    // Fetch metadata via noembed
    const metaResponse = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const metadata = await metaResponse.json();

    // Fetch transcript
    let transcript: string | null = null;
    try {
      transcript = await fetchTranscriptDirect(videoId);
    } catch (e) {
      console.error("Transcript fetch error:", e);
    }

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

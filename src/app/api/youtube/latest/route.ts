import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/youtube/latest
// Fetches latest video from a YouTube channel via RSS feed.
// No API key required - uses the public Atom feed.
// ---------------------------------------------------------------------------

// Benjamin Cowen's channel
const CHANNEL_ID = "UCRvqjQPSeaWn-uEx-w0XOIg";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  author: string;
  published: string;
  link: string;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return match ? match[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
  return match ? match[1] : "";
}

async function fetchLatestVideo(): Promise<VideoInfo | null> {
  try {
    const res = await fetch(RSS_URL, {
      next: { revalidate: 1800 },
    } as RequestInit);

    if (!res.ok) return null;

    const xml = await res.text();

    // Extract the first <entry> block
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entry = entryMatch[1];

    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const published = extractTag(entry, "published");
    const author = extractTag(xml, "name"); // Channel name from feed level
    const link = extractAttr(entry, "link", "href");

    return {
      videoId,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      author: author || "Benjamin Cowen",
      published,
      link: link || `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const video = await fetchLatestVideo();

  if (video) {
    return NextResponse.json(
      { source: "youtube_rss", ...video },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  }

  // Fallback
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
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    },
  );
}

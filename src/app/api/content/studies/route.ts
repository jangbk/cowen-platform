import { NextResponse } from "next/server";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// RSS Feed Sources
// ---------------------------------------------------------------------------
const RSS_FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/feed" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
];

// ---------------------------------------------------------------------------
// File-based persistent cache
// ---------------------------------------------------------------------------
const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "news-cache.json");

interface CacheData {
  articles: Article[];
  cachedAt: number;
}

function readCache(): CacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const data: CacheData = JSON.parse(raw);
    if (!Array.isArray(data.articles) || !data.cachedAt) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(articles: Article[], cachedAt: number): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ articles, cachedAt }, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("Failed to write cache:", e instanceof Error ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? stripHtml(m[1]) : "";
}

function extractCategories(itemXml: string): string[] {
  const cats: string[] = [];
  const re = /<category[^>]*>([\s\S]*?)<\/category>/gi;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    const cat = stripHtml(m[1]).trim();
    if (cat && !cats.includes(cat)) cats.push(cat);
  }
  return cats.slice(0, 4);
}

function hashId(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex").slice(0, 12);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  source: string;
  sourceUrl: string;
  tags: string[];
  category: string;
}

function parseItems(xml: string, sourceName: string): Article[] {
  const articles: Article[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRe.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link =
      extractTag(itemXml, "link") ||
      (itemXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? "");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");
    const categories = extractCategories(itemXml);

    if (!title || !link) continue;

    const date = formatDate(pubDate);
    if (!date) continue;

    articles.push({
      id: hashId(link),
      title,
      excerpt: truncate(description || title, 150),
      date,
      source: sourceName,
      sourceUrl: link,
      tags: categories.length > 0 ? categories : [sourceName],
      category: categories[0] || "Crypto",
    });
  }

  return articles;
}

function fetchFeed(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return "";
    const safeUrl = parsedUrl.href;

    return execSync(
      `curl -sL --max-time 15 --max-filesize 5242880 ` +
        `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' ` +
        `-H 'Accept: application/rss+xml,application/xml,text/xml,*/*;q=0.1' ` +
        `'${safeUrl}'`,
      { maxBuffer: 5 * 1024 * 1024, timeout: 20000 }
    ).toString();
  } catch (e) {
    console.error(`Failed to fetch feed ${url}:`, e instanceof Error ? e.message : e);
    return "";
  }
}

// ---------------------------------------------------------------------------
// AI Summarization (single batch call for all articles)
// ---------------------------------------------------------------------------
async function summarizeArticles(
  articles: Article[]
): Promise<Map<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || articles.length === 0) return new Map();

  try {
    const client = new Anthropic({ apiKey });

    const listText = articles
      .map((a, i) => `${i + 1}. [${a.title}] — ${a.excerpt}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `아래는 크립토/금융 뉴스 기사 ${articles.length}개의 제목과 설명입니다. 각 기사를 한국어로 3줄 이내로 요약해주세요.

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
["1번 기사 요약", "2번 기사 요약", ...]

기사 목록:
${listText}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return new Map();

    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const summaries: string[] = JSON.parse(jsonStr);
    const map = new Map<string, string>();
    articles.forEach((a, i) => {
      if (summaries[i]) map.set(a.id, summaries[i]);
    });
    return map;
  } catch (e) {
    console.error(
      "AI summarization failed, using RSS descriptions:",
      e instanceof Error ? e.message : e
    );
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Fetch + summarize pipeline
// ---------------------------------------------------------------------------
async function fetchAndSummarize(): Promise<Article[]> {
  const allArticles: Article[] = [];

  for (const feed of RSS_FEEDS) {
    const xml = fetchFeed(feed.url);
    if (!xml) continue;
    const items = parseItems(xml, feed.name);
    allArticles.push(...items);
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Sort by date desc, take 30
  unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const result = unique.slice(0, 30);

  // AI summarization
  const summaries = await summarizeArticles(result);
  if (summaries.size > 0) {
    for (const article of result) {
      const summary = summaries.get(article.id);
      if (summary) article.excerpt = summary;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// GET Handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cache = readCache();
      if (cache && cache.articles.length > 0) {
        return NextResponse.json({
          articles: cache.articles,
          cachedAt: cache.cachedAt,
          fresh: false,
        });
      }
    }

    // Fresh fetch
    const result = await fetchAndSummarize();
    const now = Date.now();

    // Persist to file
    writeCache(result, now);

    return NextResponse.json({
      articles: result,
      cachedAt: now,
      fresh: true,
    });
  } catch (error) {
    console.error("News RSS API error:", error);

    // On error, try returning stale file cache
    const cache = readCache();
    if (cache && cache.articles.length > 0) {
      return NextResponse.json({
        articles: cache.articles,
        cachedAt: cache.cachedAt,
        fresh: false,
      });
    }

    return NextResponse.json(
      { articles: [], cachedAt: 0, fresh: false },
      { status: 200 }
    );
  }
}

import { NextResponse } from "next/server";
import { COOKIE_NAME, COOKIE_MAX_AGE, signToken } from "@/lib/auth";

// IP-based in-memory rate limiter
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60_000;

function getClientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const now = Date.now();

  // Check rate limit
  const entry = loginAttempts.get(ip);
  if (entry) {
    if (now < entry.blockedUntil) {
      const remaining = Math.ceil((entry.blockedUntil - now) / 1000);
      return NextResponse.json(
        { error: `너무 많은 시도입니다. ${remaining}초 후에 다시 시도해주세요.` },
        { status: 429 }
      );
    }
    if (now >= entry.blockedUntil) {
      loginAttempts.delete(ip);
    }
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { password } = body;
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword || password !== sitePassword) {
    // Track failed attempt
    const current = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.blockedUntil = now + BLOCK_DURATION_MS;
    }
    loginAttempts.set(ip, current);

    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  // Success — clear attempts
  loginAttempts.delete(ip);

  const token = await signToken(password);
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

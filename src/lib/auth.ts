export const COOKIE_NAME = "bk-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const SECRET = "bk-investment-hmac-secret";

function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signToken(password: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  return toHex(sig);
}

export async function verifyToken(token: string): Promise<boolean> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  const expected = await signToken(password);
  return token === expected;
}

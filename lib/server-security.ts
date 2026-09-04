import { createHash, timingSafeEqual } from "node:crypto";

export function actorFrom(request: Request): string | null {
  const platformUser = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (platformUser) return platformUser;
  const localUser = process.env.AIFIX3R_LOCAL_USER?.trim().toLowerCase();
  return localUser || null;
}

export function requireActor(request: Request): string | Response {
  const actor = actorFrom(request);
  return actor || Response.json({ error: "Authenticated operator required." }, { status: 401 });
}

export async function parseJson<T>(request: Request, maximum = 64_000): Promise<T> {
  const raw = await request.text();
  if (raw.length > maximum) throw new Error("Request body is too large.");
  return JSON.parse(raw) as T;
}

export function redactSecrets(value: string): string {
  return value
    .replace(/nvapi-[A-Za-z0-9_-]+/g, "[REDACTED_KEY]")
    .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password)\s*[:=]\s*)[^\s\"'&]+/gi, "$1[REDACTED]");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function workerConfiguration(): { url: string; token: string } | null {
  const url = process.env.AIFIX3R_WORKER_URL?.replace(/\/$/, "");
  const token = process.env.AIFIX3R_WORKER_TOKEN;
  return url && token ? { url, token } : null;
}

export async function callWorker(path: string, init?: RequestInit): Promise<Response> {
  const configuration = workerConfiguration();
  if (!configuration) return Response.json({ error: "Local worker is not configured." }, { status: 503 });
  return fetch(`${configuration.url}${path}`, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init?.headers).entries()), authorization: `Bearer ${configuration.token}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
}

export function databaseError(error: unknown): Response {
  console.error("Aifix3r database operation failed", error);
  return Response.json({ error: "Persistent storage is temporarily unavailable." }, { status: 503 });
}

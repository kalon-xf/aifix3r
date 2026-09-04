import { getD1 } from "@/db";
import { databaseError, parseJson, requireActor } from "@/lib/server-security";

type ProgramInput = { name?: string; platform?: string; authorizationRef?: string; rateLimit?: number; concurrency?: number };
const PLATFORMS = new Set(["hackerone", "bugcrowd", "private", "lab"]);

export async function GET(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  try {
    const result = await (await getD1()).prepare("SELECT * FROM programs WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100").bind(actor).all();
    return Response.json({ programs: result.results });
  } catch (error) { return databaseError(error); }
}

export async function POST(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  try {
    const input = await parseJson<ProgramInput>(request);
    const name = input.name?.trim() || "";
    const platform = input.platform || "private";
    const authorizationRef = input.authorizationRef?.trim() || "";
    if (name.length < 2 || name.length > 120 || !PLATFORMS.has(platform) || authorizationRef.length < 3 || authorizationRef.length > 500) return Response.json({ error: "Valid name, platform, and authorization reference are required." }, { status: 422 });
    const now = Date.now(), id = crypto.randomUUID();
    const rate = Math.min(50, Math.max(1, Math.trunc(input.rateLimit || 5)));
    const concurrency = Math.min(8, Math.max(1, Math.trunc(input.concurrency || 2)));
    await (await getD1()).prepare("INSERT INTO programs (id, owner_id, name, platform, authorization_ref, rate_limit, concurrency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, actor, name, platform, authorizationRef, rate, concurrency, now, now).run();
    return Response.json({ program: { id, ownerId: actor, name, platform, authorizationRef, rateLimit: rate, concurrency, status: "draft", createdAt: now, updatedAt: now } }, { status: 201 });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

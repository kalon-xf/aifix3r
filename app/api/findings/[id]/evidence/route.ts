import { getD1 } from "@/db";
import { databaseError, parseJson, redactSecrets, requireActor, sha256 } from "@/lib/server-security";

const KINDS = new Set(["request", "response", "command", "stdout", "screenshot", "note"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const input = await parseJson<{ kind?: string; content?: string; jobId?: string }>(request, 120_000);
    const kind = input.kind || "note", content = redactSecrets(input.content?.trim() || "");
    if (!KINDS.has(kind) || content.length < 2 || content.length > 100_000) return Response.json({ error: "Valid evidence kind and content are required." }, { status: 422 });
    const db = await getD1();
    const finding = await db.prepare("SELECT f.id FROM findings f JOIN programs p ON p.id = f.program_id WHERE f.id = ? AND p.owner_id = ?").bind(id, actor).first();
    if (!finding) return Response.json({ error: "Finding not found." }, { status: 404 });
    const evidence = { id: crypto.randomUUID(), findingId: id, jobId: input.jobId || null, kind, content, sha256: sha256(content), redacted: true, createdBy: actor, createdAt: Date.now() };
    await db.prepare("INSERT INTO evidence (id, finding_id, job_id, kind, content, sha256, redacted, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)")
      .bind(evidence.id, id, evidence.jobId, kind, content, evidence.sha256, actor, evidence.createdAt).run();
    return Response.json({ evidence }, { status: 201 });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

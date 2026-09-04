import { getD1 } from "@/db";
import { buildBountyReport } from "@/lib/report.mjs";
import { databaseError, parseJson, requireActor } from "@/lib/server-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const input = await parseJson<{ platform?: string }>(request);
    if (!input.platform || !["hackerone", "bugcrowd"].includes(input.platform)) return Response.json({ error: "Choose HackerOne or Bugcrowd." }, { status: 422 });
    const db = await getD1();
    const finding = await db.prepare("SELECT f.* FROM findings f JOIN programs p ON p.id = f.program_id WHERE f.id = ? AND p.owner_id = ? AND f.status IN ('validated', 'reported', 'resolved')").bind(id, actor).first<Record<string, string | null>>();
    if (!finding) return Response.json({ error: "Only a human-validated finding can be reported." }, { status: 409 });
    const evidence = (await db.prepare("SELECT kind, content FROM evidence WHERE finding_id = ? ORDER BY created_at").bind(id).all<{ kind: string; content: string }>()).results;
    const platform = input.platform as "hackerone" | "bugcrowd";
    const content = buildBountyReport(platform, finding as never, evidence), reportId = crypto.randomUUID(), now = Date.now();
    await db.batch([
      db.prepare("INSERT INTO reports (id, finding_id, platform, format_version, content, created_by, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)").bind(reportId, id, platform, content, actor, now),
      db.prepare("UPDATE findings SET status = 'reported', updated_at = ? WHERE id = ?").bind(now, id),
    ]);
    return new Response(content, { status: 201, headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="aifix3r-${id}-${platform}.md"`, "x-aifix3r-report-id": reportId } });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

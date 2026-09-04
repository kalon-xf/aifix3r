import { getD1 } from "@/db";
import { databaseError, parseJson, requireActor } from "@/lib/server-security";

type ValidationInput = { decision?: string; rationale?: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const input = await parseJson<ValidationInput>(request);
    const decision = input.decision || "", rationale = input.rationale?.trim() || "";
    if (!["approve", "reject", "needs_more_evidence"].includes(decision) || rationale.length < 10 || rationale.length > 4000) return Response.json({ error: "Decision and a detailed rationale are required." }, { status: 422 });
    const db = await getD1();
    const finding = await db.prepare("SELECT f.id FROM afx_findings f JOIN afx_programs p ON p.id = f.program_id WHERE f.id = ? AND p.owner_id = ?").bind(id, actor).first();
    if (!finding) return Response.json({ error: "Finding not found." }, { status: 404 });
    const now = Date.now(), status = decision === "approve" ? "validated" : decision === "reject" ? "rejected" : "validation_requested";
    await db.batch([
      db.prepare("INSERT INTO afx_finding_validations (id, finding_id, reviewer_id, decision, rationale, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, actor, decision, rationale, now),
      db.prepare("UPDATE afx_findings SET status = ?, validator_id = ?, validated_at = ?, updated_at = ? WHERE id = ?").bind(status, actor, decision === "approve" ? now : null, now, id),
    ]);
    return Response.json({ findingId: id, status, reviewer: actor, validatedAt: decision === "approve" ? now : null });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

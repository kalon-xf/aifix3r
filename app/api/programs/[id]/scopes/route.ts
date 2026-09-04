import { getD1 } from "@/db";
import { databaseError, parseJson, requireActor } from "@/lib/server-security";

type ScopeInput = { kind?: string; value?: string; decision?: string; notes?: string };
const KINDS = new Set(["domain", "wildcard", "url", "ip", "cidr"]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const db = await getD1();
    const program = await db.prepare("SELECT id FROM afx_programs WHERE id = ? AND owner_id = ?").bind(id, actor).first();
    if (!program) return Response.json({ error: "Program not found." }, { status: 404 });
    const result = await db.prepare("SELECT * FROM afx_scopes WHERE program_id = ? ORDER BY decision, value").bind(id).all();
    return Response.json({ scopes: result.results });
  } catch (error) { return databaseError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id: programId } = await context.params;
  try {
    const input = await parseJson<ScopeInput>(request);
    const value = input.value?.trim().toLowerCase() || "";
    const kind = input.kind || "domain", decision = input.decision || "include";
    if (!KINDS.has(kind) || !["include", "exclude"].includes(decision) || !value || value.length > 500 || /[\0\r\n]/.test(value)) return Response.json({ error: "Valid scope kind, value, and decision are required." }, { status: 422 });
    const db = await getD1();
    const program = await db.prepare("SELECT id FROM afx_programs WHERE id = ? AND owner_id = ?").bind(programId, actor).first();
    if (!program) return Response.json({ error: "Program not found." }, { status: 404 });
    const scope = { id: crypto.randomUUID(), programId, kind, value, decision, notes: input.notes?.slice(0, 500) || null, createdAt: Date.now() };
    await db.prepare("INSERT INTO afx_scopes (id, program_id, kind, value, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(scope.id, programId, kind, value, decision, scope.notes, scope.createdAt).run();
    return Response.json({ scope }, { status: 201 });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

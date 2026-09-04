import { getD1 } from "@/db";
import { callWorker, databaseError, parseJson, requireActor } from "@/lib/server-security";

type JobInput = { programId?: string; tool?: string; target?: string; validationApproved?: boolean; approvedBy?: string; timeoutSeconds?: number };

export async function GET(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const programId = new URL(request.url).searchParams.get("programId");
  try {
    const sql = programId ? "SELECT * FROM afx_jobs WHERE owner_id = ? AND program_id = ? ORDER BY created_at DESC LIMIT 200" : "SELECT * FROM afx_jobs WHERE owner_id = ? ORDER BY created_at DESC LIMIT 200";
    const statement = (await getD1()).prepare(sql).bind(...(programId ? [actor, programId] : [actor]));
    return Response.json({ jobs: (await statement.all()).results });
  } catch (error) { return databaseError(error); }
}

export async function POST(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  try {
    const input = await parseJson<JobInput>(request);
    if (!input.programId || !input.tool || !input.target) return Response.json({ error: "Program, tool, and target are required." }, { status: 422 });
    const db = await getD1();
    const program = await db.prepare("SELECT * FROM afx_programs WHERE id = ? AND owner_id = ? AND status IN ('draft', 'active')").bind(input.programId, actor).first<Record<string, unknown>>();
    if (!program) return Response.json({ error: "Authorized program not found or paused." }, { status: 404 });
    const scopes = (await db.prepare("SELECT value, decision FROM afx_scopes WHERE program_id = ?").bind(input.programId).all<{ value: string; decision: string }>()).results;
    const workerResponse = await callWorker("/v1/jobs", { method: "POST", body: JSON.stringify({
      programId: input.programId, tool: input.tool, target: input.target,
      includeScopes: scopes.filter((scope) => scope.decision === "include").map((scope) => scope.value),
      excludeScopes: scopes.filter((scope) => scope.decision === "exclude").map((scope) => scope.value),
      authorizationRef: program.authorization_ref, rateLimit: program.rate_limit,
      maxConcurrency: program.concurrency,
      timeoutSeconds: input.timeoutSeconds, validationApproved: input.validationApproved,
      approvedBy: input.validationApproved ? actor : input.approvedBy,
    }) });
    const payload = await workerResponse.json() as { job?: Record<string, unknown>; error?: string };
    if (!workerResponse.ok || !payload.job) return Response.json(payload, { status: workerResponse.status });
    const job = payload.job, now = Date.now();
    await db.prepare("INSERT INTO afx_jobs (id, program_id, owner_id, tool, target, parameters_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(job.id, input.programId, actor, input.tool, input.target, JSON.stringify({ timeoutSeconds: input.timeoutSeconds || null }), job.status || "queued", now, now).run();
    return Response.json({ job }, { status: 202 });
  } catch (error) { return error instanceof SyntaxError ? Response.json({ error: "JSON required." }, { status: 400 }) : databaseError(error); }
}

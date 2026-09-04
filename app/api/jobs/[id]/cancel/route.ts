import { getD1 } from "@/db";
import { callWorker, databaseError, requireActor } from "@/lib/server-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const db = await getD1();
    const job = await db.prepare("SELECT id FROM afx_jobs WHERE id = ? AND owner_id = ?").bind(id, actor).first();
    if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
    const response = await callWorker(`/v1/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" });
    const payload = await response.json();
    if (response.ok) await db.prepare("UPDATE afx_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(Date.now(), id).run();
    return Response.json(payload, { status: response.status });
  } catch (error) { return databaseError(error); }
}

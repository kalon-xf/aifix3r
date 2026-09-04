import { getD1 } from "@/db";
import { databaseError, requireActor } from "@/lib/server-security";

export async function GET(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const url = new URL(request.url), query = (url.searchParams.get("q") || "").slice(0, 200), programId = url.searchParams.get("programId");
  try {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const sql = `SELECT r.* FROM afx_job_results r JOIN afx_programs p ON p.id = r.program_id WHERE p.owner_id = ? AND (? IS NULL OR r.program_id = ?) AND (? = '' OR r.searchable_text LIKE ? ESCAPE '\\') ORDER BY r.created_at DESC LIMIT 500`;
    const results = await (await getD1()).prepare(sql).bind(actor, programId, programId, query, pattern).all();
    return Response.json({ results: results.results });
  } catch (error) { return databaseError(error); }
}

import { getD1 } from "@/db";
import { databaseError, requireActor } from "@/lib/server-security";

export async function GET(request: Request) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const url = new URL(request.url), programId = url.searchParams.get("programId"), status = url.searchParams.get("status");
  try {
    const results = await (await getD1()).prepare(`SELECT f.* FROM findings f JOIN programs p ON p.id = f.program_id WHERE p.owner_id = ? AND (? IS NULL OR f.program_id = ?) AND (? IS NULL OR f.status = ?) ORDER BY f.updated_at DESC LIMIT 200`)
      .bind(actor, programId, programId, status, status).all();
    return Response.json({ findings: results.results });
  } catch (error) { return databaseError(error); }
}

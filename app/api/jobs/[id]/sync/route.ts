import { getD1 } from "@/db";
import { callWorker, databaseError, redactSecrets, requireActor, sha256 } from "@/lib/server-security";

type WorkerResult = { type: string; value: string; searchableText: string; data: Record<string, unknown> };
type WorkerJob = { id: string; programId: string; tool: string; target: string; status: string; exitCode?: number | null; error?: string | null; startedAt?: string; finishedAt?: string; stdout?: string; results?: WorkerResult[] };

function time(value?: string): number | null { const parsed = value ? Date.parse(value) : Number.NaN; return Number.isFinite(parsed) ? parsed : null; }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = requireActor(request); if (actor instanceof Response) return actor;
  const { id } = await context.params;
  try {
    const db = await getD1();
    const local = await db.prepare("SELECT id, program_id FROM afx_jobs WHERE id = ? AND owner_id = ?").bind(id, actor).first<{ id: string; program_id: string }>();
    if (!local) return Response.json({ error: "Job not found." }, { status: 404 });
    const response = await callWorker(`/v1/jobs/${encodeURIComponent(id)}`);
    const payload = await response.json() as { job?: WorkerJob; error?: string };
    if (!response.ok || !payload.job) return Response.json(payload, { status: response.status });
    const job = payload.job, now = Date.now();
    const statements: D1PreparedStatement[] = [
      db.prepare("UPDATE afx_jobs SET status = ?, exit_code = ?, error = ?, started_at = ?, finished_at = ?, updated_at = ? WHERE id = ?")
        .bind(job.status, job.exitCode ?? null, job.error ?? null, time(job.startedAt), time(job.finishedAt), now, id),
    ];
    for (const result of (job.results || []).slice(0, 10_000)) {
      const resultId = crypto.randomUUID();
      statements.push(db.prepare("INSERT OR IGNORE INTO afx_job_results (id, job_id, program_id, result_type, value, normalized_json, searchable_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(resultId, id, local.program_id, result.type, result.value.slice(0, 2048), JSON.stringify(result.data).slice(0, 20_000), result.searchableText.slice(0, 4000), now));
      if (["host", "url", "service"].includes(result.type)) {
        statements.push(db.prepare("INSERT INTO afx_assets (id, program_id, first_seen_job_id, type, value, metadata_json, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(program_id, type, value) DO UPDATE SET metadata_json = excluded.metadata_json, last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at")
          .bind(crypto.randomUUID(), local.program_id, id, result.type === "host" ? "domain" : result.type, result.value.slice(0, 2048), JSON.stringify(result.data).slice(0, 20_000), now, now, now));
      }
      if (result.type === "finding-candidate") {
        const data = result.data || {}, info = (data.info || {}) as Record<string, unknown>;
        statements.push(db.prepare("INSERT OR IGNORE INTO afx_findings (id, program_id, source_job_id, title, vulnerability_class, severity, status, confidence, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'candidate', 60, ?, ?, ?)")
          .bind(`finding-${sha256(`${id}\0${result.type}\0${result.value}`).slice(0, 32)}`, local.program_id, id, String(info.name || data['template-id'] || data.template_id || "Scanner observation").slice(0, 300), String(data['template-id'] || data.template_id || "unclassified").slice(0, 120), ["info", "low", "medium", "high", "critical"].includes(String(info.severity)) ? String(info.severity) : "info", `Automated ${job.tool} observation. Human validation is required before reporting.`, now, now));
      }
    }
    for (let offset = 0; offset < statements.length; offset += 80) await db.batch(statements.slice(offset, offset + 80));
    if (job.stdout) {
      const content = redactSecrets(job.stdout).slice(0, 100_000), digest = sha256(content);
      const candidate = await db.prepare("SELECT id FROM afx_findings WHERE source_job_id = ? ORDER BY created_at LIMIT 1").bind(id).first<{ id: string }>();
      if (candidate) await db.prepare("INSERT OR IGNORE INTO afx_evidence (id, finding_id, job_id, kind, content, sha256, redacted, created_by, created_at) VALUES (?, ?, ?, 'stdout', ?, ?, 1, ?, ?)")
        .bind(`evidence-${sha256(`${id}\0${digest}`).slice(0, 32)}`, candidate.id, id, content, digest, actor, now).run();
    }
    return Response.json({ jobId: id, status: job.status, importedResults: job.results?.length || 0 });
  } catch (error) { return databaseError(error); }
}

function text(value) {
  return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
}

export function normalizeRecord(tool, record) {
  if (typeof record === "string") return { type: "text", value: record, searchableText: record, data: { value: record } };
  const value = text(record.url || record.host || record.input || record.matched_at || record.matched || record.ip || record.endpoint || record.data || record);
  const type = record.template_id || record['template-id'] ? "finding-candidate" : record.port ? "service" : record.url ? "url" : record.host || record.ip ? "host" : "observation";
  return { type, value, searchableText: `${tool} ${value} ${text(record.info?.name)} ${text(record.info?.severity)}`.trim(), data: record };
}

export function parseToolOutput(tool, stdout) {
  const results = [];
  for (const rawLine of String(stdout || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) results.push(...parsed.map((item) => normalizeRecord(tool, item)));
      else results.push(normalizeRecord(tool, parsed));
    } catch {
      results.push(normalizeRecord(tool, line));
    }
  }
  return results.slice(0, 10000);
}

export function searchResults(jobs, query, programId) {
  const needle = String(query || "").trim().toLowerCase();
  return jobs.flatMap((job) => (job.results || []).map((result) => ({ jobId: job.id, programId: job.programId, tool: job.tool, ...result })))
    .filter((result) => (!programId || result.programId === programId) && (!needle || result.searchableText.toLowerCase().includes(needle)))
    .slice(0, 500);
}

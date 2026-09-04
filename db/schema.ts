import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const programs = sqliteTable("afx_programs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  platform: text("platform", { enum: ["hackerone", "bugcrowd", "private", "lab"] }).notNull(),
  authorizationRef: text("authorization_ref").notNull(),
  rateLimit: integer("rate_limit").notNull().default(5),
  concurrency: integer("concurrency").notNull().default(2),
  status: text("status", { enum: ["draft", "active", "paused", "archived"] }).notNull().default("draft"),
  ...timestamps,
}, (table) => [index("idx_programs_owner_status").on(table.ownerId, table.status)]);

export const scopes = sqliteTable("afx_scopes", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["domain", "wildcard", "url", "ip", "cidr"] }).notNull(),
  value: text("value").notNull(),
  decision: text("decision", { enum: ["include", "exclude"] }).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uidx_scopes_program_value_decision").on(table.programId, table.value, table.decision),
  index("idx_scopes_program_decision").on(table.programId, table.decision),
]);

export const jobs = sqliteTable("afx_jobs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  tool: text("tool").notNull(),
  target: text("target").notNull(),
  parametersJson: text("parameters_json").notNull().default("{}"),
  status: text("status", { enum: ["queued", "running", "completed", "failed", "cancelled", "timed_out"] }).notNull().default("queued"),
  exitCode: integer("exit_code"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [index("idx_jobs_program_status_created").on(table.programId, table.status, table.createdAt)]);

export const assets = sqliteTable("afx_assets", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  firstSeenJobId: text("first_seen_job_id").references(() => jobs.id, { onDelete: "set null" }),
  type: text("type", { enum: ["domain", "url", "ip", "service", "repository"] }).notNull(),
  value: text("value").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("uidx_assets_program_type_value").on(table.programId, table.type, table.value),
  index("idx_assets_program_last_seen").on(table.programId, table.lastSeenAt),
]);

export const jobResults = sqliteTable("afx_job_results", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  resultType: text("result_type").notNull(),
  value: text("value").notNull(),
  normalizedJson: text("normalized_json").notNull().default("{}"),
  searchableText: text("searchable_text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uidx_job_results_job_type_value").on(table.jobId, table.resultType, table.value),
  index("idx_job_results_program_type").on(table.programId, table.resultType),
  index("idx_job_results_job").on(table.jobId),
]);

export const findings = sqliteTable("afx_findings", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  assetId: text("asset_id").references(() => assets.id, { onDelete: "set null" }),
  sourceJobId: text("source_job_id").references(() => jobs.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  vulnerabilityClass: text("vulnerability_class").notNull(),
  severity: text("severity", { enum: ["info", "low", "medium", "high", "critical"] }).notNull(),
  status: text("status", { enum: ["candidate", "validation_requested", "validated", "rejected", "reported", "resolved"] }).notNull().default("candidate"),
  confidence: integer("confidence").notNull().default(0),
  summary: text("summary").notNull(),
  impact: text("impact"),
  remediation: text("remediation"),
  validatorId: text("validator_id"),
  validatedAt: integer("validated_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [index("idx_findings_program_status_severity").on(table.programId, table.status, table.severity)]);

export const evidence = sqliteTable("afx_evidence", {
  id: text("id").primaryKey(),
  findingId: text("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  kind: text("kind", { enum: ["request", "response", "command", "stdout", "screenshot", "note"] }).notNull(),
  content: text("content").notNull(),
  sha256: text("sha256").notNull(),
  redacted: integer("redacted", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_evidence_finding_created").on(table.findingId, table.createdAt)]);

export const findingValidations = sqliteTable("afx_finding_validations", {
  id: text("id").primaryKey(),
  findingId: text("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").notNull(),
  decision: text("decision", { enum: ["approve", "reject", "needs_more_evidence"] }).notNull(),
  rationale: text("rationale").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_validations_finding_created").on(table.findingId, table.createdAt)]);

export const reports = sqliteTable("afx_reports", {
  id: text("id").primaryKey(),
  findingId: text("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["hackerone", "bugcrowd"] }).notNull(),
  formatVersion: integer("format_version").notNull().default(1),
  content: text("content").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_reports_finding_platform").on(table.findingId, table.platform)]);

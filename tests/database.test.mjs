import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

test("D1 migration creates the operational schema and indexes", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migration = readFileSync(new URL("../drizzle/0000_omniscient_maximus.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) database.exec(statement);
  const tables = database.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  for (const table of ["afx_programs", "afx_scopes", "afx_jobs", "afx_assets", "afx_job_results", "afx_findings", "afx_evidence", "afx_finding_validations", "afx_reports"]) assert.ok(tables.includes(table), `${table} table missing`);
  const indexes = database.prepare("SELECT name FROM sqlite_schema WHERE type = 'index'").all().map((row) => row.name);
  assert.ok(indexes.includes("idx_jobs_program_status_created"));
  assert.ok(indexes.includes("uidx_job_results_job_type_value"));
  database.close();
});

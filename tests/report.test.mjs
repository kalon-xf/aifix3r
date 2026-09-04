import test from "node:test";
import assert from "node:assert/strict";
import { buildBountyReport } from "../lib/report.mjs";

const finding = { id: "AFX-1", title: "Authorization bypass", vulnerability_class: "CWE-862", severity: "high", summary: "A validated authorization check is missing.", impact: "An authorized test account accessed a second owned test object.", remediation: "Enforce ownership server-side." };

test("generates HackerOne-ready markdown", () => {
  const report = buildBountyReport("hackerone", finding, [{ kind: "request", content: "GET /owned-test-object" }]);
  assert.match(report, /# Authorization bypass/);
  assert.match(report, /## Steps to reproduce/);
  assert.match(report, /## Impact/);
  assert.match(report, /Supporting material/);
});

test("generates Bugcrowd proof-of-concept section", () => {
  assert.match(buildBountyReport("bugcrowd", finding, []), /## Proof of concept/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateScope, normalizeTarget } from "../lib/scope-policy.mjs";
import { parseToolOutput, searchResults } from "../lib/tool-output.mjs";
import { readFileSync } from "node:fs";

test("scope policy permits exact and wildcard includes", () => {
  assert.equal(evaluateScope("https://api.example.com/path", ["*.example.com"], []).allowed, true);
  assert.equal(evaluateScope("example.com", ["example.com"], []).allowed, true);
});

test("scope exclusions override includes", () => {
  const result = evaluateScope("staging.example.com", ["*.example.com"], ["staging.example.com"]);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /exclusion/i);
});

test("URL path and CIDR scopes stay bounded", () => {
  assert.equal(evaluateScope("https://example.com/api/users", ["https://example.com/api"], []).allowed, true);
  assert.equal(evaluateScope("https://example.com/admin", ["https://example.com/api"], []).allowed, false);
  assert.equal(evaluateScope("192.0.2.12", ["192.0.2.0/24"], []).allowed, true);
  assert.equal(evaluateScope("198.51.100.12", ["192.0.2.0/24"], []).allowed, false);
});

test("scope rejects credentials, control characters and unrelated suffixes", () => {
  assert.equal(normalizeTarget("https://user:pass@example.com"), null);
  assert.equal(normalizeTarget("example.com\nother.example"), null);
  assert.equal(evaluateScope("evil-example.com", ["example.com"], []).allowed, false);
});

test("tool parser normalizes JSONL and plain output", () => {
  const output = '{"host":"api.example.com","ip":"192.0.2.1"}\nhttps://example.com/login';
  const results = parseToolOutput("subfinder", output);
  assert.equal(results.length, 2);
  assert.equal(results[0].type, "host");
  assert.equal(searchResults([{ id: "j1", programId: "p1", tool: "subfinder", results }], "login", "p1").length, 1);
});

test("nuclei observations remain finding candidates", () => {
  const [result] = parseToolOutput("nuclei", '{"template-id":"exposure","matched-at":"https://example.com","info":{"name":"Exposure","severity":"medium"}}');
  assert.equal(result.type, "finding-candidate");
  assert.match(result.searchableText, /medium/);
});

test("execution registry pins versions and exposes no arbitrary shell", () => {
  const registry = JSON.parse(readFileSync(new URL("../config/tool-registry.json", import.meta.url), "utf8"));
  for (const [name, definition] of Object.entries(registry.tools)) {
    assert.match(definition.version, /^\d+\.\d+\.\d+$/, `${name} must use an exact version`);
    assert.match(definition.binary, /^[a-z0-9_-]+$/i);
    assert.ok(Array.isArray(definition.args));
    assert.ok(Array.isArray(definition.versionArgs) && definition.versionArgs.length > 0);
    assert.equal(definition.args.some((argument) => /[;&|`]/.test(argument)), false);
    assert.ok(definition.timeoutSeconds >= 10 && definition.timeoutSeconds <= 900);
  }
});

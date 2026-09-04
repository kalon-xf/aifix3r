import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, resolve } from "node:path";

const token = "test-token-that-is-at-least-thirty-two-characters";
const port = 17331;
let worker, directory;

async function request(path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...options.headers } });
}

async function waitFor(predicate, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error("Timed out waiting for worker state.");
}

test.before(async () => {
  directory = await mkdtemp(resolve(tmpdir(), "aifix3r-worker-"));
  worker = spawn(process.execPath, ["local-worker/server.mjs"], {
    cwd: resolve("."), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PATH: `${resolve("tests/fixtures")}${delimiter}${process.env.PATH}`, AIFIX3R_DATA_DIR: directory, AIFIX3R_WORKER_TOKEN: token, AIFIX3R_WORKER_PORT: String(port), AIFIX3R_WORKER_CONCURRENCY: "1" }
  });
  worker.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${port}/health`)).ok; } catch { return false; } });
});

test.after(async () => {
  worker?.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
});

test("requires worker authentication", async () => {
  assert.equal((await fetch(`http://127.0.0.1:${port}/v1/jobs`)).status, 401);
});

test("rejects targets outside the allowlist", async () => {
  const response = await request("/v1/jobs", { method: "POST", body: JSON.stringify({ programId: "p1", authorizationRef: "AUTH-1", tool: "subfinder", target: "evil.test", includeScopes: ["example.com"] }) });
  assert.equal(response.status, 400);
});

test("requires human approval for validation tools", async () => {
  const response = await request("/v1/jobs", { method: "POST", body: JSON.stringify({ programId: "p1", authorizationRef: "AUTH-1", tool: "nuclei", target: "example.com", includeScopes: ["example.com"] }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /approval/i);
});

test("executes an allowlisted tool and parses searchable output", async () => {
  const created = await request("/v1/jobs", { method: "POST", body: JSON.stringify({ programId: "p1", authorizationRef: "AUTH-1", tool: "subfinder", target: "example.com", includeScopes: ["example.com"] }) });
  assert.equal(created.status, 202);
  const { job } = await created.json();
  const completed = await waitFor(async () => { const payload = await (await request(`/v1/jobs/${job.id}`)).json(); return payload.job.status === "completed" ? payload.job : null; });
  assert.equal(completed.results[0].value, "api.example.com");
  const results = await (await request("/v1/results?q=api.example.com&programId=p1")).json();
  assert.equal(results.results.length, 1);
});

test("cancels a running job", async () => {
  const created = await request("/v1/jobs", { method: "POST", body: JSON.stringify({ programId: "p1", authorizationRef: "AUTH-1", tool: "httpx", target: "example.com", includeScopes: ["example.com"] }) });
  const { job } = await created.json();
  await waitFor(async () => ((await (await request(`/v1/jobs/${job.id}`)).json()).job.status === "running"));
  assert.equal((await request(`/v1/jobs/${job.id}/cancel`, { method: "POST", body: "{}" })).status, 202);
  const cancelled = await waitFor(async () => { const current = (await (await request(`/v1/jobs/${job.id}`)).json()).job; return current.status === "cancelled" ? current : null; });
  assert.equal(cancelled.status, "cancelled");
});

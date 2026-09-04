import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clampInteger, evaluateScope } from "../lib/scope-policy.mjs";
import { parseToolOutput, searchResults } from "../lib/tool-output.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(process.env.AIFIX3R_DATA_DIR || join(root, "data", "worker"));
const jobsDir = join(dataDir, "jobs");
const registry = JSON.parse(await readFile(join(root, "config", "tool-registry.json"), "utf8"));
const token = process.env.AIFIX3R_WORKER_TOKEN || "";
const port = clampInteger(process.env.AIFIX3R_WORKER_PORT, 1024, 65535, 7331);
const host = process.env.AIFIX3R_WORKER_HOST || "127.0.0.1";
const maxConcurrent = clampInteger(process.env.AIFIX3R_WORKER_CONCURRENCY, 1, 8, 2);
const outputLimit = 2 * 1024 * 1024;
if (token.length < 32) throw new Error("AIFIX3R_WORKER_TOKEN must contain at least 32 characters.");
const jobs = new Map();
const running = new Map();
const queue = [];
await mkdir(jobsDir, { recursive: true });

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}

function authorized(request) {
  if (!token) return false;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(supplied), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function persist(job) {
  const path = join(jobsDir, `${job.id}.json`);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(job, null, 2), { mode: 0o600 });
  await rename(temporary, path);
}

async function loadJobs() {
  for (const name of await readdir(jobsDir)) {
    if (!name.endsWith(".json")) continue;
    try {
      const job = JSON.parse(await readFile(join(jobsDir, name), "utf8"));
      if (["queued", "running"].includes(job.status)) {
        job.status = "failed";
        job.error = "Worker restarted before completion.";
      }
      jobs.set(job.id, job);
    } catch {}
  }
}
await loadJobs();

function substitute(value, variables) {
  return value.replace(/\{\{(host|url|rate|outputDir)\}\}/g, (_, key) => variables[key]);
}

function schedule() {
  while (running.size < maxConcurrent && queue.length) {
    const index = queue.findIndex((candidate) => [...jobs.values()].filter((job) => job.programId === candidate.programId && job.status === "running").length < candidate.maxConcurrency);
    if (index < 0) return;
    const [next] = queue.splice(index, 1);
    void execute(next);
  }
}

async function execute(job) {
  const definition = registry.tools[job.tool];
  const outputDir = join(dataDir, "tool-output", job.id);
  await mkdir(outputDir, { recursive: true });
  const variables = { host: job.normalizedTarget.host, url: job.normalizedTarget.url, rate: String(job.rateLimit), outputDir };
  const args = definition.args.map((arg) => substitute(arg, variables));
  job.status = "running";
  job.startedAt = new Date().toISOString();
  await persist(job);

  const child = spawn(definition.binary, args, {
    cwd: outputDir,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin", HOME: outputDir, LANG: "C.UTF-8" },
    detached: process.platform !== "win32"
  });
  running.set(job.id, child);
  let stdout = "", stderr = "", truncated = false;
  const append = (current, chunk) => {
    if (current.length >= outputLimit) { truncated = true; return current; }
    return (current + chunk.toString("utf8")).slice(0, outputLimit);
  };
  child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
  child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
  const timer = setTimeout(() => {
    job.timedOut = true;
    if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM"); else child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 5000).unref();
  }, job.timeoutSeconds * 1000);
  timer.unref();

  child.on("error", async (error) => {
    clearTimeout(timer);
    running.delete(job.id);
    job.status = "failed";
    job.error = error.code === "ENOENT" ? `Tool not installed: ${definition.binary}` : error.message;
    job.finishedAt = new Date().toISOString();
    await persist(job);
    schedule();
  });
  child.on("close", async (code, signal) => {
    clearTimeout(timer);
    running.delete(job.id);
    if (job.cancelRequested) job.status = "cancelled";
    else if (job.timedOut) job.status = "timed_out";
    else job.status = code === 0 ? "completed" : "failed";
    job.exitCode = code;
    job.signal = signal;
    job.stdout = stdout;
    job.stderr = stderr;
    job.outputTruncated = truncated;
    job.results = parseToolOutput(job.tool, stdout);
    job.outputSha256 = createHash("sha256").update(stdout).digest("hex");
    job.finishedAt = new Date().toISOString();
    await persist(job);
    schedule();
  });
}

function createJob(input) {
  const definition = registry.tools[input.tool];
  if (!definition) throw new Error("Tool is not allowlisted.");
  const scope = evaluateScope(input.target, input.includeScopes, input.excludeScopes);
  if (!scope.allowed) throw new Error(scope.reason);
  if (!input.programId || !input.authorizationRef) throw new Error("Program and authorization reference are required.");
  if (definition.risk === "human-approved-validation" && (!input.validationApproved || !input.approvedBy)) throw new Error("Human validation approval is required for this tool.");
  const now = new Date().toISOString();
  return {
    id: randomUUID(), programId: String(input.programId), tool: input.tool,
    target: input.target, normalizedTarget: scope.target,
    includeScopes: input.includeScopes, excludeScopes: input.excludeScopes || [],
    authorizationRef: String(input.authorizationRef), approvedBy: input.approvedBy || null,
    rateLimit: clampInteger(input.rateLimit, 1, 50, 5),
    maxConcurrency: clampInteger(input.maxConcurrency, 1, maxConcurrent, Math.min(2, maxConcurrent)),
    timeoutSeconds: clampInteger(input.timeoutSeconds, 10, definition.timeoutSeconds, definition.timeoutSeconds),
    status: "queued", createdAt: now, updatedAt: now, results: []
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/health") return json(response, 200, { status: "ok", version: 1, running: running.size, queued: queue.length });
  if (!authorized(request)) return json(response, 401, { error: "Worker authentication required." });
  try {
    if (request.method === "GET" && url.pathname === "/v1/tools") return json(response, 200, registry);
    if (request.method === "GET" && url.pathname === "/v1/jobs") return json(response, 200, { jobs: [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200) });
    if (request.method === "POST" && url.pathname === "/v1/jobs") {
      const job = createJob(await body(request));
      jobs.set(job.id, job); queue.push(job); await persist(job); schedule();
      return json(response, 202, { job });
    }
    if (request.method === "GET" && url.pathname === "/v1/results") {
      return json(response, 200, { results: searchResults([...jobs.values()], url.searchParams.get("q"), url.searchParams.get("programId")) });
    }
    const match = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]+)(?:\/(cancel))?$/i);
    if (match) {
      const job = jobs.get(match[1]);
      if (!job) return json(response, 404, { error: "Job not found." });
      if (request.method === "GET" && !match[2]) return json(response, 200, { job });
      if (request.method === "POST" && match[2] === "cancel") {
        job.cancelRequested = true;
        if (job.status === "queued") { job.status = "cancelled"; queue.splice(queue.indexOf(job), 1); }
        const child = running.get(job.id);
        if (child) child.kill("SIGTERM");
        job.updatedAt = new Date().toISOString(); await persist(job);
        return json(response, 202, { job });
      }
    }
    return json(response, 404, { error: "Route not found." });
  } catch (error) {
    return json(response, 400, { error: error instanceof Error ? error.message : "Request failed." });
  }
});

server.listen(port, host, () => console.log(`AiFix3r local worker listening on http://${host}:${port}`));

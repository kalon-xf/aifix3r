import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../.env.local", import.meta.url);
let content = await readFile(path, "utf8");
if (/^AIFIX3R_LOCAL_USER=\s*$/m.test(content)) content = content.replace(/^AIFIX3R_LOCAL_USER=\s*$/m, "AIFIX3R_LOCAL_USER=local-operator");
if (/^AIFIX3R_WORKER_TOKEN=\s*$/m.test(content)) content = content.replace(/^AIFIX3R_WORKER_TOKEN=\s*$/m, `AIFIX3R_WORKER_TOKEN=${randomBytes(32).toString("hex")}`);
await writeFile(path, content, { mode: 0o600 });
console.log("Local operator identity and worker authentication are configured.");

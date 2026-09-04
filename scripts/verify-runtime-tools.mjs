import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../config/tool-registry.json", import.meta.url), "utf8"));
let failures = 0;
for (const [name, definition] of Object.entries(registry.tools)) {
  try {
    const output = execFileSync(definition.binary, definition.versionArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 });
    const matches = output.includes(definition.version);
    console.log(`${matches ? "OK" : "MISMATCH"}  ${name} expected=${definition.version} ${output.trim().split(/\r?\n/)[0] || "unknown"}`);
    if (!matches) failures++;
  } catch {
    console.log(`MISSING   ${name} expected=${definition.version}`);
    failures++;
  }
}
process.exitCode = failures ? 2 : 0;

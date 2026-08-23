type Mode = "recon" | "poc" | "report" | "fix";
const MODES = new Set(["recon", "poc", "report", "fix"]);
function redact(s: string) {
  return s.replace(/nvapi-[A-Za-z0-9_-]+/g, "[REDACTED_KEY]")
    .replace(/(authorization:\\s*(?:bearer|basic)\\s+)[^\\s]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password)\\s*[:=]\\s*)[^\\s\"'&]+/gi, "$1[REDACTED]");
}
function build(mode: Mode, artifact: string, scope: string, program: string) {
  if (mode === "recon") {
    const lines = [...new Set(artifact.split(/\\r?\\n/).map((x) => x.trim()).filter(Boolean))].slice(0, 500);
    const risk = (x: string) => /(admin|auth|login|oauth|upload|graphql|api\\/|swagger|openapi)/i.test(x) ? "high" : /(account|user|internal|debug|staging|\\.js\\b|callback|redirect)/i.test(x) ? "medium" : "low";
    return "## Ranked recon map\\n\\n" + JSON.stringify({ scope, high: lines.filter((x) => risk(x) === "high"), medium: lines.filter((x) => risk(x) === "medium"), low: lines.filter((x) => risk(x) === "low"), suggested_vectors: ["Access control", "Input validation", "Authentication/session", "Upload controls", "API schema"], manual_review_required: true }, null, 2);
  }
  if (mode === "report") return "## Title and CWE\\n\\n## Program and scope\\n\\nProgram: " + program + "\\nAsset: " + scope + "\\n\\n## Summary\\n\\n## Steps to reproduce\\n\\n## Sanitized HTTP evidence\\n\\n" + artifact.slice(0, 8000) + "\\n\\n## Demonstrated impact\\n\\n## Suggested remediation";
  if (mode === "fix") return "### Security Patch\\n\\nLocal mode will not invent a patch. Review the code below, create the smallest unified diff, and add a regression test.\\n\\n" + artifact.slice(0, 12000);
  return "## Safe PoC validation plan\\n\\nAuthorized scope: " + scope + "\\n\\n1. Preserve a sanitized baseline.\\n2. Change only the minimum suspected input.\\n3. Use one owned test resource.\\n4. Make no bulk requests.\\n5. Stop before accessing another user's data or changing persistent state.\\n6. Record only demonstrated impact.\\n\\nObservation:\\n" + artifact.slice(0, 12000);
}
export async function POST(request: Request) {
  let input: { mode?: string; scope?: string; program?: string; artifact?: string; authorized?: boolean };
  try { input = await request.json() as typeof input; } catch { return Response.json({ error: "JSON required." }, { status: 400 }); }
  const mode = MODES.has(input.mode || "") ? input.mode as Mode : undefined;
  const scope = input.scope?.trim() || "";
  const artifact = redact(input.artifact?.trim() || "");
  const program = input.program?.trim() || "Authorized engagement";
  if (!mode) return Response.json({ error: "Choose a valid mode." }, { status: 422 });
  if (input.authorized !== true) return Response.json({ error: "Authorization confirmation required." }, { status: 403 });
  if (!scope || scope.length > 300 || /[\\r\\n\\0]/.test(scope)) return Response.json({ error: "Enter one authorized scope." }, { status: 422 });
  if (artifact.length < 10 || artifact.length > 40000) return Response.json({ error: "Input must be 10-40,000 characters." }, { status: 422 });
  return Response.json({ result: { mode, title: "SecurityOps " + mode + " review", content: build(mode, artifact, scope, program), risk: "manual-review", warnings: ["Processed locally", "No evidence sent to an external AI", "Human validation required"] }, provider: "local-guarded-engine" });
}
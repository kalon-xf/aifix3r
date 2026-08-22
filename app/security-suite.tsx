"use client";

import { useMemo, useState } from "react";

type ScopeProps = {
  scope: string;
  setScope: (value: string) => void;
};

type ReconProfile = "passive" | "balanced" | "deep";
type Tool = {
  name: string;
  category: "Discovery" | "DNS" | "Web" | "URLs" | "Exposure" | "Validation";
  tier: "Core" | "Ultra";
  mode: "Passive" | "Bounded" | "Approval";
  description: string;
  output: string;
  command: string;
};

const DOMAIN_PATTERN = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const tools: Tool[] = [
  { name: "Subfinder", category: "Discovery", tier: "Core", mode: "Passive", description: "Enumerate subdomains from curated passive sources.", output: "subfinder.txt", command: "subfinder -silent -d \"{{target}}\" | sort -u | tee subfinder.txt" },
  { name: "Amass", category: "Discovery", tier: "Ultra", mode: "Passive", description: "Correlate passive DNS and OSINT relationships.", output: "amass.txt", command: "amass enum -passive -d \"{{target}}\" -o amass.txt" },
  { name: "Assetfinder", category: "Discovery", tier: "Core", mode: "Passive", description: "Add fast certificate and public-source coverage.", output: "assetfinder.txt", command: "assetfinder --subs-only \"{{target}}\" | sort -u | tee assetfinder.txt" },
  { name: "GitHub CLI", category: "Discovery", tier: "Ultra", mode: "Passive", description: "Locate public references for the authorized organization or domain.", output: "github-references.json", command: "gh search code '\"{{target}}\"' --limit 100 --json repository,path,url > github-references.json" },
  { name: "DNSx", category: "DNS", tier: "Core", mode: "Bounded", description: "Resolve and normalize the discovered hostname inventory.", output: "resolved.txt", command: "dnsx -silent -l assets.txt -a -resp -rl 50 -o resolved.txt" },
  { name: "MassDNS", category: "DNS", tier: "Ultra", mode: "Bounded", description: "Bulk-resolve approved assets with a controlled resolver set.", output: "massdns.txt", command: "massdns -r resolvers.txt -t A -o S assets.txt > massdns.txt" },
  { name: "CDNcheck", category: "DNS", tier: "Ultra", mode: "Passive", description: "Separate CDN and cloud-protected infrastructure before probing.", output: "cdn-classification.txt", command: "cdncheck -silent -i resolved.txt -o cdn-classification.txt" },
  { name: "HTTPx", category: "Web", tier: "Core", mode: "Bounded", description: "Inventory live web services, titles, status and technologies.", output: "web.txt", command: "httpx -silent -l assets.txt -rl 5 -threads 10 -status-code -title -tech-detect -o web.txt" },
  { name: "TLSx", category: "Web", tier: "Ultra", mode: "Bounded", description: "Capture certificate names, issuers and TLS metadata.", output: "tls.jsonl", command: "tlsx -l web.txt -san -cn -issuer -json -o tls.jsonl" },
  { name: "Wappalyzer", category: "Web", tier: "Ultra", mode: "Bounded", description: "Fingerprint the approved root application technology stack.", output: "technology.json", command: "wappalyzer \"https://{{target}}\" --pretty > technology.json" },
  { name: "GAU", category: "URLs", tier: "Core", mode: "Passive", description: "Collect known URLs from public archives and datasets.", output: "archived-urls.txt", command: "gau --subs \"{{target}}\" | sort -u > archived-urls.txt" },
  { name: "Waybackurls", category: "URLs", tier: "Core", mode: "Passive", description: "Recover historical paths for manual exposure review.", output: "wayback-urls.txt", command: "printf '%s\\n' \"{{target}}\" | waybackurls | sort -u > wayback-urls.txt" },
  { name: "Katana", category: "URLs", tier: "Ultra", mode: "Approval", description: "Run a shallow, rate-limited crawl of the approved web root.", output: "crawl.txt", command: "katana -u \"https://{{target}}\" -d 2 -jc -rl 2 -c 3 -o crawl.txt" },
  { name: "Uro", category: "URLs", tier: "Ultra", mode: "Passive", description: "Normalize noisy URL collections before human review.", output: "normalized-urls.txt", command: "uro < all-urls.txt > normalized-urls.txt" },
  { name: "Naabu", category: "Exposure", tier: "Ultra", mode: "Approval", description: "Check a small approved port set with bounded rate and concurrency.", output: "ports.txt", command: "naabu -list assets.txt -top-ports 100 -rate 50 -c 10 -o ports.txt" },
  { name: "Nuclei", category: "Validation", tier: "Ultra", mode: "Approval", description: "Collect non-intrusive technology and exposure signals for review.", output: "signals.jsonl", command: "nuclei -l web.txt -tags tech,misconfig,exposure -exclude-tags intrusive,bruteforce,dos,fuzz -rl 3 -c 5 -jsonl -o signals.jsonl" },
  { name: "Arjun", category: "Validation", tier: "Ultra", mode: "Approval", description: "Perform low-concurrency parameter discovery on one approved URL.", output: "parameters.json", command: "arjun -u \"https://{{target}}\" -t 2 --stable -oJ parameters.json" },
  { name: "ParamSpider", category: "URLs", tier: "Ultra", mode: "Passive", description: "Extract parameterized historical URLs for later validation.", output: "results/{{target}}.txt", command: "paramspider -d \"{{target}}\" --exclude woff,css,png,svg,jpg" },
  { name: "GF Patterns", category: "Validation", tier: "Core", mode: "Passive", description: "Classify collected URLs into manual review queues.", output: "review-candidates.txt", command: "gf xss archived-urls.txt | sort -u > review-candidates.txt" },
  { name: "Dalfox", category: "Validation", tier: "Ultra", mode: "Approval", description: "Discovery-only analysis of pre-approved reflected candidates.", output: "dalfox-discovery.txt", command: "dalfox file review-candidates.txt --only-discovery --skip-bav -o dalfox-discovery.txt" },
];

const categories = ["All", "Discovery", "DNS", "Web", "URLs", "Exposure", "Validation"] as const;

function normalizeScope(value: string) {
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^\*\./, "").split(/[/?#]/)[0];
  return DOMAIN_PATTERN.test(normalized) ? normalized : "";
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function commandFor(tool: Tool, target: string) {
  return tool.command.replaceAll("{{target}}", target);
}

function buildReconScript(target: string, profile: ReconProfile) {
  const lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    "# AiFix3r authorized discovery workflow",
    "# Review program exclusions and limits before running.",
    `TARGET="${target}"`,
    'STAMP="$(date +%Y%m%d-%H%M%S)"',
    'OUT="aifix3r-$TARGET-$STAMP"',
    'mkdir -p "$OUT"',
    "",
    'printf "[01] Passive asset discovery for %s\\n" "$TARGET"',
    'subfinder -silent -d "$TARGET" > "$OUT/subfinder.txt"',
    'amass enum -passive -d "$TARGET" -o "$OUT/amass.txt"',
    'cat "$OUT/subfinder.txt" "$OUT/amass.txt" | sort -u > "$OUT/assets.txt"',
    "",
    'printf "[02] DNS normalization\\n"',
    'dnsx -silent -l "$OUT/assets.txt" -rl 50 -o "$OUT/resolved.txt"',
    "",
    'printf "[03] Archive collection\\n"',
    'gau --subs "$TARGET" | sort -u > "$OUT/archived-urls.txt"',
  ];

  if (profile !== "passive") {
    lines.push(
      "",
      '# Bounded direct checks: confirm authorization before this stage.',
      'printf "[04] Web inventory\\n"',
      'httpx -silent -l "$OUT/resolved.txt" -rl 5 -threads 10 -status-code -title -tech-detect -o "$OUT/web.txt"',
      'katana -list "$OUT/web.txt" -d 2 -jc -rl 2 -c 3 -o "$OUT/crawl.txt"',
    );
  }

  if (profile === "deep") {
    lines.push(
      "",
      '# Approval stage: verify the program permits port and template checks.',
      'printf "[05] Bounded exposure signals\\n"',
      'naabu -list "$OUT/resolved.txt" -top-ports 100 -rate 50 -c 10 -o "$OUT/ports.txt"',
      'nuclei -l "$OUT/web.txt" -tags tech,misconfig,exposure -exclude-tags intrusive,bruteforce,dos,fuzz -rl 3 -c 5 -jsonl -o "$OUT/signals.jsonl"',
    );
  }

  lines.push("", 'printf "Finished. Review evidence in %s before making any security claim.\\n" "$OUT"');
  return lines.join("\n");
}

export function DiscoveryHub({ scope, setScope, onOpenTools }: ScopeProps & { onOpenTools: () => void }) {
  const [projectName, setProjectName] = useState("Acme public program");
  const [profile, setProfile] = useState<ReconProfile>("balanced");
  const [authorized, setAuthorized] = useState(false);
  const [script, setScript] = useState("");
  const [message, setMessage] = useState("");
  const target = normalizeScope(scope);
  const stageCount = profile === "passive" ? 3 : profile === "balanced" ? 4 : 5;

  function generate() {
    if (!target) {
      setMessage("Enter one valid root domain such as example.com.");
      return;
    }
    if (!authorized) {
      setMessage("Confirm that you have written authorization before generating a workflow.");
      return;
    }
    setScript(buildReconScript(target, profile));
    setMessage("Safe workflow generated. Review every command before running it locally.");
  }

  async function copyScript() {
    await copyText(script);
    setMessage("Workflow copied to clipboard.");
  }

  return <div className="page-stack cyber-page">
    <section className="cyber-hero">
      <div><span className="terminal-kicker">root@aifix3r:~/projects$ init</span><h2>Project discovery lab</h2><p>Turn an authorized program scope into a controlled recon workflow with passive-first discovery, bounded checks, and AI-ready evidence.</p></div>
      <div className="threat-orbit" aria-hidden="true"><span /><span /><b>20</b><small>tool<br />templates</small></div>
    </section>

    <section className="discovery-layout">
      <article className="cyber-panel project-builder">
        <div className="cyber-panel-head"><div><span>PROJECT INTAKE</span><h3>Configure authorized scope</h3></div><span className="live-chip"><i /> Guard online</span></div>
        <div className="cyber-form-grid">
          <label><span>Project name</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={80} /></label>
          <label><span>Root domain</span><input value={scope} onChange={(event) => { setScope(event.target.value); setScript(""); }} placeholder="example.com" spellCheck={false} /></label>
          <label><span>Program source</span><select defaultValue="hackerone"><option value="hackerone">HackerOne</option><option value="bugcrowd">Bugcrowd</option><option value="private">Private program</option><option value="lab">Owned lab</option></select></label>
          <label><span>Discovery profile</span><select value={profile} onChange={(event) => { setProfile(event.target.value as ReconProfile); setScript(""); }}><option value="passive">Passive intelligence</option><option value="balanced">Balanced web recon</option><option value="deep">Deep approved review</option></select></label>
        </div>
        <label className="authorization-check"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span><strong>I confirm written authorization</strong>This target is in scope and I will apply the program&apos;s exclusions, rates, and prohibited-testing rules.</span></label>
        <div className="project-actions"><button className="cyber-primary" onClick={generate} disabled={!authorized}>Generate workflow <span>↗</span></button><button className="cyber-secondary" onClick={onOpenTools}>Browse 20 tools</button></div>
        {message && <p className={`cyber-message ${script ? "success" : ""}`}>{message}</p>}
      </article>

      <article className="cyber-panel pipeline-card">
        <div className="cyber-panel-head"><div><span>PIPELINE MAP</span><h3>{projectName || "Untitled project"}</h3></div><span className={`profile-chip ${profile}`}>{profile}</span></div>
        <div className="pipeline-map">
          <PipelineStep number="01" title="Passive intel" tools="Subfinder · Amass · archives" active />
          <PipelineStep number="02" title="DNS ownership" tools="DNSx · CDNcheck" active />
          <PipelineStep number="03" title="URL intelligence" tools="GAU · Waybackurls" active />
          <PipelineStep number="04" title="Web inventory" tools="HTTPx · Katana" active={profile !== "passive"} />
          <PipelineStep number="05" title="Safe signals" tools="Naabu · Nuclei safe tags" active={profile === "deep"} />
        </div>
        <div className="pipeline-summary"><span>{stageCount} active stages</span><span>{target || "scope pending"}</span></div>
      </article>
    </section>

    <section className="terminal-panel">
      <div className="terminal-bar"><div><i /><i /><i /></div><span>generated-workflow.sh</span>{script && <button onClick={() => void copyScript()}>Copy full script</button>}</div>
      {script ? <pre><code>{script}</code></pre> : <div className="terminal-empty"><span>$</span><p>Confirm authorization and generate a copy-ready discovery workflow.<small>AiFix3r never executes these commands from the browser.</small></p></div>}
    </section>

    <section className="project-strip">
      <ProjectMini name="Fintech public program" scope="api.example.com" status="Review" assets="248" tone="orange" />
      <ProjectMini name="Commerce surface" scope="shop.example.com" status="Active" assets="519" tone="lime" />
      <ProjectMini name="Owned AI lab" scope="lab.example.com" status="Mapped" assets="84" tone="cyan" />
    </section>
  </div>;
}

function PipelineStep({ number, title, tools: toolNames, active }: { number: string; title: string; tools: string; active: boolean }) {
  return <div className={active ? "active" : "locked"}><span>{number}</span><div><strong>{title}</strong><small>{toolNames}</small></div><b>{active ? "READY" : "LOCKED"}</b></div>;
}

function ProjectMini({ name, scope: target, status, assets, tone }: { name: string; scope: string; status: string; assets: string; tone: string }) {
  return <article className={`project-mini ${tone}`}><span className="project-node" /><div><small>{status}</small><strong>{name}</strong><code>{target}</code></div><b>{assets}<small>assets</small></b></article>;
}

export function ToolLibrary({ scope, setScope }: ScopeProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [authorized, setAuthorized] = useState(false);
  const [copied, setCopied] = useState("");
  const target = normalizeScope(scope);
  const visibleTools = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === "All" || tool.category === category;
    const haystack = `${tool.name} ${tool.category} ${tool.description}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [category, query]);

  async function copyTool(tool: Tool) {
    if (!target || !authorized) return;
    await copyText(`# Authorized target: ${target}\nTARGET="${target}"\n${commandFor(tool, target)}`);
    setCopied(tool.name);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function copyPassiveStack() {
    if (!target || !authorized) return;
    await copyText(buildReconScript(target, "passive"));
    setCopied("Passive stack");
    window.setTimeout(() => setCopied(""), 1800);
  }

  return <div className="page-stack cyber-page">
    <section className="cyber-hero compact"><div><span className="terminal-kicker">aifix3r://arsenal/catalog</span><h2>Bug-hunting tool arsenal</h2><p>Search proven recon tools, understand where they fit, and copy bounded command templates for an explicitly authorized target.</p></div><div className="arsenal-count"><strong>20</strong><span>curated tools</span><small>6 workflow stages</small></div></section>

    <section className="tool-control cyber-panel">
      <div className="scope-command"><label><span>AUTHORIZED TARGET</span><input value={scope} onChange={(event) => setScope(event.target.value)} placeholder="example.com" spellCheck={false} /></label><label className="mini-auth"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span>Authorization confirmed</span></label><button onClick={() => void copyPassiveStack()} disabled={!authorized || !target}>{copied === "Passive stack" ? "Copied ✓" : "Copy passive stack"}</button></div>
      {!target && <p className="scope-warning">Enter one valid root domain to unlock copy actions.</p>}
      <div className="tool-search-row"><label className="tool-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools, stages, or capabilities…" /></label><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    </section>

    <section className="tool-grid">{visibleTools.map((tool, index) => <article className="tool-card" key={tool.name}>
      <div className="tool-top"><span className="tool-index">{String(index + 1).padStart(2, "0")}</span><div className="tool-badges"><span className={tool.tier === "Ultra" ? "ultra" : "core"}>{tool.tier}</span><span className={`mode ${tool.mode.toLowerCase()}`}>{tool.mode}</span></div></div>
      <div className="tool-icon">{tool.name.slice(0, 2).toUpperCase()}</div><h3>{tool.name}</h3><span className="tool-category">{tool.category}</span><p>{tool.description}</p>
      <div className="tool-output"><span>OUTPUT</span><code>{tool.output}</code></div>
      <div className="command-preview"><code>{commandFor(tool, target || "example.com")}</code></div>
      <button className="copy-command" disabled={!authorized || !target} onClick={() => void copyTool(tool)}>{copied === tool.name ? "Copied ✓" : "Copy command"}<span>⌘C</span></button>
    </article>)}</section>
    {visibleTools.length === 0 && <div className="no-tools"><span>⌕</span><strong>No matching tools</strong><p>Try a different keyword or category.</p></div>}
    <section className="execution-boundary"><span>!</span><div><strong>Copy-only control plane</strong><p>Commands run only in your own isolated runner. Review scope, exclusions, rate limits, tool versions, and program rules before execution. Automated signals require manual validation.</p></div></section>
  </div>;
}

const plans = [
  { id: "Operator", name: "Operator", price: "₹0", cadence: "/ month", description: "Learn the workflow and organize one authorized project.", features: ["1 active project", "Passive discovery templates", "Safe local AI fallback", "Community tool catalog"], cta: "Use Operator" },
  { id: "Ultra", name: "Ultra Hunter", price: "₹1,499", cadence: "/ month", description: "AI-powered recon planning for serious independent researchers.", features: ["25 active projects", "Nemotron 3 Ultra planning", "All 20 command templates", "GitHub private-repo metadata", "Priority finding triage", "Export-ready evidence"], cta: "Select Ultra" },
  { id: "Team", name: "Security Team", price: "Custom", cadence: "", description: "Shared approval, policy and evidence controls for a company team.", features: ["Unlimited team workspaces", "Role-based approvals", "Private runner adapters", "Central policy templates", "Audit and retention controls", "Priority support"], cta: "Request Team" },
] as const;

export function PlansAndModels({ aiStatus }: { aiStatus: { configured: boolean; model: string; provider: string } }) {
  const [selected, setSelected] = useState("Operator");
  return <div className="page-stack cyber-page">
    <section className="cyber-hero plans-hero"><div><span className="terminal-kicker">aifix3r://access/upgrade</span><h2>Choose your hunting engine</h2><p>Start with the guarded workflow, then unlock advanced NVIDIA planning and professional project controls when you are ready.</p></div><span className="founder-badge">FOUNDING RELEASE · v0.2</span></section>
    <section className="pricing-grid">{plans.map((plan) => <article className={`pricing-card ${plan.id === "Ultra" ? "featured" : ""} ${selected === plan.id ? "selected" : ""}`} key={plan.id}>
      {plan.id === "Ultra" && <span className="popular-ribbon">MOST CAPABLE</span>}<div className="pricing-head"><span>{plan.name}</span><h3>{plan.price}<small>{plan.cadence}</small></h3><p>{plan.description}</p></div><ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul><button onClick={() => setSelected(plan.id)}>{selected === plan.id ? "Selected ✓" : plan.cta}</button>
    </article>)}</section>
    <p className="billing-note">Package selection is a product preview; no payment is taken. Connect a billing provider before commercial launch.</p>

    <section className="model-console cyber-panel"><div className="cyber-panel-head"><div><span>AI MODEL ROUTER</span><h3>Advanced reasoning, controlled output</h3></div><span className={`live-chip ${aiStatus.configured ? "" : "amber"}`}><i />{aiStatus.configured ? "Provider connected" : "Safe demo active"}</span></div><div className="model-grid">
      <article><span className="model-level">LOCAL / CORE</span><h4>AiFix3r Safe Planner</h4><p>Deterministic mission templates for product demos and offline workflow design.</p><div><span>Latency</span><b>Instant</b></div><div><span>Secrets required</span><b>No</b></div><div><span>Best for</span><b>Learning</b></div></article>
      <article className="ultra-model"><span className="model-level">NVIDIA / ULTRA</span><h4>Nemotron 3 Ultra</h4><code>{aiStatus.model}</code><p>Advanced mission decomposition, tool sequencing and evidence-oriented triage under a defensive system policy.</p><div><span>Provider</span><b>{aiStatus.provider}</b></div><div><span>Status</span><b>{aiStatus.configured ? "Connected" : "Key required"}</b></div><div><span>Safety</span><b>Human gate</b></div></article>
    </div></section>
    <section className="premium-capabilities"><div><span>01</span><strong>Plan</strong><p>Convert a plain-language goal into a transparent security workflow.</p></div><div><span>02</span><strong>Control</strong><p>Bind every action to authorized scope, limits, and exclusions.</p></div><div><span>03</span><strong>Review</strong><p>Keep evidence and AI confidence separate from confirmed impact.</p></div><div><span>04</span><strong>Report</strong><p>Prepare clear, reproducible notes for human submission.</p></div></section>
  </div>;
}

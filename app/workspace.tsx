"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { DiscoveryHub, PlansAndModels, ToolLibrary } from "./security-suite";
import Methodology from "./methodology";
import SecurityOps from "./securityops";

type View = "overview" | "discovery" | "methodology" | "securityops" | "toolbox" | "planner" | "missions" | "findings" | "plans" | "integrations";
type MissionPlan = {
  summary: string;
  pipeline: string;
  safety_gate: string;
  steps: Array<{ title: string; tool_group: string; reason: string }>;
  operator_checklist: string[];
};
type AiStatus = { configured: boolean; model: string; provider: string; evidence_policy: string };
type GithubRepository = {
  full_name: string; description: string | null; private: boolean; default_branch: string;
  html_url: string; pushed_at: string; open_issues_count: number;
};

const navigation: Array<{ id: View; label: string; glyph: string }> = [
  { id: "overview", label: "Command center", glyph: "⌁" },
  { id: "discovery", label: "Project discovery", glyph: "◉" },
  { id: "methodology", label: "Field methodology", glyph: "▦" },
  { id: "securityops", label: "SecurityOps AI", glyph: "✧" },
  { id: "toolbox", label: "Tool arsenal", glyph: "⌘" },
  { id: "planner", label: "AI mission planner", glyph: "✦" },
  { id: "missions", label: "Operations", glyph: "◎" },
  { id: "findings", label: "Findings", glyph: "◇" },
  { id: "plans", label: "Plans & models", glyph: "◆" },
  { id: "integrations", label: "Integrations", glyph: "↗" },
];
const missions = [
  { target: "api.example.com", profile: "Balanced recon", progress: 72, status: "running", findings: 4 },
  { target: "app.example.com", profile: "Web exposure", progress: 100, status: "review", findings: 2 },
  { target: "example.com", profile: "Passive discovery", progress: 100, status: "complete", findings: 0 },
];
const findings = [
  { severity: "high", title: "Administrative route exposed", asset: "api.example.com/v2/admin", source: "nuclei", confidence: 88 },
  { severity: "medium", title: "CORS policy needs validation", asset: "app.example.com/graphql", source: "httpx", confidence: 74 },
  { severity: "low", title: "Technology version disclosure", asset: "status.example.com", source: "wappalyzer", confidence: 96 },
];
const emptyPlan: MissionPlan = {
  summary: "Describe an authorized goal and AiFix3r will turn it into a reviewable, scope-safe mission.",
  pipeline: "Awaiting mission",
  safety_gate: "No tools run until you review and authorize the plan.",
  steps: [],
  operator_checklist: [],
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function Workspace() {
  const [view, setView] = useState<View>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [goal, setGoal] = useState("Map the public web attack surface and prioritize changes since the last review.");
  const [scope, setScope] = useState("example.com");
  const [profile, setProfile] = useState("balanced");
  const [plan, setPlan] = useState<MissionPlan>(emptyPlan);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus>({ configured: false, model: "nvidia/nemotron-3-ultra-550b-a55b", provider: "NVIDIA NIM", evidence_policy: "metadata_only" });
  const [repositoryInput, setRepositoryInput] = useState("kalon-xf/aifix3r");
  const [repository, setRepository] = useState<GithubRepository>();
  const [repoBusy, setRepoBusy] = useState(false);
  const [repoError, setRepoError] = useState("");

  useEffect(() => {
    fetch("/api/ai/status").then((response) => response.ok ? response.json() : Promise.reject())
      .then((status: AiStatus) => setAiStatus(status)).catch(() => undefined);
  }, []);

  const riskScore = useMemo(() => findings.reduce((score, finding) =>
    score + (finding.severity === "high" ? 12 : finding.severity === "medium" ? 6 : 2), 50), []);

  async function buildPlan(event?: FormEvent) {
    event?.preventDefault();
    setPlanning(true); setPlanError("");
    try {
      const response = await fetch("/api/ai/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, scope, profile }) });
      const payload = (await response.json()) as { plan?: MissionPlan; error?: string };
      if (!response.ok || !payload.plan) throw new Error(payload.error || "Could not create the mission plan.");
      setPlan(payload.plan); setView("planner");
    } catch (error) { setPlanError(error instanceof Error ? error.message : "Could not create the mission plan."); }
    finally { setPlanning(false); }
  }

  async function connectRepository(event: FormEvent) {
    event.preventDefault(); setRepoBusy(true); setRepoError("");
    try {
      const response = await fetch(`/api/github/repository?repo=${encodeURIComponent(repositoryInput)}`);
      const payload = (await response.json()) as { repository?: GithubRepository; error?: string };
      if (!response.ok || !payload.repository) throw new Error(payload.error || "Repository could not be connected.");
      setRepository(payload.repository);
    } catch (error) { setRepository(undefined); setRepoError(error instanceof Error ? error.message : "Repository could not be connected."); }
    finally { setRepoBusy(false); }
  }

  function navigate(next: View) { setView(next); setMobileNav(false); }

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><span>A</span><i /></div><div><strong>AiFix3r</strong><small>Security automation</small></div><button className="nav-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div>
      <nav aria-label="Workspace navigation"><span className="nav-label">Workspace</span>{navigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><span className="nav-glyph">{item.glyph}</span>{item.label}{item.id === "findings" && <em>3</em>}</button>)}</nav>
      <div className="guard-card"><div><span className="guard-icon">✓</span><strong>Authorization guard</strong></div><p>Every mission pauses for scope and policy confirmation before execution.</p><span className="guard-state"><i /> Enforcement active</span></div>
      <div className="sidebar-footer"><span>Authorized research only</span><small>AiFix3r Ultra · v0.2</small></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <section className="workspace">
      <header className="topbar"><div className="topbar-title"><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation">☰</button><div><span>Authorized workspace</span><h1>{navigation.find((item) => item.id === view)?.label}</h1></div></div><div className="topbar-actions"><span className="premium-signal">ULTRA</span><span className={`provider-pill ${aiStatus.configured ? "online" : "demo"}`}><i />{aiStatus.configured ? "Nemotron connected" : "AI demo mode"}</span><button className="secondary-action" onClick={() => navigate("discovery")}>New project</button><button className="primary-action" onClick={() => navigate("planner")}><b>✦</b> New mission</button></div></header>
      <div className="content">
        {view === "overview" && <Overview goal={goal} setGoal={setGoal} scope={scope} setScope={setScope} profile={profile} setProfile={setProfile} planning={planning} planError={planError} buildPlan={buildPlan} riskScore={riskScore} onView={navigate} />}
        {view === "discovery" && <DiscoveryHub scope={scope} setScope={setScope} onOpenTools={() => navigate("toolbox")} />}
        {view === "methodology" && <Methodology />}
        {view === "securityops" && <SecurityOps />}
        {view === "toolbox" && <ToolLibrary scope={scope} setScope={setScope} />}
        {view === "planner" && <Planner goal={goal} setGoal={setGoal} scope={scope} setScope={setScope} profile={profile} setProfile={setProfile} planning={planning} planError={planError} buildPlan={buildPlan} plan={plan} aiStatus={aiStatus} />}
        {view === "missions" && <Missions />}
        {view === "findings" && <Findings onAskAi={(finding) => { setGoal(`Help me safely validate and report: ${finding.title} at ${finding.asset}`); setView("planner"); }} />}
        {view === "plans" && <PlansAndModels aiStatus={aiStatus} />}
        {view === "integrations" && <Integrations aiStatus={aiStatus} repositoryInput={repositoryInput} setRepositoryInput={setRepositoryInput} repository={repository} repoBusy={repoBusy} repoError={repoError} connectRepository={connectRepository} />}
      </div>
    </section>
  </main>;
}

type PlannerProps = {
  goal: string; setGoal: (value: string) => void; scope: string; setScope: (value: string) => void;
  profile: string; setProfile: (value: string) => void; planning: boolean; planError: string;
  buildPlan: (event?: FormEvent) => Promise<void>;
};

function Overview(props: PlannerProps & { riskScore: number; onView: (view: View) => void }) {
  return <div className="page-stack">
    <section className="welcome-row"><div><span className="eyebrow">AI-guided operations</span><h2>Good afternoon, operator.</h2><p>Describe the outcome. AiFix3r plans the safest authorized path and keeps you in control.</p></div><div className="trust-note"><span>01</span><p><strong>Human approval required</strong>AI creates plans and triage notes. It never widens scope or launches exploits.</p></div></section>
    <section className="planner-card compact-planner"><div className="planner-head"><div className="spark-mark">✦</div><div><span>Mission copilot</span><h3>What do you want to investigate?</h3></div><span className="model-tag">Nemotron 3 Ultra</span></div><form onSubmit={(event) => void props.buildPlan(event)}><textarea value={props.goal} onChange={(event) => props.setGoal(event.target.value)} maxLength={1200} aria-label="Security mission goal" /><div className="planner-controls"><label><span>Authorized scope</span><input value={props.scope} onChange={(event) => props.setScope(event.target.value)} placeholder="example.com" /></label><label><span>Noise profile</span><select value={props.profile} onChange={(event) => props.setProfile(event.target.value)}><option value="passive">Passive only</option><option value="balanced">Balanced</option><option value="deep">Deep review</option></select></label><button className="primary-action large" disabled={props.planning || !props.goal.trim() || !props.scope.trim()}><b>✦</b>{props.planning ? "Building plan…" : "Build safe plan"}</button></div>{props.planError && <p className="form-error">{props.planError}</p>}</form></section>
    <section className="metric-grid"><Metric label="Monitored assets" value="1,284" change="+38 this week" tone="cyan" glyph="◉" /><Metric label="Active missions" value="03" change="1 needs review" tone="lime" glyph="⌁" /><Metric label="Open findings" value="06" change="1 high priority" tone="orange" glyph="◇" /><Metric label="Security posture" value={`${props.riskScore}/100`} change="Improving · +4" tone="violet" glyph="↗" /></section>
    <section className="dashboard-grid"><div className="panel operations-panel"><PanelTitle kicker="Automation status" title="Live operations" action="View all" onAction={() => props.onView("missions")} /><MissionTable compact /></div><div className="panel findings-panel"><PanelTitle kicker="Human review queue" title="Priority findings" action="Triage all" onAction={() => props.onView("findings")} /><FindingList compact /></div></section>
  </div>;
}

function Planner(props: PlannerProps & { plan: MissionPlan; aiStatus: AiStatus }) {
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Plan before execution</span><h2>AI mission planner</h2><p>Turn a plain-language security goal into a transparent, reviewable workflow.</p></div><span className="model-detail">{props.aiStatus.model}</span></section><div className="planner-layout">
    <section className="planner-card full-planner"><div className="planner-head"><div className="spark-mark">✦</div><div><span>Mission brief</span><h3>Describe your authorized objective</h3></div></div><form onSubmit={(event) => void props.buildPlan(event)}><label className="field-label">Goal<textarea value={props.goal} onChange={(event) => props.setGoal(event.target.value)} maxLength={1200} /></label><div className="form-row"><label className="field-label">Authorized scope<input value={props.scope} onChange={(event) => props.setScope(event.target.value)} /></label><label className="field-label">Noise profile<select value={props.profile} onChange={(event) => props.setProfile(event.target.value)}><option value="passive">Passive only</option><option value="balanced">Balanced</option><option value="deep">Deep review</option></select></label></div><div className="approval-note"><span>✓</span><p><strong>Scope guard stays active</strong>The generated plan cannot launch until you confirm authorization and rate limits.</p></div>{props.planError && <p className="form-error">{props.planError}</p>}<button className="primary-action large" disabled={props.planning || !props.goal.trim() || !props.scope.trim()}><b>✦</b>{props.planning ? "Reasoning with Nemotron…" : "Generate mission plan"}</button></form></section>
    <section className="plan-output panel"><div className="plan-output-head"><div><span>Proposed workflow</span><h3>{props.plan.pipeline}</h3></div><span className="advisory-tag">Advisory</span></div><p className="plan-summary">{props.plan.summary}</p>{props.plan.steps.length > 0 ? <div className="plan-steps">{props.plan.steps.map((step, index) => <div key={`${step.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.title}</strong><small>{step.tool_group}</small><p>{step.reason}</p></div></div>)}</div> : <div className="empty-plan"><span>✦</span><strong>Your plan will appear here</strong><p>AiFix3r explains every stage before anything runs.</p></div>}{props.plan.steps.length > 0 && <div className="safety-gate"><span>!</span><p><strong>Safety gate</strong>{props.plan.safety_gate}</p></div>}</section>
  </div></div>;
}

function Missions() {
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Auditable automation</span><h2>Operations</h2><p>Every action is tied to a known tool, approved scope, timeout, and evidence record.</p></div><button className="primary-action"><b>+</b> New mission</button></section><section className="panel"><PanelTitle kicker="Current workspace" title="Mission history" /><MissionTable /></section></div>;
}

function Findings({ onAskAi }: { onAskAi: (finding: typeof findings[number]) => void }) {
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Evidence before claims</span><h2>Findings</h2><p>Scanner observations stay in a human validation queue until impact and program policy are confirmed.</p></div></section><div className="finding-cards">{findings.map((finding) => <article key={finding.title} className="finding-card"><div className={`severity-bar ${finding.severity}`} /><div className="finding-main"><div><span className={`severity ${finding.severity}`}>{finding.severity}</span><small>{finding.source} · AI confidence {finding.confidence}%</small></div><h3>{finding.title}</h3><code>{finding.asset}</code><p>Automated signal only. Reproduce the behavior safely and confirm material impact before reporting.</p></div><div className="finding-actions"><button onClick={() => onAskAi(finding)}>✦ Ask AiFix3r</button><button>Open evidence</button><select defaultValue="new" aria-label={`Status for ${finding.title}`}><option value="new">New</option><option value="triage">In triage</option><option value="validated">Validated</option><option value="false_positive">False positive</option></select></div></article>)}</div></div>;
}

function Integrations(props: { aiStatus: AiStatus; repositoryInput: string; setRepositoryInput: (value: string) => void; repository?: GithubRepository; repoBusy: boolean; repoError: string; connectRepository: (event: FormEvent) => Promise<void> }) {
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Server-side connections</span><h2>Integrations</h2><p>Credentials stay on the server. The browser receives connection status and normalized results—never tokens.</p></div></section><div className="integration-grid">
    <article className="integration-card featured"><div className="integration-logo nvidia">NV</div><div className="integration-copy"><span>AI provider</span><h3>NVIDIA Nemotron 3 Ultra</h3><p>Builds scope-safe mission plans and structures finding triage for human review.</p><code>{props.aiStatus.model}</code></div><span className={`connection-state ${props.aiStatus.configured ? "connected" : "needs-key"}`}><i />{props.aiStatus.configured ? "Connected" : "Add server key"}</span><div className="integration-foot"><span>Data policy: {label(props.aiStatus.evidence_policy)}</span><small>Set NVIDIA_API_KEY in hosted secrets</small></div></article>
    <article className="integration-card"><div className="integration-logo github">GH</div><div className="integration-copy"><span>Source control</span><h3>GitHub repository</h3><p>Read repository metadata and workflow health without exposing a GitHub token to the client.</p></div><form className="repo-form" onSubmit={(event) => void props.connectRepository(event)}><label>Owner/repository<input value={props.repositoryInput} onChange={(event) => props.setRepositoryInput(event.target.value)} placeholder="owner/repository" /></label><button disabled={props.repoBusy}>{props.repoBusy ? "Connecting…" : "Connect repository"}</button></form>{props.repoError && <p className="integration-error">{props.repoError}</p>}{props.repository && <div className="repo-result"><div><span className={props.repository.private ? "private" : "public"}>{props.repository.private ? "Private" : "Public"}</span><strong>{props.repository.full_name}</strong><p>{props.repository.description || "No repository description."}</p></div><a href={props.repository.html_url} target="_blank" rel="noreferrer">Open ↗</a></div>}</article>
    <article className="integration-card muted-card"><div className="integration-logo notify">NT</div><div className="integration-copy"><span>Notifications</span><h3>Secure webhook</h3><p>Route mission completion and high-priority review alerts to an approved internal channel.</p></div><span className="connection-state disabled"><i />Coming next</span></article>
  </div><section className="security-callout"><span>✓</span><div><strong>Secret-safe by design</strong><p>Never paste API keys into the dashboard, Git commits, issues, or chat. Configure rotated credentials only through server environment secrets.</p></div></section></div>;
}

function Metric({ label: itemLabel, value, change, tone, glyph }: { label: string; value: string; change: string; tone: string; glyph: string }) {
  return <article className={`metric-card ${tone}`}><div className="metric-glyph">{glyph}</div><div><span>{itemLabel}</span><strong>{value}</strong><small>{change}</small></div></article>;
}
function PanelTitle({ kicker, title, action, onAction }: { kicker: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="panel-title"><div><span>{kicker}</span><h3>{title}</h3></div>{action && <button onClick={onAction}>{action} →</button>}</div>;
}
function MissionTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? missions.slice(0, 3) : [...missions, { target: "auth.example.com", profile: "Identity review", progress: 45, status: "paused", findings: 1 }];
  return <div className="table-scroll"><table><thead><tr><th>Target</th><th>Profile</th><th>Progress</th><th>Status</th><th>Signals</th></tr></thead><tbody>{rows.map((mission) => <tr key={`${mission.target}-${mission.profile}`}><td><span className="target-cell"><i />{mission.target}</span></td><td>{mission.profile}</td><td><span className="progress"><i style={{ width: `${mission.progress}%` }} /></span><small>{mission.progress}%</small></td><td><span className={`status ${mission.status}`}>{mission.status}</span></td><td><strong>{mission.findings}</strong></td></tr>)}</tbody></table></div>;
}
function FindingList({ compact = false }: { compact?: boolean }) {
  const rows = compact ? findings.slice(0, 3) : findings;
  return <div className="finding-list">{rows.map((finding) => <div key={finding.title}><span className={`finding-dot ${finding.severity}`} /><div><strong>{finding.title}</strong><small>{finding.asset}</small></div><span className={`severity ${finding.severity}`}>{finding.severity}</span></div>)}</div>;
}

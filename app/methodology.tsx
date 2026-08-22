"use client";

import { useState } from "react";
import styles from "./methodology.module.css";

const phases = [
  { n: "01", title: "Authorization & scope", mode: "Gate", summary: "Import program rules, allowed roots, exclusions, rate limits and evidence policy before any action.", outputs: ["Scope manifest", "Exclusion list", "Approval record"] },
  { n: "02", title: "Passive attack surface", mode: "Passive", summary: "Correlate certificate, DNS, archive and public-code sources to build an owned asset inventory.", outputs: ["Root domains", "Subdomains", "Acquisition clues"] },
  { n: "03", title: "DNS & ownership", mode: "Bounded", summary: "Resolve, deduplicate and classify assets while separating CDN, SaaS and third-party infrastructure.", outputs: ["Resolved hosts", "Cloud/CDN map", "Ownership confidence"] },
  { n: "04", title: "Live service mapping", mode: "Approval", summary: "Apply program-safe HTTP and port visibility checks with strict concurrency and timeout controls.", outputs: ["Live services", "Technology map", "Interesting surfaces"] },
  { n: "05", title: "Content, JS & APIs", mode: "Review", summary: "Collect historical paths, crawl shallowly, inventory JavaScript, parameters and documented API schemas.", outputs: ["URL corpus", "JS/API inventory", "Parameter queues"] },
  { n: "06", title: "Change & exposure review", mode: "Passive", summary: "Prioritize new assets, public secrets, forgotten endpoints and configuration drift for human analysis.", outputs: ["Change set", "Exposure signals", "Priority shortlist"] },
  { n: "07", title: "Hypothesis validation", mode: "Manual", summary: "Test one evidence-backed hypothesis at a time using the program's permitted techniques and limits.", outputs: ["Reproduction notes", "Impact evidence", "False-positive decisions"] },
  { n: "08", title: "Report & learn", mode: "Human", summary: "Create a concise report with impact, steps, evidence and remediation; convert lessons into reusable playbooks.", outputs: ["Submission draft", "Remediation notes", "Knowledge update"] },
];

const tracks = [
  { name: "Web Recon Specialist", lessons: "18 playbooks", focus: "Discovery, DNS, URLs and JavaScript", tier: "Community" },
  { name: "Vulnerability Hunter", lessons: "24 playbooks", focus: "XSS, SSRF, SQLi, access control and APIs", tier: "Hunter Pro" },
  { name: "AI-Assisted Operator", lessons: "12 labs", focus: "Nemotron planning, triage and reporting", tier: "Ultra" },
  { name: "Business AppSec", lessons: "10 controls", focus: "Asset monitoring, evidence and team workflow", tier: "Teams" },
];

const packages = [
  { name: "Community", price: "Free", detail: "Public methodology, tool catalogue and safe checklists.", items: ["Core learning track", "Passive recon builder", "Community playbooks"] },
  { name: "Hunter Pro", price: "₹999/mo", detail: "Structured workflows for serious independent researchers.", items: ["All methodology tracks", "AI mission planning", "Report builder"], featured: true },
  { name: "Teams", price: "Custom", detail: "A governed workspace for authorized security teams.", items: ["Shared projects", "Approval and audit trail", "Private playbooks"] },
];

export default function Methodology() {
  const [active, setActive] = useState(0);
  const phase = phases[active];

  return <div className="page-stack">
    <section className={styles.hero}>
      <div>
        <span className="eyebrow">AIFIX3R FIELD SYSTEM</span>
        <h2>From recon to evidence—not scanner noise.</h2>
        <p>An original, business-ready methodology informed by the public CoffinXP/LostSec Recon-to-Master approach and rebuilt around authorization, repeatability, human validation and AI-assisted learning.</p>
        <div className={styles.heroActions}><button className="primary-action" onClick={() => setActive(0)}>Start methodology</button><a href="https://github.com/coffinxp/coffinxp" target="_blank" rel="noreferrer">Reference profile ↗</a></div>
      </div>
      <div className={styles.score}><strong>08</strong><span>controlled<br/>phases</span><small>Scope gate always on</small></div>
    </section>

    <section className={styles.methodGrid}>
      <div className={styles.rail} aria-label="Methodology phases">
        {phases.map((item, index) => <button key={item.n} className={index === active ? styles.active : ""} onClick={() => setActive(index)}>
          <span>{item.n}</span><div><strong>{item.title}</strong><small>{item.mode}</small></div>
        </button>)}
      </div>
      <article className={styles.phaseCard}>
        <div className={styles.phaseHead}><span>PHASE {phase.n}</span><em>{phase.mode}</em></div>
        <h3>{phase.title}</h3><p>{phase.summary}</p>
        <div className={styles.outputs}><span>Required outputs</span>{phase.outputs.map((output) => <div key={output}><i>✓</i>{output}</div>)}</div>
        <div className={styles.controls}><strong>Operator control</strong><p>No workflow widens scope automatically. Direct testing stages require confirmed authorization and program-safe limits.</p></div>
        <div className={styles.pager}><button disabled={active === 0} onClick={() => setActive((value) => value - 1)}>← Previous</button><span>{active + 1} / {phases.length}</span><button disabled={active === phases.length - 1} onClick={() => setActive((value) => value + 1)}>Next →</button></div>
      </article>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>LEARNING BUSINESS</span><h3>Choose a career outcome, not random tools</h3></div><p>Each track connects lessons, labs, checklists and evidence standards to an operator skill.</p></div>
      <div className={styles.trackGrid}>{tracks.map((track) => <article key={track.name}><span>{track.tier}</span><h4>{track.name}</h4><p>{track.focus}</p><small>{track.lessons}</small><button>View curriculum →</button></article>)}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>PACKAGES</span><h3>A practical path from learner to security team</h3></div><p>Pricing is a draft business model and should be connected to billing only after legal, tax and support policies are ready.</p></div>
      <div className={styles.packageGrid}>{packages.map((plan) => <article key={plan.name} className={plan.featured ? styles.featured : ""}><span>{plan.featured ? "MOST USEFUL" : "AIFIX3R"}</span><h4>{plan.name}</h4><strong>{plan.price}</strong><p>{plan.detail}</p>{plan.items.map((item) => <div key={item}>✓ {item}</div>)}<button>{plan.price === "Custom" ? "Contact sales" : "Select plan"}</button></article>)}</div>
    </section>

    <section className={styles.credit}><strong>Source respect</strong><p>This module summarizes high-level concepts from publicly described CoffinXP/LostSec methodology. It does not reproduce their article, site design, paid content or wording. AIFix3r's workflows, safety controls and commercial structure are original.</p></section>
  </div>;
}

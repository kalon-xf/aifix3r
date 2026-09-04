"use client";
import { useState } from "react";
import styles from "./securityops.module.css";
type Mode="recon"|"poc"|"report"|"fix";
type Result={mode:Mode;title:string;content:string;risk:string;warnings:string[]};
const MODES:[Mode,string,string][]=[
 ["recon","--recon","Rank raw recon and testing vectors"],
 ["poc","--poc","Create a minimal non-destructive PoC"],
 ["report","--report","Draft a professional bounty report"],
 ["fix","--fix","Generate a secure unified diff"],
];
export default function SecurityOps(){
 const [mode,setMode]=useState<Mode>("recon"),[scope,setScope]=useState("example.com"),[program,setProgram]=useState("Authorized bug-bounty program"),[artifact,setArtifact]=useState(""),[authorized,setAuthorized]=useState(false),[result,setResult]=useState<Result>(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function run(){setBusy(true);setError("");setResult(undefined);try{const r=await fetch("/api/securityops",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,scope,program,artifact,authorized})});const p=await r.json() as {result?:Result;error?:string};if(!r.ok||!p.result)throw new Error(p.error||"Request failed.");setResult(p.result)}catch(e){setError(e instanceof Error?e.message:"Request failed.")}finally{setBusy(false)}}
 return <div className="page-stack"><section className={styles.hero}><div><span className="eyebrow">SECURITYOPS-AI</span><h2>Evidence in. Safe action out.</h2><p>Filter recon, validate observations, create reports and patch vulnerable code inside one authorized workspace.</p></div><strong>Scope locked · Non-destructive</strong></section>
 <section className={styles.modes}>{MODES.map(([id,flag,help])=><button key={id} className={mode===id?styles.active:""} onClick={()=>{setMode(id);setResult(undefined)}}><code>{flag}</code><strong>{help}</strong></button>)}</section>
 <section className={styles.grid}><article><div className={styles.fields}><label>Program<input value={program} onChange={e=>setProgram(e.target.value)}/></label><label>Exact authorized scope<input value={scope} onChange={e=>setScope(e.target.value)}/></label></div><label>Sanitized evidence<textarea value={artifact} onChange={e=>setArtifact(e.target.value)} placeholder="Paste recon, HTTP evidence, scanner observation, report evidence, or vulnerable code…"/></label><label className={styles.auth}><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/><span><strong>I confirm written authorization</strong>I will manually review the output and remain inside program scope.</span></label>{error&&<p className={styles.error}>{error}</p>}<button className="primary-action large" disabled={busy||!authorized||artifact.trim().length<10} onClick={()=>void run()}>{busy?"Analyzing safely…":`Run --${mode}`}</button></article>
 <article className={styles.output}><h3>{result?.title||"Review output"}</h3>{result?<><div>{result.warnings.map(w=><span key={w}>! {w}</span>)}</div><pre>{result.content}</pre><button onClick={()=>void navigator.clipboard.writeText(result.content)}>Copy output</button></>:<p>Choose a mode, declare scope, confirm authorization and provide sanitized evidence.</p>}</article></section></div>
}

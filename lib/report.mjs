/**
 * @param {'hackerone'|'bugcrowd'} platform
 * @param {{id:string,title:string,vulnerability_class:string,severity:string,summary:string,impact:string|null,remediation:string|null}} finding
 * @param {Array<{kind:string,content:string}>} evidence
 */
export function buildBountyReport(platform, finding, evidence) {
  const proof = evidence.map((item, index) => `### Evidence ${index + 1}: ${item.kind}\n\n\`\`\`text\n${item.content}\n\`\`\``).join("\n\n");
  const common = `# ${finding.title}\n\n**Vulnerability class:** ${finding.vulnerability_class}\n**Severity:** ${finding.severity}\n**Aifix3r finding:** ${finding.id}\n\n## Summary\n\n${finding.summary}\n\n## Steps to reproduce\n\n1. Use an authorized test account and in-scope asset.\n2. Reproduce the validated behavior using the minimum required requests.\n3. Observe the demonstrated security impact described below.\n\n## Evidence\n\n${proof || "Add sanitized request and response evidence before submission."}\n\n## Impact\n\n${finding.impact || "Document the demonstrated impact before submission."}\n\n## Remediation\n\n${finding.remediation || "Apply server-side authorization and input validation appropriate to the affected component."}`;
  return platform === "hackerone" ? `${common}\n\n## Supporting material\n\nAttach only sanitized artifacts required to reproduce the issue.` : `${common}\n\n## Proof of concept\n\nThe evidence above was collected using non-destructive validation within the program rules.`;
}

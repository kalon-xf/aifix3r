# Security policy

## Supported version

AiFix3r is currently pre-1.0. Security fixes are applied to the latest version on the default branch.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability or exposed secret. Use a private GitHub security advisory after the repository is published, or contact the repository owner through a private verified channel.

Include the affected component, reproducible steps, impact, and a minimal proof of concept. Do not access data belonging to other people, disrupt service, or expand testing beyond what is necessary to demonstrate the issue.

## Secret handling

- Store `NVIDIA_API_KEY` and `GITHUB_TOKEN` in server environment secrets only.
- Never use a `NEXT_PUBLIC_` prefix for credentials.
- Rotate any credential pasted into chat, logs, issues, screenshots, or Git history.
- Prefer fine-grained, read-only GitHub access scoped to the minimum repositories.
- Never return provider tokens or raw provider error bodies to the browser.

## Product safety boundary

AiFix3r supports defensive planning, inventory, bounded checks, and human-reviewed triage for explicitly authorized systems. It does not authorize testing and must not be used for exploitation, credential attacks, persistence, evasion, destructive actions, denial-of-service, or scope expansion.

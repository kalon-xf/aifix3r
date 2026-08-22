# Contributing to AiFix3r

AiFix3r welcomes improvements that strengthen defensive planning, operator clarity, evidence handling, and safe automation.

## Before opening a pull request

1. Open an issue describing the problem and the intended safety boundary.
2. Keep credentials, real target data, and private program details out of fixtures and screenshots.
3. Add or update tests for behavior changes.
4. Run `npm run lint` and `npm test`.
5. Document any new environment variable or external permission.

## Adapter requirements

Future scanner adapters must enforce an explicit allowlist, exclusion rules, request and concurrency limits, bounded timeouts, cancellation, normalized evidence, and an auditable human approval step. Adapters must not silently broaden scope or promote an automated signal to a confirmed vulnerability.

Do not submit features for credential attacks, persistence, evasion, destructive testing, denial-of-service, or unapproved exploitation.

## Security reports

Follow [SECURITY.md](SECURITY.md). Never disclose a suspected security issue or exposed credential in a public issue.

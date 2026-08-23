# SecurityOps AI Pipeline Examples

Use these workflows only for assets covered by explicit written authorization. Sanitize cookies, authorization headers, API keys, personal data, and proprietary source before submitting evidence.

## 1. Recon to prioritized targets

**Mode:** `--recon`

```text
https://api.target.example/v1/user/profile [200 OK] [JSON]
https://admin.target.example/login [200 OK]
https://target.example/assets/main.js [200 OK]
```

Expected output:

- High: authentication, administration, APIs and upload surfaces
- Medium: JavaScript, redirects, callbacks, staging and account functionality
- Low: general static or informational assets
- Suggested testing vectors and a manual-review requirement

The hostname `target.example` is intentionally non-routable example data. Replace it only with an authorized scope.

## 2. Safe PoC preparation

**Mode:** `--poc`

```http
GET /api/v1/orders?user_id=TEST_ACCOUNT_A HTTP/1.1
Host: api.target.example
Authorization: Bearer [REDACTED]
```

Observation:

```text
Changing the identifier from researcher-controlled Account A to researcher-controlled
Account B returned Account B's order details while authenticated as Account A.
```

Use two accounts you own or that the program supplied. Record the minimum evidence needed to demonstrate broken object-level authorization. Do not enumerate identifiers, access unrelated users, retain personal data, or perform bulk extraction.

## 3. Bug report generation

**Mode:** `--report`

```text
Program: Target Corp
Authorized asset: api.target.example
Class: Broken Object Level Authorization / IDOR
Endpoint: /api/v1/orders
Demonstrated impact: Account A can read Account B's test order using two researcher-controlled accounts.
Evidence: Sanitized request and response pair attached.
```

SecurityOps produces a Markdown outline containing:

1. Clear title and applicable CWE
2. Summary and vulnerability class
3. Exact reproduction steps
4. Sanitized HTTP evidence
5. Demonstrated—not speculative—business impact
6. Suggested remediation

## 4. Code remediation

**Mode:** `--fix`

Vulnerability: SQL injection through the `username` parameter.

```python
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    query = f"SELECT * FROM users WHERE username = '{username}'"
    db.execute(query)
```

Expected secure pattern:

```diff
- query = f"SELECT * FROM users WHERE username = '{username}'"
- db.execute(query)
+ query = "SELECT * FROM users WHERE username = ?"
+ db.execute(query, (username,))
```

The exact placeholder syntax depends on the database driver. A complete patch must also add a regression test and avoid returning distinguishable login responses that enable account enumeration.

## Future integration: Nuclei JSON to report drafts

A future local CLI may:

1. Read Nuclei JSONL from disk.
2. Discard low-confidence or informational observations.
3. Redact secrets and personal data.
4. Require an exact allowlisted scope match.
5. Create a draft—not a submitted report.
6. Require manual reproduction and impact confirmation.

Raw findings must not be uploaded to an external AI provider without explicit operator consent for that specific destination and dataset.

## Future integration: pull-request patch suggestions

A future GitHub workflow may:

1. Run reviewed SAST rules on pull requests.
2. open a draft security-fix branch or review comment;
3. generate a proposed unified diff;
4. run unit, security and regression tests;
5. require CODEOWNER approval.

It must never automatically merge an AI-generated security patch or expose repository secrets, proprietary code, or vulnerability evidence to an unapproved external model.

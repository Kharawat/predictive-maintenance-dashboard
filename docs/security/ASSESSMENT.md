# Security assessment before changes

Date: 2026-10-03. Baseline: 0836093. Source/configuration, all fetched refs and offline fixtures reviewed. No production mutation or network exploit testing.

## Threat model

CSV selected by user -> in-browser parser -> numeric health model -> escaped DOM/canvas -> CSV download. Assets: local sensor data, report integrity and browser availability. No upload to a server, Python engine, API/auth/database or LLM tools in this public copy.

## Findings

| ID | Severity | Evidence and impact | Remediation |
|---|---|---|---|
| PM-01 | Medium | Machine ID is HTML-escaped correctly but exported as a spreadsheet formula when it begins with =,+,-,@. An attacker can supply a CSV that becomes an active spreadsheet formula on export. | Neutralize dangerous string cells before CSV quoting; regression with malicious machine IDs. |
| PM-02 | Low | File.text and CSV parsing have no size/row bound; large imports block UI or exhaust spread-call limits. | Reject oversized files before reading; bound actual CSV length and row count; keep prior dataset on rejection. |
| PM-03 | Low | No static security policy or CI. | CSP, referrer policy, offline tests and history secret scanning. |

No Critical or High finding confirmed within this repository scope. Gitleaks 8.30.1 redacted full fetched-history scan found no secret. No package manifest/lockfile or third-party executable JS dependencies are present. SQL/command injection, server CSRF/SSRF, container security, database grants, cloud IAM and production encryption are not assessable where those components are absent. Browser storage is neither encrypted nor an authorization boundary. Deployment headers, domain isolation and backend controls require owner verification. No existing automated test/build command was provided; browser scripts can be syntax checked and focused offline regressions added.

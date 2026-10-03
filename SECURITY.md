# Security

## Architecture and boundaries
Public browser-only CSV analysis; data stays in browser memory and report downloads. This copy contains no Python analysis engine, server, authentication, upload endpoint, cloud credentials or model tools. Treat imported files and machine identifiers as untrusted. Do not use demo scores to automate physical machine control or safety decisions.

Inputs are capped at 5 MiB and 20,000 data rows before rendering; oversized files are rejected before reading and failed imports retain the current dataset. Numeric fields must be finite/present. Machine identifiers are HTML-encoded, and exported text cells with spreadsheet formula prefixes are neutralized before quoting. No raw file content is logged or transmitted by this implementation.

Static CSP denies third-party executable code and object/base/form destinations, with inline style needed for charts. Meta CSP cannot set frame-ancestors; HTTPS and response headers must be supplied by hosting. Downloaded reports are unencrypted local files; handle industrial data under your own retention/access policy. Cloud/backends excluded from this repository remain unaudited. Verify with node --test tests/security.test.mjs.

## Reporting and maintenance
Use GitHub private vulnerability reporting if enabled for this repository, or an already established private maintainer contact. If neither is available, open an issue asking for a private contact without publishing exploit details, customer data or credentials. Never paste a secret into an issue or pull request. Potential historical credentials must be treated as compromised, rotated by the owner and audited before any history rewrite; no rotation or rewrite is automatic.

See [pre-change assessment](docs/security/ASSESSMENT.md) and [verification/review](docs/security/VERIFICATION.md). Source review and offline tests are not production certification. The prepared security workflow (not yet active; see VERIFICATION.md) is read-only, pinned by commit, uses no production credentials and never deploys. Keep action pins and scanners current through reviewed maintenance PRs.

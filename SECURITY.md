# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting for the repository. Include affected version, a minimal reproduction, impact, and any suggested mitigation.

## Supported versions

Until 1.0, only the latest tagged release receives security fixes.

## Data and model safety

- Network connectors treat every response as untrusted input.
- Acquisition uses HTTPS, bounded redirects, bounded response sizes, deadlines, atomic writes, and content hashes.
- Archives are rejected for path traversal, excessive expansion, nested-budget violations, or unexpected files.
- HTML responses use a fresh nonce for scripts and do not permit `unsafe-inline` script execution. Inline styles remain allowed for current framework compatibility and are not an authorization for inline script.
- Secrets and proprietary datasets must not be committed.
- Text-extracted and model-inferred relationships are never promoted to observed evidence without an explicit review record.
- CascadeLens is not an investment, legal, sanctions-compliance, clinical, or emergency-response decision system.

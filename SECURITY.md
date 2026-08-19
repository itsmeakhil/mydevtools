# Security Policy

MyDevTools handles things developers care about: database credentials, API keys,
tokens and password vault entries. Security reports are taken seriously, and
responsible disclosure is appreciated.

## Reporting a vulnerability

**Please do not open a public issue for a security vulnerability.**

Report it privately through GitHub Security Advisories:

**→ [Report a vulnerability](https://github.com/mydevtools-tech/mydevtools/security/advisories/new)**

That channel is private between you and the maintainers, and lets us work on a
fix and coordinate disclosure before details become public.

### What to include

- What kind of issue it is (for example: key handling, injection, path
  traversal, weak crypto, insecure IPC)
- Which part of the app is affected — a tool name, or a file and line
- Steps to reproduce, ideally with a minimal proof of concept
- The app version (Settings → About) and your OS
- What an attacker could achieve with it

Please use dummy credentials in your report. Do not include real secrets.

### What to expect

| Stage | Target |
|---|---|
| Acknowledgement of your report | Within 5 days |
| Initial assessment and severity | Within 10 days |
| Fix or mitigation plan | Depends on severity and complexity — you will be kept updated |

MyDevTools is maintained by volunteers, so these are good-faith targets rather
than a contractual SLA. If you have not heard back within the acknowledgement
window, please ping the advisory thread.

We do not currently run a paid bug bounty. Reporters are credited in the
advisory and the release notes unless they prefer to stay anonymous.

## Supported versions

Fixes land in the latest release. Only the most recent version is supported —
please reproduce on the
[latest release](https://github.com/mydevtools-tech/mydevtools/releases/latest)
before reporting.

## Scope

### In scope

- The desktop application (`apps/desktop`, `apps/desktop-ui`)
- Local data storage: SQLCipher database, keychain usage, the credential vault
- Cryptographic tool implementations (encryption playground, hashing, HMAC,
  TOTP, key generation)
- Handling of credentials for the SQL, MongoDB, Redis and S3 clients
- The API client's request handling and secret storage
- The marketing website (`apps/web`) and its build output

### Out of scope

- Vulnerabilities in **your** database, API or infrastructure that MyDevTools
  merely connects to at your instruction
- Attacks that require an already-compromised machine or an attacker with local
  OS-level access to the user account running the app — the local database is
  encrypted with a key held in the OS keychain, which is available to that user
  by design
- Missing hardening that has no demonstrated impact (for example, a header
  scanner report without an exploitation path)
- Social engineering, physical attacks and denial of service against public
  websites
- Reports produced solely by an automated scanner with no verified impact

## Security design, in brief

- **No MyDevTools backend.** There is no account system, no sync service and no
  server holding user data. That removes an entire class of exposure — there is
  no central store to breach.
- **Local storage is encrypted.** App data lives in a SQLCipher database keyed
  from the OS keychain (Keychain on macOS).
- **Credentials get a second layer.** Database passwords, API keys and password
  manager entries are encrypted with a master key derived from a password only
  the user knows. A locked vault is unreadable, including to the rest of the app.
- **Outbound connections are user-initiated.** The app itself needs no network.
  Traffic happens where a tool exists to make it: the API client, database
  clients, DNS/WHOIS lookups, and the updater's check against GitHub releases.
- **Telemetry is opt-in and anonymous.** Off unless the user enables it. When
  enabled it sends two events with a rotating session id, app version and locale
  — no device id, no paths, nothing typed into a tool. See
  [`apps/desktop-ui/src/lib/telemetry.ts`](apps/desktop-ui/src/lib/telemetry.ts).
- **Automated scanning.** Every push is scanned in CI
  (`.github/workflows/threatcrush-scan.yml`) with results uploaded as SARIF.
- **Auditable.** The app is AGPL-3.0 and the whole source is in this repository.
  Verify the claims above rather than taking them on faith.

## Hardening tips for users

- Set a strong, unique master password for the vault. It is not recoverable —
  that is the point, and it means a forgotten password means lost vault data.
- Keep the app updated; fixes ship in the latest release.
- Download only from the
  [official releases page](https://github.com/mydevtools-tech/mydevtools/releases/latest)
  or [mydevtools.tech](https://mydevtools.tech). macOS builds are signed and
  notarized by Apple — a build that fails Gatekeeper did not come from us.
- Use read-only or least-privilege database credentials where you can.

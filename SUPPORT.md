# Support

Need help with MyDevTools? Here is where to go.

## Where to ask

| I want to… | Go to |
|---|---|
| Report something broken | [Open a bug report](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| Suggest a tool or improvement | [Open a feature request](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| Ask a question or get unstuck | [GitHub Discussions](https://github.com/mydevtools-tech/mydevtools/discussions) |
| Report a security vulnerability | [SECURITY.md](SECURITY.md) — **never** a public issue |
| Read the docs | [mydevtools.tech/help](https://mydevtools.tech/help) · [Tool pages](https://mydevtools.tech/tools) · [Architecture](docs/ARCHITECTURE.md) |
| Contribute code | [CONTRIBUTING.md](CONTRIBUTING.md) |
| See what is planned | [ROADMAP.md](ROADMAP.md) |
| See what changed | [Releases](https://github.com/mydevtools-tech/mydevtools/releases) · [Changelog](https://mydevtools.tech/changelog) |

MyDevTools is maintained by volunteers in their own time. Replies are usually
quick, but there is no guaranteed response time. A clear, reproducible report
gets answered fastest.

## Before you ask

A few minutes here often solves it outright:

1. **Update to the [latest release](https://github.com/mydevtools-tech/mydevtools/releases/latest)** — the bug may already be fixed.
2. **Search [existing issues](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue)** — including closed ones.
3. **Check [Discussions](https://github.com/mydevtools-tech/mydevtools/discussions)** for the same question.

## What to include in a report

- Your OS and version (for example: macOS 15.2, Apple Silicon)
- The MyDevTools version — Settings → About
- Which tool you were using
- What you did, what you expected, what happened instead
- A screenshot or short clip for anything visual

**Redact your secrets.** Do not paste real tokens, passwords or production
connection strings into a public issue. Reproduce with dummy data, or use
`example.com` hosts.

## Common questions

**Do I need an account?**
No. MyDevTools has no accounts — no sign-up, no sign-in, no activation, no
license key.

**Does it work offline?**
Yes. The app itself needs no network. Tools that exist to reach something — the
API client, database clients, DNS/WHOIS — connect to the destination you point
them at, and the updater checks GitHub for new releases.

**Do the tools run on the website?**
No. mydevtools.tech documents the tools and hosts the download. The tools run in
the desktop app on your machine.

**Where is my data stored?**
In a local SQLCipher database on your device, encrypted with a key from your OS
keychain. Credentials and vault entries get a second layer of encryption using
your master password. Nothing is uploaded — there is no MyDevTools server.

**I forgot my vault master password. Can it be recovered?**
No. The vault key is derived from your password and never leaves your device, so
there is no reset path. That is what makes the vault meaningful.

**Which platforms are supported?**
Published builds are macOS only today (universal — Apple Silicon and Intel,
signed and notarized). Windows and Linux builds are not published yet; the Tauri
shell can be built from source on those platforms, but is untested.

**Is it really free?**
Yes — every tool and every feature, no paid tier and no limits. It is open source
under the [GNU AGPL v3](LICENSE).

## Helping others

Answering someone else's question in
[Discussions](https://github.com/mydevtools-tech/mydevtools/discussions) is a
real contribution. So is confirming a bug you can reproduce, or adding the
detail that a report is missing.

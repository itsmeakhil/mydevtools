# @mydevtools/api-runner

Headless runner for [mydevtools](https://mydevtools.tech) API client collections — Postman / Newman compatible.

Same scripts, same `pm.*` API, same JUnit output as the web runner.

## Install

```bash
npm i -g @mydevtools/api-runner
```

## Run

```bash
mydevtools-api run my-collection.json
mydevtools-api run my-collection.json --env prod.env.json --data users.csv
mydevtools-api run my-collection.json --reporter junit --reporter-out report.xml --bail
```

## Flags

| Flag | Description |
|---|---|
| `--data <file>` | CSV or JSON-array data file. One iteration per row; row keys override `{{vars}}`. |
| `--env <file>` | Postman Environment v2 export. Enabled values become the base `{{var}}` map. |
| `--iterations <N>` | Iterations when no data file is given. Default 1. |
| `--reporter <name>` | `cli` (default) or `junit`. |
| `--reporter-out <path>` | Required for `--reporter junit`. |
| `--bail` | Stop on the first failing assertion / network error. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All tests passed |
| 1 | Some tests / requests failed |
| 2 | Usage error |

## Differences vs the web runner (v0.1)

- No cookie jar (Node `fetch` has no jar) — provide auth via env vars.
- No OAuth refresh flow — pre-mint a bearer token and put it in env.
- No SSE / streaming (the web has `/api/proxy-stream`; the CLI does plain `await response.text()`).
- No GraphQL introspection.

Everything else — scripts, env mutations, `{{response.body.x}}` chaining,
folder inheritance, data-driven iterations, JUnit XML — matches the web runner
bit-for-bit.

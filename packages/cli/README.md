# @mydevtools/cli — `mdt`

Run MyDevTools API collections from a terminal or CI: the same runner,
variables, scripts and assertions as the desktop app's collection runner.

```sh
mdt run ./api --env local --reporter junit --output results.xml
```

Works on:
- **MyDevTools folder collections** — a folder with `collection.yaml` (the
  app's "Git-friendly folder" collections). Format: [COLLECTION-FORMAT.md](./COLLECTION-FORMAT.md).
- **Bruno / OpenCollection folders** — a folder with `bruno.json` or
  `opencollection.yml`, imported on the fly (its `environments/*.bru` are
  usable with `--env <name>`).

## Usage

```
mdt run <collection-dir> [options]

  --folder <path>        Run one folder: "Auth/Login" (names) or a folder id
  --env <name|file>      Environment file (.yaml/.json/.bru; Postman env JSON ok)
                         or a name in <collection-dir>/environments/
  --env-var <k=v>        Set/override a variable (repeatable)
  --data <file>          CSV or JSON rows; one iteration per row
  --reporter <name>      cli (default) | json | junit | html
  --output <file>        Write the report to a file (default: stdout)
  --bail                 Stop after the first failed request
  --delay <ms>           Pause between requests
  --timeout <ms>         Default request timeout (requests' own setting wins)
  --insecure             Don't verify TLS certificates
  --no-scripts           Don't run pre-request/test scripts (untrusted collections)
```

Exit codes: **0** everything passed · **1** a request failed (network error,
script error, failed test or assertion) · **2** usage or load error.

### Environments

`--env` takes a file or a name. Files may be:
- `{ variables: [{ key, value, enabled? }] }` (YAML or JSON),
- a Postman environment export (`{ values: [...] }`),
- a plain map (`baseUrl: https://api.test`),
- a Bruno `.bru` environment.

A bare name looks in `<collection-dir>/environments/<name>.{yaml,yml,json,bru}`
(and the Bruno folder's own environments). `--env-var` wins over the file.

Precedence when a request resolves `{{name}}` is the app's
(`lib/api-client/variables.ts`): `{{response.*}}` → data row → script changes
→ session → environment → collection variables → dynamic (`{{$guid}}`, …). `{{vault.*}}` / `{{env.*}}` secrets live in the desktop
app's encrypted vault and **do not resolve in the CLI** — pass those values
with `--env-var` from your CI secret store.

## Running from this repo

No build step: `register.mjs` lets Node run the desktop app's TypeScript
sources directly, using the `typescript` and `undici` packages desktop-ui
already installs. Node ≥ 22.15.

```sh
pnpm install                                   # once, for apps/desktop-ui
node packages/cli/bin/mdt.mjs run path/to/collection --env local
```

Tests: `cd packages/cli && node --import ./register.mjs --test "test/*.test.ts"`.

**Not published to npm yet** (`"private": true`). Publishing needs a bundle step
(e.g. esbuild) so the package carries the code it imports from
`apps/desktop-ui/src` instead of reaching outside its folder.

## Security

- **Scripts are code.** `mdt run` executes a collection's pre-request and test
  scripts. Each runs in a fresh `node:vm` context — JavaScript builtins plus
  `pm`, `bru`/`req`/`res`, `expect`, a `require()` that only serves `uuid` and
  `crypto-js`, and `btoa`/`atob`/timers/`URL`. There is no `process`, `fs`,
  `fetch` or real `require`; `pm.sendRequest` goes through the same proxy as
  normal requests. A script stuck in a loop is stopped after 5 s of script
  time (60 s overall) by terminating its worker thread.
- **`node:vm` is not a security boundary.** A hostile script can reach the
  host realm through the objects it is handed. Only run scripts you trust. For
  collections from pull requests or other untrusted sources, use
  **`--no-scripts`** — requests and declarative assertions still run.
- Requests to cloud metadata endpoints (`169.254.169.254`,
  `metadata.google.internal`, …) are refused, as in the desktop app. Unlike the
  app's web build, localhost and private addresses are allowed — it's your
  machine or your CI runner.
- `HTTP_PROXY`/`HTTPS_PROXY` are not applied.

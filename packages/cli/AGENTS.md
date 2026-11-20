# Agents: authoring MyDevTools collections

A folder with a `collection.yaml` is a MyDevTools API collection: one request
per `NNN-name.yaml` file, folders as directories. Before creating or editing
requests, read [COLLECTION-FORMAT.md](./COLLECTION-FORMAT.md) — every key,
body/auth type, assertion operator, variable rule and script API is there.

Rules of thumb:
- Never write secrets into the files. Use `{{variable}}` references and pass
  values with `mdt run --env-var key=value` (or an environment file kept out
  of git).
- The `NNN-` prefixes set the order (sorted numerically; gaps are fine). The
  app renumbers files when it saves.
- Prefer declarative `assertions` over `testScript` for status/body checks.
- Check your work: `mdt run <collection-dir> --env-var baseUrl=…` exits 0 when
  every request, test and assertion passes; use `--no-scripts` for
  collections you didn't write.

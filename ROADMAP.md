# Roadmap

Where MyDevTools is going, and roughly in what order.

This is a direction, not a delivery contract. Priorities move as issues come in,
and nothing here has a ship date. Items in **Now** are actively worked on; items
in **Next** are agreed direction; items in **Under consideration** are ideas that
have not been committed to.

Shipped work lives in the
[changelog](https://mydevtools.tech/changelog) and the
[releases](https://github.com/mydevtools-tech/mydevtools/releases).

Want to influence this list? Open a
[feature request](https://github.com/mydevtools-tech/mydevtools/issues/new/choose)
or join a [discussion](https://github.com/mydevtools-tech/mydevtools/discussions).
Requests that come with a concrete workflow ("here is what I do today and why it
is painful") tend to move up.

---

## The constraints

Every item on this roadmap has to hold these. They are not up for negotiation,
and a feature that cannot be built within them will not be built:

- **Offline first.** The app works with no network. No feature may make a
  network connection mandatory.
- **No accounts.** No sign-up, no sign-in, no activation, no license keys.
- **No MyDevTools backend.** Your data stays on your device.
- **Free and open source.** Every tool, every feature, AGPL-3.0. No paid tier,
  ever.

---

## Now

Current focus — stability and polish over new surface area.

- **Bug fixes and stability** across the shipped tools.
- **Performance**: faster cold start, snappier large-payload handling in the
  editors and result grids.
- **UX consistency**: tool headers, empty states, error messages and loading
  behaviour that match across all 80+ tools.
- **Documentation**: per-tool docs on the website, an accurate README, and the
  contributor guide you are reading the sibling of.
- **Accessibility**: keyboard navigation, focus states, labels and contrast
  across the app.
- **Translation quality** across the 27 shipped locales.

## Next

Agreed direction, not yet scheduled.

- **Windows and Linux builds.** The Tauri shell can already be built on both;
  what is missing is CI, signing and enough testing to publish them. This is the
  most-requested item.
- **More developer utilities**, driven by what people actually ask for in issues.
- **API client depth**: smoother collection workflows, better environment and
  secret handling, richer request/response inspection.
- **Git-friendly API collections**: collections stored as folders of plain YAML,
  so they can be committed, diffed and reviewed like the rest of a project.
- **Database workflow improvements**: better schema browsing, query history and
  result-grid ergonomics across the SQL, MongoDB and Redis clients.
- **Keyboard shortcuts**: broader coverage and a discoverable shortcut reference.
- **Workspace improvements**: switching, per-workspace settings, and keeping
  large workspaces fast.

## Under consideration

Ideas we like, with nothing committed. Feedback genuinely decides these.

- **Extensibility.** Some way to add a tool without forking the app. Any design
  here has to keep the security model intact — a plugin system that can read
  your vault is not a plugin system worth having.
- **More database and storage targets** beyond PostgreSQL, MySQL/MariaDB,
  SQLite, MongoDB, Redis and S3-compatible buckets.
- **Deeper security utilities**, building on the encryption playground, key
  generation and certificate tooling.
- **Local automation**: chaining tools together for repeated workflows, on-device.
- **A public tool API** so the desktop app's logic can be scripted locally.

## Not planned

Being clear about these saves everyone time:

- **Cloud sync and shared/team workspaces.** These were removed in 0.1.13 along
  with the account layer, and are not coming back in a form that requires an
  account or a server. Local workspaces stay.
- **A web version of the tools.** mydevtools.tech documents the app and hosts the
  download; the tools run on your machine. Running them in a browser tab would
  undo the reason the project exists.
- **Paid tiers, usage limits, or upsells.**
- **Ads or data harvesting.** There is no analytics in the app beyond the
  opt-in, anonymous, off-by-default usage events described in
  [SECURITY.md](SECURITY.md).

---

## Helping

The fastest way to move something up this list:

- **Open an issue** describing the problem, not just the fix you have in mind.
- **Pick up a [good first issue](https://github.com/mydevtools-tech/mydevtools/labels/good%20first%20issue)** — see [`docs/GOOD_FIRST_ISSUES.md`](docs/GOOD_FIRST_ISSUES.md) for scoped starter work.
- **Improve a translation** — 27 locales, and native speakers always beat a sync script.
- **Test on Windows or Linux** and report what breaks. That is the concrete work
  standing between those builds and a release.

See [CONTRIBUTING.md](CONTRIBUTING.md) to get set up.

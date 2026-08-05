export type ChangeType = 'added' | 'improved' | 'fixed' | 'removed'

export type ChangelogEntry = {
  /** Must match the "version" field in apps/desktop/src-tauri/tauri.conf.json for that release. */
  version: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** Short headline for the release, e.g. "Unified Data Explorer". */
  title?: string
  /** One or two sentences of context, shown under the headline. */
  summary?: string
  changes: Array<{ type: ChangeType; text: string }>
}

export const changeTypeLabels: Record<ChangeType, string> = {
  added: 'Added',
  improved: 'Improved',
  fixed: 'Fixed',
  removed: 'Removed',
}

/**
 * Newest release first — entries render in array order, so PREPEND each new release.
 * Deliberately not sorted in code: a string sort puts 0.1.10 before 0.1.9, and a semver
 * comparator is code nobody needs when the author controls the order.
 */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.9',
    date: '2026-07-24',
    title: 'Update progress, NoSQL depth, open source',
    summary:
      'MyDevTools went fully open source under AGPL-3.0. Updates now show live progress instead of applying invisibly, and the NoSQL explorer gained code generation and write-safety guards for hosted Mongo-wire databases.',
    changes: [
      { type: 'added', text: 'App-wide update progress modal with a corner pill, so downloads and installs are visible instead of silent.' },
      { type: 'added', text: 'Query code generator and schema export in the NoSQL explorer.' },
      { type: 'added', text: 'Email validator tool.' },
      { type: 'added', text: 'Write-safety guards for DocumentDB and Cosmos DB, which accept Mongo-wire commands but reject some of them.' },
      { type: 'improved', text: 'Update failures now show a translated title in all 27 in-app languages.' },
      { type: 'improved', text: 'Connection-string errors are worded for every Mongo-wire dialect, not just MongoDB.' },
      { type: 'fixed', text: 'Removed a meaningless percentage readout during the install phase of an update.' },
    ],
  },
  {
    version: '0.1.8',
    date: '2026-07-20',
    title: 'Interface polish',
    changes: [
      { type: 'improved', text: 'Layout, spacing, and contrast passes across the tool surfaces and the API client response panel.' },
      { type: 'fixed', text: 'Assorted visual glitches reported after the 0.1.6 interface revamp.' },
    ],
  },
  {
    version: '0.1.7',
    date: '2026-07-20',
    title: 'Interface polish',
    changes: [
      { type: 'improved', text: 'Follow-up refinements to the reworked navigation and workspace canvas.' },
    ],
  },
  {
    version: '0.1.6',
    date: '2026-07-18',
    title: 'Pro-instrument interface revamp',
    summary:
      'The biggest visual change since launch: a full-width workspace canvas, grouped top navigation, and a rebuilt landing page.',
    changes: [
      { type: 'added', text: 'Full-width workspace canvas with a grouped top navigation strip.' },
      { type: 'improved', text: 'Rebuilt landing page with an animated hero and clearer workspace framing.' },
      { type: 'improved', text: 'Unified the brand gradient to indigo across the app and the site.' },
    ],
  },
  {
    version: '0.1.5',
    date: '2026-07-17',
    title: 'Stability release',
    changes: [
      { type: 'fixed', text: 'Bookmark manager layout and interaction fixes.' },
      { type: 'fixed', text: 'Assorted interface fixes across tool pages.' },
    ],
  },
  {
    version: '0.1.4',
    date: '2026-07-17',
    title: 'Stability release',
    changes: [
      { type: 'fixed', text: 'Interface fixes across tool pages and the dashboard.' },
    ],
  },
  {
    version: '0.1.3',
    date: '2026-07-16',
    title: 'Silent auto-update',
    changes: [
      { type: 'improved', text: 'Updates download and apply in the background with no prompt — the first build where auto-update is fully hands-off.' },
    ],
  },
  {
    version: '0.1.2',
    date: '2026-07-16',
    title: 'Release tooling',
    changes: [
      { type: 'added', text: 'Local release script for producing signed builds outside CI.' },
      { type: 'added', text: 'Bundle analyzer wired into the desktop build, gated behind an environment flag.' },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-07-15',
    title: 'Auto-update pipeline',
    changes: [
      { type: 'added', text: 'App version shown in the sidebar footer.' },
      { type: 'improved', text: 'Release artifacts are mirrored to a public repository so the in-app updater can reach them.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-15',
    title: 'First public release',
    summary:
      'The first downloadable MyDevTools desktop build for macOS, Windows, and Linux — 80+ developer tools that run on your device and work offline.',
    changes: [
      { type: 'added', text: 'Formatters, converters, generators, validators, cryptography, and network tools in one app.' },
      { type: 'added', text: 'Notes, bookmarks, tasks, and an API client, stored in an encrypted local vault.' },
      { type: 'added', text: 'One-time activation, then the app runs fully offline — no per-session sign-in.' },
    ],
  },
]

/** Most recent release — same version string as tauri.conf.json on the shipped build. */
export const latestRelease = changelog[0]

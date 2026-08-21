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
    version: '0.1.15',
    date: '2026-08-22',
    title: 'MyDevTools on Linux',
    summary:
      'The desktop app now runs on Linux, published in the same release as macOS so you can grab the build for your machine in one place. This release also brings a consistent layout across 42 tools, a factory reset for your local data, and refreshed database and networking libraries.',
    changes: [
      { type: 'added', text: 'Linux support: install with a .deb on Debian and Ubuntu (22.04 or newer), or run the AppImage without installing anything.' },
      { type: 'added', text: 'Linux builds for Intel/AMD (x86_64). ARM64 packages are not part of this release.' },
      { type: 'added', text: 'Factory reset — wipe every note, bookmark, task and vault entry from your device and start over, from Settings.' },
      { type: 'added', text: 'A tool launcher that surfaces the tools that match how you actually work.' },
      { type: 'improved', text: 'All 14 Formatters, 15 Converters and 13 Generators now share the same layout, so input, output and actions sit where you expect in every one of them.' },
      { type: 'improved', text: 'On Linux your database key is kept in the system keyring (GNOME Keyring or KWallet), the same way the macOS build uses the Keychain.' },
      { type: 'improved', text: 'macOS and Linux are now published together in a single release instead of separate ones.' },
      { type: 'improved', text: 'Updated the bundled database and networking libraries, including the encrypted-database engine.' },
      { type: 'fixed', text: 'The window title bar no longer leaves an empty gap on Linux, where it reserved room for the macOS window buttons.' },
      { type: 'fixed', text: 'Rough edges in the editor canvas and the Tasks composer.' },
    ],
  },
  {
    version: '0.1.14',
    date: '2026-08-14',
    title: 'Reorderable tabs and a refreshed sidebar',
    summary:
      'Open tabs can now be dragged into whatever order you like, the tool sidebar has been reworked, and a few rough edges in Notes and the Markdown tool are smoothed out.',
    changes: [
      { type: 'added', text: 'Drag open tabs to rearrange them in any order.' },
      { type: 'improved', text: 'Reworked the tool sidebar.' },
      { type: 'fixed', text: 'A layout glitch in Notes.' },
      { type: 'fixed', text: 'The Markdown tool now shows the correct notification after a download.' },
    ],
  },
  {
    version: '0.1.13',
    date: '2026-08-13',
    title: 'Open source, and no account at all',
    summary:
      'MyDevTools is now open source under the GNU AGPLv3, and the account layer is gone for good. There is no sign-up, no sign-in and no activation — download the app, open it, and start working. The server it used to talk to has been deleted from the project, so the app is completely offline and free for everyone.',
    changes: [
      { type: 'added', text: 'MyDevTools is open source, licensed under the GNU AGPLv3. Read the code, build it yourself, or fork it.' },
      { type: 'added', text: 'A local profile in Settings: set the display name and avatar the app shows you. It lives on your device and is not an account.' },
      { type: 'added', text: 'Images in notes work offline — they are stored inside the note itself, in the encrypted local database, up to 2 MB each.' },
      { type: 'removed', text: 'Accounts, sign-in and the one-time browser activation. The app opens straight to your dashboard.' },
      { type: 'removed', text: 'Passkeys, the web dashboard, and everything else that existed only to identify you to a server.' },
      { type: 'removed', text: 'Shared and team workspaces, which needed an account to work. Your local workspace is unchanged.' },
      { type: 'improved', text: 'Your encrypted vault, master password, and backup codes are untouched by this change — same keys, same data, same lock.' },
      { type: 'improved', text: 'Updating to this version deletes the leftover sign-in tokens from your local database. Nothing on your device still holds a session for a service that no longer exists.' },
    ],
  },
  {
    version: '0.1.12',
    date: '2026-08-12',
    title: 'SQL databases in Data Explorer, and a hardened password vault',
    summary:
      'Data Explorer becomes a full database workspace: PostgreSQL, MySQL, MariaDB and SQLite join the existing sources, with credentials encrypted on your device. The password manager gets a real strength model, an encrypted export, imports from the other managers, and a breach check that admits when it could not reach the service.',
    changes: [
      { type: 'added', text: 'SQL databases in Data Explorer: PostgreSQL, MySQL, and MariaDB, each with a schema tree, a SQL editor, saved queries and history, and an editable result grid.' },
      { type: 'added', text: 'SQLite support: open a database file straight from disk — no server and no credentials to configure.' },
      { type: 'added', text: 'Paste a full database connection URL into the host field and every other field fills itself in.' },
      { type: 'added', text: 'Encrypted vault export, protected by a passphrase you choose, alongside the existing plain-text option.' },
      { type: 'added', text: 'Import passwords from Bitwarden, 1Password, Chrome, KeePass, and LastPass CSV exports.' },
      { type: 'improved', text: 'Password strength is now judged by how guessable a password really is — dictionary words, keyboard runs, repeats, and letter-for-symbol substitutions — instead of counting character types. Expect some passwords in your vault to be rescored.' },
      { type: 'improved', text: 'Importing passwords shows what will be added, what is already in your vault, and what cannot be read, before anything is written.' },
      { type: 'improved', text: 'Exporting your vault now asks for your master password first.' },
      { type: 'improved', text: 'Site icons in the password manager are off by default, so no icon service learns which sites you hold accounts on. There is a switch in Settings.' },
      { type: 'improved', text: 'Read-only database connections are now enforced by the database itself, not only hidden in the interface.' },
      { type: 'improved', text: 'Long-running SQL queries stop on their own instead of hanging, and you can walk away from one without waiting for it.' },
      { type: 'improved', text: 'Every new data source and password-manager screen is translated into all 27 in-app languages.' },
      { type: 'fixed', text: 'A breach lookup that fails now says so, instead of showing the password as safe.' },
      { type: 'fixed', text: 'Copying a second password no longer wipes it from the clipboard early, and the clipboard is only cleared if it still holds what you copied.' },
      { type: 'fixed', text: 'An interrupted password import reports how many entries were actually added.' },
      { type: 'fixed', text: 'Editing a cell whose filter matches more than one row is rolled back instead of quietly changing all of them.' },
      { type: 'fixed', text: 'Query results containing two columns with the same name no longer lose one of them.' },
      { type: 'fixed', text: 'Binary column values show as hex with their real size instead of corrupted text, and timestamps keep their fractional seconds.' },
      { type: 'fixed', text: 'Database errors now say what actually went wrong instead of a generic failure message.' },
      { type: 'fixed', text: 'A result grid that shows only the first rows now says so, instead of implying it holds the whole table.' },
      { type: 'fixed', text: 'A mistyped SQLite path reports an error instead of silently creating an empty database.' },
    ],
  },
  {
    version: '0.1.11',
    date: '2026-08-10',
    title: 'Firestore and Elasticsearch in Data Explorer',
    summary:
      'Two more sources join Data Explorer — Cloud Firestore and Elasticsearch — each with the full browse-and-edit toolset and connection credentials encrypted on your device.',
    changes: [
      { type: 'added', text: 'Firestore support: browse collections and subcollections, page through documents with filters, and create, edit, and delete with typed-value patches and orphan warnings.' },
      { type: 'added', text: 'Elasticsearch support: connect to a cluster and search your indices from the Data Explorer.' },
      { type: 'improved', text: 'Firestore and Elasticsearch are translated into all 27 in-app languages.' },
      { type: 'improved', text: 'Reworked in-app update experience with a progress modal.' },
    ],
  },
  {
    version: '0.1.10',
    date: '2026-08-05',
    title: 'Data Explorer — one workspace for MongoDB and Redis',
    summary:
      'The separate NoSQL explorer is now Data Explorer: a single workspace where each connection picks its own source and gets the full toolset for it. MongoDB and Redis ship first, with connection credentials encrypted on your device.',
    changes: [
      { type: 'added', text: 'Data Explorer — unified sidebar, tab bar, and connection dialog covering every data source in one place.' },
      { type: 'added', text: 'Redis support: browse keys, edit values, use pub/sub, and run commands from a console.' },
      { type: 'added', text: 'MongoDB in the new workspace: collection browsing, document queries, aggregation pipelines, and index management.' },
      { type: 'added', text: 'One-click import of connections saved in the old NoSQL explorer, de-duplicated against connections you already have.' },
      { type: 'added', text: 'Unified connection vault — every connection is stored as encrypted JSON on your device.' },
      { type: 'improved', text: 'The MongoDB dialect (MongoDB, DocumentDB, Cosmos DB) is inferred from your connection string instead of being asked for.' },
      { type: 'improved', text: 'The data source picker is a dropdown, so adding sources no longer crowds the dialog.' },
      { type: 'improved', text: 'Data Explorer is translated into all 27 in-app languages.' },
      { type: 'improved', text: 'Cleaner tool headers and a reworked top bar across the app.' },
      { type: 'fixed', text: 'Redis error messages scrub credentials — connection URLs and passwords never reach a toast, even when the message cannot be parsed.' },
      { type: 'fixed', text: 'Deleting a single document now asks for confirmation.' },
      { type: 'fixed', text: 'Read-only mode applies immediately instead of only after reconnecting.' },
      { type: 'fixed', text: 'Tabs belonging to a removed connection are pruned instead of lingering, and restoring a session no longer reopens invalid tabs.' },
      { type: 'fixed', text: 'Accessible labels on sidebar controls and a working menu trigger on small windows.' },
    ],
  },
  {
    version: '0.1.9',
    date: '2026-07-24',
    title: 'Update progress and NoSQL depth',
    summary:
      'Updates now show live progress instead of applying invisibly, and the NoSQL explorer gained code generation and write-safety guards for hosted Mongo-wire databases.',
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

# ApplyFlow

A private, local-first workspace for an internship or job search. Save opportunities, prepare applications, preserve exactly what you submitted, follow up, and learn from your outcomes.

ApplyFlow runs on your computer with SQLite. No cloud database, account, paid API, or external AI service is required. Fonts are bundled locally. Next.js telemetry is disabled in the supplied commands.

## Start locally

Requirements: **Node.js 24**, npm, and a modern browser. The `.nvmrc` selects Node 24.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:3000**. The server binds to loopback only. Database setup also runs automatically on first access, so the migration command is useful but optional.

The workspace starts empty. Choose **Explore demo data** on Overview, or **Settings → Load demo data**, to explore ten explicitly labeled sample applications. Remove them in Settings after typing `REMOVE DEMO`. Your own applications and uploaded documents are retained. Edits to demo applications are still demo data, so export them before removal if needed.

For a production server:

```sh
npm run build
npm start
```

Keep the process running while using the app or capturing jobs with the extension.

## What works

- **Command center:** application deadlines, overdue follow-ups, unanswered applications, upcoming interviews and preparation counts, weekly activity, and recent applications.
- **Applications:** full job description snapshots, dates, sources, compensation text, tags, role categories, location, arrangement, priority, notes, offers and outcome reasons. Changes persist in SQLite.
- **Pipeline:** drag cards by their grips between stages. Status changes also work through an accessible select on the application detail page. Every transition creates a timeline event. Use the Archived filter to find archived records.
- **History:** saved, edited, status, note, document, contact, interaction, interview, follow-up, and confirmed email events. You can reconstruct an application's progression even after its current status changes.
- **Documents:** local file uploads up to 20 MB, immutable numbered versions, exact-version application attachments, original-file downloads, and observed interview conversion per version. Uploading a new version never replaces an existing file or application association.
- **Contacts:** company grouping, follow-up filtering, linked applications, email and LinkedIn details, interaction history, and timeline entries for linked interactions.
- **Interview workspace:** multiple rounds, local date/time, interviewer names, meeting location/link, interactive preparation checklists, questions, topics, difficulty, reflection, and outcomes.
- **Answer bank:** favorites, local word-similarity search, copy-to-clipboard with last-used dates, and saved answer revisions.
- **Analytics:** historical stage reach, response/interview/offer conversion, recorded response and rejection timing, weekly activity, daily heatmap, interview topics, and comparisons by source, resume version, category, arrangement, location, referral, month, company, priority, and cover-letter use.
- **Experiments:** explicit, disjoint control and experimental cohorts; response/interview/offer metrics; raw counts; conversion differences; 95% Wilson intervals; and small-sample cautions.
- **Data tools:** CSV column mapping, complete validation and preview, explicit duplicate policy, transactional import, formula-safe CSV export, complete JSON backup including document bytes, and transactional restore into an empty workspace.
- **Search:** `⌘K` / `Ctrl+K` searches applications (including descriptions, tags, notes), contacts, answers, and document names. Applications have status, source, priority, category, location, document version, applied-date range, and stale filters.
- **Settings:** light/dark/system themes, recruiting-season label, configurable stale threshold, and demo management.
- **Browser extension:** review generic/JobPosting extraction, then open the local application form to confirm Save Job or Mark as Applied.
- **Email review:** paste a recruiting email, inspect a keyword-based status suggestion, and explicitly confirm or ignore it. Gmail syncing is not implemented.

## A few important behaviors

**Statuses are not a forced sequence.** Move straight to an interview or offer when that matches reality. Archived records retain their history and remain included in historical analytics.

**Stale is a flag, not a rejection.** Applied records without a response are flagged after 21 days by default. A recorded follow-up restarts the inactivity clock. Notes and metadata edits do not. Snooze for seven days from the detail page, choose a date in the editor, or archive the record. Nothing is automatically rejected.

**Submission dates:** selecting Applied or a later response stage fills today's applied date if it is empty. When importing older applications, map the actual applied date to avoid attributing them to today.

**Documents:** an attachment is an explicit assertion that this exact version belongs with that application. The app does not automatically infer which resume you used. Old associations are preserved; attaching a replacement adds another version. There is no destructive detach/edit-version action.

**Analytics:** denominators use submitted applications. OA, recruiter screen, interview, final round, offer, and rejection count as responses. Withdrawals alone do not. Interviews include final rounds and offers. Historical status events continue to count after rejection or archiving. Different stage counts need not descend because companies skip stages. A version attached to an unsubmitted application is counted as an attachment but excluded from its submitted conversion denominator. The same application may appear in multiple version groups if multiple versions are attached.

**Timing and evidence:** elapsed response times use the entered applied date and the first recorded response event. Imported records without historical response timestamps cannot reconstruct the original response day. Cohorts are observational, not randomized, and may differ in role, source, or application age. Wilson intervals describe binomial uncertainty, not causal certainty. Groups under 20 submissions are labeled small samples; larger samples are still observational.

**Local date/time:** calendar dates and interview times use the machine/browser's local timezone. Run the local server and browser on the same machine/timezone. Interview timezone conversion and calendar syncing are not implemented.

## CSV import

Export your spreadsheet as a UTF-8 CSV. Dates must be `YYYY-MM-DD`. Common headers such as Employer, Position, Date Applied, and Link are suggested automatically. Every available column can be mapped manually.

```csv
Company,Position,Status,Date Applied,Link,Source
Example Labs,Software Engineer Intern,Applied,2026-09-25,https://example.com/jobs/123,LinkedIn
```

1. Open **Import / Export** and select the CSV (up to 10 MB / 5,000 rows).
2. Map Company and Role, then any other columns you have.
3. Inspect preview and validation errors. Correct invalid rows in the source CSV; no rows are written until all pass validation.
4. Choose **Skip duplicates and report count** or **Keep as separate applications**.
5. Confirm the import. The result reports created and skipped counts, including duplicates within the uploaded file.

Duplicate detection compares canonical URLs (ignoring common tracking parameters) and normalized company + role. It is a heuristic; distinct openings can have the same title. Manual creation lets you open a match or explicitly save anyway. There is no automatic destructive merge.

## Data storage, backup, and restore

Default storage:

```text
data/applyflow.sqlite       # all records and document file bytes
data/applyflow.sqlite-wal   # SQLite journal while running
data/applyflow.sqlite-shm   # SQLite shared-memory file while running
```

These are excluded from Git. No personal data is seeded automatically. Document files are SQLite BLOBs so file versions, references, imports, and restores share the same transaction and backup boundary. Original filenames are metadata only; they never become filesystem paths. Downloads use attachment disposition and disable MIME sniffing.

To choose another local folder (use the same value for every command):

```sh
APPLYFLOW_DATA_DIR="$HOME/ApplyFlowData" npm run dev
```

### Recommended portable backup

In **Import / Export**, click **Complete JSON backup**. This contains all applications, events, contacts, interviews, answer revisions, experiments, settings, proposals, documents, and base64-encoded original files. Keep it somewhere private: backups contain your personal information and are not encrypted. JSON restore requests are limited to 100 MB; for a larger workspace use the SQLite backup procedure below.

To restore without risking the current workspace:

1. Stop the app with `Ctrl+C`.
2. Start a new empty workspace:

   ```sh
   APPLYFLOW_DATA_DIR="$HOME/ApplyFlowRestored" npm run dev
   ```

3. Open **Import / Export**, select the JSON backup, and confirm restore.
4. Inspect the restored workspace before removing any old files.

Restore refuses to overwrite a populated workspace. Validation or reference failures roll back the entire transaction. Settings in the backup are restored too.

### Native SQLite backup

Stop **all** ApplyFlow processes before copying the database directory. Copy the entire `data` directory, including any remaining `-wal` / `-shm` files, to a private backup folder. Restore by starting the app with `APPLYFLOW_DATA_DIR` pointing at that copied directory. Do not copy only the main database file while the app is running: recent changes may be in the journal.

To remove your data permanently, stop the app, retain any backup you want, then delete the chosen data directory through your file manager. An empty database is initialized on the next launch. Archiving an application is reversible and does not delete its data.

## Install the development browser extension

1. Start ApplyFlow at `http://127.0.0.1:3000`.
2. Open `chrome://extensions` (or the equivalent Chromium extension page).
3. Enable **Developer mode**, choose **Load unpacked**, and select this repository's `extension` folder.
4. Open a job listing, click **Save to ApplyFlow**, and review the extracted company, title, URL, description, location, and compensation.
5. Choose **Save job** or **Mark as applied**. A local ApplyFlow review form opens. Nothing is written until you submit that form; duplicate checks apply there too.

Extraction prefers schema.org `JobPosting` JSON-LD (including `@graph`), then a generic job-description/main/article element. Imperfect fields are editable. Extension permissions are limited to `activeTab` and `scripting`; extraction runs only after you open the popup. Restricted browser pages cannot be extracted. No continuous scraping or form autofill is included.

The payload travels in the local page's URL **fragment**, which is not sent to the HTTP server; the app clears the fragment after reading it. There is no cross-origin write endpoint or pairing secret. The extension currently targets port 3000. After changing extension files, click **Reload** on the extension page.

## Email integration boundary

Email review currently accepts pasted text only. A conservative local keyword classifier proposes Rejected, Offer, Online Assessment, or Interview. A message may be ambiguous or misclassified; the user must choose the related application and confirm every suggestion. Confirmation writes both a status event and an email review event. Ignoring a suggestion changes no application status.

A future Gmail adapter should use this existing `proposals` boundary:

1. Create a Google Cloud project and enable Gmail API.
2. Configure an OAuth consent screen and a **Desktop app** OAuth client; add the local user as a test user while in testing mode.
3. Implement an installed-app authorization flow with `gmail.readonly`, using a loopback redirect and PKCE where supported.
4. Store refresh tokens in the OS credential store, never Git or exported workspace JSON; provide Disconnect/revoke controls.
5. Fetch only user-selected labels/date ranges, deduplicate by message ID, and create pending proposals through the service layer. Preserve original message context.
6. Keep status mutation behind the existing explicit confirmation path. Never turn classification into an automatic status update.

These are adapter implementation requirements, not a claim that OAuth setup alone enables Gmail today. No external credentials are needed to use the rest of ApplyFlow.

## Architecture

- Next.js App Router + React + strict TypeScript.
- Node 24's built-in `node:sqlite`, with prepared statements, foreign keys, WAL journaling, and explicit transactions.
- Zod schemas shared by forms/import preview and the service boundary.
- CSS design tokens, self-hosted fonts, native modal dialogs, and Lucide icons.
- dnd-kit for pointer and keyboard drag interaction; detail-page status selection is an alternative.
- Papa Parse for CSV parsing and escaped export.
- Vitest integration/unit tests and Playwright production-browser workflows.

The database uses relational identity, file-version and association tables, with validated JSON records for evolving application/CRM metadata. Native SQLite keeps setup free of an additional ORM or compiled database addon. Runtime validation is the write boundary; SQLite enforces relationships and unique document version numbers.

```text
src/lib/model.ts             Shared domain schemas and types
src/lib/db.ts                SQLite connection and transaction helpers
src/lib/service.ts           Validated domain mutations and timeline events
src/lib/insights.ts          Metrics, stale rules, cohorts, duplicate detection
src/lib/csv.ts               Mapping, validation, formula-safe exports
src/lib/backup.ts            Complete backup and transactional restore
src/app/api/                Local-only HTTP and download boundary
src/components/             Workspace shell and product screens
migrations/001_initial.sql  Repeatable initial schema
extension/                  Unpacked Manifest V3 capture extension
```

Migrations are checked in and repeatable. Run `npm run db:migrate` explicitly whenever needed. This version has one initial schema and uses `PRAGMA user_version = 1`; future schema changes must add a versioned migration rather than modifying user data in place.

The app is intended for a trusted local machine. It has no login, remote hosting, encryption-at-rest, multi-user permissions, or cloud syncing. It binds to loopback and validates the request host and write origin to defend against cross-origin browser writes. Do not expose it through a public tunnel or bind it to an untrusted network.

## Validation and development

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser tests require **Google Chrome** installed. They launch the production build on port 3101 with a separate temporary SQLite directory. Run the build before them. They do not use or reset your normal workspace. Test artifacts are in `test-results/` and traces are retained on failure.

Coverage includes create/edit/status history, immutable file associations, CRM/interview/answer workflows, cohort calculations, response timing, stale detection, duplicate normalization, import rollback, backup/restore rollback, extension extraction, capture review, real pipeline dragging, mobile navigation, and cross-origin write rejection.

```sh
npm run format
```

For manual browser review, run the development server and `node scripts/visual-qa.mjs`. This script loads labeled demo data **only when the current workspace is empty**, visits product screens at 1440px and 390px, captures screenshots in `test-results/visual/`, and reports page errors, failed requests, external requests, and page-level overflow. Use a separate data directory when you want a fully disposable visual workspace.

## Current limits

- Single-user local workspace, not a hosted collaborative product.
- Gmail ingestion/OAuth and calendar syncing remain future adapters; pasted email review works now.
- The unpacked extension uses generic extraction, not a comprehensive set of job-board adapters. It is not store-published.
- No automatic merge, saved filter views, bulk editing, structured compensation ranges, or inferred resume assignment.
- No destructive document-version editing/detachment. Archive applications or retain backups for recovery.
- Imported historical stage timestamps cannot be reconstructed from current status alone.
- Analytics are descriptive; no causal or statistical-significance claims are made.
- JSON restore is limited to 100 MB; native SQLite backups handle larger workspaces.

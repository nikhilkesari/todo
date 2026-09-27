# Test Infrastructure & Methodology Specification

## Overview
This document defines the comprehensive 4-tier testing architecture and verification methodology for the modern React + TypeScript Todo application with Google Gemini Workload Intelligence and Chrome DevTools Protocol (CDP) verification.

The testing infrastructure guarantees end-to-end correctness, data persistence integrity, AI reasoning accuracy, and fault tolerance across the entire stack:
1. **Tier 1: Feature Coverage** (Core specifications & happy paths)
2. **Tier 2: Boundary & Corner Cases** (Extreme values, invalid inputs, edge conditions)
3. **Tier 3: Cross-Feature Combinations** (Pairwise interactions and cross-cutting concerns)
4. **Tier 4: Real-World Application Scenarios** (Complex user journeys and lifecycle workflows)

---

## 1. Multi-Tier Testing Methodology

```
┌────────────────────────────────────────────────────────────────────────┐
│             Tier 4: Real-World User Scenarios                          │
│     (Workday Rebalance, Bulk Errand Runs, Multi-Tab/Reload Fidelity)    │
├────────────────────────────────────────────────────────────────────────┤
│             Tier 3: Cross-Feature Combinations                         │
│     (R1×R2 AI Reschedule, R1×R4 CDP Persistence, R2×R4 Batch Store)    │
├────────────────────────────────────────────────────────────────────────┤
│             Tier 2: Boundary & Corner Cases                            │
│     (Unicode, Quota Limits, 0/100 Tasks, Clock Drift, Nullable Dates)   │
├────────────────────────────────────────────────────────────────────────┤
│             Tier 1: Feature Coverage (Core Requirements)                │
│     (R1 CRUD/Lists, R2 AI Advisor/Proxy, R3 Bugbot, R4 CDP/CI Gates)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: Feature Coverage (>= 5 Test Cases per Feature)

### 2.1 Feature R1: Task Management & Categorization (CRUD + IndexedDB)
- **T1-R1-01: Quick Add Task Creation**:
  - *Input*: Enter title `"Finish quarterly report"` in quick-add input (`[data-testid="quick-add-input"]`) and press Enter or click submit (`[data-testid="quick-add-submit"]`).
  - *Expected Result*: Task appears immediately in task list, default priority `'medium'`, completed `false`, persisted to IndexedDB `tasks` store.
- **T1-R1-02: Modal Task Creation with Rich Metadata**:
  - *Input*: Open task modal (`[data-testid="open-task-modal-btn"]`), set title `"Dental appointment"`, description `"Checkup and cleaning"`, project `"Personal"`, priority `"high"`, due date `"2026-09-30"`, submit.
  - *Expected Result*: Task displays in list with high priority badge, project indicator, formatted due date, and matching IndexedDB record.
- **T1-R1-03: Task Completion Toggle & Visual Styling**:
  - *Input*: Click checkbox (`[data-testid^="task-checkbox-"]`) on task.
  - *Expected Result*: Checkbox transitions to checked, title receives `line-through` CSS style and reduced opacity (`opacity-60`), IndexedDB record has `completed: true`.
- **T1-R1-04: Task Inline / Modal Editing**:
  - *Input*: Click edit button (`[data-testid^="task-edit-btn-"]`), change title to `"Quarterly report revised"` and priority to `"low"`.
  - *Expected Result*: Updated task details reflect instantly in UI and persist in IndexedDB with updated timestamp.
- **T1-R1-05: Task Deletion & Confirmation**:
  - *Input*: Click delete button (`[data-testid^="task-delete-btn-"]`) on task and confirm deletion prompt.
  - *Expected Result*: Task element is removed from DOM and completely deleted from IndexedDB `tasks` store.
- **T1-R1-06: Custom Project / List Management**:
  - *Input*: Click add project (`[data-testid="add-project-btn"]`), create new project `"Groceries"` with custom color tag.
  - *Expected Result*: Project appears in sidebar list (`[data-testid^="project-item-"]`), project record stored in `projects` store, tasks can be filtered by it.
- **T1-R1-07: Due Date Quick Filters**:
  - *Input*: Toggle between filter tabs: `"Today"`, `"Upcoming"`, `"Overdue"`, `"All"` (`[data-testid="filter-today"]`, `[data-testid="filter-upcoming"]`, etc.).
  - *Expected Result*: Task list updates dynamically to show only tasks matching the selected temporal filter.

### 2.2 Feature R2: Google Gemini Workload Intelligence & Backend Proxy
- **T1-R2-01: Proxy Health Check Endpoint**:
  - *Input*: `GET /api/health`.
  - *Expected Result*: Returns HTTP 200 with JSON payload `{ status: 'ok', geminiConfigured: boolean, model: string, uptime: number }`.
- **T1-R2-02: Workload Analysis Request & Heuristic Fallback**:
  - *Input*: `POST /api/ai/analyze-workload` with 6 scheduled tasks on the same calendar date.
  - *Expected Result*: Returns structured `WorkloadAnalysisResponse` with `workloadLevel: 'overcommitted'`, daily summary, and recommendations.
- **T1-R2-03: Interactive AI Assistant Drawer Mount & State Display**:
  - *Input*: Click AI Assistant button (`data-testid="ai-drawer-trigger"`).
  - *Expected Result*: Slide-out drawer (`data-testid="ai-drawer-panel"`) opens smoothly, displaying workload capacity visualization, conversational guidance, and recommendations.
- **T1-R2-04: Proactive Overcommitment Alert Banner**:
  - *Input*: Populate a single date with 6+ hours of tasks.
  - *Expected Result*: Main view displays high-visibility warning banner (`data-testid="overcommitment-banner"`) alerting user of overloaded schedule with direct link to open drawer.
- **T1-R2-05: One-Click Reschedule Recommendation Acceptance**:
  - *Input*: Click `"Accept"` on recommendation card (`data-testid="ai-apply-reschedule-btn"` or `data-testid^="recommendation-accept-"`).
  - *Expected Result*: Task's due date updates in UI and IndexedDB immediately, recommendation marks as applied, and workload stats recalculate.
- **T1-R2-06: Task Decomposition Endpoint**:
  - *Input*: `POST /api/ai/decompose-task` with title `"Build website redesign"`.
  - *Expected Result*: Returns list of discrete sub-tasks with estimated completion durations.

### 2.3 Feature R3: Automated Bugbot (CI Reviewer)
- **T1-R3-01: Workflow Trigger Configuration**:
  - *Input*: Inspect `.github/workflows/bugbot.yml` trigger definitions.
  - *Expected Result*: Valid triggers on `pull_request` (`opened`, `synchronize`, `reopened`), `push` to `main`/`master`, and `workflow_dispatch`.
- **T1-R3-02: Git Diff Code-Only Filtering**:
  - *Input*: Pull request with changes spanning TypeScript source and lockfiles (`package-lock.json`).
  - *Expected Result*: Extractor script filters out generated lockfiles, assets, and vendor files, extracting only relevant code diffs.
- **T1-R3-03: Token Safety & Diff Bounding**:
  - *Input*: Large diff exceeding 100KB.
  - *Expected Result*: Diff extractor truncates diff cleanly at 50KB boundary, appending truncation notice to prevent prompt token overflow.
- **T1-R3-04: Bugbot Review Prompt Structure**:
  - *Input*: Validate review system prompt against diff containing intentional type error or off-by-one loop.
  - *Expected Result*: Prompt instructs Gemini to output structured markdown with `Findings`, `Severity`, `Line Number`, and `Suggested Fix`.
- **T1-R3-05: Sticky PR Comment & Step Summary Delivery**:
  - *Input*: Execute Bugbot action in CI context with PR ID.
  - *Expected Result*: Bot publishes or updates existing comment with unique marker `<!-- BUGBOT_REVIEW_SUMMARY -->` and writes to `$GITHUB_STEP_SUMMARY`.

### 2.4 Feature R4: Multi-Layer Verification & Chrome DevTools Protocol (CDP)
- **T1-R4-01: CDP Session Establishment & Domain Initialization**:
  - *Input*: Call `cdpHelper.init()` via `page.context().newCDPSession(page)`.
  - *Expected Result*: `IndexedDB.enable` succeeds without error; CDP connection ready.
- **T1-R4-02: CDP Database & Schema Introspection**:
  - *Input*: Execute `IndexedDB.requestDatabaseNames` and `IndexedDB.requestDatabase`.
  - *Expected Result*: Returns `todo_app_db` containing `tasks` and `projects` stores with proper indexes (`by-projectId`, `by-dueDate`, `by-completed`).
- **T1-R4-03: CDP Direct Object Store Data Extraction**:
  - *Input*: Execute `IndexedDB.requestData` on `tasks` store.
  - *Expected Result*: Returns raw deserialized task records directly from browser disk storage.
- **T1-R4-04: Hard Page Reload Persistence Verification**:
  - *Input*: Create task via DOM, verify in IndexedDB via CDP, trigger `page.reload()`, and re-query CDP + DOM.
  - *Expected Result*: Both DOM and IndexedDB retain the exact task state across reload without loss.
- **T1-R4-05: Multi-Stage GitHub Actions CI Pipeline**:
  - *Input*: Inspect `.github/workflows/ci.yml`.
  - *Expected Result*: 3 sequential jobs: `lint-and-typecheck`, `unit-tests`, `e2e-cdp-verification` configured for `https://github.com/nikhilkesari/todo`.

---

## 3. Tier 2: Boundary & Corner Cases (>= 5 Test Cases per Feature)

### 3.1 Feature R1 Boundaries
- **T2-R1-01: Empty & Whitespace Task Titles**:
  - *Behavior*: Submitting empty or all-whitespace strings in quick-add or modal is prevented by validation; no empty record created.
- **T2-R1-02: Extremely Long Strings & Special Characters**:
  - *Behavior*: 1,000-character descriptions, unicode emojis (🚀🔥💻), HTML injection attempts (`<script>alert(1)</script>`), and RTL characters render safely without XSS or layout breaking.
- **T2-R1-03: Leap Year, Year-End, & Invalid Due Dates**:
  - *Behavior*: Tasks scheduled on Feb 29 (leap years), Dec 31, or invalid ISO strings handle timezones gracefully without off-by-one day display bugs.
- **T2-R1-04: High Volume Task Count (100+ items)**:
  - *Behavior*: Creating 100+ tasks in a single list does not crash IndexedDB or degrade UI scrolling; virtualization/pagination handles volume.
- **T2-R1-05: Deletion of Project with Associated Tasks**:
  - *Behavior*: Deleting a custom project either cascades task cleanup or moves orphaned tasks to default `"Inbox"` / `"Personal"` list without dangling pointers.

### 3.2 Feature R2 Boundaries
- **T2-R2-01: Zero Tasks on Date / Zero Estimated Minutes**:
  - *Behavior*: Workload advisor recognizes empty calendar days as `'balanced'` / `'underutilized'`, not `'overcommitted'`.
- **T2-R2-02: Boundary Saturation (Exact Capacity Threshold)**:
  - *Behavior*: Exactly 8 hours or 5 tasks does not trigger false positive overcommitment warning; 8.1 hours or 6 tasks triggers warning cleanly.
- **T2-R2-03: Fully Saturated Week (All 7 Days Overcommitted)**:
  - *Behavior*: When every single day in the scheduling window is overloaded, AI advisor suggests deferring tasks to subsequent week rather than infinite loop rebalancing.
- **T2-R2-04: Backend Proxy Offline / Network Failure**:
  - *Behavior*: If backend proxy returns 500 or is unreachable, frontend falls back deterministically to local heuristic calculations without crashing UI.
- **T2-R2-05: Rapid Concurrent One-Click Reschedules**:
  - *Behavior*: Rapidly clicking accept on multiple rescheduling suggestions executes serial or atomic batch IndexedDB transactions without race conditions or dirty writes.

### 3.3 Feature R3 Boundaries
- **T3-R3-01: Empty PR Diff**:
  - *Behavior*: PR containing no code changes (e.g. branch merge or tag) is skipped gracefully with informational step summary.
- **T3-R3-02: Diff Exceeding Max Bound (Massive Refactor > 500KB)**:
  - *Behavior*: Extractor truncates safely with explicit warning; Gemini API request does not fail with 400 Bad Request / Payload Too Large.
- **T3-R3-03: Binary Files & Media in Diff**:
  - *Behavior*: Images, binaries, and `.png`/`.woff` files are filtered out prior to prompt assembly.
- **T3-R3-04: Gemini API Rate Limiting (HTTP 429)**:
  - *Behavior*: Workflow implements retry with exponential backoff; if persistent, posts graceful fallback notice rather than hard failing CI runner.
- **T3-R3-05: PR Authored by Dependabot / Bot User**:
  - *Behavior*: Bot handles automated dependency PRs cleanly without getting stuck in infinite review loops.

### 3.4 Feature R4 Boundaries
- **T4-R4-01: Rapid Consecutive Reloads Under Active Transaction**:
  - *Behavior*: Reloading the page immediately after triggering task creation does not leave partially written or corrupted records in IndexedDB.
- **T4-R4-02: Browser Storage Eviction & Quota Boundary**:
  - *Behavior*: Database initialization requests persistent storage permission (`navigator.storage.persist()`) when supported.
- **T4-R4-03: Concurrent Multi-Tab Access to IndexedDB**:
  - *Behavior*: Opening two browser tabs to the application does not cause schema upgrade blocking or unhandled `VersionError`.
- **T4-R4-04: CDP RemoteObject Deserialization of Nested Data**:
  - *Behavior*: Complex nested objects in IndexedDB entries are resolved safely via `Runtime.callFunctionOn` when CDP returns `objectId`.
- **T4-R4-05: Missing Database / First-Time Cold Launch**:
  - *Behavior*: Fresh browser session automatically boots, provisions `todo_app_db`, creates stores, and populates default seed data.

---

## 4. Tier 3: Cross-Feature Combinations (Pairwise Interactions)

### 4.1 R1 (Task Management) × R2 (Gemini Workload Intelligence)
- **Matrix Interaction**: Adding tasks in R1 instantly alters daily workload calculation in R2; accepting AI reschedule updates R1 task lists.
- **Test Scenarios**:
  - Creating 5 heavy tasks today immediately triggers R2 Overcommitment Banner.
  - Clicking AI one-click reschedule moves task to tomorrow; R1 "Today" filter count drops by 1, R1 "Upcoming" count increases by 1.
  - Marking an overcommitted task as completed immediately removes its minutes from R2 workload calculation, clearing overcommitment banner.

### 4.2 R1 (Task Management) × R4 (CDP Storage Verification)
- **Matrix Interaction**: Every user action in R1 (create, toggle, edit, delete, project assign) is verified at the byte level in IndexedDB via CDP.
- **Test Scenarios**:
  - UI Task Create -> CDP queries `tasks` store -> Asserts record matches ID, title, and initial state.
  - UI Task Toggle -> CDP queries `tasks` store -> Asserts `completed: true`.
  - UI Task Delete -> CDP queries `tasks` store -> Asserts record is deleted.
  - Hard page reload -> CDP verifies database is intact and UI rehydrates identically.

### 4.3 R2 (Workload Intelligence) × R4 (CDP Storage Verification)
- **Matrix Interaction**: Batch rescheduling suggestions accepted through AI Assistant execute real IndexedDB transactions verified by CDP.
- **Test Scenarios**:
  - Accepting a multi-task reschedule proposal -> CDP inspects all affected task records in IndexedDB -> Verifies new `dueDate` timestamps are persisted on disk.
  - Page is reloaded -> CDP verifies rescheduled dates persist.

### 4.4 R3 (Bugbot Reviewer) × R4 (Static Analysis & Verification Pipeline)
- **Matrix Interaction**: Bugbot works in synergy with the deterministic CI pipeline.
- **Test Scenarios**:
  - PR contains syntax or type error -> CI `lint-and-typecheck` fails deterministically; Bugbot highlights the exact typing defect in conversational PR comment.
  - PR modifies database schema -> CI executes CDP tests to ensure backward compatibility; Bugbot flags migration considerations.

---

## 5. Tier 4: Real-World Application Scenarios

### Scenario 1: Busy Professional Workday Overload & Rebalance
- **Workflow**:
  1. User arrives on Monday morning.
  2. Creates 4 high-priority work tasks (`"Prepare board deck"`, `"Review budget spreadsheet"`, `"1-on-1 performance review"`, `"Client incident post-mortem"`).
  3. Total estimated time reaches 9 hours; Overcommitment Banner alerts user.
  4. User opens AI Assistant drawer, reviews heatmap (Monday glowing red).
  5. AI recommends moving `"Review budget spreadsheet"` to Wednesday and splitting `"Client incident post-mortem"`.
  6. User clicks `"Accept & Reschedule"`.
  7. Schedule updates; Monday workload drops to 6.5 hours (balanced status).
  8. CDP verification confirms updated due date for budget task in IndexedDB.

### Scenario 2: Project-Based Grocery & Personal Errands with Offline Reconnect
- **Workflow**:
  1. User creates custom project `"Groceries & Home"`.
  2. Adds multiple items with quick-add.
  3. Switches to `"Groceries & Home"` project filter tab.
  4. Marks 3 items completed while shopping.
  5. Simulates network disconnection / offline status.
  6. Creates additional urgent item `"Coffee beans"`.
  7. Hard refreshes browser (`page.reload()`).
  8. Verifies all items, project assignments, and completion states persist perfectly from IndexedDB.

### Scenario 3: Bulk Task Migration, Completion Spree, & Multi-Tab Data Fidelity
- **Workflow**:
  1. User launches application with seed data.
  2. Moves through list marking multiple tasks completed across different projects.
  3. Uses search or filter tabs to isolate overdue tasks.
  4. Deletes completed tasks.
  5. Verifies IndexedDB task count decreases accordingly via CDP.
  6. Re-opens application in new page context to verify immediate synchronization.

### Scenario 4: AI Overcommitment Early Warning to Zero-Defect Resolution
- **Workflow**:
  1. User schedules tasks across the upcoming 7 days.
  2. Mid-week deadline shift causes 3 new urgent tasks to be placed on Thursday.
  3. AI Assistant detects threshold breach and surfaces recommendation card.
  4. User applies recommendation; undo toast appears with 5-second timer.
  5. User tests undo action -> task reverts to original date.
  6. User re-applies recommendation -> task persists to new date.
  7. All state changes are verified against raw IndexedDB records via CDP.

---

## 6. Execution Command Reference

```bash
# Run full E2E & CDP verification suite
npx playwright test

# Run CDP IndexedDB persistence suite specifically
npx playwright test tests/cdp/indexeddb-persistence.spec.ts

# Run E2E user interaction suites
npx playwright test tests/e2e/tasks-crud.spec.ts
npx playwright test tests/e2e/projects-filters.spec.ts
npx playwright test tests/e2e/ai-drawer.spec.ts
npx playwright test tests/e2e/scenarios.spec.ts

# Run with interactive UI mode
npx playwright test --ui
```

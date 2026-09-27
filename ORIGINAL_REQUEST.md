# Original User Request

## 2026-09-26T13:14:15Z

Build a responsive, modern React and TypeScript Todo application with Tailwind CSS, browser IndexedDB persistence, an interactive Google Gemini AI workload advisor, automated Chrome DevTools Protocol (CDP) verification, and a complete GitHub Actions CI pipeline featuring a Cursor-style automated Bugbot.

Working directory: `/Users/nikhilskesari/workspace/chromedev`
Repository: `https://github.com/nikhilkesari/todo`
Integrity mode: demo

## Requirements

### R1. Task Management & Categorization (CRUD + IndexedDB)
- Provide full CRUD capabilities for tasks: create with title and optional description, read in a clean responsive list, edit inline or via modal, and delete individually.
- Support task completion toggling with visual indicators (e.g. strikethrough, subtle opacity shift).
- Enable due date assignment with quick filters (e.g., Today, Upcoming, Overdue).
- Organize tasks into user-defined Lists or Projects (e.g., Work, Personal, Groceries).
- Store and persist all tasks, projects, and metadata strictly on the client side using browser IndexedDB.

### R2. Google Gemini Workload Intelligence & Backend Proxy
- Provide a lightweight Node.js/Express backend proxy to securely communicate with the Google Gemini API without exposing credentials in client-side bundles.
- Implement an interactive AI Assistant drawer/sidebar in the web application that analyzes scheduled tasks across dates:
  - Detect when a user is overcommitted on any particular date based on task count and complexity.
  - Proactively alert the user with conversational guidance and actionable recommendations (e.g. suggesting rescheduling tasks to lighter days, splitting complex tasks, prioritizing urgent items).
  - Allow one-click user acceptance to reschedule or re-prioritize suggested tasks.

### R3. Automated Bugbot (CI Reviewer)
- Implement a GitHub Actions workflow acting as an automated "Bugbot" (inspired by Cursor's Bug Finder).
- The Bugbot analyzes git diffs / pull request changes using Gemini to detect logic flaws, edge cases, regression risks, and security issues, posting structured review comments or summaries.

### R4. Multi-Layer Verification & Chrome DevTools Protocol (CDP)
- Implement a multi-layer verification test suite to ensure verifiable code correctness and build trust:
  - Unit & Integration: Vitest and React Testing Library tests covering UI components, state management, and IndexedDB operations.
  - End-to-End CDP: Playwright / Puppeteer driving headless Chrome with direct Chrome DevTools Protocol (CDP) sessions to verify real IndexedDB data storage, DOM manipulation, task persistence across page reloads, and user interactions.
- Enforce strict static analysis: ESLint (with TypeScript & React hooks recommended rules), TypeScript in strict mode (`tsc --noEmit`), and Prettier formatting.
- Construct a GitHub Actions CI pipeline configured for `https://github.com/nikhilkesari/todo` running lints, typechecks, Vitest unit tests, and headless CDP verification on every push and pull request.

## Acceptance Criteria

### Core Functionality & Persistence
- [ ] Users can create, view, edit, complete, and delete tasks with instant UI feedback.
- [ ] Tasks can be categorized into lists/projects and assigned due dates.
- [ ] Tasks and lists persist accurately in browser IndexedDB across page reloads and browser sessions.

### AI Workload Advisor & Backend Proxy
- [ ] The backend proxy successfully routes AI requests to Gemini using environment-provided credentials (`GEMINI_API_KEY`).
- [ ] The AI Assistant drawer surfaces overcommitment warnings when tasks on a single date exceed reasonable capacity and offers one-click rescheduling suggestions.

### Automated Bugbot & CI Pipeline
- [ ] GitHub Actions workflow files (`.github/workflows/ci.yml` and `.github/workflows/bugbot.yml`) are configured, syntactically valid, and ready for deployment to `https://github.com/nikhilkesari/todo`.
- [ ] Bugbot workflow reliably inspects diffs and formats diagnostic feedback.

### Objective Verification
- [ ] `npm run lint` and `npm run typecheck` execute cleanly with zero warnings or errors.
- [ ] Unit and integration test suite (`npm test`) passes 100% of test cases.
- [ ] End-to-end CDP test suite (`npm run test:e2e` or CDP verification runner) launches headless Chrome, creates tasks, verifies IndexedDB state via CDP, and confirms persistence after reload without flaky timeouts.

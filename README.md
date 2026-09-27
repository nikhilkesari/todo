# Todo Application with Gemini AI & Chrome DevTools Protocol (CDP) Verification

A high-trust, responsive React + TypeScript Todo application styled with Tailwind CSS, persisted locally in browser IndexedDB, powered by Google Gemini AI workload intelligence, and verified using multi-tier unit and Chrome DevTools Protocol (CDP) browser tests.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)
![Tailwind](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)
![Playwright](https://img.shields.io/badge/Playwright-CDP-green.svg)
![Vitest](https://img.shields.io/badge/Vitest-34%2F34%20Pass-brightgreen.svg)

---

## 🌟 Key Features

### 1. Task Management & Categorization (CRUD)
- **Full CRUD**: Create tasks with title, description, priority (`low`, `medium`, `high`), due date, and complexity.
- **Completion Toggle**: Visual strikethrough, opacity shift, and completion state toggling.
- **Project/List Organization**: Organize tasks into custom lists (e.g. *Inbox*, *Work*, *Personal*, *Groceries*) with project badges.
- **Temporal Quick Filters**: Filter by *Today*, *Upcoming*, *Overdue*, and *All*.
- **Client Persistence**: 100% client-side persistence in browser IndexedDB (`todo_app_db`) via `idb` with 5 indexed keypaths for fast offline queries.

### 2. Google Gemini AI Workload Advisor & Backend Proxy
- **Secure Architecture**: Lightweight Node.js/Express backend proxy (`server/`) keeps `GEMINI_API_KEY` isolated from client bundles.
- **Overcommitment Detection**: Proactively detects when a user is overcommitted on any specific date (>4 tasks or high cognitive load).
- **Interactive AI Assistant Drawer**: Slide-out drawer with a 7-day capacity visualizer, conversational scheduling advice, and one-click rebalance suggestions.
- **Heuristic Fallback Engine**: Deterministic offline/keyless engine ensures the UI and rebalancing work seamlessly even when no API key is set or when offline.

### 3. Cursor-Style Automated Bugbot
- **Workflow**: Automated GitHub Actions review bot ([`.github/workflows/bugbot.yml`](.github/workflows/bugbot.yml)).
- **Intelligent Inspection**: Extracts bounded git diffs (50KB safety clamp) and prompts Gemini (`gemini-2.5-flash`) to review for:
  - Logic flaws & async race conditions
  - IndexedDB transaction integrity & schema collisions
  - Security vulnerabilities & exposed secrets
  - Regressions & breaking API contracts
- **Sticky PR Summaries**: Idempotent comments posted directly on GitHub pull requests.

### 4. Chrome DevTools Protocol (CDP) & Multi-Layer Verification
- **Unit & Integration Suite**: 34 Vitest tests covering repositories, optimistic state rollback closures, date calculations, and Express routes.
- **Direct Chrome DevTools Protocol Tests**: Playwright harness interacting directly with Chrome's native `IndexedDB` CDP domain ([`tests/cdp/cdpHelper.ts`](tests/cdp/cdpHelper.ts)) to verify on-disk object store records and reload persistence.
- **GitHub Actions CI Pipeline**: Complete 3-stage CI pipeline ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) running ESLint, TypeScript typecheck, Vitest, and headless Chrome CDP verification on push and PR.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (recommended Node 22)
- pnpm 9+ or 10+ (`corepack enable pnpm`)

### Installation
```bash
# Clone the repository
git clone https://github.com/nikhilkesari/todo.git
cd todo

# Install dependencies using pnpm
pnpm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Google Gemini API key:
```env
GEMINI_API_KEY=your_google_gemini_api_key
PORT=3001
```

### Development (Single Command)
Run both the Express backend proxy and the Vite React frontend concurrently with a single command:
```bash
pnpm dev
# or
pnpm start
```

This starts:
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend Proxy**: [http://localhost:3001](http://localhost:3001)

*(If you ever need to run them separately in individual terminals, you can use `pnpm run dev:server` and `pnpm run dev:client`)*

---

## 🧪 Testing & Verification

### Static Analysis
```bash
# Run ESLint (Flat Config)
pnpm run lint

# Run TypeScript Strict Typecheck
pnpm run typecheck
```

### Unit & Integration Tests (Vitest)
```bash
pnpm test
```

### End-to-End & Chrome DevTools Protocol Tests (Playwright)
```bash
# Run full 30-test suite (includes CDP storage verification)
pnpm run test:e2e
```

### Production Build
```bash
pnpm run build
```

---

## 📁 Project Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml                 # 3-stage GitHub Actions CI pipeline
│       └── bugbot.yml             # Cursor-style Gemini automated PR reviewer
├── scripts/
│   ├── bugbot.mjs                 # Bugbot review evaluation engine
│   └── eslint.config.js           # ESLint v9 Flat Config
├── server/                        # Express Backend Proxy
│   ├── index.ts                   # Express server entry point
│   ├── routes/                    # /api/health and /api/ai/* endpoints
│   ├── services/                  # Gemini client & heuristic fallback engine
│   └── types/                     # Server TypeScript types
├── src/                           # React + TypeScript Frontend
│   ├── components/
│   │   ├── ai/                    # AIAssistantDrawer & visualizers
│   │   ├── layout/                # Responsive layout & header
│   │   ├── projects/              # Project list & modal
│   │   └── tasks/                 # Task list, task items, quick add, edit modal
│   ├── context/                   # AppContext & optimistic taskReducer
│   ├── db/                        # IndexedDB database & repositories (idb)
│   ├── services/                  # Client aiService with proxy & fallback
│   └── test/                      # Vitest unit test suites
└── tests/                         # Playwright E2E & CDP Verification
    ├── cdp/                       # Direct CDP session helper & persistence tests
    └── e2e/                       # CRUD, projects, filters, and workflow scenarios
```

---

## 🔒 Verification & Quality Metrics

| Check | Tool | Result |
|---|---|---|
| Static Analysis | ESLint (`scripts/eslint.config.js`) | **0 Errors, 0 Warnings** |
| Type Safety | TypeScript `5.7` (`tsc --noEmit`) | **0 Errors** |
| Unit & Repository Tests | Vitest + React Testing Library | **34 / 34 Passed** |
| CDP & Browser Tests | Playwright + Chrome DevTools Protocol | **30 / 30 Passed** |
| Production Build | Vite 6 | **dist/ generated cleanly** |

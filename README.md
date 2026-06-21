# Legion Hutta

> **A modern, language-agnostic web notebook — _better than all notebooks_.**
> By **Death Legion Team**.

Legion Hutta is a Jupyter-style interactive computing notebook built with a
Next.js 16 + React 19 frontend and a FastAPI Python backend. It ships with
its own native `.legion` notebook format (with full `.ipynb` interop),
multi-platform sandboxes (Local / E2B / Daytona), an AI assistant, a
variables inspector, a command palette, and a public v1 API for agentic AIs.

---

## ✨ Features

### Core notebook
- **Code + Markdown cells** with CodeMirror 6 editor (Python syntax, autocomplete, bracket matching, line numbers, word-wrap toggle).
- **Streaming execution** via Server-Sent Events — see output appear live as the cell runs.
- **Rich output rendering**: stdout, stderr, error tracebacks, `image/png`, `image/jpeg`, `text/html`, `text/markdown`, `application/json`, `text/latex`, `text/plain`.
- **Persistent kernel state** — variables, imports, and module-level mutations survive across cells.
- **Execution metadata** — execution count, wall-clock time per cell, error state.

### v0.5 — Productivity & analytics
- **Cell bookmarks** — star important cells (`Shift+B` or the star icon in the cell hover toolbar). Bookmarks appear in a dedicated section at the top of the Outline panel.
- **Snippets library** (`Ctrl+Shift+K`) — modal dialog with quick-insert code patterns: imports, CSV loading, plots, function templates, `%%ai` prompts, markdown sections, benchmark scaffolds. Click to insert below the active cell.
- **Notebook statistics** (`Ctrl+Shift+Y`) — modal with cell counts (code / markdown / bookmarked), source size (chars / lines / bytes), execution-time stats (total / avg / slowest), tag aggregation.
- **Clear all outputs** (`Ctrl+Shift+L`) — wipes outputs, execution counts, and timings for every code cell in one keystroke.
- **Run cells above** (`Shift+R`) and **run cells below** (`Shift+N`) — execute only the cells before or after the active cell, stopping on the first error.
- **Output actions** — hover any rich output to reveal Copy and Download buttons. Images download as `.png` / `.jpg`; JSON downloads as `.json`; HTML / markdown / LaTeX / plain text all have one-click copy.

### v0.4 — Cell editing & UX
- **Cell drag-and-drop reordering** — grab any cell by its left gutter to drag it anywhere.
- **Clipboard**: copy (`Shift+C`), cut (`Shift+X`), paste (`Shift+V`), duplicate (`Shift+D`).
- **Split cell at cursor** (`Ctrl+Shift+-`) — break a long cell into two at the cursor.
- **Merge with cell below** (`Shift+M`).
- **Focus / presentation mode** (`F`) — collapses chrome, narrows the page, hides keyboard hints.
- **Status bar** — kernel status dot + spec, sandbox, cell count (code vs. md), line/char totals, error count, running cell count, clipboard state, auto-save indicator, dirty indicator, relative last-saved time, focus-mode toggle.
- **Last-saved timestamp** persisted in the store.

### v0.3 — Format, sandboxes, AI
- **Native `.legion` file format** — JSON-based, versioned, carries sandbox + AI history that `.ipynb` can't.
- **Bidirectional `.ipynb` conversion** — round-trip safe via `metadata.legion-hutta`.
- **Three sandboxes**: `local` (subprocess), `e2b` (E2B cloud), `daytona` (Daytona cloud). Mock removed.
- **AI Assistant panel** (`Ctrl+/`) — chat, explain cell, fix error, generate cells from prompt.
- **`%%ai` magic** — prepend `%%ai` to any cell to query the LLM inline.
- **Variables inspector** (`Ctrl+Shift+V`) — live view of kernel namespace.
- **Outline / TOC** (`Ctrl+Shift+O`) — jump-to-cell from markdown headings.
- **Find & replace** (`Ctrl+H`) — across all cells, with regex & case-sensitivity options.
- **Command palette** (`Ctrl+P`) — every action reachable in two keystrokes.
- **Shortcuts help** (`?`) — full list of keyboard shortcuts.
- **Notebook persistence** — save/open to a local SQLite database via Prisma.
- **Auto-save every 30s** when there are unsaved changes.
- **Per-cell collapse** — hide code, keep output visible. Bulk collapse/expand all.
- **Word-wrap + line-numbers toggles** in the toolbar.
- **Theme toggle** — dark (default) / light.

### Backend (FastAPI)
- Language-agnostic kernel architecture: `BaseKernel` ABC + `KERNEL_REGISTRY`. Adding a language = implement `BaseKernel` + register.
- `PythonKernel` — long-lived `python -u` subprocess running a JSON-over-stdio REPL with clean stdout/stderr separation, structured error reporting, SIGINT-based interrupt.
- Multi-sandbox abstraction: `BaseSandbox` ABC + `SANDBOX_REGISTRY`.
- **Public v1 API** for agentic AIs (gated by `X-Legion-Key` header):
  - `GET  /api/v1/format/spec` — `.legion` format spec.
  - `POST /api/v1/format/legion` — validate + normalize a `.legion` document.
  - `POST /api/v1/format/legion/to-ipynb` — convert.
  - `POST /api/v1/format/ipynb/to-legion` — convert.
  - `GET  /api/v1/sandboxes` — list available sandboxes.

---

## 🚀 Quick start

### Prerequisites
- Node.js 20+ (or Bun)
- Python 3.11+
- (Optional) E2B API key — set `E2B_API_KEY` env var
- (Optional) Daytona API key — set `DAYTONA_API_KEY` env var

### Backend
```bash
cd python-backend
pip install -r requirements.txt
bash ../scripts/start-python-backend.sh
# → uvicorn on http://localhost:8000
```

### Frontend
```bash
bun install      # or npm install
bun run db:push  # create the SQLite database
bun run dev      # or: npm run dev
# → http://localhost:3000
```

---

## ⌨️ Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Run cell, select below | `Shift+Enter` |
| Run cell, stay | `Ctrl+Enter` |
| Run cell, insert below | `Alt+Enter` |
| Insert cell below / above | `B` / `A` |
| Delete cell | `D D` (double-tap) |
| Collapse / expand cell | `C` |
| Copy / cut / paste cell | `Shift+C` / `Shift+X` / `Shift+V` |
| Duplicate cell | `Shift+D` |
| Merge with cell below | `Shift+M` |
| Split cell at cursor | `Ctrl+Shift+-` |
| Navigate cells | `↑` / `↓` |
| Edit cell | `Enter` |
| Exit edit / close dialog | `Esc` |
| Focus mode | `F` |
| Command palette | `Ctrl+P` |
| AI assistant | `Ctrl+/` |
| Variables inspector | `Ctrl+Shift+V` |
| Outline / TOC | `Ctrl+Shift+O` |
| Find & replace | `Ctrl+H` |
| Save notebook | `Ctrl+S` |
| Export as `.legion` | `Ctrl+Shift+E` |
| Export as `.ipynb` | `Ctrl+Shift+J` |
| Import file | `Ctrl+Shift+I` |
| Full shortcuts list | `?` |

Press `?` inside the app for the complete list.

---

## 📁 `.legion` file format

A `.legion` file is a JSON document:

```jsonc
{
  "format": "legion-hutta",
  "format_version": 1,
  "app_version": "0.3.0",
  "metadata": {
    "title": "my-notebook.legion",
    "sandbox": "local",
    "kernel": { "name": "python3", "display_name": "Python 3" },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "cells": [
    { "id": "…", "kind": "code", "source": "print('hi')", "execution_count": 1 },
    { "id": "…", "kind": "markdown", "source": "# Hello" }
  ],
  "ai_history": [
    { "id": "…", "role": "user", "content": "explain this cell" },
    { "id": "…", "role": "assistant", "content": "…" }
  ]
}
```

The format is **versioned** (`format_version: 1`). Future versions will be
backward-compatible. The `ai_history` and `sandbox` fields are what `.ipynb`
can't carry natively — they're preserved when you convert to `.ipynb` by
stashing them under `metadata.legion-hutta`.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 16 + React 19 frontend (port 3000)              │
│  ├─ Zustand store (notebook-store.ts)                    │
│  ├─ CodeMirror 6 editor                                  │
│  ├─ shadcn/ui components                                 │
│  └─ SSE client for streaming execution                   │
└──────────────────────────────────────────────────────────┘
                          │ HTTP / SSE
┌──────────────────────────────────────────────────────────┐
│  FastAPI backend (port 8000)                             │
│  ├─ /api/*        — user-facing endpoints                │
│  ├─ /api/v1/*     — public API for agentic AIs           │
│  ├─ KernelManager — kernel lifecycle                     │
│  ├─ BaseKernel    — ABC for language kernels             │
│  │   └─ PythonKernel (subprocess REPL)                   │
│  └─ BaseSandbox   — ABC for execution sandboxes          │
│      ├─ LocalSubprocessSandbox                           │
│      ├─ E2BSandbox                                        │
│      └─ DaytonaSandbox                                    │
└──────────────────────────────────────────────────────────┘
```

---

## 📂 Project structure

```
.
├── src/                          # Next.js frontend
│   ├── app/                      # App router (pages, API routes)
│   ├── components/
│   │   ├── notebook/             # Notebook UI components
│   │   └── ui/                   # shadcn/ui primitives
│   ├── lib/
│   │   ├── notebook-store.ts     # Zustand store
│   │   ├── notebook-api.ts       # Backend API client + SSE parser
│   │   ├── legion-format.ts      # .legion ↔ .ipynb conversion
│   │   ├── notebook-persistence.ts
│   │   ├── db.ts                 # Prisma client
│   │   └── ai.ts                 # AI helper
│   └── types/notebook.ts         # Shared types
├── python-backend/               # FastAPI backend
│   ├── main.py                   # App + endpoints
│   ├── kernels/                  # BaseKernel + PythonKernel
│   └── sandboxes/                # BaseSandbox + Local/E2B/Daytona
├── prisma/                       # Database schema
├── scripts/                      # Helper scripts
└── public/                       # Static assets
```

---

## 🛠️ Tech stack

**Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, CodeMirror 6, next-themes, lucide-react.

**Backend**: Python 3.11+, FastAPI, uvicorn. No external state — kernels are long-lived subprocesses.

**Database**: SQLite via Prisma (for notebook persistence).

---

## 📜 License

MIT — see [LICENSE](./LICENSE).

---

## 🧠 Credits

Built by **Death Legion Team** — _better than all notebooks_.

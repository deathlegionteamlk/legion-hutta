---
Task ID: legion-hutta-mvp
Agent: main (Super Z)
Task: Build "Legion Hutta" — a web-based notebook application for interactive computing, similar to a simplified Jupyter. Python backend (Jupyter-Server-style), modern frontend, language-agnostic kernel architecture, runnable locally for development. Branding: "Legion Hutta by Death Legion Team — better than all notebooks".

Work Log:
- Invoked fullstack-dev skill, initialized the Next.js 16 project environment.
- Designed language-agnostic kernel architecture:
  - `BaseKernel` abstract class with `start/execute/interrupt/restart/shutdown` contract.
  - `KernelSpec` dataclass for static language metadata (display name, file extension, CodeMirror mode, etc.).
  - `KernelManager` singleton for kernel lifecycle.
  - `KERNEL_REGISTRY` dict in `kernels/__init__.py` — adding a new language = implement `BaseKernel` + register here.
- Implemented `PythonKernel` using a long-lived `python -u` subprocess running a JSON-over-stdio REPL:
  - Persistent state across cell executions (variables, imports).
  - Clean stdout/stderr separation via `contextlib.redirect_stdout/stderr`.
  - Structured error reporting (exception name, value, traceback).
  - Interruptible via SIGINT.
  - Last-expression printing via `compile(..., "single")` with fallback to `exec` mode.
- Built FastAPI backend on port 8000 with these endpoints:
  - GET /api/health
  - GET /api/kernelspecs
  - GET /api/kernels | POST /api/kernels | GET /api/kernels/{id} | DELETE /api/kernels/{id}
  - POST /api/kernels/{id}/interrupt | /restart
  - POST /api/kernels/{id}/execute (single response)
  - POST /api/kernels/{id}/execute/stream (Server-Sent Events for live output)
- Started Python backend via `scripts/start-python-backend.sh` (uvicorn with --reload on port 8000).
- Verified backend end-to-end via curl: create kernel → execute (x=42) → execute (x**3=74088, state persists) → error (1/0) → shutdown. All working.
- Installed frontend deps: `@uiw/react-codemirror`, `@codemirror/lang-python`, `@codemirror/theme-one-dark`.
- Built frontend TypeScript types (`src/types/notebook.ts`) mirroring backend shapes.
- Built API client (`src/lib/notebook-api.ts`) that routes through the Caddy gateway via `?XTransformPort=8000` and includes an async-generator SSE parser for `executeStream`.
- Built Zustand store (`src/lib/notebook-store.ts`) holding notebook state + operations: init, startKernel, interrupt, restart, addCell, removeCell, moveCell, setCellSource, setCellKind, clearCellOutput, runCell (streaming), runAll.
- Built UI components:
  - `CodeEditor.tsx` — CodeMirror 6 wrapper with Python syntax, One Dark theme, line wrapping, Jupyter-style Shift/Ctrl/Alt+Enter shortcuts.
  - `OutputArea.tsx` — renders stdout/stderr/error chunks; pulsing dot while running.
  - `MarkdownView.tsx` — minimal Markdown renderer (headings, bold/italic, code, lists, links, paragraphs) — no extra deps.
  - `Cell.tsx` — code/markdown cell with hover toolbar (run, move up/down, switch kind, clear, insert, delete) + left-gutter execution count.
  - `Toolbar.tsx` — top bar with Legion Hutta branding, editable filename, Run All, Add Cell, Interrupt, Restart, Save (.ipynb export), theme toggle, kernel status pill.
  - `Notebook.tsx` — shell wiring init effect + global keyboard shortcuts (B/A insert, D D delete, ↑/↓ navigate, Enter edit, Ctrl+Enter run) + sticky footer.
- Updated `layout.tsx` with proper title/metadata + `ThemeProvider` (defaultTheme=dark).
- Fixed two lint issues: removed setState-in-effect `mounted` pattern in Toolbar (used CSS dark: variants instead), removed unused eslint-disable in store. Then fixed CodeMirror hydration warning using `useSyncExternalStore` for the mounted check.
- Verified end-to-end via Agent Browser through the gateway (port 81):
  - Page loads cleanly, branding visible ("Legion Hutta / by Death Legion Team / better than all notebooks").
  - Kernel auto-starts on page load → status pill shows "Idle Python 3".
  - Run All executes both code cells: cell 1 prints welcome text, cell 2 prints "x * y = 42" (proves persistent state across cells).
  - Add Cell button creates a new cell (3 → 4 cells).
  - Restart button clears kernel state + all cell outputs + execution counts.
  - No console errors, no hydration warnings after fix.
- Saved screenshots to /home/z/my-project/download/notebook-screenshot.png and notebook-final.png.

Stage Summary:
- Project structure set up and runnable locally for development.
- Backend: /home/z/my-project/python-backend/ — FastAPI + uvicorn on port 8000, language-agnostic kernel architecture, Python kernel with persistent state via subprocess REPL.
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind + shadcn/ui + CodeMirror 6 — full notebook UI with cell management, streaming execution, kernel controls, dark mode, keyboard shortcuts.
- Both services run via the existing dev script (Next.js on 3000) + scripts/start-python-backend.sh (uvicorn on 8000). The Caddy gateway on port 81 routes both via `?XTransformPort=8000`.
- Verified working end-to-end via Agent Browser: kernel starts, cells execute with persistent state, outputs stream live, restart clears state, no runtime errors.
- Architecture is language-agnostic: adding a new kernel = subclass BaseKernel + register in KERNEL_REGISTRY. Frontend auto-discovers new kernels via GET /api/kernelspecs.

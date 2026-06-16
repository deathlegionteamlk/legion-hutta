# Legion Hutta — Backend

A small, language-agnostic notebook kernel server inspired by Jupyter Server.
Built by **Death Legion Team**.

## Stack

- **Python 3.12+**
- **FastAPI** — HTTP API
- **uvicorn** — ASGI server
- No external Python packages required by the kernel itself — it spawns
  a stock `python -u` subprocess running a tiny REPL loop.

## Architecture

```
python-backend/
├── main.py              # FastAPI app + routes
├── kernel_manager.py    # In-memory kernel registry / lifecycle
├── kernels/
│   ├── __init__.py      # Kernel registry (add new languages here)
│   ├── base.py          # Abstract BaseKernel + shared dataclasses
│   └── python_kernel.py # Concrete Python kernel (subprocess REPL)
└── requirements.txt
```

### Why a subprocess REPL?

Each kernel instance owns a long-lived `python -u` child process running
a JSON-over-stdio REPL. That gives us:

- **Persistent state** between cell executions (variables, imports, etc.)
- **Clean stdout / stderr separation** without monkey-patching `sys.stdout`
  in the parent process
- **Interruptibility** via `SIGINT` to the child
- **Language-agnostic surface** — the protocol is JSON, so adding a JS or
  R kernel later only requires implementing the same REPL contract in
  that language.

### Adding a new language

1. Implement a subclass of `BaseKernel` in `kernels/<lang>_kernel.py`.
2. Expose it via a module-level `KERNEL_ENTRYPOINT` symbol.
3. Register it in `kernels/__init__.py`'s `KERNEL_REGISTRY` dict.

The frontend will automatically pick up the new kernel spec via
`GET /api/kernelspecs`.

## API

| Method | Path                                  | Description                       |
|--------|---------------------------------------|-----------------------------------|
| GET    | `/api/health`                         | Liveness probe                    |
| GET    | `/api/kernelspecs`                    | List available kernel languages   |
| GET    | `/api/kernels`                        | List running kernels              |
| POST   | `/api/kernels`                        | Start a new kernel                |
| GET    | `/api/kernels/{id}`                   | Kernel status                     |
| DELETE | `/api/kernels/{id}`                   | Shut down a kernel                |
| POST   | `/api/kernels/{id}/interrupt`         | Interrupt current execution       |
| POST   | `/api/kernels/{id}/restart`           | Restart kernel, clear state       |
| POST   | `/api/kernels/{id}/execute`           | Execute code (single response)    |
| POST   | `/api/kernels/{id}/execute/stream`    | Execute code (SSE stream)         |

## Running locally

```bash
cd python-backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Health check: `curl http://localhost:8000/api/health`

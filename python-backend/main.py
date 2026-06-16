"""
Legion Hutta backend API.

Public API surface:
  - GET    /api/health
  - GET    /api/kernelspecs
  - GET    /api/sandboxes                 list sandbox backends with availability
  - GET    /api/kernels
  - POST   /api/kernels                   { name, sandbox }
  - GET    /api/kernels/{id}
  - DELETE /api/kernels/{id}
  - POST   /api/kernels/{id}/interrupt
  - POST   /api/kernels/{id}/restart
  - POST   /api/kernels/{id}/execute
  - POST   /api/kernels/{id}/execute/stream
  - GET    /api/kernels/{id}/variables    variables inspector
  - POST   /api/kernels/{id}/ai           proxy AI call (chat / explain / fix / generate)

Public API v1 (for agentic AIs — requires X-Legion-Key header):
  - GET    /api/v1/health
  - GET    /api/v1/sandboxes
  - GET    /api/v1/kernels
  - POST   /api/v1/kernels
  - GET    /api/v1/kernels/{id}
  - DELETE /api/v1/kernels/{id}
  - POST   /api/v1/kernels/{id}/execute
  - POST   /api/v1/kernels/{id}/execute/stream
  - GET    /api/v1/kernels/{id}/variables
  - POST   /api/v1/ai/chat                streaming chat completion
  - GET    /api/v1/format/spec            .legion format specification
  - POST   /api/v1/format/legion          validate + normalize a .legion document
  - POST   /api/v1/format/legion/to-ipynb convert .legion -> nbformat 4 (.ipynb)
  - POST   /api/v1/format/ipynb/to-legion convert nbformat 4 (.ipynb) -> .legion

The v1 API mirrors the internal API but is designed for programmatic
access. Auth is via a static API key set in the LEGION_HUTTA_API_KEY
environment variable. If unset, all v1 routes return 503.
"""
from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from kernel_manager import kernel_manager
from kernels import KernelStatus, OutputChunk, OutputType

logger = logging.getLogger("legion-hutta")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


# ---- Request / response models ----


class CreateKernelRequest(BaseModel):
    name: str = Field(default="python3")
    sandbox: str = Field(default="local", description="Sandbox backend: local, e2b, daytona")


class ExecuteRequest(BaseModel):
    code: str


class AiChatRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    model: Optional[str] = None
    context: Optional[str] = None  # notebook context (cells, outputs)


# ---- Lifespan ----


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    logger.info("Legion Hutta backend starting up")
    yield
    logger.info("Legion Hutta backend shutting down - cleaning up kernels")
    await kernel_manager.shutdown_all()


# ---- App ----


app = FastAPI(
    title="Legion Hutta Backend",
    description="A language-agnostic notebook kernel server by Death Legion Team.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- API key auth (v1 only) ----


API_KEY = os.environ.get("LEGION_HUTTA_API_KEY", "")


async def require_api_key(x_legion_key: Optional[str] = Header(None)):
    """Dependency that gates v1 routes behind a static API key.

    The key is read from LEGION_HUTTA_API_KEY at startup. If unset,
    all v1 routes return 503. If set but the request doesn't include
    a matching X-Legion-Key header, return 401.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Public API is disabled. Set LEGION_HUTTA_API_KEY to enable.",
        )
    if not x_legion_key or x_legion_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_legion_key


# ---- Internal routes (no auth — same-origin as the Next.js frontend) ----


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "legion-hutta",
        "team": "Death Legion Team",
        "version": "0.2.0",
        "kernels_running": len(kernel_manager.list_kernels()),
        "public_api_enabled": bool(API_KEY),
    }


@app.get("/api/kernelspecs")
async def list_kernelspecs() -> dict[str, Any]:
    specs = kernel_manager.list_specs()
    return {
        "default": specs[0].name if specs else None,
        "kernelspecs": {
            s.name: {
                "name": s.name,
                "display_name": s.display_name,
                "language": s.language,
                "file_extension": s.file_extension,
                "codemirror_mode": s.codemirror_mode,
                "description": s.description,
            }
            for s in specs
        },
    }


@app.get("/api/sandboxes")
async def list_sandboxes() -> dict[str, Any]:
    return {"sandboxes": await kernel_manager.list_sandboxes()}


@app.get("/api/kernels")
async def list_kernels() -> dict[str, Any]:
    return {"kernels": [k.to_dict() for k in kernel_manager.list_kernels()]}


@app.post("/api/kernels")
async def create_kernel(req: CreateKernelRequest) -> dict[str, Any]:
    try:
        kernel = await kernel_manager.start_kernel(name=req.name, sandbox_name=req.sandbox)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to start kernel")
        raise HTTPException(status_code=500, detail=f"Failed to start kernel: {exc}")
    return kernel.to_dict()


@app.get("/api/kernels/{kernel_id}")
async def get_kernel(kernel_id: str) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")
    return kernel.to_dict()


@app.delete("/api/kernels/{kernel_id}")
async def shutdown_kernel(kernel_id: str) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")
    await kernel_manager.shutdown(kernel_id)
    return {"ok": True, "kernel_id": kernel_id}


@app.post("/api/kernels/{kernel_id}/interrupt")
async def interrupt_kernel(kernel_id: str) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")
    await kernel.interrupt()
    return kernel.to_dict()


@app.post("/api/kernels/{kernel_id}/restart")
async def restart_kernel(kernel_id: str) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")
    await kernel.restart()
    return kernel.to_dict()


@app.get("/api/kernels/{kernel_id}/variables")
async def get_variables(kernel_id: str) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")
    return await kernel.introspect()


@app.post("/api/kernels/{kernel_id}/execute")
async def execute_kernel(kernel_id: str, req: ExecuteRequest) -> dict[str, Any]:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")

    outputs: list[OutputChunk] = []
    error_name: Optional[str] = None
    error_value: Optional[str] = None
    traceback: list[str] = []
    success = True

    async for chunk in kernel.execute(req.code):
        outputs.append(chunk)
        if chunk.type == OutputType.ERROR:
            success = False
            error_name = chunk.data.get("name")
            error_value = chunk.text
            traceback = chunk.data.get("traceback", [])

    return {
        "success": success,
        "outputs": [o.to_dict() for o in outputs],
        "error_name": error_name,
        "error_value": error_value,
        "traceback": traceback,
        "execution_count": kernel.execution_count,
    }


@app.post("/api/kernels/{kernel_id}/execute/stream")
async def execute_kernel_stream(kernel_id: str, req: ExecuteRequest) -> StreamingResponse:
    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")

    async def event_stream():
        success = True
        error_name: Optional[str] = None
        error_value: Optional[str] = None
        traceback: list[str] = []
        try:
            async for chunk in kernel.execute(req.code):
                if chunk.type == OutputType.ERROR:
                    success = False
                    error_name = chunk.data.get("name")
                    error_value = chunk.text
                    traceback = chunk.data.get("traceback", [])
                yield f"data: {json.dumps(chunk.to_dict())}\n\n"
        except Exception as exc:  # noqa: BLE001
            logger.exception("Kernel execution failed")
            yield f"data: {json.dumps({'type': 'error', 'text': str(exc), 'data': {}})}\n\n"
            success = False
            error_value = str(exc)
        summary = {
            "success": success,
            "error_name": error_name,
            "error_value": error_value,
            "traceback": traceback,
            "execution_count": kernel.execution_count,
        }
        yield f"event: done\ndata: {json.dumps(summary)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---- AI proxy (delegates to Next.js /api/ai/raw) ----


@app.post("/api/kernels/{kernel_id}/ai")
async def kernel_ai_proxy(kernel_id: str, req: AiChatRequest) -> dict[str, Any]:
    """Invoke the LLM in the context of this kernel.

    This is a thin proxy over the Next.js AI route so the kernel
    manager stays Python-only. The Next.js side calls z-ai-web-dev-sdk.
    """
    import urllib.request
    import urllib.error

    kernel = kernel_manager.get(kernel_id)
    if kernel is None:
        raise HTTPException(status_code=404, detail="Kernel not found")

    # If the user passed `context=None`, auto-attach kernel state.
    context = req.context
    if context is None:
        try:
            introspection = await kernel.introspect()
            context = json.dumps({
                "kernel_id": kernel.kernel_id,
                "execution_count": kernel.execution_count,
                "variables": introspection.get("variables", [])[:50],
            })
        except Exception:  # noqa: BLE001
            context = ""

    target = os.environ.get("LEGION_HUTTA_AI_URL", "http://localhost:3000/api/ai/raw")
    payload = json.dumps({
        "prompt": req.prompt,
        "system": req.system,
        "model": req.model,
        "context": context,
    }).encode()

    def _do() -> dict:
        http_req = urllib.request.Request(
            target,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(http_req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except urllib.error.HTTPError as e:
            return {"error": f"upstream HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:300]}"}

    import asyncio
    result = await asyncio.to_thread(_do)
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


# ---- Public API v1 (for agentic AIs) ----


@app.get("/api/v1/health")
async def v1_health(_: str = Depends(require_api_key)) -> dict[str, Any]:
    return await health()


@app.get("/api/v1/sandboxes")
async def v1_sandboxes(_: str = Depends(require_api_key)) -> dict[str, Any]:
    return await list_sandboxes()


@app.get("/api/v1/kernelspecs")
async def v1_kernelspecs(_: str = Depends(require_api_key)) -> dict[str, Any]:
    return await list_kernelspecs()


@app.get("/api/v1/kernels")
async def v1_list_kernels(_: str = Depends(require_api_key)) -> dict[str, Any]:
    return await list_kernels()


@app.post("/api/v1/kernels")
async def v1_create_kernel(req: CreateKernelRequest, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await create_kernel(req)


@app.get("/api/v1/kernels/{kernel_id}")
async def v1_get_kernel(kernel_id: str, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await get_kernel(kernel_id)


@app.delete("/api/v1/kernels/{kernel_id}")
async def v1_shutdown_kernel(kernel_id: str, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await shutdown_kernel(kernel_id)


@app.post("/api/v1/kernels/{kernel_id}/interrupt")
async def v1_interrupt(kernel_id: str, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await interrupt_kernel(kernel_id)


@app.post("/api/v1/kernels/{kernel_id}/restart")
async def v1_restart(kernel_id: str, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await restart_kernel(kernel_id)


@app.get("/api/v1/kernels/{kernel_id}/variables")
async def v1_variables(kernel_id: str, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await get_variables(kernel_id)


@app.post("/api/v1/kernels/{kernel_id}/execute")
async def v1_execute(kernel_id: str, req: ExecuteRequest, _: str = Depends(require_api_key)) -> dict[str, Any]:
    return await execute_kernel(kernel_id, req)


@app.post("/api/v1/kernels/{kernel_id}/execute/stream")
async def v1_execute_stream(kernel_id: str, req: ExecuteRequest, _: str = Depends(require_api_key)) -> StreamingResponse:
    return await execute_kernel_stream(kernel_id, req)


@app.post("/api/v1/ai/chat")
async def v1_ai_chat(req: AiChatRequest, _: str = Depends(require_api_key)) -> dict[str, Any]:
    """Non-streaming AI chat completion for agentic AIs.

    Returns the full response text. For streaming, use the kernel
    execute endpoint with `%%ai` magic instead.
    """
    import asyncio
    import urllib.request

    target = os.environ.get("LEGION_HUTTA_AI_URL", "http://localhost:3000/api/ai/raw")
    payload = json.dumps({
        "prompt": req.prompt,
        "system": req.system,
        "model": req.model,
        "context": req.context,
    }).encode()

    def _do() -> dict:
        http_req = urllib.request.Request(
            target,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(http_req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))

    result = await asyncio.to_thread(_do)
    return result


# ---- Public API v1 — .legion format utilities ----
#
# These endpoints let agentic AIs serialize / deserialize notebooks in
# Legion's native .legion format, and convert to/from nbformat 4 (.ipynb).
# All round-trip through the same schema used by the frontend, so an AI
# agent can build a notebook, POST it to /api/v1/format/legion to validate
# and pretty-print, then execute it on a kernel.

LEGION_FORMAT = "legion"
LEGION_FORMAT_VERSION = 1
LEGION_APP_VERSION = "0.3.0"


class LegionCellInput(BaseModel):
    id: Optional[str] = None
    kind: str = Field(default="code", pattern="^(code|markdown)$")
    source: str = ""
    execution_count: Optional[int] = None
    outputs: list[dict[str, Any]] = Field(default_factory=list)


class LegionMetadataInput(BaseModel):
    title: str = "untitled.legion"
    kernel: Optional[dict[str, Any]] = None
    sandbox: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    legion_version: Optional[str] = None
    extensions: dict[str, Any] = Field(default_factory=dict)


class LegionDocumentInput(BaseModel):
    """Input shape for /api/v1/format/legion endpoints.

    Accepts either a full Legion document or a minimal subset; missing
    fields are filled with defaults. `format` and `format_version` are
    always normalized on output.
    """
    format: Optional[str] = None
    format_version: Optional[int] = None
    metadata: LegionMetadataInput = Field(default_factory=LegionMetadataInput)
    cells: list[LegionCellInput] = Field(default_factory=list)
    ai_history: Optional[list[dict[str, Any]]] = None


def _normalize_legion_doc(doc: LegionDocumentInput) -> dict[str, Any]:
    """Normalize input into a valid Legion document (v1)."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    cells_out = []
    for i, c in enumerate(doc.cells):
        cells_out.append({
            "id": c.id or f"cell-{i}",
            "kind": c.kind,
            "source": c.source,
            "execution_count": c.execution_count,
            "outputs": c.outputs or [],
        })
    return {
        "format": LEGION_FORMAT,
        "format_version": LEGION_FORMAT_VERSION,
        "metadata": {
            "title": doc.metadata.title or "untitled.legion",
            "kernel": doc.metadata.kernel,
            "sandbox": doc.metadata.sandbox or "local",
            "created_at": doc.metadata.created_at or now,
            "updated_at": now,
            "legion_version": doc.metadata.legion_version or LEGION_APP_VERSION,
            "extensions": doc.metadata.extensions or {},
        },
        "cells": cells_out,
        **({"ai_history": doc.ai_history} if doc.ai_history else {}),
    }


@app.post("/api/v1/format/legion")
async def v1_format_legion(
    doc: LegionDocumentInput,
    _: str = Depends(require_api_key),
) -> dict[str, Any]:
    """Validate and normalize a .legion document.

    Accepts a partial document, fills in defaults, and returns the
    canonical v1 representation. Useful for AI agents that want to
    build a notebook programmatically and validate it before saving.
    """
    return _normalize_legion_doc(doc)


@app.post("/api/v1/format/legion/to-ipynb")
async def v1_format_legion_to_ipynb(
    doc: LegionDocumentInput,
    _: str = Depends(require_api_key),
) -> dict[str, Any]:
    """Convert a .legion document to nbformat 4 (.ipynb).

    Rich outputs (MIME bundles) are preserved in `data`. AI history is
    not carried over (no .ipynb equivalent). The original Legion
    metadata is preserved under `metadata.legion-hutta` for round-trip.
    """
    normalized = _normalize_legion_doc(doc)
    kernel = (normalized["metadata"] or {}).get("kernel") or {}
    cells_out = []
    for c in normalized["cells"]:
        base = {
            "id": c["id"],
            "cell_type": c["kind"],
            "source": c["source"].split("\n"),
            "metadata": {},
        }
        if c["kind"] == "markdown":
            cells_out.append(base)
            continue
        outputs = []
        for o in c.get("outputs") or []:
            t = o.get("type")
            if t == "stdout" or t == "stderr":
                outputs.append({
                    "output_type": "stream",
                    "name": t,
                    "text": (o.get("text") or "").split("\n"),
                })
            elif t == "error":
                data = o.get("data") or {}
                outputs.append({
                    "output_type": "error",
                    "ename": data.get("name", "Error"),
                    "evalue": o.get("text", ""),
                    "traceback": data.get("traceback", []),
                })
            elif t == "result":
                data = o.get("data") or {}
                outputs.append({
                    "output_type": "display_data",
                    "data": data if data else {"text/plain": o.get("text", "")},
                    "metadata": {},
                })
            # status outputs are dropped (protocol-only)
        cells_out.append({
            **base,
            "execution_count": c.get("execution_count"),
            "outputs": outputs,
        })
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "name": kernel.get("name", "python3"),
                "display_name": kernel.get("display_name", "Python 3"),
                "language": kernel.get("language", "python"),
            },
            "legion-hutta": {
                "format": LEGION_FORMAT,
                "format_version": LEGION_FORMAT_VERSION,
                "sandbox": normalized["metadata"].get("sandbox", "local"),
                "legion_version": LEGION_APP_VERSION,
            },
        },
        "cells": cells_out,
    }


@app.post("/api/v1/format/ipynb/to-legion")
async def v1_format_ipynb_to_legion(
    payload: dict[str, Any],
    _: str = Depends(require_api_key),
) -> dict[str, Any]:
    """Convert an nbformat 4 (.ipynb) document to .legion.

    Best-effort: anything that doesn't map is dropped. The sandbox is
    pulled from `metadata.legion-hutta.sandbox` if present, else
    defaults to "local".
    """
    meta = payload.get("metadata") or {}
    kernel = meta.get("kernelspec") or {}
    legion_meta = meta.get("legion-hutta") or {}
    raw_cells = payload.get("cells") or []

    def _join_src(v: Any) -> str:
        if isinstance(v, list):
            return "".join(str(x) for x in v)
        return str(v or "")

    cells_out = []
    for i, c in enumerate(raw_cells):
        kind = "markdown" if c.get("cell_type") == "markdown" else "code"
        outputs = []
        if kind == "code":
            for o in c.get("outputs") or []:
                t = o.get("output_type")
                if t == "stream":
                    outputs.append({
                        "type": o.get("name", "stdout"),
                        "text": _join_src(o.get("text")),
                        "data": {},
                        "timestamp": 0,
                    })
                elif t == "error":
                    outputs.append({
                        "type": "error",
                        "text": str(o.get("evalue", "")),
                        "data": {
                            "name": o.get("ename", "Error"),
                            "traceback": o.get("traceback", []),
                        },
                        "timestamp": 0,
                    })
                elif t in ("display_data", "execute_result"):
                    data = o.get("data") or {}
                    text = _join_src(data.get("text/plain", ""))
                    outputs.append({
                        "type": "result",
                        "text": text,
                        "data": data,
                        "timestamp": 0,
                    })
        cells_out.append({
            "id": c.get("id") or f"cell-{i}",
            "kind": kind,
            "source": _join_src(c.get("source")),
            "execution_count": c.get("execution_count"),
            "outputs": outputs,
        })

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    return {
        "format": LEGION_FORMAT,
        "format_version": LEGION_FORMAT_VERSION,
        "metadata": {
            "title": "imported.legion",
            "kernel": {
                "name": kernel.get("name", "python3"),
                "display_name": kernel.get("display_name", kernel.get("name", "Python 3")),
                "language": kernel.get("language", "python"),
            } if kernel else None,
            "sandbox": legion_meta.get("sandbox", "local"),
            "created_at": now,
            "updated_at": now,
            "legion_version": LEGION_APP_VERSION,
            "extensions": {},
        },
        "cells": cells_out,
    }


@app.get("/api/v1/format/spec")
async def v1_format_spec(_: str = Depends(require_api_key)) -> dict[str, Any]:
    """Return the .legion format specification.

    Useful for AI agents that want to introspect the format before
    constructing a document.
    """
    return {
        "format": LEGION_FORMAT,
        "format_version": LEGION_FORMAT_VERSION,
        "legion_app_version": LEGION_APP_VERSION,
        "extension": ".legion",
        "schema": {
            "format": "string  (literal 'legion')",
            "format_version": "integer  (currently 1)",
            "metadata": {
                "title": "string",
                "kernel": "object | null  ({name, display_name, language})",
                "sandbox": "string | null  ('local' | 'e2b' | 'daytona')",
                "created_at": "ISO 8601 string",
                "updated_at": "ISO 8601 string",
                "legion_version": "string",
                "extensions": "object  (free-form future-proofing)",
            },
            "cells": [
                {
                    "id": "string",
                    "kind": "'code' | 'markdown'",
                    "source": "string",
                    "execution_count": "integer | null",
                    "outputs": [
                        {
                            "type": "'stdout' | 'stderr' | 'result' | 'error' | 'status'",
                            "text": "string",
                            "data": "object  (MIME bundle for 'result', {name, traceback} for 'error')",
                            "timestamp": "number  (epoch ms)",
                        }
                    ],
                }
            ],
            "ai_history": "array  (optional; {id, role, content})",
        },
        "endpoints": {
            "validate": "POST /api/v1/format/legion",
            "to_ipynb": "POST /api/v1/format/legion/to-ipynb",
            "from_ipynb": "POST /api/v1/format/ipynb/to-legion",
            "spec": "GET /api/v1/format/spec",
        },
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):  # noqa: ARG001
    logger.exception("Unhandled error")
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {exc}"},
    )

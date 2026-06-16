"""
Legion Hutta backend API.

A minimal Jupyter-Server-style backend that exposes:
  - GET    /api/kernelspecs           list available kernel languages
  - GET    /api/kernels               list running kernels
  - POST   /api/kernels               start a new kernel
  - GET    /api/kernels/{id}          kernel status
  - DELETE /api/kernels/{id}          shut down a kernel
  - POST   /api/kernels/{id}/interrupt
  - POST   /api/kernels/{id}/restart
  - POST   /api/kernels/{id}/execute  execute code (returns final result)
  - GET    /api/health                liveness probe

Run with:
    cd python-backend
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
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
    name: str = Field(default="python3", description="Kernel spec name, e.g. 'python3'")


class ExecuteRequest(BaseModel):
    code: str = Field(..., description="Source code to execute")


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
    version="0.1.0",
    lifespan=lifespan,
)

# Permissive CORS - in dev the Next.js frontend runs on a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Routes ----


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "legion-hutta",
        "team": "Death Legion Team",
        "kernels_running": len(kernel_manager.list_kernels()),
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


@app.get("/api/kernels")
async def list_kernels() -> dict[str, Any]:
    return {"kernels": [k.to_dict() for k in kernel_manager.list_kernels()]}


@app.post("/api/kernels")
async def create_kernel(req: CreateKernelRequest) -> dict[str, Any]:
    try:
        kernel = await kernel_manager.start_kernel(name=req.name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
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


@app.post("/api/kernels/{kernel_id}/execute")
async def execute_kernel(kernel_id: str, req: ExecuteRequest) -> dict[str, Any]:
    """Execute code and return the final aggregated result.

    For a non-streaming response. The `/execute/stream` endpoint
    below emits output chunks as server-sent events for a more
    interactive UX.
    """
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
    """Execute code, streaming each output chunk as a Server-Sent Event.

    Each event's `data` field is a JSON-encoded OutputChunk. The final
    event has `event: done` and contains the aggregated result summary.
    """
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
            "X-Accel-Buffering": "no",  # disable proxy buffering (nginx etc.)
        },
    )


# Fallback for unhandled errors so the frontend always gets JSON.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):  # noqa: ARG001
    logger.exception("Unhandled error")
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {exc}"},
    )

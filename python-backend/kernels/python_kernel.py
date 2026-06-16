"""
Python kernel for Legion Hutta.

Thin orchestrator that delegates execution to a pluggable sandbox
(local subprocess, E2B, Daytona, mock cloud). Supports:

  - Persistent state across executions (via the underlying sandbox)
  - Rich output: stdout, stderr, errors, structured results with
    MIME bundles (image/png, text/html, application/json, text/latex)
  - Introspection for the variables inspector
  - `%%ai` magic: delegates the prompt to an LLM (configured via env)
  - `%%time` magic: times the execution
  - `%%capture` magic: suppresses stdout but keeps results

Adding a new magic = handle it in `_strip_magics` and dispatch in
`execute()`.
"""
from __future__ import annotations

import os
import time
from typing import AsyncIterator, Optional

from kernels.base import BaseKernel, ExecutionResult, KernelSpec, KernelStatus, OutputChunk, OutputType
from sandboxes import (
    BaseSandbox,
    ExecutionEvent,
    ExecutionRequest,
    LocalSubprocessSandbox,
    SANDBOX_REGISTRY,
)


class PythonKernel(BaseKernel):
    """A Python kernel backed by any sandbox implementation."""

    def __init__(
        self,
        kernel_id: Optional[str] = None,
        sandbox: Optional[BaseSandbox] = None,
        sandbox_name: str = "local",
    ):
        if sandbox is None:
            cls = SANDBOX_REGISTRY.get(sandbox_name, LocalSubprocessSandbox)
            sandbox = cls()
        super().__init__(kernel_id=kernel_id, sandbox=sandbox)

    @staticmethod
    def spec() -> KernelSpec:
        return KernelSpec(
            name="python3",
            display_name="Python 3",
            language="python",
            file_extension=".py",
            codemirror_mode="python",
            description="Interactive Python 3 kernel with persistent state.",
        )

    async def start(self) -> None:
        await self.sandbox.start()
        self.status = KernelStatus.IDLE
        self._touch()

    async def execute(self, code: str) -> AsyncIterator[OutputChunk]:
        if not self.sandbox:
            self.status = KernelStatus.DEAD
            yield OutputChunk(type=OutputType.ERROR, text="no sandbox attached")
            return

        # Parse magics
        magics, body = _strip_magics(code)
        self._touch()
        self.status = KernelStatus.BUSY
        yield OutputChunk(type=OutputType.STATUS, text="busy", data={"execution_count": self.execution_count + 1})

        # Handle AI magic
        if "ai" in magics:
            async for chunk in self._run_ai_magic(body, magics["ai"]):
                yield chunk
            self.status = KernelStatus.IDLE
            self._touch()
            return

        # Build request
        started = time.monotonic()
        self.execution_count += 1
        req = ExecutionRequest(
            code=body,
            execution_count=self.execution_count,
            timeout=float(magics.get("timeout", 120.0)),
        )

        # `%%capture` suppresses stdout
        capture = "capture" in magics
        success = True
        async for ev in self.sandbox.execute(req):
            self._touch()
            if ev.type == "status":
                if ev.text == "idle":
                    if isinstance(ev.data.get("execution_count"), int):
                        self.execution_count = ev.data["execution_count"]
                    success = ev.data.get("ok", success)
                    self.status = KernelStatus.IDLE
                    yield OutputChunk(
                        type=OutputType.STATUS,
                        text="idle",
                        data={
                            "execution_count": self.execution_count,
                            "ok": success,
                            "duration_ms": (time.monotonic() - started) * 1000,
                        },
                    )
                    return
                if ev.text == "busy":
                    continue
                if ev.text == "interrupted":
                    self.status = KernelStatus.INTERRUPTED
                    yield OutputChunk(type=OutputType.STATUS, text="interrupted")
                    continue
                # other status — pass through
                yield OutputChunk(type=OutputType.STATUS, text=ev.text, data=ev.data)
                continue
            if ev.type == "stdout" and capture:
                continue
            yield OutputChunk(
                type=OutputType(ev.type),
                text=ev.text,
                data=ev.data,
            )

    async def _run_ai_magic(self, prompt: str, model_hint: str) -> AsyncIterator[OutputChunk]:
        """Handle `%%ai` magic — call an LLM with the cell source as prompt.

        The LLM is invoked via an HTTP call to the Next.js AI route
        (so we reuse the same z-ai-web-dev-sdk wiring). Set
        LEGION_HUTTA_AI_URL to override the default.
        """
        url = os.environ.get("LEGION_HUTTA_AI_URL", "http://localhost:3000/api/ai/raw")
        import json
        import urllib.request

        self.execution_count += 1
        yield OutputChunk(
            type=OutputType.STATUS,
            text="busy",
            data={"execution_count": self.execution_count, "sandbox": "ai"},
        )
        try:
            payload = json.dumps({"prompt": prompt, "model": model_hint or None}).encode()
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            # Run blocking HTTP in a thread to stay async-friendly
            import asyncio
            def _do() -> str:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    return resp.read().decode("utf-8", errors="replace")
            raw = await asyncio.to_thread(_do)
            # Parse the JSON response from /api/ai/raw: {"text": "...", "model": "..."}
            try:
                parsed = json.loads(raw)
                ai_text = parsed.get("text", raw)
            except (json.JSONDecodeError, AttributeError):
                ai_text = raw
            # Emit as a rich result so the frontend renders it as markdown
            yield OutputChunk(
                type=OutputType.RESULT,
                text=ai_text,
                data={"text/markdown": ai_text, "text/plain": ai_text},
            )
            yield OutputChunk(
                type=OutputType.STATUS,
                text="idle",
                data={"execution_count": self.execution_count, "ok": True},
            )
        except Exception as exc:  # noqa: BLE001
            yield OutputChunk(
                type=OutputType.ERROR,
                text=str(exc),
                data={"name": type(exc).__name__, "traceback": [str(exc)]},
            )
            yield OutputChunk(
                type=OutputType.STATUS,
                text="idle",
                data={"execution_count": self.execution_count, "ok": False},
            )

    async def interrupt(self) -> None:
        if self.sandbox:
            await self.sandbox.interrupt()
        self.status = KernelStatus.INTERRUPTED
        self._touch()

    async def restart(self) -> None:
        if self.sandbox:
            await self.sandbox.restart()
        self.execution_count = 0
        self.status = KernelStatus.IDLE
        self._touch()

    async def shutdown(self) -> None:
        if self.sandbox:
            try:
                await self.sandbox.shutdown()
            except Exception:  # noqa: BLE001
                pass
        self.status = KernelStatus.DEAD
        self._touch()


KERNEL_ENTRYPOINT = PythonKernel


# ---- Magic parser ----


def _strip_magics(code: str) -> tuple[dict[str, str], str]:
    """Extract `%%magic arg` lines from the top of the cell.

    Returns (magics_dict, body) where magics_dict maps magic name to
    its argument string (or empty string if no arg). Recognized
    magics: ai, time, capture, timeout.
    """
    magics: dict[str, str] = {}
    lines = code.split("\n")
    body_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            body_start = i + 1
            continue
        if stripped.startswith("%%"):
            magic_line = stripped[2:].strip()
            parts = magic_line.split(None, 1)
            if not parts:
                body_start = i + 1
                continue
            name = parts[0]
            arg = parts[1] if len(parts) > 1 else ""
            magics[name] = arg
            body_start = i + 1
            continue
        break
    body = "\n".join(lines[body_start:])
    return magics, body

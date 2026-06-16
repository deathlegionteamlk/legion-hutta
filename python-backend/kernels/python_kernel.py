"""
Python kernel implementation for Legion Hutta.

Strategy: spawn a long-lived `python -u` subprocess that runs a custom
REPL loop. The subprocess reads JSON-encoded requests from stdin and
writes JSON-encoded responses to stdout. This gives us:

- Persistent state across executions (variables, imports, etc.)
- Clean stdout/stderr separation
- Structured error reporting (name, value, traceback)
- Interruptibility via SIGINT to the subprocess
- Language-agnostic surface: the protocol is JSON, so any future
  kernel (JS, R, ...) can adopt the same shape.
"""
from __future__ import annotations

import asyncio
import json
import os
import signal
import sys
import textwrap
import time
import uuid
from typing import AsyncIterator, Optional

from .base import BaseKernel, ExecutionResult, KernelSpec, KernelStatus, OutputChunk, OutputType

# Marker bytes used to delimit structured messages on the kernel's stdout.
# Picked because they are extremely unlikely to appear in normal program output.
MSG_START = "__LEGION_HUTTA_MSG__"
MSG_END = "__LEGION_HUTTA_END__"

# The REPL script that runs inside the subprocess. It is intentionally
# minimal and dependency-free so we can ship the kernel without any
# extra Python packages installed in the user's environment.
REPL_SCRIPT = textwrap.dedent(
    """
    import json
    import sys
    import traceback
    import signal
    import io
    import contextlib

    _EXEC_COUNT = 0
    _USER_GLOBALS = {"__name__": "__main__"}

    def _emit(obj):
        sys.stdout.write("__LEGION_HUTTA_MSG__")
        sys.stdout.write(json.dumps(obj))
        sys.stdout.write("__LEGION_HUTTA_END__\\n")
        sys.stdout.flush()

    def _handle_sigint(signum, frame):
        _emit({"type": "status", "text": "interrupted"})
        raise KeyboardInterrupt

    signal.signal(signal.SIGINT, _handle_sigint)

    _emit({"type": "status", "text": "idle"})

    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            req = json.loads(line)
        except Exception as e:
            _emit({"type": "error", "text": "bad request", "data": {"value": str(e)}})
            continue

        kind = req.get("kind")
        if kind == "shutdown":
            break

        if kind != "execute":
            _emit({"type": "error", "text": "unknown kind", "data": {"value": kind}})
            continue

        code = req.get("code", "")
        _EXEC_COUNT += 1
        _emit({"type": "status", "text": "busy", "data": {"execution_count": _EXEC_COUNT}})

        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        error = None
        result_repr = None

        # Try to evaluate the last expression if the source is a single
        # expression; otherwise execute as statements. We compile in
        # 'single' mode so the REPL-style printing of the last expression
        # value works naturally.
        try:
            with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
                try:
                    compiled = compile(code, "<legion-hutta>", "single")
                except SyntaxError:
                    # Not a single expression -> execute as a module
                    compiled = compile(code, "<legion-hutta>", "exec")
                exec(compiled, _USER_GLOBALS)
        except KeyboardInterrupt:
            error = {
                "name": "KeyboardInterrupt",
                "value": "Execution interrupted by user",
                "traceback": traceback.format_exception_only(KeyboardInterrupt, KeyboardInterrupt()),
            }
        except BaseException as exc:  # noqa: BLE001 - we want to report any error
            tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
            error = {
                "name": type(exc).__name__,
                "value": str(exc),
                "traceback": tb_lines,
            }

        stdout_text = stdout_buf.getvalue()
        stderr_text = stderr_buf.getvalue()
        if stdout_text:
            _emit({"type": "stdout", "text": stdout_text})
        if stderr_text:
            _emit({"type": "stderr", "text": stderr_text})
        if error:
            _emit({"type": "error", "text": error["value"], "data": {
                "name": error["name"],
                "traceback": error["traceback"],
            }})
        _emit({"type": "status", "text": "idle", "data": {"execution_count": _EXEC_COUNT, "ok": error is None}})
    """
).strip()


class PythonKernel(BaseKernel):
    """A Python kernel backed by a long-lived `python -u` subprocess."""

    def __init__(self, kernel_id: Optional[str] = None, python_executable: Optional[str] = None):
        super().__init__(kernel_id=kernel_id)
        self._python_executable = python_executable or sys.executable
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._stdout_buffer = ""
        self._execution_lock = asyncio.Lock()

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
        if self._proc and self._proc.returncode is None:
            return
        self._proc = await asyncio.create_subprocess_exec(
            self._python_executable,
            "-u",  # unbuffered stdout/stderr
            "-c",
            REPL_SCRIPT,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        # Wait for the initial "idle" status message
        async for chunk in self._drain_until_status(expected="idle", timeout=10.0):
            # discard
            pass
        self.status = KernelStatus.IDLE
        self._touch()

    async def _drain_until_status(
        self, expected: Optional[str] = None, timeout: float = 30.0
    ) -> AsyncIterator[OutputChunk]:
        """Yield parsed messages from the kernel stdout until a matching status arrives."""
        assert self._proc and self._proc.stdout
        deadline = time.monotonic() + timeout
        while True:
            if time.monotonic() > deadline:
                yield OutputChunk(type=OutputType.ERROR, text="kernel did not respond in time")
                return
            try:
                line = await asyncio.wait_for(self._proc.stdout.readline(), timeout=max(0.1, deadline - time.monotonic()))
            except asyncio.TimeoutError:
                continue
            if not line:
                # process ended
                self.status = KernelStatus.DEAD
                yield OutputChunk(type=OutputType.STATUS, text="dead")
                return
            text = line.decode("utf-8", errors="replace")
            if MSG_START not in text:
                # Not a structured message - emit as raw stdout
                yield OutputChunk(type=OutputType.STDOUT, text=text)
                continue
            # Extract the JSON payload between markers
            try:
                start = text.index(MSG_START) + len(MSG_START)
                end = text.index(MSG_END, start)
                payload = json.loads(text[start:end])
            except (ValueError, json.JSONDecodeError):
                continue

            chunk = OutputChunk(
                type=OutputType(payload.get("type", "stdout")),
                text=payload.get("text", ""),
                data=payload.get("data", {}) or {},
            )
            yield chunk
            if chunk.type == OutputType.STATUS:
                if expected is None or chunk.text == expected:
                    return

    async def execute(self, code: str) -> AsyncIterator[OutputChunk]:
        if not self._proc or self._proc.returncode is not None:
            self.status = KernelStatus.DEAD
            yield OutputChunk(type=OutputType.ERROR, text="kernel is not running")
            return

        async with self._execution_lock:
            self.status = KernelStatus.BUSY
            self._touch()
            # Send the execute request
            assert self._proc.stdin
            try:
                self._proc.stdin.write((json.dumps({"kind": "execute", "code": code}) + "\n").encode())
                await self._proc.stdin.drain()
            except (BrokenPipeError, ConnectionResetError):
                self.status = KernelStatus.DEAD
                yield OutputChunk(type=OutputType.ERROR, text="kernel process exited unexpectedly")
                return

            seen_busy = False
            async for chunk in self._drain_until_status(expected="idle", timeout=120.0):
                self._touch()
                # Track execution_count from the busy status message
                if chunk.type == OutputType.STATUS:
                    if chunk.text == "busy" and not seen_busy:
                        seen_busy = True
                        ec = chunk.data.get("execution_count")
                        if isinstance(ec, int):
                            self.execution_count = ec
                        self.status = KernelStatus.BUSY
                        yield chunk
                        continue
                    if chunk.text == "idle":
                        ec = chunk.data.get("execution_count")
                        if isinstance(ec, int):
                            self.execution_count = ec
                        self.status = KernelStatus.IDLE
                        yield chunk
                        continue
                    if chunk.text == "interrupted":
                        self.status = KernelStatus.INTERRUPTED
                        yield chunk
                        continue
                    # Any other status - pass through
                    yield chunk
                    continue
                yield chunk

    async def interrupt(self) -> None:
        if self._proc and self._proc.returncode is None:
            try:
                self._proc.send_signal(signal.SIGINT)
            except ProcessLookupError:
                pass
            self.status = KernelStatus.INTERRUPTED
            self._touch()

    async def restart(self) -> None:
        await self.shutdown()
        self.execution_count = 0
        self.status = KernelStatus.STARTING
        await self.start()

    async def shutdown(self) -> None:
        if self._proc:
            try:
                if self._proc.stdin and self._proc.returncode is None:
                    try:
                        self._proc.stdin.write((json.dumps({"kind": "shutdown"}) + "\n").encode())
                        await self._proc.stdin.drain()
                    except (BrokenPipeError, ConnectionResetError):
                        pass
                try:
                    await asyncio.wait_for(self._proc.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    self._proc.kill()
                    await self._proc.wait()
            finally:
                self._proc = None
        self.status = KernelStatus.DEAD
        self._touch()


# Module-level helper so the kernel manager can discover kernels by name.
KERNEL_ENTRYPOINT = PythonKernel

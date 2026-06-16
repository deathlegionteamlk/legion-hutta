"""
Sandbox abstraction layer for Legion Hutta.

A "sandbox" is the place where kernel code actually runs. The kernel
class orchestrates the protocol (request/response, status, interrupts);
the sandbox carries out the execution.

This lets us plug in multiple execution backends behind a single
kernel contract:

  - LocalSubprocessSandbox : runs `python -u` as a child process (default)
  - E2BSandbox             : runs code in an E2B cloud sandbox
  - DaytonaSandbox         : runs code in a Daytona cloud dev env

Backends that require credentials degrade gracefully: if the relevant
SDK / API key is not configured, the sandbox reports `available=False`
and the kernel manager will refuse to start kernels on it, returning
a helpful error message instead of crashing.

To add a new sandbox backend:
  1. Subclass `BaseSandbox` and implement the abstract methods.
  2. Register it in `SANDBOX_REGISTRY` at the bottom of this file.
  3. The kernel manager + API layer will pick it up automatically.
"""
from __future__ import annotations

import abc
import asyncio
import importlib
import json
import logging
import os
import textwrap
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

logger = logging.getLogger("legion-hutta.sandbox")


@dataclass
class SandboxSpec:
    """Static description of a sandbox backend."""

    name: str
    display_name: str
    description: str
    icon: str = "cpu"
    requires_api_key: bool = False
    api_key_env_var: Optional[str] = None
    docs_url: Optional[str] = None


@dataclass
class ExecutionRequest:
    code: str
    execution_count: int
    timeout: float = 120.0


@dataclass
class ExecutionEvent:
    """A single event emitted during execution.

    Mirrors the kernel `OutputChunk` shape so kernels can forward
    sandbox events verbatim.
    """

    type: str  # "stdout" | "stderr" | "result" | "error" | "status"
    text: str = ""
    data: dict[str, Any] = field(default_factory=dict)


class BaseSandbox(abc.ABC):
    """Abstract sandbox contract.

    A sandbox instance is bound to a single kernel and owns the
    execution context (process, cloud sandbox ID, etc.). Sandboxes
    are NOT shared across kernels.
    """

    def __init__(self, sandbox_id: Optional[str] = None):
        self.sandbox_id: str = sandbox_id or str(uuid.uuid4())
        self.created_at: float = time.time()

    @staticmethod
    @abc.abstractmethod
    def spec() -> SandboxSpec:
        """Static spec describing this backend."""

    @abc.abstractmethod
    async def is_available(self) -> tuple[bool, str]:
        """Return (available, reason). If not available, reason explains why."""

    @abc.abstractmethod
    async def start(self) -> None:
        """Initialize the sandbox (spawn process, create cloud sandbox, etc.)."""

    @abc.abstractmethod
    async def execute(self, req: ExecutionRequest) -> AsyncIterator[ExecutionEvent]:
        """Execute `req.code` and yield events as they arrive."""

    @abc.abstractmethod
    async def interrupt(self) -> None:
        """Interrupt the current execution."""

    @abc.abstractmethod
    async def restart(self) -> None:
        """Restart the sandbox, clearing all state."""

    @abc.abstractmethod
    async def shutdown(self) -> None:
        """Tear down the sandbox and release all resources."""

    @abc.abstractmethod
    async def introspect(self) -> dict[str, Any]:
        """Return a dict of variables in the sandbox's global scope.

        Format: {"variables": [{"name","type","repr","size"}, ...]}
        """

    def to_dict(self) -> dict[str, Any]:
        return {
            "sandbox_id": self.sandbox_id,
            "spec": {
                "name": self.spec().name,
                "display_name": self.spec().display_name,
                "description": self.spec().description,
                "icon": self.spec().icon,
                "requires_api_key": self.spec().requires_api_key,
                "api_key_env_var": self.spec().api_key_env_var,
                "docs_url": self.spec().docs_url,
            },
            "created_at": self.created_at,
        }


# ---- Local subprocess backend (default) ----


_REPL_SCRIPT = textwrap.dedent(
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

        if kind == "introspect":
            import types as _types
            variables = []
            for name, val in _USER_GLOBALS.items():
                if name.startswith("__"):
                    continue
                if isinstance(val, _types.ModuleType):
                    continue
                try:
                    repr_str = repr(val)[:200]
                except Exception as rerr:
                    repr_str = f"<repr error: {rerr}>"
                try:
                    size = sys.getsizeof(val)
                except Exception:
                    size = 0
                variables.append({
                    "name": name,
                    "type": type(val).__name__,
                    "repr": repr_str,
                    "size": size,
                })
            _emit({"type": "result", "text": json.dumps({"variables": variables})})
            _emit({"type": "status", "text": "idle", "data": {"ok": True}})
            continue

        if kind != "execute":
            _emit({"type": "error", "text": "unknown kind", "data": {"value": kind}})
            continue

        code = req.get("code", "")
        _EXEC_COUNT += 1
        _emit({"type": "status", "text": "busy", "data": {"execution_count": _EXEC_COUNT}})

        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        error = None

        try:
            with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
                try:
                    compiled = compile(code, "<legion-hutta>", "single")
                except SyntaxError:
                    compiled = compile(code, "<legion-hutta>", "exec")
                exec(compiled, _USER_GLOBALS)
        except KeyboardInterrupt:
            error = {
                "name": "KeyboardInterrupt",
                "value": "Execution interrupted by user",
                "traceback": traceback.format_exception_only(KeyboardInterrupt, KeyboardInterrupt()),
            }
        except BaseException as exc:
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


MSG_START = "__LEGION_HUTTA_MSG__"
MSG_END = "__LEGION_HUTTA_END__"


class LocalSubprocessSandbox(BaseSandbox):
    """Default sandbox: a long-lived `python -u` child process."""

    def __init__(self, python_executable: Optional[str] = None):
        super().__init__()
        self._python_executable = python_executable or __import__("sys").executable
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._exec_lock = asyncio.Lock()

    @staticmethod
    def spec() -> SandboxSpec:
        return SandboxSpec(
            name="local",
            display_name="Local subprocess",
            description="Runs Python as a long-lived child process on this machine. No setup required.",
            icon="cpu",
            requires_api_key=False,
        )

    async def is_available(self) -> tuple[bool, str]:
        return True, "ok"

    async def start(self) -> None:
        if self._proc and self._proc.returncode is None:
            return
        self._proc = await asyncio.create_subprocess_exec(
            self._python_executable,
            "-u",
            "-c",
            _REPL_SCRIPT,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        # Wait for the initial "idle" status
        async for _ in self._drain_until_status(expected="idle", timeout=10.0):
            pass

    async def _drain_until_status(
        self, expected: Optional[str] = None, timeout: float = 30.0
    ) -> AsyncIterator[ExecutionEvent]:
        assert self._proc and self._proc.stdout
        deadline = time.monotonic() + timeout
        while True:
            if time.monotonic() > deadline:
                yield ExecutionEvent(type="error", text="sandbox did not respond in time")
                return
            try:
                line = await asyncio.wait_for(
                    self._proc.stdout.readline(),
                    timeout=max(0.1, deadline - time.monotonic()),
                )
            except asyncio.TimeoutError:
                continue
            if not line:
                yield ExecutionEvent(type="status", text="dead")
                return
            text = line.decode("utf-8", errors="replace")
            if MSG_START not in text:
                yield ExecutionEvent(type="stdout", text=text)
                continue
            try:
                start = text.index(MSG_START) + len(MSG_START)
                end = text.index(MSG_END, start)
                payload = json.loads(text[start:end])
            except (ValueError, json.JSONDecodeError):
                continue
            yield ExecutionEvent(
                type=payload.get("type", "stdout"),
                text=payload.get("text", ""),
                data=payload.get("data", {}) or {},
            )
            if payload.get("type") == "status":
                if expected is None or payload.get("text") == expected:
                    return

    async def execute(self, req: ExecutionRequest) -> AsyncIterator[ExecutionEvent]:
        if not self._proc or self._proc.returncode is not None:
            yield ExecutionEvent(type="error", text="sandbox is not running")
            return
        async with self._exec_lock:
            assert self._proc.stdin
            try:
                self._proc.stdin.write(
                    (json.dumps({"kind": "execute", "code": req.code}) + "\n").encode()
                )
                await self._proc.stdin.drain()
            except (BrokenPipeError, ConnectionResetError):
                yield ExecutionEvent(type="error", text="sandbox process exited unexpectedly")
                return

            async for ev in self._drain_until_status(expected="idle", timeout=req.timeout):
                yield ev

    async def interrupt(self) -> None:
        if self._proc and self._proc.returncode is None:
            try:
                import signal as _sig
                self._proc.send_signal(_sig.SIGINT)
            except ProcessLookupError:
                pass

    async def restart(self) -> None:
        await self.shutdown()
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

    async def introspect(self) -> dict[str, Any]:
        if not self._proc or self._proc.returncode is not None:
            return {"variables": []}
        assert self._proc.stdin
        try:
            self._proc.stdin.write((json.dumps({"kind": "introspect"}) + "\n").encode())
            await self._proc.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            return {"variables": []}
        async for ev in self._drain_until_status(expected="idle", timeout=10.0):
            if ev.type == "result":
                try:
                    return json.loads(ev.text)
                except json.JSONDecodeError:
                    return {"variables": []}
        return {"variables": []}


# ---- E2B backend (cloud sandbox) ----


class E2BSandbox(BaseSandbox):
    """E2B cloud sandbox backend.

    Uses the `e2b-code-interpreter` Python SDK to run code in an
    isolated cloud sandbox. State persists across executions within
    a single sandbox instance, matching our kernel contract.

    Requires `E2B_API_KEY` in the environment. If the SDK or key is
    missing, `is_available()` returns False.
    """

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self._api_key = api_key or os.environ.get("E2B_API_KEY")
        self._sandbox: Any = None
        self._exec_lock = asyncio.Lock()

    @staticmethod
    def spec() -> SandboxSpec:
        return SandboxSpec(
            name="e2b",
            display_name="E2B Cloud Sandbox",
            description="Run code in an isolated E2B cloud sandbox. Requires E2B_API_KEY.",
            icon="cloud",
            requires_api_key=True,
            api_key_env_var="E2B_API_KEY",
            docs_url="https://e2b.dev/docs",
        )

    async def is_available(self) -> tuple[bool, str]:
        if not self._api_key:
            return False, "E2B_API_KEY is not set"
        try:
            importlib.import_module("e2b_code_interpreter")
            return True, "ok"
        except ImportError:
            return False, "e2b-code-interpreter package is not installed (pip install e2b-code-interpreter)"

    async def start(self) -> None:
        available, reason = await self.is_available()
        if not available:
            raise RuntimeError(f"E2B sandbox unavailable: {reason}")
        from e2b_code_interpreter import AsyncSandbox  # type: ignore

        self._sandbox = await AsyncSandbox.create(api_key=self._api_key)

    async def execute(self, req: ExecutionRequest) -> AsyncIterator[ExecutionEvent]:
        if not self._sandbox:
            yield ExecutionEvent(type="error", text="E2B sandbox is not started")
            return
        async with self._exec_lock:
            yield ExecutionEvent(
                type="status",
                text="busy",
                data={"execution_count": req.execution_count, "sandbox": "e2b"},
            )
            try:
                execution = await self._sandbox.run_code(req.code, timeout=req.timeout)
            except asyncio.CancelledError:
                yield ExecutionEvent(type="status", text="interrupted")
                yield ExecutionEvent(type="status", text="idle", data={"ok": False})
                return
            except Exception as exc:  # noqa: BLE001
                yield ExecutionEvent(
                    type="error",
                    text=str(exc),
                    data={"name": type(exc).__name__, "traceback": [str(exc)]},
                )
                yield ExecutionEvent(type="status", text="idle", data={"ok": False})
                return

            for line in getattr(execution.logs, "stdout", []) or []:
                yield ExecutionEvent(type="stdout", text=line)
            for line in getattr(execution.logs, "stderr", []) or []:
                yield ExecutionEvent(type="stderr", text=line)
            for r in getattr(execution, "results", []) or []:
                data: dict[str, Any] = {}
                if getattr(r, "png", None):
                    data["image/png"] = r.png
                if getattr(r, "html", None):
                    data["text/html"] = r.html
                if getattr(r, "json", None) is not None:
                    data["application/json"] = r.json
                if getattr(r, "latex", None):
                    data["text/latex"] = r.latex
                yield ExecutionEvent(
                    type="result",
                    text=getattr(r, "text", "") or "",
                    data=data,
                )
            err = getattr(execution, "error", None)
            if err:
                yield ExecutionEvent(
                    type="error",
                    text=getattr(err, "value", str(err)),
                    data={
                        "name": getattr(err, "ename", "Error"),
                        "traceback": getattr(err, "traceback", []) or [],
                    },
                )
            yield ExecutionEvent(
                type="status",
                text="idle",
                data={"execution_count": req.execution_count, "ok": err is None},
            )

    async def interrupt(self) -> None:
        # E2B doesn't expose a clean interrupt; future iteration could
        # use per-call timeouts more aggressively.
        pass

    async def restart(self) -> None:
        await self.shutdown()
        await self.start()

    async def shutdown(self) -> None:
        if self._sandbox:
            try:
                await self._sandbox.kill()
            except Exception:  # noqa: BLE001
                pass
            self._sandbox = None

    async def introspect(self) -> dict[str, Any]:
        if not self._sandbox:
            return {"variables": []}
        code = (
            "import json, sys, types as _t\n"
            "_vs = []\n"
            "for _n, _v in list(globals().items()):\n"
            "    if _n.startswith('_') or isinstance(_v, _t.ModuleType):\n"
            "        continue\n"
            "    try:\n"
            "        _r = repr(_v)[:200]\n"
            "        _s = sys.getsizeof(_v)\n"
            "    except Exception:\n"
            "        _r, _s = '<err>', 0\n"
            "    _vs.append({'name': _n, 'type': type(_v).__name__, 'repr': _r, 'size': _s})\n"
            "print(json.dumps({'variables': _vs}))\n"
        )
        variables: list[dict[str, Any]] = []
        try:
            execution = await self._sandbox.run_code(code, timeout=10.0)
            for line in getattr(execution.logs, "stdout", []) or []:
                try:
                    parsed = json.loads(line)
                    variables.extend(parsed.get("variables", []))
                except json.JSONDecodeError:
                    pass
        except Exception:  # noqa: BLE001
            pass
        return {"variables": variables}


# ---- Daytona backend (cloud dev environment) ----


class DaytonaSandbox(BaseSandbox):
    """Daytona cloud dev environment backend.

    Uses the `daytona-sdk` Python SDK to spawn an isolated dev
    environment and run Python code inside it.

    Requires `DAYTONA_API_KEY` and `DAYTONA_SERVER_URL` in the
    environment. Degrades gracefully when missing.
    """

    def __init__(self, api_key: Optional[str] = None, server_url: Optional[str] = None):
        super().__init__()
        self._api_key = api_key or os.environ.get("DAYTONA_API_KEY")
        self._server_url = server_url or os.environ.get("DAYTONA_SERVER_URL")
        self._daytona: Any = None
        self._sandbox: Any = None
        self._exec_lock = asyncio.Lock()

    @staticmethod
    def spec() -> SandboxSpec:
        return SandboxSpec(
            name="daytona",
            display_name="Daytona Cloud Dev Env",
            description="Run code in an isolated Daytona dev environment. Requires DAYTONA_API_KEY.",
            icon="server",
            requires_api_key=True,
            api_key_env_var="DAYTONA_API_KEY",
            docs_url="https://www.daytona.io/docs",
        )

    async def is_available(self) -> tuple[bool, str]:
        if not self._api_key:
            return False, "DAYTONA_API_KEY is not set"
        try:
            importlib.import_module("daytona_sdk")
            return True, "ok"
        except ImportError:
            return False, "daytona-sdk package is not installed (pip install daytona-sdk)"

    async def start(self) -> None:
        available, reason = await self.is_available()
        if not available:
            raise RuntimeError(f"Daytona sandbox unavailable: {reason}")
        from daytona_sdk import AsyncDaytona  # type: ignore

        self._daytona = AsyncDaytona(api_key=self._api_key, server_url=self._server_url)
        self._sandbox = await self._daytona.create()

    async def execute(self, req: ExecutionRequest) -> AsyncIterator[ExecutionEvent]:
        if not self._sandbox:
            yield ExecutionEvent(type="error", text="Daytona sandbox is not started")
            return
        async with self._exec_lock:
            yield ExecutionEvent(
                type="status",
                text="busy",
                data={"execution_count": req.execution_count, "sandbox": "daytona"},
            )
            try:
                result = await self._sandbox.process.exec(
                    f"python3 -c {json.dumps(req.code)}",
                    timeout=int(req.timeout),
                )
            except Exception as exc:  # noqa: BLE001
                yield ExecutionEvent(
                    type="error",
                    text=str(exc),
                    data={"name": type(exc).__name__, "traceback": [str(exc)]},
                )
                yield ExecutionEvent(type="status", text="idle", data={"ok": False})
                return

            stdout = getattr(result, "stdout", "") or ""
            stderr = getattr(result, "stderr", "") or ""
            exit_code = getattr(result, "exit_code", 0) or 0
            if stdout:
                yield ExecutionEvent(type="stdout", text=stdout)
            if stderr:
                yield ExecutionEvent(type="stderr", text=stderr)
            if exit_code != 0:
                yield ExecutionEvent(
                    type="error",
                    text=f"Process exited with code {exit_code}",
                    data={"name": "NonZeroExit", "traceback": [stderr]},
                )
            yield ExecutionEvent(
                type="status",
                text="idle",
                data={"execution_count": req.execution_count, "ok": exit_code == 0},
            )

    async def interrupt(self) -> None:
        pass

    async def restart(self) -> None:
        await self.shutdown()
        await self.start()

    async def shutdown(self) -> None:
        if self._sandbox and self._daytona:
            try:
                await self._daytona.delete(self._sandbox)
            except Exception:  # noqa: BLE001
                pass
        self._sandbox = None
        self._daytona = None

    async def introspect(self) -> dict[str, Any]:
        if not self._sandbox:
            return {"variables": []}
        code = (
            "import json, sys, types as _t\n"
            "_vs = []\n"
            "for _n, _v in list(globals().items()):\n"
            "    if _n.startswith('_') or isinstance(_v, _t.ModuleType):\n"
            "        continue\n"
            "    try:\n"
            "        _r = repr(_v)[:200]\n"
            "        _s = sys.getsizeof(_v)\n"
            "    except Exception:\n"
            "        _r, _s = '<err>', 0\n"
            "    _vs.append({'name': _n, 'type': type(_v).__name__, 'repr': _r, 'size': _s})\n"
            "print(json.dumps({'variables': _vs}))\n"
        )
        try:
            result = await self._sandbox.process.exec(f"python3 -c {json.dumps(code)}", timeout=10)
            stdout = getattr(result, "stdout", "") or ""
            try:
                return json.loads(stdout.strip().splitlines()[-1])
            except (json.JSONDecodeError, IndexError):
                return {"variables": []}
        except Exception:  # noqa: BLE001
            return {"variables": []}


# ---- Registry ----


SANDBOX_REGISTRY: dict[str, type[BaseSandbox]] = {
    "local": LocalSubprocessSandbox,
    "e2b": E2BSandbox,
    "daytona": DaytonaSandbox,
}


async def list_sandbox_specs() -> list[dict[str, Any]]:
    """Return specs for all registered sandboxes, with live availability."""
    out: list[dict[str, Any]] = []
    for name, cls in SANDBOX_REGISTRY.items():
        spec = cls.spec()
        try:
            instance = cls()
            available, reason = await instance.is_available()
        except Exception as exc:  # noqa: BLE001
            available, reason = False, f"init error: {exc}"
        out.append(
            {
                "name": spec.name,
                "display_name": spec.display_name,
                "description": spec.description,
                "icon": spec.icon,
                "requires_api_key": spec.requires_api_key,
                "api_key_env_var": spec.api_key_env_var,
                "docs_url": spec.docs_url,
                "available": available,
                "unavailable_reason": reason if not available else None,
            }
        )
    return out


__all__ = [
    "BaseSandbox",
    "SandboxSpec",
    "ExecutionRequest",
    "ExecutionEvent",
    "LocalSubprocessSandbox",
    "E2BSandbox",
    "DaytonaSandbox",
    "SANDBOX_REGISTRY",
    "list_sandbox_specs",
]

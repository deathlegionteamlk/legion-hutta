"""
Abstract base class for all kernels in Legion Hutta.

A kernel is the user-facing execution context — it has a language,
an execution count, lifecycle status, and a sandbox where code
actually runs. The sandbox is pluggable (local subprocess, E2B,
Daytona, ...) so a single kernel implementation can
target multiple execution backends.

Adding a new LANGUAGE = subclass BaseKernel + register in KERNEL_REGISTRY.
Adding a new SANDBOX  = subclass BaseSandbox + register in SANDBOX_REGISTRY.
"""
from __future__ import annotations

import abc
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from sandboxes import BaseSandbox, ExecutionRequest


class KernelStatus(str, Enum):
    STARTING = "starting"
    IDLE = "idle"
    BUSY = "busy"
    INTERRUPTED = "interrupted"
    DEAD = "dead"


class OutputType(str, Enum):
    STDOUT = "stdout"
    STDERR = "stderr"
    RESULT = "result"
    ERROR = "error"
    STATUS = "status"


@dataclass
class OutputChunk:
    type: OutputType
    text: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type.value,
            "text": self.text,
            "data": self.data,
            "timestamp": self.timestamp,
        }


@dataclass
class ExecutionResult:
    success: bool
    outputs: list[OutputChunk] = field(default_factory=list)
    error_name: Optional[str] = None
    error_value: Optional[str] = None
    traceback: list[str] = field(default_factory=list)
    execution_count: int = 0
    duration_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "outputs": [o.to_dict() for o in self.outputs],
            "error_name": self.error_name,
            "error_value": self.error_value,
            "traceback": self.traceback,
            "execution_count": self.execution_count,
            "duration_ms": self.duration_ms,
        }


@dataclass
class KernelSpec:
    name: str
    display_name: str
    language: str
    file_extension: str
    codemirror_mode: str = "python"
    description: str = ""


class BaseKernel(abc.ABC):
    """Abstract kernel contract.

    A kernel owns:
      - identity (kernel_id, spec, status, execution_count)
      - a sandbox instance where code actually runs

    Subclasses customize `start()` and `execute()` to wire up the
    sandbox and translate sandbox events into kernel output chunks.
    """

    def __init__(
        self,
        kernel_id: Optional[str] = None,
        sandbox: Optional[BaseSandbox] = None,
    ):
        self.kernel_id: str = kernel_id or str(uuid.uuid4())
        self.status: KernelStatus = KernelStatus.STARTING
        self.execution_count: int = 0
        self.created_at: float = time.time()
        self.last_activity: float = time.time()
        self.sandbox: Optional[BaseSandbox] = sandbox

    @staticmethod
    @abc.abstractmethod
    def spec() -> KernelSpec:
        """Return the static spec for this kernel implementation."""

    @abc.abstractmethod
    async def start(self) -> None:
        """Start the kernel + its sandbox."""

    @abc.abstractmethod
    async def execute(self, code: str) -> Any:
        """Execute `code`, yielding OutputChunk objects."""

    @abc.abstractmethod
    async def interrupt(self) -> None:
        """Interrupt the currently-running execution."""

    @abc.abstractmethod
    async def restart(self) -> None:
        """Restart the kernel, clearing all state."""

    @abc.abstractmethod
    async def shutdown(self) -> None:
        """Shut down the kernel and release all resources."""

    async def introspect(self) -> dict[str, Any]:
        """Return variables in the kernel's global scope.

        Default implementation delegates to the sandbox. Subclasses
        can override for custom introspection.
        """
        if self.sandbox:
            return await self.sandbox.introspect()
        return {"variables": []}

    def _touch(self) -> None:
        self.last_activity = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "kernel_id": self.kernel_id,
            "status": self.status.value,
            "execution_count": self.execution_count,
            "created_at": self.created_at,
            "last_activity": self.last_activity,
            "spec": {
                "name": self.spec().name,
                "display_name": self.spec().display_name,
                "language": self.spec().language,
                "file_extension": self.spec().file_extension,
                "codemirror_mode": self.spec().codemirror_mode,
                "description": self.spec().description,
            },
            "sandbox": self.sandbox.to_dict() if self.sandbox else None,
        }

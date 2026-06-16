"""
Abstract base class for all kernels in Legion Hutta.

This defines the language-agnostic kernel interface. Each language
kernel (Python, JavaScript, R, etc.) must implement this contract so
the kernel manager and API layer can treat them uniformly.

Inspired by Jupyter's kernel specification, but intentionally simpler
to keep the codebase approachable for new contributors.
"""
from __future__ import annotations

import abc
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Optional


class KernelStatus(str, Enum):
    """Lifecycle status of a kernel instance."""

    STARTING = "starting"
    IDLE = "idle"
    BUSY = "busy"
    INTERRUPTED = "interrupted"
    DEAD = "dead"


class OutputType(str, Enum):
    """Output stream type emitted during code execution."""

    STDOUT = "stdout"
    STDERR = "stderr"
    RESULT = "result"  # rich display result (e.g. repr of last expression)
    ERROR = "error"  # structured error
    STATUS = "status"  # kernel lifecycle event


@dataclass
class OutputChunk:
    """A single chunk of output streamed from a kernel execution."""

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
    """Final result of a code execution."""

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
    """Static specification describing a kernel language.

    Implementations register themselves with the kernel manager by
    exposing a KernelSpec. This lets the UI render a "new kernel"
    menu without the backend having to know about every language.
    """

    name: str  # e.g. "python3"
    display_name: str  # e.g. "Python 3"
    language: str  # e.g. "python"
    file_extension: str  # e.g. ".py"
    codemirror_mode: str = "python"  # hint for the frontend editor
    description: str = ""


class BaseKernel(abc.ABC):
    """Abstract kernel contract.

    A kernel represents a long-lived execution context that maintains
    state across multiple code executions (variables, imports, etc.).
    """

    def __init__(self, kernel_id: Optional[str] = None):
        self.kernel_id: str = kernel_id or str(uuid.uuid4())
        self.status: KernelStatus = KernelStatus.STARTING
        self.execution_count: int = 0
        self.created_at: float = time.time()
        self.last_activity: float = time.time()

    # ---- Abstract API ----

    @staticmethod
    @abc.abstractmethod
    def spec() -> KernelSpec:
        """Return the static spec for this kernel implementation."""

    @abc.abstractmethod
    async def start(self) -> None:
        """Start the kernel process / runtime."""

    @abc.abstractmethod
    async def execute(self, code: str) -> AsyncIterator[OutputChunk]:
        """Execute `code` and yield output chunks as they arrive.

        Implementations MUST:
        - Increment `self.execution_count` exactly once per call.
        - Set `self.status` to BUSY at the start and IDLE (or DEAD)
          at the end.
        - Update `self.last_activity` before yielding each chunk.
        - Yield an `OutputChunk(type=STATUS)` at the start and end so
          the frontend can show live kernel state.
        """

    @abc.abstractmethod
    async def interrupt(self) -> None:
        """Interrupt the currently-running execution if any."""

    @abc.abstractmethod
    async def restart(self) -> None:
        """Restart the kernel, clearing all state."""

    @abc.abstractmethod
    async def shutdown(self) -> None:
        """Shut down the kernel and release all resources."""

    # ---- Helpers ----

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
        }

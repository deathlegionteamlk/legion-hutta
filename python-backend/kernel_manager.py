"""Kernel manager for Legion Hutta.

Maintains the lifecycle of all kernel instances in this process.
The FastAPI layer talks to this object; it never touches kernel
internals directly, which keeps the API surface small and the
language-agnostic contract honest.
"""
from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional

from kernels import KERNEL_REGISTRY, BaseKernel, KernelStatus, OutputChunk
from kernels.base import KernelSpec


class KernelManager:
    """In-memory kernel registry.

    For an MVP this is process-local: restarting the backend loses
    kernels. A future iteration could persist kernel metadata and
    reconnect to detached processes (similar to Jupyter's behavior).
    """

    def __init__(self) -> None:
        self._kernels: dict[str, BaseKernel] = {}
        self._lock = asyncio.Lock()

    def list_specs(self) -> list[KernelSpec]:
        return [cls.spec() for cls in KERNEL_REGISTRY.values()]

    def list_kernels(self) -> list[BaseKernel]:
        return list(self._kernels.values())

    def get(self, kernel_id: str) -> Optional[BaseKernel]:
        return self._kernels.get(kernel_id)

    async def start_kernel(self, name: str = "python3") -> BaseKernel:
        async with self._lock:
            cls = KERNEL_REGISTRY.get(name)
            if cls is None:
                raise ValueError(f"Unknown kernel: {name}")
            kernel = cls()
            await kernel.start()
            self._kernels[kernel.kernel_id] = kernel
            return kernel

    async def interrupt(self, kernel_id: str) -> None:
        kernel = self._kernels.get(kernel_id)
        if kernel:
            await kernel.interrupt()

    async def restart(self, kernel_id: str) -> None:
        kernel = self._kernels.get(kernel_id)
        if kernel:
            await kernel.restart()

    async def shutdown(self, kernel_id: str) -> None:
        async with self._lock:
            kernel = self._kernels.pop(kernel_id, None)
            if kernel:
                await kernel.shutdown()

    async def shutdown_all(self) -> None:
        async with self._lock:
            for kernel_id in list(self._kernels.keys()):
                kernel = self._kernels.pop(kernel_id, None)
                if kernel:
                    try:
                        await kernel.shutdown()
                    except Exception:  # noqa: BLE001 - best-effort cleanup
                        pass


# Process-wide singleton. The FastAPI app imports this directly.
kernel_manager = KernelManager()

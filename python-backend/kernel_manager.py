"""Kernel manager for Legion Hutta.

Maintains the lifecycle of all kernel instances in this process.
The FastAPI layer talks to this object; it never touches kernel
internals directly.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from kernels import KERNEL_REGISTRY, BaseKernel, KernelStatus
from kernels.base import KernelSpec
from sandboxes import SANDBOX_REGISTRY, list_sandbox_specs

logger = logging.getLogger("legion-hutta.kernel-manager")


class KernelManager:
    """In-memory kernel registry."""

    def __init__(self) -> None:
        self._kernels: dict[str, BaseKernel] = {}
        self._lock = asyncio.Lock()

    def list_specs(self) -> list[KernelSpec]:
        return [cls.spec() for cls in KERNEL_REGISTRY.values()]

    async def list_sandboxes(self) -> list[dict]:
        return await list_sandbox_specs()

    def list_kernels(self) -> list[BaseKernel]:
        return list(self._kernels.values())

    def get(self, kernel_id: str) -> Optional[BaseKernel]:
        return self._kernels.get(kernel_id)

    async def start_kernel(
        self,
        name: str = "python3",
        sandbox_name: str = "local",
    ) -> BaseKernel:
        async with self._lock:
            cls = KERNEL_REGISTRY.get(name)
            if cls is None:
                raise ValueError(f"Unknown kernel: {name}")
            sandbox_cls = SANDBOX_REGISTRY.get(sandbox_name)
            if sandbox_cls is None:
                raise ValueError(f"Unknown sandbox: {sandbox_name}")
            sandbox = sandbox_cls()
            available, reason = await sandbox.is_available()
            if not available:
                # Clean up the sandbox we just constructed
                try:
                    await sandbox.shutdown()
                except Exception:  # noqa: BLE001
                    pass
                raise RuntimeError(
                    f"Sandbox '{sandbox_name}' is not available: {reason}"
                )
            # Construct the kernel with the sandbox injected
            kernel = cls(sandbox=sandbox)
            await kernel.start()
            self._kernels[kernel.kernel_id] = kernel
            logger.info(
                "Started kernel %s (kernel=%s sandbox=%s)",
                kernel.kernel_id, name, sandbox_name,
            )
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
                try:
                    await kernel.shutdown()
                except Exception:  # noqa: BLE001
                    logger.exception("Error shutting down kernel %s", kernel_id)

    async def shutdown_all(self) -> None:
        async with self._lock:
            for kernel_id in list(self._kernels.keys()):
                kernel = self._kernels.pop(kernel_id, None)
                if kernel:
                    try:
                        await kernel.shutdown()
                    except Exception:  # noqa: BLE001
                        pass


# Process-wide singleton.
kernel_manager = KernelManager()

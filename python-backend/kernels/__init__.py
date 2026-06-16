"""Kernels package for Legion Hutta.

Each kernel implementation lives in its own module and exposes a
`KERNEL_ENTRYPOINT` symbol pointing at the kernel class. The kernel
manager uses this convention to discover available kernels.
"""
from .base import BaseKernel, ExecutionResult, KernelSpec, KernelStatus, OutputChunk, OutputType
from .python_kernel import PythonKernel

# Registry of available kernel classes keyed by spec name.
# To add a new language, implement a subclass of BaseKernel and add it here.
KERNEL_REGISTRY: dict[str, type[BaseKernel]] = {
    "python3": PythonKernel,
}

__all__ = [
    "BaseKernel",
    "ExecutionResult",
    "KernelSpec",
    "KernelStatus",
    "OutputChunk",
    "OutputType",
    "PythonKernel",
    "KERNEL_REGISTRY",
]

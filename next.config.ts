import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Forward backend API calls to the Python FastAPI server on :8000.
  // In the hosted preview environment, the gateway rewrites based on
  // ?XTransformPort=8000 automatically; for local dev (`next dev`),
  // we proxy here so the frontend can call same-origin /api/* paths.
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: "http://localhost:8000/api/health",
      },
      {
        source: "/api/kernelspecs",
        destination: "http://localhost:8000/api/kernelspecs",
      },
      {
        source: "/api/kernels",
        destination: "http://localhost:8000/api/kernels",
      },
      {
        source: "/api/kernels/:path*",
        destination: "http://localhost:8000/api/kernels/:path*",
      },
      {
        source: "/api/sandboxes",
        destination: "http://localhost:8000/api/sandboxes",
      },
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;

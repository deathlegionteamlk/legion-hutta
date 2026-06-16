#!/usr/bin/env bash
# Start the Legion Hutta Python backend on port 8000.
# Uses a double-fork pattern to fully detach from the calling shell
# so the backend survives the calling tool's cleanup.
#
# Sets a default LEGION_HUTTA_API_KEY so the public v1 API is enabled
# out of the box. Override by setting the env var before running.

set -e

cd /home/z/my-project/python-backend

# Make sure dependencies are installed (best-effort)
pip install -q -r requirements.txt 2>&1 | tail -3 || true

# Kill any existing uvicorn on port 8000
pkill -9 -f "uvicorn main:app" 2>/dev/null || true
sleep 1

# Default API key for local dev — change in production!
export LEGION_HUTTA_API_KEY="${LEGION_HUTTA_API_KEY:-legion-hutta-dev-key-local}"

# Double-fork detach so the process survives this script's exit
( setsid bash -c "cd /home/z/my-project/python-backend && exec uvicorn main:app --host 0.0.0.0 --port 8000 >> /home/z/my-project/python-backend.log 2>&1" </dev/null >/dev/null 2>&1 & )

# Wait a moment for it to come up
sleep 3

# Health check
echo "=== Backend health check ==="
curl -sS http://localhost:8000/api/health || echo "Health check failed"
echo ""
echo "=== Sandboxes ==="
curl -sS http://localhost:8000/api/sandboxes | python3 -c "import sys,json;d=json.load(sys.stdin);[print(f'  - {s[\"name\"]:15} {s[\"display_name\"]:25} {\"available\" if s[\"available\"] else \"unavailable: \"+s[\"unavailable_reason\"]}') for s in d['sandboxes']]"
echo ""
echo "=== Public API v1 (with default key) ==="
curl -sS -H "X-Legion-Key: $LEGION_HUTTA_API_KEY" http://localhost:8000/api/v1/health
echo ""
echo ""
echo "Default API key: $LEGION_HUTTA_API_KEY"

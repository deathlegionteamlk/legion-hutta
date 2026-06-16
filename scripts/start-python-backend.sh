#!/usr/bin/env bash
# Start the Legion Hutta Python backend on port 8000.
# Used by the fullstack dev environment. Logs go to python-backend.log.

set -e

cd /home/z/my-project/python-backend

# Make sure dependencies are installed
pip install -q -r requirements.txt 2>&1 | tail -5 || true

# Kill any existing uvicorn on port 8000
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 1

# Start uvicorn in the background, with auto-reload
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /home/z/my-project/python-backend.log 2>&1 &
echo $! > /home/z/my-project/python-backend.pid

# Wait a moment for it to come up
sleep 3

# Health check
echo "=== Backend health check ==="
curl -sS http://localhost:8000/api/health || echo "Health check failed"
echo ""
echo "=== Kernel specs ==="
curl -sS http://localhost:8000/api/kernelspecs || echo "Kernelspecs check failed"
echo ""

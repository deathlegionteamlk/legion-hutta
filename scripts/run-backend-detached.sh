#!/bin/bash
# Double-fork to fully detach from the parent
cd /home/z/my-project/python-backend
export LEGION_HUTTA_API_KEY="legion-hutta-dev-key-local"
exec uvicorn main:app --host 0.0.0.0 --port 8000 >> /home/z/my-project/python-backend.log 2>&1

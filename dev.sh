#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_PID=""
BACKEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "Stopped frontend"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && echo "Stopped backend"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting backend..."
cd "$ROOT_DIR/backend/mastra"
MASTRA_HOST=0.0.0.0 npm run dev &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "---"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4111"
echo "---"
echo ""

wait

#!/bin/bash
# CSSD-Flow — Local startup script

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
PYTHON="python3"
UVICORN="$HOME/Library/Python/3.9/bin/uvicorn"
NPM="/opt/homebrew/bin/npm"
NODE="/opt/homebrew/bin/node"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}  ██████╗███████╗███████╗██████╗     ███████╗██╗      ██████╗ ██╗    ██╗${RESET}"
echo -e "${BOLD}${CYAN} ██╔════╝██╔════╝██╔════╝██╔══██╗    ██╔════╝██║     ██╔═══██╗██║    ██║${RESET}"
echo -e "${BOLD}${CYAN} ██║     ███████╗███████╗██║  ██║    █████╗  ██║     ██║   ██║██║ █╗ ██║${RESET}"
echo -e "${BOLD}${CYAN} ██║          ██║╚════██║██║  ██║    ██╔══╝  ██║     ██║   ██║██║███╗██║${RESET}"
echo -e "${BOLD}${CYAN} ╚██████╗███████║███████║██████╔╝    ██║     ███████╗╚██████╔╝╚███╔███╔╝${RESET}"
echo -e "${BOLD}${CYAN}  ╚═════╝╚══════╝╚══════╝╚═════╝     ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝${RESET}"
echo ""
echo -e "${BOLD}  Hospital CSSD Sterilization Tracking System${RESET}"
echo -e "  ${YELLOW}v2.1.0 — Local Development${RESET}"
echo ""

# ── Kill existing processes ───────────────────────────────────────────────────
echo -e "${YELLOW}▶ Stopping any existing servers...${RESET}"
pkill -f "uvicorn main:app" 2>/dev/null && echo "  Stopped backend" || true
pkill -f "vite" 2>/dev/null && echo "  Stopped frontend" || true
sleep 1

# ── Check dependencies ────────────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Checking dependencies...${RESET}"

if ! command -v $PYTHON &>/dev/null; then
  echo -e "${RED}  ✗ Python3 not found${RESET}"; exit 1
fi
echo -e "${GREEN}  ✓ Python: $($PYTHON --version)${RESET}"

if ! [ -f "$UVICORN" ]; then
  echo -e "${YELLOW}  Installing backend dependencies...${RESET}"
  cd "$BACKEND_DIR" && $PYTHON -m pip install -r requirements.txt -q
fi
echo -e "${GREEN}  ✓ Uvicorn ready${RESET}"

if ! [ -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}  Installing frontend dependencies...${RESET}"
  cd "$FRONTEND_DIR" && $NPM install --silent
fi
echo -e "${GREEN}  ✓ Node modules ready${RESET}"

# ── Start Backend ─────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting backend (FastAPI)...${RESET}"
cd "$BACKEND_DIR"
PATH="$HOME/Library/Python/3.9/bin:$PATH" \
  $UVICORN main:app --reload --port 8000 \
  > /tmp/cssd-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend
for i in {1..15}; do
  sleep 1
  if curl -s http://localhost:8000/ &>/dev/null; then
    echo -e "${GREEN}  ✓ Backend running — http://localhost:8000${RESET}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${RED}  ✗ Backend failed to start. Check /tmp/cssd-backend.log${RESET}"
    exit 1
  fi
done

# ── Start Frontend ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting frontend (React + Vite)...${RESET}"
cd "$FRONTEND_DIR"
PATH="/opt/homebrew/bin:$PATH" \
  $NPM run dev \
  > /tmp/cssd-frontend.log 2>&1 &
FRONTEND_PID=$!

for i in {1..15}; do
  sleep 1
  if curl -s http://localhost:3000/ &>/dev/null; then
    echo -e "${GREEN}  ✓ Frontend running — http://localhost:3000${RESET}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${RED}  ✗ Frontend failed. Check /tmp/cssd-frontend.log${RESET}"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  CSSD-Flow is running!${RESET}"
echo ""
echo -e "  ${GREEN}●${RESET} Frontend  →  ${BOLD}http://localhost:3000${RESET}"
echo -e "  ${GREEN}●${RESET} Backend   →  ${BOLD}http://localhost:8000${RESET}"
echo -e "  ${GREEN}●${RESET} API Docs  →  ${BOLD}http://localhost:8000/docs${RESET}"
echo ""
echo -e "  Backend PID:  $BACKEND_PID"
echo -e "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop all servers${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Open browser
sleep 1
open http://localhost:3000 2>/dev/null || true

# Keep alive — trap Ctrl+C
cleanup() {
  echo -e "\n${YELLOW}  Stopping servers...${RESET}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  pkill -f "uvicorn main:app" 2>/dev/null
  pkill -f "vite" 2>/dev/null
  echo -e "${GREEN}  Stopped. Goodbye!${RESET}\n"
  exit 0
}
trap cleanup INT TERM

# Monitor logs
tail -f /tmp/cssd-backend.log /tmp/cssd-frontend.log 2>/dev/null

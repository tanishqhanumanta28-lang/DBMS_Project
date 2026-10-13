#!/usr/bin/env bash
# One-time setup: create .venv, install dependencies, build the database.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
[ -f .env ] || cp .env.example .env
./database/reset.sh
echo "Done. Start with:  source .venv/bin/activate && python backend/app.py   (API)  &  python server.py   (web app)"

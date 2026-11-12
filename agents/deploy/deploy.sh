#!/usr/bin/env bash
# Syncs what the VPS needs and (re)starts the stack. Usage: agents/deploy/deploy.sh [ssh-host]   (default host alias: vps)
# Prereqs (once): `pnpm pack:secrets`, and agents/deploy/.env created from .env.example.
set -euo pipefail
HOST="${1:-${VPS_HOST:-vps}}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/koelakan}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

[ -f "$ROOT/agents/deploy/.env" ] || { echo "missing agents/deploy/.env (copy .env.example)"; exit 1; }
[ -d "$ROOT/agents/deploy/secrets/keys" ] || { echo "missing agents/deploy/secrets (run: pnpm pack:secrets)"; exit 1; }
grep -q '^SERVICE_KEY=ed25519:' "$ROOT/agents/deploy/.env" || { echo "SERVICE_KEY is empty in .env (run: pnpm keygen:service)"; exit 1; }

ssh "$HOST" "mkdir -p $REMOTE_DIR/agents $REMOTE_DIR/sim/src"
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .keys --exclude .data --exclude .state --exclude out \
  --exclude 'secrets/service-key.env' \
  "$ROOT/agents/" "$HOST:$REMOTE_DIR/agents/"
rsync -az --delete "$ROOT/sim/src/" "$HOST:$REMOTE_DIR/sim/src/"
ssh "$HOST" "chmod 600 $REMOTE_DIR/agents/deploy/.env && chmod -R go-rwx $REMOTE_DIR/agents/deploy/secrets && \
  cd $REMOTE_DIR && docker compose -f agents/deploy/compose.yaml --project-directory agents/deploy up -d --build && \
  docker compose -f agents/deploy/compose.yaml --project-directory agents/deploy ps"
echo "done. Check: curl https://\$(grep ^AGENT_DOMAIN $ROOT/agents/deploy/.env | cut -d= -f2)/status"

#!/usr/bin/env bash
# Day2 SecOps — auto-sync.
#
# Commits any dirty state in the repo and pushes to origin/main. Designed to
# run periodically via a systemd user timer.
#
# Safety guards:
#   - flock against concurrent runs (slow push won't overlap next tick)
#   - skips if working tree is clean
#   - skips if branch is detached or not on main
#   - skips if any merge / rebase / cherry-pick is in flight
#   - 60s timeout on push so a network hang doesn't wedge the timer
#
# Credentials live in .git/config (token embedded in remote URL). We do not
# echo or log the URL.

set -euo pipefail

REPO="${REPO:-/home/osboxes/abcl-secviz}"
LOG_DIR="${LOG_DIR:-$REPO/var/log}"
LOCK_FILE="$LOG_DIR/auto-sync.lock"
LOG_FILE="$LOG_DIR/auto-sync.log"

mkdir -p "$LOG_DIR"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG_FILE"
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "skip — another auto-sync already running"
  exit 0
fi

cd "$REPO"

# Safety: only run on main and only when no rebase/merge in progress.
branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo DETACHED)"
if [ "$branch" != "main" ]; then
  log "skip — not on main (HEAD=$branch)"
  exit 0
fi
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ] || [ -f .git/CHERRY_PICK_HEAD ]; then
  log "skip — merge/rebase/cherry-pick in progress"
  exit 0
fi

# Anything to do?
if [ -z "$(git status --porcelain)" ]; then
  # Still attempt a push in case we have unpushed commits.
  unpushed="$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)"
  if [ "$unpushed" = "0" ]; then
    log "clean — no changes, no unpushed commits"
    exit 0
  fi
  log "no working-tree changes, but $unpushed unpushed commit(s) — pushing"
else
  changes="$(git status --porcelain | wc -l | tr -d ' ')"
  git add -A
  msg="chore: auto-sync ${changes} change(s) at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if ! git -c user.email=info@cyfy.ai -c user.name='Day2 SecOps Bot' commit -m "$msg" >> "$LOG_FILE" 2>&1; then
    log "commit failed (likely empty after .gitignore filter); skipping"
    exit 0
  fi
  log "committed: $msg"
fi

# Push with hard timeout.
if timeout 60 git push origin HEAD:main >> "$LOG_FILE" 2>&1; then
  log "push ok"
else
  rc=$?
  log "push failed rc=$rc (will retry on next tick)"
  exit 0  # don't bubble up — timer will retry
fi

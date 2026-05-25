#!/usr/bin/env bash
# Install abcl-secviz stack supervisor as user-level systemd units.
# Idempotent. Does NOT need root — writes to ~/.config/systemd/user/.
#
# After install:
#   systemctl --user start  abcl-secviz-stack.service
#   systemctl --user status abcl-secviz-stack.service
#   systemctl --user enable abcl-secviz-stack.service        # start on user login
#   systemctl --user enable --now abcl-secviz-cleanup.timer  # hourly cleanup
#
# To survive logout (true 24/7 even when no one is logged in):
#   sudo loginctl enable-linger "$USER"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$REPO_ROOT/deploy/systemd"
DEST="$HOME/.config/systemd/user"

mkdir -p "$DEST"
mkdir -p "$REPO_ROOT/var/log"

UNITS=(
  abcl-secviz-stack.service
  abcl-secviz-cleanup.service
  abcl-secviz-cleanup.timer
)

for unit in "${UNITS[@]}"; do
  src="$SRC/$unit"
  dst="$DEST/$unit"
  if [ ! -f "$src" ]; then
    echo "missing: $src" >&2
    exit 1
  fi
  # Resolve %h to $HOME ahead of time so the unit works even if a non-systemd
  # tool tries to launch it.
  sed "s|%h|$HOME|g" "$src" > "$dst"
  echo "installed: $dst"
done

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload
  echo "systemctl --user daemon-reload OK"
else
  echo "warn: systemctl not available — units written but not reloaded"
fi

cat <<'EOF'

Next steps:
  systemctl --user enable --now abcl-secviz-stack.service
  systemctl --user enable --now abcl-secviz-cleanup.timer

To watch logs:
  journalctl --user -u abcl-secviz-stack.service -f
  tail -F var/log/supervisor.log var/log/dev-server.log

To run 24/7 without an active login session:
  sudo loginctl enable-linger "$USER"
EOF

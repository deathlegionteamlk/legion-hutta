#!/usr/bin/env bash
#
# push-to-github.sh — safely push Legion Hutta to a new GitHub repo.
#
# This script does NOT hardcode any token. It prompts you at runtime,
# uses the token once to push, then immediately rewrites the remote URL
# to remove the token so it's not persisted in .git/config or shell history.
#
# Usage:
#   bash scripts/push-to-github.sh <github-username> <repo-name>
#
# Example:
#   bash scripts/push-to-github.sh deathlegion legion-hutta
#
# Prerequisites:
#   1. Revoke any previously-exposed tokens at https://github.com/settings/tokens
#   2. Create a NEW token at https://github.com/settings/tokens/new
#      with the "repo" scope (and "workflow" if you want to push GitHub Actions).
#      DO NOT paste it anywhere except this script's prompt.
#   3. Create an empty repo on GitHub:
#        https://github.com/new
#      Name it whatever you want (e.g. "legion-hutta").
#      DO NOT initialize with README/LICENSE/.gitignore — this repo already has them.
#
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <github-username> <repo-name>" >&2
  echo "Example: $0 deathlegion legion-hutta" >&2
  exit 1
fi

USERNAME="$1"
REPO="$2"
REMOTE_URL="https://github.com/${USERNAME}/${REPO}.git"

echo "→ Pushing to: ${REMOTE_URL}"
echo

# Prompt for token without echoing it to the terminal.
read -s -p "GitHub Personal Access Token (input hidden): " TOKEN
echo
echo

if [[ -z "${TOKEN}" ]]; then
  echo "✗ No token entered. Aborting." >&2
  exit 1
fi

# Set the remote with the token embedded. We'll strip it immediately after push.
TOKEN_URL="https://${USERNAME}:${TOKEN}@github.com/${USERNAME}/${REPO}.git"

# Remove existing origin if any, then add the token-embedded URL.
if git remote get-url origin >/dev/null 2>&1; then
  git remote remove origin
fi
git remote add origin "${TOKEN_URL}"

echo "→ Pushing main branch…"
# Capture push output so we can scrub the token from any error messages.
if git push -u origin main 2>&1 | sed "s|${TOKEN}|***TOKEN SCRUBBED***|g"; then
  echo
  echo "✓ Push succeeded."
else
  echo
  echo "✗ Push failed. See scrubbed output above." >&2
  # Still scrub the token from the remote URL before exiting.
  git remote set-url origin "${REMOTE_URL}"
  exit 1
fi

# Immediately rewrite the remote URL to remove the token.
git remote set-url origin "${REMOTE_URL}"

# Clear the token from the shell variable.
TOKEN=""
unset TOKEN

echo "→ Remote URL scrubbed (token no longer stored in .git/config)."
echo
echo "✓ Done. Your repo is live at:"
echo "  ${REMOTE_URL}"
echo
echo "Next steps:"
echo "  1. Verify the push: open ${REMOTE_URL} in your browser."
echo "  2. Star your own repo. ⭐"
echo "  3. (Optional) Add a description + topics on the GitHub repo settings page."
echo "  4. (Optional) Enable GitHub Pages for a hosted demo."

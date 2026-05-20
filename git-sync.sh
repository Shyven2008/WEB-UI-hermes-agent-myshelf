#!/bin/bash
# ====== Git Sync · Just Hermes Agent WEB UI ======
# One-click: version++ -> add -> commit -> push
# Usage: bash git-sync.sh "commit message"

PROJECT="/c/Users/YF00/just-hermes-agent-webui"
cd "$PROJECT" || exit 1

# Read current version
VFILE="$PROJECT/VERSION"
CUR=$(head -1 "$VFILE" | grep -oP 'v\d+\.\d+\.\d+')
echo "Current: $CUR"

# Parse and increment (v2.2.0 -> v2.3.0)
MAJOR=$(echo "$CUR" | cut -d. -f1 | tr -d v)
MINOR=$(echo "$CUR" | cut -d. -f2)
PATCH=$(echo "$CUR" | cut -d. -f3)
NEW="v$MAJOR.$((MINOR+1)).0"
echo "Next:    $NEW"

# Update VERSION
DATE=$(date "+%a %b %d %T %Y")
MSG="${1:-Auto sync}"
echo "$NEW (${MSG}) - ${DATE}" > "$VFILE"
echo "VERSION updated"

# Update README changelog
CHANGELOG="### ${NEW} ($(date +%F)) — ${MSG}"
sed -i "/^## Changelog/a \\
\\
${CHANGELOG}" README.md
echo "README updated"

# Stage, commit, push
git add -A
git commit -m "${NEW} — ${MSG}"
# Tag the version for history preservation
git tag -a "${NEW}" -m "${NEW} — ${MSG}"
git push origin main --follow-tags
echo "=== Done: ${NEW} ==="

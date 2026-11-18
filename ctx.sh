#!/usr/bin/env bash
# Plan docs: `./ctx.sh sync` pulls them into the working tree, `./ctx.sh publish "<msg>"` commits your edits.
# Branch mode keeps them on an orphan `context` branch so code branches stay code-only; it goes through a
# temporary index, so it never switches branches or touches your staged code.
# Inline mode (git config solo.docs inline) just commits them on the current branch.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DOCS=(CLAUDE.md plan.md tasks.md decisions.md handoff.md research.md skills ctx.sh)
MODE=$(git config solo.docs || echo branch)
STAMP=.git/context-synced
EMPTY_TREE=$(git hash-object -t tree /dev/null)

has_remote() { git remote get-url origin >/dev/null 2>&1; }
base() {
  if has_remote && git rev-parse -q --verify origin/context >/dev/null; then echo origin/context
  elif git rev-parse -q --verify context >/dev/null; then echo context; fi
}
present() { for p in "${DOCS[@]}"; do [ -e "$p" ] && echo "$p"; done; }
install_skills() { if [ -d skills ]; then mkdir -p .claude/skills && cp -r skills/* .claude/skills/; fi; }
check_secrets() {
  if git diff --cached ${1:+"$1"} | grep -nEi '^\+.*(api[_-]?key|secret|token|password)["'"'"' ]*[:=] *["'"'"']?[A-Za-z0-9_\-]{16,}'; then
    echo "ctx: that looks like a secret; nothing published." >&2; exit 1
  fi
}

sync_branch() {
  if has_remote; then git fetch -q origin context 2>/dev/null || true; fi
  local b new old
  b=$(base)
  if [ -z "$b" ]; then echo "ctx: no context branch yet; run ./ctx.sh publish first"; exit 1; fi
  new=$(git rev-parse "$b"); old=$(cat "$STAMP" 2>/dev/null || true)
  if [ "$new" = "$old" ]; then echo "ctx: docs current (${new:0:7})"; install_skills; rm -rf skills; return; fi
  if [ -n "$old" ]; then
    git --no-pager log --oneline "$old..$new"
    git --no-pager diff --stat "$old" "$new"
    # Unpacking overwrites the docs, so keep any edit that was never published.
    git ls-tree -r --name-only "$old" | while read -r f; do
      if [ -f "$f" ] && [ "$(git hash-object "$f")" != "$(git rev-parse "$old:$f")" ]; then
        mkdir -p .git/ctx-backup && cp "$f" ".git/ctx-backup/${f//\//_}"
        echo "ctx: unpublished edit to $f saved in .git/ctx-backup/; merge it back by hand"
      fi
    done
  fi
  git archive "$new" | tar -x
  git update-ref refs/heads/context "$new"
  echo "$new" > "$STAMP"
  install_skills; rm -rf skills
  echo "ctx: synced to ${new:0:7}"
}

publish_branch() {
  local msg=$1 b tree c
  if has_remote; then git fetch -q origin context 2>/dev/null || true; fi
  b=$(base)
  if [ -n "$b" ] && [ "$(git rev-parse "$b")" != "$(cat "$STAMP" 2>/dev/null)" ]; then
    echo "ctx: context moved since your last sync; run ./ctx.sh sync, merge, then publish" >&2; exit 1
  fi
  export GIT_INDEX_FILE=.git/context-index
  if [ -n "$b" ]; then git read-tree "$b"; else git read-tree --empty; fi
  mapfile -t paths < <(present)
  git -c core.safecrlf=false add -f -- "${paths[@]}"
  if git diff --cached --quiet "${b:-$EMPTY_TREE}"; then unset GIT_INDEX_FILE; echo "ctx: nothing to publish"; return; fi
  git --no-pager diff --cached --stat "${b:-$EMPTY_TREE}"
  check_secrets "${b:-$EMPTY_TREE}"
  tree=$(git write-tree); unset GIT_INDEX_FILE
  if [ -n "$b" ]; then c=$(git commit-tree "$tree" -p "$b" -m "$msg"); else c=$(git commit-tree "$tree" -m "$msg"); fi
  if has_remote; then git push -q origin "$c:refs/heads/context" && git fetch -q origin context; fi
  git update-ref refs/heads/context "$c"
  echo "$c" > "$STAMP"
  echo "ctx: published ${c:0:7}: $msg"
}

publish_inline() {
  local msg=$1
  mapfile -t paths < <(present)
  git -c core.safecrlf=false add -- "${paths[@]}"
  if git diff --cached --quiet -- "${paths[@]}"; then echo "ctx: nothing to publish"; return; fi
  check_secrets
  git commit -q -m "$msg" -- "${paths[@]}"
  echo "ctx: committed docs on $(git branch --show-current): $msg"
}

case "${1:-}" in
  sync)    if [ "$MODE" = inline ]; then install_skills; echo "ctx: inline mode, docs come with git pull"; else sync_branch; fi ;;
  publish) msg=${2:?usage: ./ctx.sh publish \"<message>\"}
           if [ "$MODE" = inline ]; then publish_inline "$msg"; else publish_branch "$msg"; fi ;;
  *)       echo "usage: ./ctx.sh sync | publish \"<message>\"" >&2; exit 2 ;;
esac

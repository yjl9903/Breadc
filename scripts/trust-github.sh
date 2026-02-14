#!/usr/bin/env bash
set -euo pipefail

WORKFLOW_FILE="${WORKFLOW_FILE:-release.yml}"
REPO="${REPO:-}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"
DRY_RUN=false
NPM_CMD=(mise exec npm@^11.10.0 -- npm)

while (($# > 0)); do
  case "$1" in
    --file)
      WORKFLOW_FILE="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 [--file release.yml] [--repo owner/repo] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

resolve_repo_from_git() {
  local remote_url
  if ! remote_url="$(git remote get-url origin 2>/dev/null)"; then
    echo "Failed to read git remote 'origin'. Use --repo owner/repo." >&2
    exit 1
  fi

  remote_url="${remote_url%.git}"
  case "$remote_url" in
    git@github.com:*)
      echo "${remote_url#git@github.com:}"
      ;;
    https://github.com/*)
      echo "${remote_url#https://github.com/}"
      ;;
    http://github.com/*)
      echo "${remote_url#http://github.com/}"
      ;;
    ssh://git@github.com/*)
      echo "${remote_url#ssh://git@github.com/}"
      ;;
    *)
      echo "Unsupported remote URL: $remote_url" >&2
      echo "Use --repo owner/repo to set it explicitly." >&2
      exit 1
      ;;
  esac
}

if [[ -z "$REPO" ]]; then
  REPO="$(resolve_repo_from_git)"
fi

PACKAGES=()
while IFS= read -r pkg; do
  [[ -n "$pkg" ]] && PACKAGES+=("$pkg")
done < <(
  pnpm -r list --depth -1 --json \
    | node -e '
      let data = "";
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => {
        const entries = JSON.parse(data);
        const names = entries
          .filter((pkg) => pkg.name && pkg.private !== true)
          .map((pkg) => pkg.name);
        for (const name of names) console.log(name);
      });
    '
)

if [[ "${#PACKAGES[@]}" -eq 0 ]]; then
  echo "No publishable workspace packages found from pnpm-workspace config." >&2
  exit 1
fi

echo "Repo: $REPO"
echo "Workflow file: $WORKFLOW_FILE"
echo "Workspace packages: ${#PACKAGES[@]}"

print_cmd() {
  printf '  %q' "$@"
  printf '\n'
}

get_trust_ids() {
  local pkg="$1"
  "${NPM_CMD[@]}" trust list "$pkg" --json --loglevel=error \
    | node -e '
      let data = "";
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => {
        try {
          const parsed = JSON.parse(data.trim());
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const entry of list) {
            if (entry && typeof entry.id === "string" && entry.id.length > 0) {
              console.log(entry.id);
            }
          }
        } catch (err) {
          // Ignore JSON parsing errors and return no IDs.
        }
      });
    '
}

for pkg in "${PACKAGES[@]}"; do
  echo ""
  echo "Config trust for $pkg"

  trust_ids=()
  while IFS= read -r trust_id; do
    [[ -n "$trust_id" ]] && trust_ids+=("$trust_id")
  done < <(get_trust_ids "$pkg")

  if [[ "${#trust_ids[@]}" -gt 0 ]]; then
    echo "  existing trust config found (${#trust_ids[@]}), revoking..."
    for trust_id in "${trust_ids[@]}"; do
      revoke_cmd=("${NPM_CMD[@]}" trust revoke "$pkg" --id "$trust_id")
      if [[ "$DRY_RUN" == true ]]; then
        print_cmd "${revoke_cmd[@]}"
      else
        "${revoke_cmd[@]}"
      fi
    done
  fi

  cmd=("${NPM_CMD[@]}" trust github "$pkg" --repo "$REPO" --file "$WORKFLOW_FILE" --yes)
  if [[ "$DRY_RUN" == true ]]; then
    print_cmd "${cmd[@]}"
  else
    "${cmd[@]}"
    sleep "$SLEEP_SECONDS"
  fi
done

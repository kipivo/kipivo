#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
compose=(
  docker compose
  --file .railway/topology/compose.yml
  --project-name "kipivo-topology-smoke-$$-$RANDOM"
)
docker compose version >/dev/null

cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then "${compose[@]}" logs --no-color >&2 || true; fi
  if ! "${compose[@]}" down --volumes --remove-orphans; then
    if (( status == 0 )); then status=1; fi
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" up --no-build --wait --wait-timeout 90 gateway
"${compose[@]}" run --rm -T smoke

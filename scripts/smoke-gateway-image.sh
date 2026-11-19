#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  printf 'Usage: %s [gateway-image]\n' "$0" >&2
  exit 2
fi
cd "$(dirname "$0")/.."
export KIPIVO_GATEWAY_SMOKE_IMAGE
KIPIVO_GATEWAY_SMOKE_IMAGE=$(docker image inspect --format '{{.Id}}' -- "${1:-kipivo-gateway:ci}")
compose=(
  docker compose
  --file .railway/gateway/smoke/compose.yml
  --project-name "kipivo-gateway-smoke-$$-$RANDOM"
)
docker compose version >/dev/null

cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then "${compose[@]}" logs --no-color >&2 || true; fi
  if ! "${compose[@]}" down --volumes; then
    if (( status == 0 )); then status=1; fi
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" up --wait --wait-timeout 60
"${compose[@]}" exec -T upstream bun /smoke/test.mjs

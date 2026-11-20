#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  printf 'Usage: %s [docs-image]\n' "$0" >&2
  exit 2
fi

cd "$(dirname "$0")/.."
image=$(docker image inspect --format '{{.Id}}' -- "${1:-kipivo-docs:ci}")
container=$(docker create --publish 127.0.0.1::4321 "$image")
cleanup() {
  docker logs "$container" || true
  docker rm --force --volumes "$container" >/dev/null
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker start "$container" >/dev/null
origin="http://$(docker port "$container" 4321/tcp)"
curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 1 --max-time 2 \
  --output /dev/null "$origin/docs/"
bun scripts/smoke-docs.mjs "$origin"

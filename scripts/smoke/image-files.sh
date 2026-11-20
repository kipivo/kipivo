#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  printf 'Usage: %s <image>\n' "$0" >&2
  exit 2
fi

container=$(docker create --pull never -- "$1")
trap 'docker rm --volumes "$container" >/dev/null' EXIT

unexpected=$(docker export "$container" | tar -tf - | awk '
  /(^|\/)node_modules(\/|$)/ { next }
  /(^|\/)(\.git|\.env(\.[^\/]+)?)(\/|$)/
')
if [[ -n "$unexpected" ]]; then
  printf 'Found checkout or dotenv files in %s\n%s\n' "$1" "$unexpected" >&2
  exit 1
fi

printf 'Image filesystem check passed for %s\n' "$1"

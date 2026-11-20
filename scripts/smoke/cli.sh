#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
version=$(bun apps/cli/dist/kipivo.js --version)
test -n "$version"
for command in kipivo kpvo; do
  actual_version=$(bun run --silent "$command" --version)
  test "$version" = "$actual_version"
done

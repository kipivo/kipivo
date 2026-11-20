#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
bun run format:check
bun run lint
bun run ci:test
bun run db:check
bun run typecheck
bun run tsc -p .railway/tsconfig.json
bun run knip
bun test scripts/cli/index.test.ts
bun run test

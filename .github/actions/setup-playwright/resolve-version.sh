#!/usr/bin/env bash
set -euo pipefail

version=$(bun -e 'console.log(require("@playwright/test/package.json").version)')
printf 'version=%s\n' "$version" >> "$GITHUB_OUTPUT"

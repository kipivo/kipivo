#!/usr/bin/env bash
set -euo pipefail

check_chromium() {
  bun -e 'import { chromium } from "@playwright/test"; const browser = await chromium.launch(); await browser.close()'
}

if ! check_chromium; then
  bun run --bun playwright install-deps chromium
  check_chromium
fi

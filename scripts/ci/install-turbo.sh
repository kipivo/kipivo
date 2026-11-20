#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
version=$(bun -e 'console.log((await Bun.file("package.json").json()).devDependencies.turbo)')
install_dir="${RUNNER_TEMP:?Set RUNNER_TEMP to a temporary directory}/ci-turbo"
mkdir -p "$install_dir"
printf '{}\n' > "$install_dir/package.json"
bun install --cwd "$install_dir" --no-save "turbo@$version"
mkdir -p node_modules/.bin
ln -s "$install_dir/node_modules/.bin/turbo" node_modules/.bin/turbo

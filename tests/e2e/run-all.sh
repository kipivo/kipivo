#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
docker info --format 'Docker server {{.ServerVersion}}'
bun run test:e2e:install --only-shell
bun run build --filter=api --filter=web --filter=kipivo

if [[ -z ${TEST_DATABASE_URL:-} ]]; then
  postgres_id=
  cleanup() {
    local status=$?
    trap - EXIT
    if [[ -n $postgres_id ]]; then
      if ! docker rm --force --volumes "$postgres_id" >/dev/null; then
        if (( status == 0 )); then status=1; fi
      fi
    fi
    exit "$status"
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  password=$(bun -e 'console.log(crypto.randomUUID())')
  postgres_id=$(POSTGRES_PASSWORD="$password" docker create \
    --env POSTGRES_PASSWORD --publish 127.0.0.1::5432 postgres:17-alpine)
  docker start "$postgres_id" >/dev/null

  # The image starts a socket-only server during initdb. Wait for its final TCP listener.
  deadline=$((SECONDS + 60))
  until docker exec "$postgres_id" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do
    if [[ $(docker inspect --format '{{.State.Running}}' "$postgres_id") != true ]] ||
      (( SECONDS >= deadline )); then
      echo 'Test PostgreSQL did not become ready.' >&2
      docker logs --tail 50 "$postgres_id" >&2
      exit 1
    fi
    sleep 1
  done
  address=$(docker port "$postgres_id" 5432/tcp)
  export TEST_DATABASE_URL="postgresql://postgres:$password@$address/postgres"
fi

# Run every project in playwright.config.ts against the local build.
E2E_API_ORIGIN= bun run --cwd tests/e2e test:e2e "$@"

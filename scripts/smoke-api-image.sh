#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  printf 'Usage: %s [api-image]\n' "$0" >&2
  exit 2
fi

cd "$(dirname "$0")/.."
image=$(docker image inspect --format '{{.Id}}' -- "${1:-kipivo-api:ci}")
expected_migrations=$(bun -e 'console.log((await Bun.file("packages/db/drizzle/meta/_journal.json").json()).entries.length)')
(( expected_migrations > 0 ))

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/kipivo-api-smoke.XXXXXXXX")
run_label="io.kipivo.api-image-smoke=${work_dir##*/}"

cleanup() {
  local status=$? cleanup_status=0 ids id resource
  trap - EXIT
  # Find resources even if Docker created them before the client returned their IDs.
  ids=$(docker container ls --all --quiet --filter "label=$run_label") || cleanup_status=1
  while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    if (( status != 0 )); then
      printf '\nLogs for %s\n' "$id" >&2
      docker logs "$id" >&2 || true
    fi
    docker container rm --force --volumes "$id" >/dev/null || cleanup_status=1
  done <<< "$ids"

  for resource in volume network; do
    ids=$(docker "$resource" ls --quiet --filter "label=$run_label") || cleanup_status=1
    while IFS= read -r id; do
      [[ -n "$id" ]] || continue
      docker "$resource" rm "$id" >/dev/null || cleanup_status=1
    done <<< "$ids"
  done
  rm -rf -- "$work_dir" || cleanup_status=1
  if (( status == 0 )); then
    status=$cleanup_status
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

start_container() {
  container=$(docker create --label "$run_label" --network "$network" "$@")
  docker start "$container" >/dev/null
}

wait_for() {
  local description=$1 deadline=$((SECONDS + 60))
  shift
  until "$@" 2>"$work_dir/wait-error"; do
    if (( SECONDS >= deadline )); then
      cat "$work_dir/wait-error" >&2
      fail "Timed out waiting for $description"
    fi
    sleep 1
  done
}

db_user=kipivo
db_password=kipivo_smoke
db_name=kipivo_image_smoke
database_url="postgresql://$db_user:$db_password@postgres:5432/$db_name"
network=$(docker network create --label "$run_label" "${work_dir##*/}")
volume=$(docker volume create --label "$run_label")

start_container --network-alias postgres \
  --env "POSTGRES_USER=$db_user" --env "POSTGRES_PASSWORD=$db_password" --env "POSTGRES_DB=$db_name" \
  --mount "type=volume,source=$volume,target=/var/lib/postgresql/data" postgres:17-alpine
postgres=$container

sql() {
  docker exec --env "PGPASSWORD=$db_password" --env PGCONNECT_TIMEOUT=2 \
    --env 'PGOPTIONS=-c statement_timeout=5000' "$postgres" \
    psql -X -v ON_ERROR_STOP=1 -At -h postgres -U "$db_user" -d "$db_name" -c "$1"
}
postgres_ready() {
  sql 'SELECT 1' >/dev/null
}
wait_for 'PostgreSQL TCP query' postgres_ready

schema_state() {
  sql "SELECT to_regclass('public.auth_user') IS NOT NULL,
              to_regclass('public.auth_session') IS NOT NULL,
              to_regclass('public.auth_account') IS NOT NULL,
              to_regclass('public.auth_verification') IS NOT NULL,
              to_regclass('drizzle.__drizzle_migrations') IS NOT NULL"
}

start_api() {
  local connection_string=$1
  shift
  start_container --publish 127.0.0.1::8080 --env PORT=8080 \
    --env "DATABASE_URL=$connection_string" --env BETTER_AUTH_URL=https://kipivo.example \
    --env BETTER_AUTH_SECRET=kipivo-image-smoke-test-secret-2026 "$@" "$image"
  api=$container
}

probe() {
  local path=$1 status=$2 body=$3 actual
  actual=$(curl --silent --show-error --noproxy 127.0.0.1 --max-time 2 --output "$work_dir/body" \
    --write-out '%{http_code}' "$origin/$path") || return
  if [[ "$actual" != "$status" ]] || ! cmp -s "$work_dir/body" <(printf '%s' "$body"); then
    printf '%s returned HTTP %s with body %s. Expected HTTP %s with body %s.\n' \
      "$path" "$actual" "$(cat "$work_dir/body")" "$status" "$body" >&2
    return 1
  fi
}

container_exited() {
  local state
  state=$(docker container inspect --format '{{.State.Status}}' "$1") || return
  [[ "$state" == exited || "$state" == dead ]]
}

expect_api_startup_failure() {
  local message=$1 exit_code logs
  shift
  start_api "$@"
  wait_for "API container $api to exit" container_exited "$api"
  exit_code=$(docker wait "$api")
  (( exit_code != 0 )) || fail "Expected API startup to fail with $message"
  logs=$(docker logs "$api" 2>&1)
  [[ "$logs" == *"$message"* ]] || fail "Expected startup logs to include $message"
}

wait_for_ready_api() {
  origin="http://$(docker port "$api" 8080/tcp)"
  wait_for /healthz probe healthz 200 ok
  probe readyz 200 ok
}

ledger() {
  sql 'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id'
}

printf 'Start the API image against an empty database without the migration switch.\n'
before=$(schema_state)
[[ "$before" == 'f|f|f|f|f' ]] || fail "Expected an empty schema, got $before"
start_api "$database_url"
wait_for 'unmigrated API to fail initialization' container_exited "$api"
[[ "$(docker wait "$api")" != 0 ]] || fail "Expected startup to fail without setup schema"
after=$(schema_state)
[[ "$after" == "$before" ]] || fail "Expected the schema to remain empty, got $after"
printf 'Without migrations, setup initialization stopped startup and left the schema empty.\n'

printf 'Reject invalid Auth, Redis, and S3 settings before applying migrations.\n'
expect_api_startup_failure 'BETTER_AUTH_SECRET must be at least 32 characters.' \
  "$database_url" --env DB_MIGRATE_ON_START=true --env BETTER_AUTH_SECRET=short
expect_api_startup_failure 'REDIS_URL must be a Redis TCP URL' \
  "$database_url" --env DB_MIGRATE_ON_START=true --env REDIS_URL=https://redis.example
expect_api_startup_failure 'S3_ENDPOINT must be an HTTP(S) URL' \
  "$database_url" --env DB_MIGRATE_ON_START=true \
  --env S3_ENDPOINT=ftp://s3.example --env S3_BUCKET=kipivo \
  --env S3_REGION=us-east-1 --env S3_ACCESS_KEY_ID=smoke --env S3_SECRET_ACCESS_KEY=smoke
after=$(schema_state)
[[ "$after" == "$before" ]] || fail "Expected invalid configuration to leave the schema empty, got $after"
printf 'The API rejected all three invalid configurations and the schema remained empty.\n'

printf 'Start the API image with migrations enabled.\n'
start_api "$database_url" --env DB_MIGRATE_ON_START=true
wait_for_ready_api
after=$(schema_state)
[[ "$after" == 't|t|t|t|t' ]] || fail "Expected four auth tables and the migration ledger, got $after"
count=$(sql 'SELECT count(*) FROM drizzle.__drizzle_migrations')
[[ "$count" == "$expected_migrations" ]] || fail "Expected $expected_migrations migration records, got $count"
printf 'Complete first installation as a non-root API process.\n'
docker exec "$api" bun -e '
  import assert from "node:assert/strict";
  assert.notEqual(process.getuid(), 0);
  const headers = {Origin: "https://kipivo.example", "Content-Type": "application/json"};
  const body = JSON.stringify({name: "Operator", email: "install@example.com", password: crypto.randomUUID()});
  const post = (path) => fetch(`http://127.0.0.1:8080${path}`, {method:"POST", headers, body});
  assert.equal((await post("/api/v1/setup")).status, 200);
  assert.equal((await post("/api/auth/sign-in/email")).status, 200);
'
ledger >"$work_dir/first-ledger"
docker stop --time 5 "$api" >/dev/null
printf 'Readiness returned 200 with all four auth tables and %s migration records.\n' "$count"

printf 'Start a second API container with migrations enabled against the same database.\n'
start_api "$database_url" --env DB_MIGRATE_ON_START=true
wait_for_ready_api
docker exec "$api" bun -e '
  import assert from "node:assert/strict";
  const response = await fetch("http://127.0.0.1:8080/api/v1/setup");
  assert.deepEqual(await response.json(), {open:false});
'
ledger >"$work_dir/second-ledger"
diff -u "$work_dir/first-ledger" "$work_dir/second-ledger"
printf 'Readiness returned 200 and the migration ledger matches the first run.\n'
E2E_API_ORIGIN="$origin" bun run --bun --cwd tests/e2e test:e2e --project=api

printf 'Run the standalone migration command from the API image.\n'
start_container --env "DATABASE_URL=$database_url" "$image" db:migrate
wait_for 'the standalone migration command to exit' container_exited "$container"
exit_code=$(docker wait "$container")
(( exit_code == 0 )) || fail "Standalone migration exited with status $exit_code."
ledger >"$work_dir/standalone-ledger"
diff -u "$work_dir/first-ledger" "$work_dir/standalone-ledger"

printf 'Check that a migration connection failure stops API startup.\n'
expect_api_startup_failure 'password authentication failed' \
  "postgresql://$db_user:wrong_password@postgres:5432/$db_name" --env DB_MIGRATE_ON_START=true

# API product telemetry

The API adds a `telemetry.event` field to its existing structured request log for selected successful writes, whether called over RPC (`/rpc`) or REST (`/api/v1`). There is no separate analytics service or event stream. For optional browser traffic metrics, see [Cloudflare Web Analytics](architecture.md#web-and-public-api).

| Event                      | What it counts                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `install.completed`        | The first administrator was created and installation was closed. Checking setup status or attempting installation after closure does not count. |
| `settings.personal_saved`  | Personal settings were saved.                                                                                                                   |
| `settings.directory_saved` | Instance directory settings were saved.                                                                                                         |
| `settings.email_saved`     | Instance email delivery settings were saved. No sender or provider credentials are included.                                                    |
| `account.role_set`         | The account service successfully set another account's role.                                                                                    |

The API records these events only after the write service reports success. Reads, invalid requests, access denials, and failed writes have no `telemetry` field. A successful save or role assignment can count even if the submitted value equals the stored value. These are counts of log records, not unique users, changed values, or client acknowledgements.

## Query the logs

Use the `api` service logs for the environment and time range you want. For example, given raw structured API log lines in `api.jsonl` (the API emits JSON in production), count events by name with:

```sh
jq -Rr 'fromjson? | objects | select(.service == "api") | .telemetry.event // empty' api.jsonl |
  sort | uniq -c
```

To inspect installation completions without printing the rest of the request log:

```sh
jq -Rc 'fromjson? | objects | select(.service == "api" and .telemetry.event == "install.completed") |
  {timestamp, event: .telemetry.event, status}' api.jsonl
```

Add a filter such as `select(.status >= 200 and .status < 300)` if you want to count only requests with a successful HTTP response as well as a successful write. The write is recorded before the response is delivered.

## Privacy and limits

`telemetry` contains only a fixed event name: no IDs, settings values, role values, credentials, or other payload data. This is not a guarantee about the full request log. Normal request metadata (such as the request ID or REST path) and the existing `access` audit field for role changes are separate and unchanged. Limit access to raw logs and project only the fields needed for analysis.

Telemetry has the same retention and delivery limits as request logs. It is not stored with the database transaction; a committed write can be missing from logs, and repeated successful requests count separately. Do not use these counts as a complete audit trail or a source of truth for current state.

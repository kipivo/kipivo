# Commit messages

Use Conventional Commits for new commits on `next`, `main`, and pull requests. Keep each commit focused on one change; do not rewrite published history to rename old commits.

```text
fix(storybook): wait for select focus to return
feat(web): add a settings page
ci: cache browser binaries
```

- Choose `feat` for a feature, `fix` for a bug, `perf` for a performance improvement, or `refactor` for a behavior-preserving change. Use `test`, `docs`, `style` (formatting only), `build`, `ci`, `chore`, or `revert` for the corresponding maintenance work.
- Use an optional kebab-case scope for the affected app, package, or area (e.g. `web`, `api`, `storybook`, `ui`, `db`, `e2e`, `deps`). Omit it for repository-wide changes.
- Write a short imperative subject in English, without a trailing period. Keep the whole header within 100 characters. Add a body after a blank line when the reason for the change is not obvious.
- Mark breaking changes with `!` before the colon (e.g. `feat(api)!: remove the legacy endpoint`). Use a `BREAKING CHANGE:` footer to explain what callers must do differently.

## Checking locally

Run `bun install --frozen-lockfile` from the repository root. In a development clone this sets up Husky's `commit-msg` hook, which checks each commit message using the rules in [scripts/check/commitlint.mjs](scripts/check/commitlint.mjs).

If you manage your own Git hooks, set `HUSKY=0` before installing to keep your hooks path and call `bun run --silent commitlint --edit "$1"` from your own `commit-msg` hook. To check messages without installing a hook:

```sh
printf '%s\n' 'fix(web): restore focus after saving' | bun run kpdev commitlint
bun run kpdev commitlint --from origin/next --to HEAD
```

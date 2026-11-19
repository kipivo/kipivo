# File naming

Use lowercase `kebab-case` for hand-written files and directories: `role-change.tsx`, not `RoleChange.tsx` or `role_change.tsx`. Keep TypeScript identifiers idiomatic: `AccountDirectoryRow` is the component and `useLocalRuns` is the hook. These rules apply to new or renamed files, not to identifiers or URLs.

| Kind                            | Convention                                                                                                                         | Example                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| React component                 | Name the component's responsibility; use `.tsx` for JSX.                                                                           | `account/avatar.tsx`                              |
| React hook                      | Start with `use-`; use `.ts` when there is no JSX.                                                                                 | `use-local-runs.ts`                               |
| Module or script                | Name the capability or action. Avoid `helpers`, `common`, or `utils` when a specific name fits.                                    | `access-labels.ts`, `smoke-gateway-image.sh`      |
| Server-only Web module          | Put `.server` before the extension. The filename does not replace the server-only import boundary.                                 | `local-runner.server.ts`                          |
| Unit test                       | Match the subject's basename and append `.test`. Prefer colocation; keep an established workspace test directory when appropriate. | `runs/details.test.tsx`, `env.server.test.ts`     |
| Browser spec or Storybook story | Use `.spec` for Playwright and `.stories` for Storybook. Name the behavior or component under test.                                | `local-runs.spec.ts`, `dropdown-menu.stories.tsx` |

## Let the directory name the domain

Group files that change together under their domain or subdomain. Read the path as a whole: `account/directory/list.tsx` and `account/directory/row.tsx` are clearer than `account/account-directory-list.tsx` and `account/account-directory-row.tsx`. The file names can be short while the exported symbols remain `AccountDirectory` and `AccountDirectoryRow` at the call site.

Keep tests beside the subject (`runs/details.tsx`, `runs/details.test.tsx`). The same rule applies outside React: the CLI's `runner/server.ts`, `runner/check-process.ts`, and `runner/store.ts` separate serving, execution, and persistence. Keep a descriptive compound name when there is no useful group; do not create a one-file directory or a forwarding `index.ts` merely to shorten a name.

A short name is fine when the directory supplies the context: `packages/auth/src/factory.ts` does not need to be `auth-factory.ts`. Keep stable package entry points such as `index.ts`, `env.ts`, and `factory.ts`. Do not rename a public package export just to change an internal filename.

## Framework and tooling exceptions

- **Web:** Use a named `.tsx` file for a leaf page (`(auth)/sign-in.tsx`), `route.tsx` for a parent layout, and `index.tsx` for an index route. Do not add a `*-page.tsx` wrapper just for the route to import. Preserve router syntax such as `__root.tsx`, `_app`, `(auth)`, `$id` and `[.]`; see the [Web guide](../apps/web/AGENTS.md).
- **Expo:** Keep its file-based entry names, including `_layout.tsx` and `index.tsx`. Do not apply Web layout naming to native routes.
- **Tool inputs:** Preserve conventional names such as `README.md`, `AGENTS.md`, `Dockerfile`, `Caddyfile`, `vite.config.ts`, and dotfiles. Do not normalize generated route trees, published migrations or their metadata, lockfiles, or vendored skills.

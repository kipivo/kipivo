![Kipivo — From spark to done.](assets/banner.svg)

Kipivo (/kɪˈpiːvoʊ/) gives developers AI bots that understand their projects, do the work, and show what they did.

[Quickstart](https://kipivo.com/docs/quickstart) · [Documentation](https://kipivo.com/docs) · [Repository guide](docs/README.md)

## Development

Install [mise](https://mise.jdx.dev/getting-started.html) and run these commands from the repository root.

```sh
mise install --locked
mise exec -- bun install --frozen-lockfile
mise exec -- bun run kpdev dev
```

Open [Web](http://localhost:3000) or [Docs](http://localhost:3000/docs). See the [contributing guide](CONTRIBUTING.md) for commit conventions.

The `@kipivo/scripts` workspace provides `kpdev` after installation. Run `bun run kpdev --help` from the repository root to list development commands, or `bun run kpdev help <command>` to see its subcommands. You can call `kpdev` directly when the repository's `node_modules/.bin` is on your `PATH`.

```sh
bun run kpdev help test
bun run kpdev check
bun run kpdev test e2e all
bun run kpdev runner --help
```

Use `bun run kpdev run smoke:plan --base HEAD` to invoke a repository script by its `package.json` name.

The [full end-to-end suite](docs/testing.md#end-to-end-tests) requires Docker. Prefix commands with `mise exec --` to use the pinned toolchain. Use `kpdev turbo` to pass arguments to the repository's Turbo executable, for example `bun run kpdev turbo run build --filter=web`. When Turbo is on your `PATH`, you can also run `turbo run build --filter=web` directly.

Pass the smoke target and its arguments directly, as in `bun run kpdev smoke web kipivo-web:ci`. Run `bun run kpdev smoke --help` for usage and options.

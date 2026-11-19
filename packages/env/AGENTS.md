# Environment validation

- Keep [the shared parser](src/index.ts) independent of app and service settings. Each owning workspace declares its own preset. `extends` merges parents in order and applies the child's schema last; keep the inferred result type consistent with runtime precedence.
- Read only declared keys. Blank strings are treated as missing; validation errors identify invalid keys without disclosing their values. Tests should supply `runtimeEnv` instead of modifying the process environment.
- Add cases in [index.test.ts](src/index.test.ts) when changing merge order, cycle detection, or parsing. Run `bun run test --filter=@kipivo/env` and `bun run typecheck` for downstream inference.

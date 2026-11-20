# Roles and permissions

- Keep [role names, permissions, and assignment rules](src/index.ts) shared and free of database or HTTP dependencies. Callers should use permission checks rather than maintain their own list of what an admin can do.
- A role change requires the assignment permission and a target other than the actor. Client-side use is for presentation; the [access service](../core/AGENTS.md) and database write enforce the rule on the server.
- Run `bun run kpdev test --filter=@kipivo/rbac` for policy changes. Check affected API operations and run `bun run kpdev test auth` for changes to granted or denied behavior.

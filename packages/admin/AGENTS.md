# Instance administration

- Put browser-safe schemas for instance administration under a domain export such as [`@kipivo/admin/directory`](src/directory.ts). Share profile identifiers from [account](../account/AGENTS.md); keep personal preferences there.
- A schema validates input; it does not authorize access. Enforce directory reads in [core](../core/AGENTS.md), settings permissions in the database repository, and expose both through the existing [public API](../api/AGENTS.md). Do not create another admin server or session.
- When changing search or pagination, exercise both API transports and the Web form with `bun run kpdev test auth` against a disposable PostgreSQL instance. See the [directory guide](../../docs/admin.md).

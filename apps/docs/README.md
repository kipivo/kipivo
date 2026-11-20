# Kipivo Docs

The TanStack Start app uses Fumadocs for the public guides in `content/docs/`. Add an MDX page with `title` and `description` frontmatter and put it in `content/docs/meta.json` to set its sidebar position.

- Run `bun run dev:docs` from the repository root and open [127.0.0.1:4321/docs/](http://127.0.0.1:4321/docs/). The root `bun run dev` also serves the docs at [localhost:3000/docs/](http://localhost:3000/docs/).
- Run `bun run build --filter=docs` to prerender pages and the search index. Turbo builds docs before Web, then Web serves `apps/docs/.output/public` at `/docs`.
- Railway deploys a standalone Docs image from `apps/docs/Dockerfile`. The gateway forwards `/docs` to the service on port 4321.
- Use `/docs/<slug>` for links to other guides. The API page links to the OpenAPI schema on the Web origin.

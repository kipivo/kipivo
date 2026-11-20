import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../../content";

const search = createFromSource(source);

export const Route = createFileRoute("/search.json")({
  server: {
    handlers: { GET: async () => Response.json(await search.export()) },
  },
});

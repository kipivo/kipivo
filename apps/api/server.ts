import { defineServerEntry } from "nitro";
import { createApp } from "./src/app";
import { runtime } from "./src/runtime";

export default defineServerEntry({ fetch: createApp(runtime).fetch, port: 3001 });

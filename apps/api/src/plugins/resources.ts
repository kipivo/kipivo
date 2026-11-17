import { definePlugin } from "nitro";
import { runtime } from "../runtime";

export default definePlugin((app) => {
  app.hooks.hook("close", async () => {
    await runtime?.close();
  });
});

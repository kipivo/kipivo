import { definePlugin } from "nitro";
import { closeRuntime } from "../runtime/resources";

export default definePlugin((app) => {
  app.hooks.hook("close", closeRuntime);
});

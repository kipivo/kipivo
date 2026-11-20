import { defineCommand, renderUsage } from "citty";

export default defineCommand({
  meta: { name: "kpdev commit", description: "Work with Git commit messages" },
  subCommands: Object.assign(Object.create(null), {
    lint: () => import("./commit/lint").then((module) => module.default),
  }),
  async run({ cmd, rawArgs }) {
    if (rawArgs.every((arg) => arg.startsWith("-"))) console.log(await renderUsage(cmd));
  },
});

import { defineCommand } from "citty";
import { execute } from "../tasks";

export default defineCommand({
  meta: { name: "kpdev runner", description: "Manage the local Kipivo runner" },
  run({ rawArgs }) {
    execute(process.execPath, ["run", "kipivo", ...rawArgs.slice(1)]);
  },
});

import { defineCommand, renderUsage } from "citty";
import { execute } from "../internal/execute";

function suggestScript(input: string, candidates: string[]) {
  let suggestion: string | undefined;
  let bestDistance = 3;
  for (const name of candidates) {
    if (Math.abs(input.length - name.length) >= bestDistance) continue;

    // Track one row of Levenshtein distances at a time.
    let distances = Array.from({ length: name.length + 1 }, (_, index) => index);
    for (let i = 0; i < input.length; i++) {
      const next = [i + 1];
      for (let j = 0; j < name.length; j++) {
        next.push(
          Math.min(distances[j + 1] + 1, next[j] + 1, distances[j] + Number(input[i] !== name[j])),
        );
      }
      distances = next;
    }
    if (distances[name.length] < bestDistance) {
      bestDistance = distances[name.length];
      suggestion = name;
    }
  }
  return suggestion;
}

export default function createRunCommand(runnableScripts: string[]) {
  return defineCommand({
    meta: { name: "kpdev run", description: "Run a repository script by name" },
    args: {
      script: {
        type: "positional",
        description: "Script name in package.json",
        required: false,
      },
      list: { type: "boolean", description: "List scripts available to run" },
    },
    async run({ cmd, args: { list, script }, rawArgs }) {
      if (rawArgs[0] === "--list") {
        if (!list || rawArgs.length !== 1)
          throw new Error("Use kpdev run --list without other arguments.");
        for (const name of runnableScripts) console.log(name);
        return;
      }
      if (!script || script.startsWith("-")) {
        console.log(await renderUsage(cmd));
        return;
      }
      if (!runnableScripts.includes(script)) {
        const suggestion = suggestScript(script, runnableScripts);
        const hint = suggestion ? `Did you mean "${suggestion}"?` : "Run kpdev run --list.";
        throw new Error(`Unknown repository script "${script}". ${hint}`);
      }
      execute(process.execPath, ["run", script, ...rawArgs.slice(2)]);
    },
  });
}

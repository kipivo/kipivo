#!/usr/bin/env bun
import { requestRunner } from "@kipivo/runtime/local/connection";
import { runDetail, runId, runnerError, submittedRun } from "@kipivo/contracts/runs";
import { defineCommand, renderUsage, runCommand, runMain } from "citty";
import { version } from "../package.json";
import { startRunner } from "./runner/server";

const invalidArguments = "Invalid arguments. Run `kipivo --help` for usage.";

async function callRunner(path: `/v1/runs${string}`, init?: RequestInit) {
  const response = await requestRunner(path, init).catch(() => {
    throw new Error("Local runner unavailable. Start it with kipivo serve.");
  });
  const data = await response.json();
  if (!response.ok) {
    const result = runnerError.safeParse(data);
    const error = result.success ? result.data.error : "unexpected runner response";
    throw new Error(`Runner request failed (${response.status}): ${error}`);
  }
  return data;
}

const serve = defineCommand({
  meta: { name: "kipivo serve", description: "Start the local runner from the Kipivo repository" },
  args: {
    port: { type: "string", description: "Loopback port", valueHint: "0–65535" },
  },
  run({ args, rawArgs }) {
    if (
      rawArgs.length &&
      (rawArgs.length !== 2 || rawArgs[0] !== "--port" || !/^\d+$/.test(rawArgs[1]))
    ) {
      throw new Error("Usage: kipivo serve [--port <0–65535>]");
    }
    const port = rawArgs.length ? Number(args.port) : undefined;
    if (port !== undefined && port > 65535) throw new Error("Port must be between 0 and 65535.");
    const runner = startRunner({ port });
    const stop = () => {
      void runner.close().catch((error) => {
        console.error(error instanceof Error ? error.message : "Could not stop the local runner.");
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    console.log(`Kipivo runner listening on 127.0.0.1:${runner.port}`);
  },
});

const check = defineCommand({
  meta: { name: "kipivo run check", description: "Submit the repository check" },
  async run({ rawArgs }) {
    if (rawArgs.length) throw new Error(invalidArguments);
    const result = submittedRun.parse(
      await callRunner("/v1/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "check" }),
      }),
    );
    console.log(result.id);
  },
});

function inspectRun(command: "status" | "logs", description: string) {
  return defineCommand({
    meta: { name: `kipivo ${command}`, description },
    args: { id: { type: "positional", description: "Run ID" } },
    async run({ args, rawArgs }) {
      if (rawArgs.length !== 1 || !runId.safeParse(args.id).success) {
        throw new Error(invalidArguments);
      }
      const { logs, ...status } = runDetail.parse(await callRunner(`/v1/runs/${args.id}`));
      if (command === "logs") process.stdout.write(logs);
      else console.log(JSON.stringify(status, null, 2));
    },
  });
}

const subCommands = {
  serve,
  run: defineCommand({
    meta: { name: "kipivo run", description: "Submit a task to the local runner" },
    subCommands: { check },
    setup({ rawArgs }) {
      if (rawArgs[0] !== "check") throw new Error(invalidArguments);
    },
  }),
  status: inspectRun("status", "Show the run status and result"),
  logs: inspectRun("logs", "Print collected run logs"),
};

const cli = defineCommand({
  meta: { name: "kipivo", version, description: "Kipivo local runner" },
  args: {
    help: { type: "boolean", alias: "h", description: "Show help" },
    version: { type: "boolean", alias: "v", description: "Print the version" },
  },
  subCommands,
});

async function main(rawArgs: string[]) {
  const [command] = rawArgs;
  if (rawArgs.length === 1 && (command === "-v" || command === "--version")) {
    console.log(version);
    return;
  }
  const help = ["-h", "--help"].includes(rawArgs.at(-1) ?? "");
  if (rawArgs.length && !(rawArgs.length === 1 && help) && !Object.hasOwn(subCommands, command)) {
    throw new Error(invalidArguments);
  }
  if (!rawArgs.length || help) {
    await runMain(cli, {
      rawArgs: rawArgs.length ? rawArgs : ["--help"],
      showUsage: async (target) => console.log(await renderUsage(target)),
    });
    return;
  }
  await runCommand(cli, { rawArgs });
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Kipivo command failed.");
  process.exitCode = 1;
}

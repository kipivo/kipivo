#!/usr/bin/env bun
import { requestRunner } from "@kipivo/contracts/runner-connection";
import { runDetail, runId, runnerError, submittedRun } from "@kipivo/contracts/runs";
import { version } from "../package.json";
import { startRunner } from "./runner";

const help = `Usage: kipivo [command]

Commands:
  serve [--port <port>]  Start the local runner from the Kipivo repository
  run check             Submit the repository check
  status <id>           Show the run status and result
  logs <id>             Print collected run logs

Options:
  -h, --help     Show help
  -v, --version  Print the version`;

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

async function main([command, ...args]: string[]) {
  if (args.length === 0 && (!command || command === "-h" || command === "--help")) {
    console.log(help);
    return;
  }
  if (args.length === 0 && (command === "-v" || command === "--version")) {
    console.log(version);
    return;
  }
  if (command === "serve") {
    if (
      args.length !== 0 &&
      (args.length !== 2 || args[0] !== "--port" || !/^\d+$/.test(args[1]))
    ) {
      throw new Error("Usage: kipivo serve [--port <0–65535>]");
    }
    const port = args.length ? Number(args[1]) : undefined;
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
    return;
  }
  if (command === "run" && args.length === 1 && args[0] === "check") {
    const result = submittedRun.parse(
      await callRunner("/v1/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "check" }),
      }),
    );
    console.log(result.id);
    return;
  }
  if (
    (command === "status" || command === "logs") &&
    args.length === 1 &&
    runId.safeParse(args[0]).success
  ) {
    const { logs, ...status } = runDetail.parse(await callRunner(`/v1/runs/${args[0]}`));
    if (command === "logs") process.stdout.write(logs);
    else console.log(JSON.stringify(status, null, 2));
    return;
  }
  throw new Error("Invalid arguments. Run `kipivo --help` for usage.");
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Kipivo command failed.");
  process.exitCode = 1;
}

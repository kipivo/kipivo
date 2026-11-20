#!/usr/bin/env bun
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
const command = [process.execPath, entry, ...process.argv.slice(2)];

// Replace the launcher so the Bun entry point receives signals directly.
if (process.platform !== "win32") process.execve?.(command[0], command, process.env);

const result = Bun.spawnSync(command, { stdio: ["inherit", "inherit", "inherit"] });
process.exitCode = result.exitCode ?? 1;

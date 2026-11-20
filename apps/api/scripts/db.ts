import { runDbCommand } from "../src/runtime/database";

await runDbCommand(process.argv.slice(2));

import { runDbCommand } from "../src/db-command";

await runDbCommand(process.argv.slice(2));

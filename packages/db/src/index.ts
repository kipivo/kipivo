import { createDatabase } from "@kipivo/db/factory";
import { envs } from "@kipivo/db/env";

const { DATABASE_URL } = envs();
export const database = DATABASE_URL ? createDatabase(DATABASE_URL) : null;

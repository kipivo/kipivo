import { envs, resolveAuthSettings } from "@kipivo/auth/env";
import { createAuth } from "@kipivo/auth/factory";
import { database } from "@kipivo/db";

const settings = resolveAuthSettings(envs(), database !== null);
export const auth =
  settings && database ? createAuth({ database: database.db, ...settings }) : null;

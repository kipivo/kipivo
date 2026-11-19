import { createObjectStorage } from "@kipivo/storage/factory";
import { envs, resolveStorageConfig } from "@kipivo/storage/env";

const config = resolveStorageConfig(envs());
export const storage = config ? createObjectStorage(config) : null;

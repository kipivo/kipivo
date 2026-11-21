import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

/**
 * The Vite plugin every app uses. The project path and the shared output directory
 * live here so consumers cannot point the compiler at a second catalog, and apps
 * do not depend on the compiler package themselves.
 */
export function paraglide() {
  return paraglideVitePlugin({
    project: fileURLToPath(new URL("../project.inlang", import.meta.url)),
    outdir: fileURLToPath(new URL("../generated", import.meta.url)),
  });
}

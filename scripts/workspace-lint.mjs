import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const runnerConnection = "@kipivo/runtime/local/connection";

function repoPath(file) {
  return relative(root, file).split(sep).join("/");
}

function isWebServerModule(file, program) {
  return (
    /^apps\/web\/src\/.+\.server\.tsx?$/.test(file) &&
    program.body.some(
      (statement) =>
        statement.type === "ImportDeclaration" &&
        !statement.specifiers.length &&
        statement.source.value === "@tanstack/react-start/server-only",
    )
  );
}

function create(context) {
  const importer = repoPath(context.filename);

  function check(node) {
    if (typeof node?.value !== "string") return;
    const [specifier] = node.value.split("?", 1);

    const target =
      specifier.startsWith(".") || isAbsolute(specifier)
        ? repoPath(resolve(dirname(context.filename), specifier))
        : "";
    const owner = /^((?:apps|packages|tests)\/[^/]+)(?:\/|$)/.exec(target)?.[1];
    if (
      (owner && !importer.startsWith(owner + "/")) ||
      /^@kipivo\/[^/]+\/src(?:\/|$)/.test(specifier)
    ) {
      context.report({ node, message: "Import another workspace through its package exports." });
      return;
    }

    if (
      specifier !== runnerConnection &&
      !/^packages\/runtime\/src\/local\/connection(?:\.[cm]?[jt]s)?$/.test(target)
    )
      return;
    if (importer.startsWith("packages/runtime/") || importer.startsWith("apps/cli/")) return;
    if (isWebServerModule(importer, context.sourceCode.ast)) return;
    context.report({
      node,
      message: "The local runtime is private to the CLI and marked Web server modules.",
    });
  }

  const checkSource = (node) => check(node.source);
  return {
    ImportDeclaration: checkSource,
    ExportNamedDeclaration: checkSource,
    ExportAllDeclaration: checkSource,
    ImportExpression: checkSource,
    TSImportType: checkSource,
    TSExternalModuleReference: (node) => check(node.expression),
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "require")
        check(node.arguments[0]);
    },
  };
}

export default {
  meta: { name: "kipivo" },
  rules: { "workspace-imports": { create } },
};

import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const runnerConnection = "@kipivo/runtime/local/connection";
const serverPackages = new Set([
  "@kipivo/auth",
  "@kipivo/cache",
  "@kipivo/core",
  "@kipivo/db",
  "@kipivo/email",
  "@kipivo/orpc",
  "@kipivo/storage",
]);
const sharedEntries = new Set([
  "@kipivo/auth/errors",
  "@kipivo/auth/native",
  "@kipivo/email/settings",
  "@kipivo/orpc/client",
  "@kipivo/orpc/errors",
]);

function repoPath(file) {
  return relative(root, file).split(sep).join("/");
}

function isWebServerModule(file, context) {
  return (
    /^apps\/web\/src\/.+\.server\.tsx?$/.test(file) &&
    context.sourceCode.ast.body.some(
      (statement) =>
        statement.type === "ImportDeclaration" &&
        statement.importKind !== "type" &&
        !statement.specifiers.length &&
        statement.source.value === "@tanstack/react-start/server-only",
    )
  );
}

function create(context) {
  const importer = repoPath(context.filename);
  const webServer = isWebServerModule(importer, context);
  const webClient = importer.startsWith("apps/web/src/") && !webServer;
  const contract = importer.startsWith("packages/contract/src/");
  const core = importer.startsWith("packages/core/src/");

  function checkDependency(node, specifier) {
    if (!specifier.startsWith("@kipivo/")) return;
    const workspace = specifier.split("/", 2).join("/");
    const serverOnly = serverPackages.has(workspace) && !sharedEntries.has(specifier);
    if (webClient && serverOnly) {
      context.report({
        node,
        message: `${specifier} is server-only. Use a browser-safe export or a marked Web server module.`,
      });
    } else if (contract && (serverOnly || workspace === "@kipivo/orpc")) {
      context.report({
        node,
        message: `The public contract cannot depend on ${specifier}. Define its API with shared schemas.`,
      });
    } else if (
      core &&
      workspace !== "@kipivo/core" &&
      (serverOnly || workspace === "@kipivo/orpc" || workspace === "@kipivo/contract")
    ) {
      context.report({
        node,
        message: `Core cannot depend on ${specifier}. Use domain types and inject repository operations.`,
      });
    }
  }

  function check(node) {
    const value =
      node?.type === "TemplateLiteral" && node.expressions.length === 0
        ? node.quasis[0].value.cooked
        : node?.value;
    if (typeof value !== "string") return;
    const [specifier] = value.split(/[?#]/, 1);

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

    checkDependency(node, specifier);
    if (
      specifier !== runnerConnection &&
      !/^packages\/runtime\/src\/local\/connection(?:\.[cm]?[jt]s)?$/.test(target)
    )
      return;
    if (importer.startsWith("packages/runtime/") || importer.startsWith("apps/cli/")) return;
    if (webServer) return;
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

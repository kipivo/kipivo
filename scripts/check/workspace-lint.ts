import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { RuleTester } from "oxlint/plugins-dev";
import { ROOT } from "../internal/root.ts";

type Rule = Parameters<RuleTester["run"]>[1];
type CreateRule = NonNullable<Rule["create"]>;
type RuleContext = Parameters<CreateRule>[0];
type Visitor = ReturnType<CreateRule>;
type Node = Parameters<NonNullable<Visitor[string]>>[0];

const RUNNER_CONNECTION = "@kipivo/runtime/local/connection";
const SERVER_PACKAGES = new Set([
  "@kipivo/auth",
  "@kipivo/cache",
  "@kipivo/core",
  "@kipivo/db",
  "@kipivo/email",
  "@kipivo/orpc",
  "@kipivo/storage",
]);
const SHARED_ENTRIES = new Set([
  "@kipivo/auth/errors",
  "@kipivo/auth/native",
  "@kipivo/email/settings",
  "@kipivo/orpc/client",
  "@kipivo/orpc/errors",
]);

function repoPath(file: string) {
  return relative(ROOT, file).split(sep).join("/");
}

function isWebServerModule(file: string, context: RuleContext) {
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

function create(context: RuleContext): Visitor {
  const importer = repoPath(context.filename);
  const webServer = isWebServerModule(importer, context);
  const webClient = importer.startsWith("apps/web/src/") && !webServer;
  const contract = importer.startsWith("packages/contract/src/");
  const core = importer.startsWith("packages/core/src/");

  function checkDependency(node: Node, specifier: string) {
    if (!specifier.startsWith("@kipivo/")) return;
    const workspace = specifier.split("/", 2).join("/");
    const serverOnly = SERVER_PACKAGES.has(workspace) && !SHARED_ENTRIES.has(specifier);
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

  function check(node: Node | null | undefined) {
    if (!node) return;
    const value =
      node.type === "TemplateLiteral" && node.expressions.length === 0
        ? node.quasis[0].value.cooked
        : node.type === "Literal"
          ? node.value
          : undefined;
    if (typeof value !== "string") return;
    const [specifier] = value.split(/[?#]/, 1);

    const target =
      specifier.startsWith(".") || isAbsolute(specifier)
        ? repoPath(resolve(dirname(context.filename), specifier))
        : "";
    const owner = /^((?:apps|packages|tests)\/[^/]+|scripts)(?:\/|$)/.exec(target)?.[1];
    if (
      (owner && !importer.startsWith(owner + "/")) ||
      /^@kipivo\/[^/]+\/src(?:\/|$)/.test(specifier)
    ) {
      context.report({ node, message: "Import another workspace through its package exports." });
      return;
    }

    checkDependency(node, specifier);
    if (
      specifier !== RUNNER_CONNECTION &&
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

  const checkSource = (node: Node) => {
    if ("source" in node) check(node.source);
  };
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

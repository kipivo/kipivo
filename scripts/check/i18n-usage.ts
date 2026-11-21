import ts from "typescript-api";

const MESSAGES_MODULE = "@kipivo/i18n/messages";

export interface MessageUsage {
  /** Catalog ids no source references. Empty when a source uses the namespace dynamically. */
  unused: string[];
  /** Properties accessed on the namespace that the catalog does not define. */
  unknown: string[];
  /** A source passes, spreads or destructures the namespace, so `unused` cannot be trusted. */
  dynamic: boolean;
}

interface SourceUsage {
  used: Set<string>;
  dynamic: boolean;
}

function isNamespaceReference(node: ts.Node, namespaces: ReadonlySet<string>): boolean {
  return ts.isIdentifier(node) && namespaces.has(node.text);
}

/** Names bound to the `m` namespace, plus messages imported by name. */
function importsOf(file: ts.SourceFile): {
  namespaces: Set<string>;
  direct: Set<string>;
  sawImport: boolean;
} {
  const namespaces = new Set<string>();
  const direct = new Set<string>();
  let sawImport = false;
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== MESSAGES_MODULE
    ) {
      continue;
    }
    sawImport = true;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
      continue;
    }
    for (const element of bindings.elements) {
      const imported = (element.propertyName ?? element.name).text;
      if (imported === "m") namespaces.add(element.name.text);
      else direct.add(imported);
    }
  }
  return { namespaces, direct, sawImport };
}

function analyzeSource(source: string): SourceUsage {
  const file = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const { namespaces, direct, sawImport } = importsOf(file);
  if (!sawImport) return { used: new Set(), dynamic: false };

  // Follow aliases such as `const t = m`.
  let changed = true;
  while (changed) {
    changed = false;
    for (const statement of file.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isIdentifier(declaration.initializer) &&
          namespaces.has(declaration.initializer.text) &&
          !namespaces.has(declaration.name.text)
        ) {
          namespaces.add(declaration.name.text);
          changed = true;
        }
      }
    }
  }

  const used = new Set(direct);
  let dynamic = false;

  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node) && isNamespaceReference(node.expression, namespaces)) {
      used.add(node.name.text);
      return;
    }
    if (ts.isElementAccessExpression(node) && isNamespaceReference(node.expression, namespaces)) {
      const argument = node.argumentExpression;
      if (ts.isStringLiteralLike(argument)) used.add(argument.text);
      else dynamic = true;
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isNamespaceReference(node.initializer, namespaces)
    ) {
      if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (element.dotDotDotToken || !ts.isIdentifier(element.name)) {
            dynamic = true;
          } else if (element.propertyName) {
            if (
              ts.isIdentifier(element.propertyName) ||
              ts.isStringLiteralLike(element.propertyName)
            ) {
              used.add((element.propertyName as ts.Identifier | ts.StringLiteral).text);
            } else {
              dynamic = true;
            }
          } else {
            used.add(element.name.text);
          }
        }
      }
      return;
    }
    if (isNamespaceReference(node, namespaces)) {
      const parent = node.parent;
      const binding =
        ts.isImportSpecifier(parent) ||
        ts.isImportClause(parent) ||
        ts.isNamespaceImport(parent) ||
        (ts.isVariableDeclaration(parent) && parent.initializer === node) ||
        (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
        (ts.isElementAccessExpression(parent) && parent.expression === node);
      if (!binding) dynamic = true;
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return { used, dynamic };
}

/**
 * Analyze `@kipivo/i18n/messages` usage across source texts. The catalog is the
 * source of truth for both directions: ids nobody references and ids that do not
 * exist. Dynamic usage of the namespace disables the unused check rather than
 * reporting false positives.
 */
export function analyzeMessageUsage(
  ids: readonly string[],
  sources: readonly string[],
): MessageUsage {
  const used = new Set<string>();
  let dynamic = false;
  for (const source of sources) {
    const usage = analyzeSource(source);
    for (const name of usage.used) used.add(name);
    dynamic ||= usage.dynamic;
  }
  const known = new Set(ids);
  return {
    unused: dynamic ? [] : ids.filter((id) => !used.has(id)),
    unknown: [...used].filter((name) => !known.has(name)).sort(),
    dynamic,
  };
}

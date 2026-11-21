import { Fragment, type ReactNode } from "react";

export type MarkupRenderer = (children: ReactNode) => ReactNode;
export type MarkupRenderers = Readonly<Record<string, MarkupRenderer>>;

/**
 * `<tag>`, `</tag>` and `<tag/>`. Message copy is authored by the product, so the
 * parser only has to accept the tags the catalogs actually use.
 */
const tagPattern = /<(\/?)([A-Za-z][\w-]*)((?:\s[^<>]*?)?)(\/?)>/g;

interface OpenTag {
  tag: string | null;
  children: ReactNode[];
}

function renderNode(node: OpenTag, renderers: MarkupRenderers, key: number): ReactNode {
  const children = node.children.length === 0 ? "" : node.children;
  if (node.tag === null) return <Fragment key={key}>{children}</Fragment>;
  const renderer = renderers[node.tag];
  // An unknown tag keeps its content so a missing renderer degrades to plain copy.
  return renderer ? (
    <Fragment key={key}>{renderer(children)}</Fragment>
  ) : (
    <Fragment key={key}>{children}</Fragment>
  );
}

/**
 * Turn a message that contains `<tag>…</tag>` markup into React nodes. Rich text
 * lives in the message so translators can reorder the sentence around the tag.
 */
export function renderMarkup(message: string, renderers: MarkupRenderers): ReactNode {
  const root: OpenTag = { tag: null, children: [] };
  const stack = [root];
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  tagPattern.lastIndex = 0;
  while ((match = tagPattern.exec(message)) !== null) {
    const [raw, closing, tag, , selfClosing] = match;
    const text = message.slice(cursor, match.index);
    if (text) stack.at(-1)!.children.push(text);
    cursor = match.index + raw.length;
    if (selfClosing) {
      stack.at(-1)!.children.push(renderNode({ tag, children: [] }, renderers, key++));
    } else if (closing) {
      if (stack.length === 1 || stack.at(-1)!.tag !== tag) {
        // Unbalanced closing tag: keep it as literal text.
        stack.at(-1)!.children.push(raw);
        continue;
      }
      const node = stack.pop()!;
      stack.at(-1)!.children.push(renderNode(node, renderers, key++));
    } else {
      stack.push({ tag, children: [] });
    }
  }
  const tail = message.slice(cursor);
  if (tail) stack.at(-1)!.children.push(tail);
  // Unclosed tags render their collected content rather than dropping it.
  while (stack.length > 1) {
    const node = stack.pop()!;
    stack.at(-1)!.children.push(renderNode(node, renderers, key++));
  }
  const nodes = root.children;
  return nodes.length === 1 ? nodes[0] : <Fragment>{nodes}</Fragment>;
}

/** The plain-text form of a message, for `aria-label`, `<title>` and logs. */
export function stripMarkup(message: string): string {
  tagPattern.lastIndex = 0;
  return message.replace(tagPattern, "");
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkup, stripMarkup } from "./markup.js";

function render(node: React.ReactNode) {
  return renderToStaticMarkup(<>{node}</>);
}

describe("renderMarkup", () => {
  it("replaces tags with the supplied renderer and keeps the text order", () => {
    const message = "New here? <link>Create an account</link> now.";
    const html = render(
      renderMarkup(message, { link: (chunks) => <a href="/sign-up">{chunks}</a> }),
    );
    expect(html).toBe('New here? <a href="/sign-up">Create an account</a> now.');
  });

  it("supports several tags, nesting and self-closing tags", () => {
    const message = "<strong>Ready</strong><br/><em>Set <strong>go</strong></em>";
    const html = render(
      renderMarkup(message, {
        strong: (chunks) => <b>{chunks}</b>,
        em: (chunks) => <i>{chunks}</i>,
        br: () => <br />,
      }),
    );
    expect(html).toBe("<b>Ready</b><br/><i>Set <b>go</b></i>");
  });

  it("keeps the content of unknown tags and returns plain messages unchanged", () => {
    expect(render(renderMarkup("Hi <unknown>there</unknown>", {}))).toBe("Hi there");
    expect(render(renderMarkup("No tags here", {}))).toBe("No tags here");
  });

  it("treats unbalanced tags as literal text instead of dropping content", () => {
    const html = render(renderMarkup("Broken </link> tag", { link: (c) => <a>{c}</a> }));
    expect(html).toBe("Broken &lt;/link&gt; tag");
  });
});

describe("stripMarkup", () => {
  it("removes tags for plain-text surfaces", () => {
    expect(stripMarkup("New to Kipivo? <link>Create an account</link>")).toBe(
      "New to Kipivo? Create an account",
    );
    expect(stripMarkup("Plain message")).toBe("Plain message");
  });
});

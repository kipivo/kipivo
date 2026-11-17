import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HomePage } from "./home-page";

test("renders the Kipivo headline and project description", () => {
  const html = renderToStaticMarkup(<HomePage />);

  expect(html).toMatch(/<h1\b[^>]*>From spark to done\.<\/h1>/);
  expect(html).toContain(
    "Kipivo gives developers AI bots that understand their projects, do the work, and show what they did.",
  );
});

import { Wordmark } from "@kipivo/ui";
import { ThemeSwitch } from "@kipivo/ui/components/theme-provider";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import mdxComponents from "fumadocs-ui/mdx";
import { use } from "react";
import logo from "@assets/logo.svg?no-inline";
import { docsBase } from "../../mount";
import { documents, source } from "../content";

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const page = source.getPage(params._splat ? params._splat.split("/") : []);
    if (!page) throw notFound();

    const document = documents.getPage(page.path);
    if (!document) throw notFound();
    await document.preload();

    const { title, description } = page.data;
    return { path: page.path, title, description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} | Kipivo Docs` : "Kipivo Docs" },
      { name: "description", content: loaderData?.description },
    ],
  }),
  component: Guide,
});

function DocsThemeSwitch() {
  return <ThemeSwitch />;
}

function Guide() {
  const { path, title, description } = Route.useLoaderData();
  const document = documents.getPage(path);
  if (!document) throw notFound();
  const { body: Content, toc } = use(document.load());

  return (
    <DocsLayout
      tree={source.getPageTree()}
      containerProps={{ className: "[--fd-layout-width:84rem]" }}
      nav={{
        mode: "top",
        url: docsBase,
        title: <Wordmark logo={logo} name="Kipivo Docs" variant="framed" />,
      }}
      links={[{ text: "Back to Kipivo", url: "/", active: "none" }]}
      githubUrl="https://github.com/kipivo/kipivo"
      slots={{ themeSwitch: DocsThemeSwitch }}
    >
      <DocsPage toc={toc}>
        <DocsTitle className="font-heading text-3xl font-[650] tracking-tight sm:text-4xl">
          {title}
        </DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        <DocsBody>
          <Content components={mdxComponents} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

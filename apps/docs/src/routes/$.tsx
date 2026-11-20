import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
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

function Guide() {
  const { path, title, description } = Route.useLoaderData();
  const document = documents.getPage(path);
  if (!document) throw notFound();
  const { body: Content, toc } = use(document.load());

  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{
        url: docsBase,
        title: (
          <>
            <img src={logo} alt="" width={24} height={24} />
            Kipivo Docs
          </>
        ),
      }}
      links={[{ text: "Kipivo", url: "/" }]}
      githubUrl="https://github.com/kipivo/kipivo"
    >
      <DocsPage toc={toc}>
        <DocsTitle>{title}</DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        <DocsBody>
          <Content components={mdxComponents} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

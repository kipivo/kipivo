import { languageNames } from "@kipivo/i18n/languages";
import { m } from "@kipivo/i18n/messages";
import { locales, type Locale } from "@kipivo/i18n/runtime";
import { Wordmark } from "@kipivo/ui";
import { ThemeSwitch } from "@kipivo/ui/components/theme-provider";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import mdxComponents from "fumadocs-ui/mdx";
import { use } from "react";
import logo from "@assets/logo.svg?no-inline";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kipivo/ui/components/select";
import { guidePath, guideUrl } from "../language";
import { documents, source } from "../content";

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const { language, slugs } = guidePath(params._splat);
    const page = source.getPage(slugs, language);
    if (!page) throw notFound();

    const document = documents.getPage(page.path);
    if (!document) throw notFound();
    await document.preload();

    const { title, description } = page.data;
    return { path: page.path, language, slugs, title, description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} | Kipivo Docs` : "Kipivo Docs" },
      { name: "description", content: loaderData?.description },
    ],
  }),
  component: Guide,
});

function DocsPreferences() {
  const { language, slugs } = Route.useLoaderData();
  return (
    <div className="flex items-center gap-2">
      <Select<Locale>
        value={language}
        onValueChange={(next) => {
          if (next && next !== language)
            window.location.assign(guideUrl(slugs, next) + window.location.search);
        }}
      >
        <SelectTrigger aria-label={m.languageLabel({}, { locale: language })}>
          <SelectValue>{languageNames[language].full}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          <SelectGroup>
            {locales.map((code) => (
              <SelectItem key={code} value={code} lang={code}>
                {languageNames[code].full}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <ThemeSwitch locale={language} />
    </div>
  );
}

function Guide() {
  const { path, language, title, description } = Route.useLoaderData();
  const document = documents.getPage(path);
  if (!document) throw notFound();
  const { body: Content, toc } = use(document.load());

  return (
    <DocsLayout
      tree={source.getPageTree(language)}
      containerProps={{ className: "[--fd-layout-width:84rem]" }}
      nav={{
        mode: "top",
        url: guideUrl([], language),
        title: <Wordmark logo={logo} name="Kipivo Docs" variant="framed" />,
      }}
      links={[
        { text: language === "en" ? "Back to Kipivo" : "返回 Kipivo", url: "/", active: "none" },
      ]}
      githubUrl="https://github.com/kipivo/kipivo"
      slots={{ themeSwitch: DocsPreferences }}
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

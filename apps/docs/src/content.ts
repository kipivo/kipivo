import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { docsBase } from "../mount";
import { guideUrl, i18n } from "./language";

export const documents = defineDocs({ dir: "content/docs", docs: { async: true } });

export const source = loader({
  i18n,
  url: guideUrl,
  baseUrl: docsBase,
  source: documents.toFumadocsSource(),
});

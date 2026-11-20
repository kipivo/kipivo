import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { docsBase } from "../mount";

export const documents = defineDocs({ dir: "content/docs", docs: { async: true } });

export const source = loader({
  baseUrl: docsBase,
  source: documents.toFumadocsSource(),
});

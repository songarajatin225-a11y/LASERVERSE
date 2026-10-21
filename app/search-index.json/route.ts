import { buildSearchIndex, searchIndexSource, SEARCH_INDEX_VERSION } from "@/lib/search/buildIndex";

/** Static search index, generated at build time from the ingested handbook and the tool registries. */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ version: SEARCH_INDEX_VERSION, generatedFrom: searchIndexSource(), docs: buildSearchIndex() });
}

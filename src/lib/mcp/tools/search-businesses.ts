import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  agentSearchBusinesses,
  searchMarkdown,
} from "@/lib/agent-data.server";

export default defineTool({
  name: "search_businesses",
  title: "Search businesses",
  description:
    "Search the Egyptian city directory for approved businesses by keyword, city slug/name, or category slug/name.",
  inputSchema: {
    query: z.string().optional().describe("Free-text keyword (name, service, product)."),
    city: z.string().optional().describe("City slug or Arabic name."),
    category: z.string().optional().describe("Category slug or Arabic name."),
    limit: z.number().optional().describe("Max results (1-50, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, category, limit }) => {
    const items = await agentSearchBusinesses({ query, city, category, limit });
    return {
      content: [
        {
          type: "text",
          text: searchMarkdown(items, "https://durtown.com", "نتائج البحث"),
        },
      ],
      structuredContent: { count: items.length, items },
    };
  },
});

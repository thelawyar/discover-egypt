import { defineTool } from "@lovable.dev/mcp-js";
import { agentListTaxonomy } from "@/lib/agent-data.server";

export default defineTool({
  name: "list_taxonomy",
  title: "List cities and categories",
  description:
    "List the governorates, cities, and business categories (with slugs) used to filter directory searches.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const tax = await agentListTaxonomy();
    return {
      content: [{ type: "text", text: JSON.stringify(tax) }],
      structuredContent: tax,
    };
  },
});

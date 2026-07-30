import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { agentGetBusiness, businessMarkdown } from "@/lib/agent-data.server";

export default defineTool({
  name: "get_business",
  title: "Get business profile",
  description:
    "Read the full public profile of one approved business by its username (durtown.com/<username>) or id.",
  inputSchema: {
    handle: z.string().describe("Business username or UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ handle }) => {
    const business = await agentGetBusiness(handle);
    if (!business) {
      return {
        content: [{ type: "text", text: `لا يوجد نشاط بهذا المعرّف: ${handle}` }],
        isError: true,
      };
    }
    return {
      content: [
        { type: "text", text: businessMarkdown(business, "https://durtown.com") },
      ],
      structuredContent: { business },
    };
  },
});

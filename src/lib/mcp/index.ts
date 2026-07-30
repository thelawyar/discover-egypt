import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchBusinessesTool from "./tools/search-businesses";
import getBusinessTool from "./tools/get-business";
import listTaxonomyTool from "./tools/list-taxonomy";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "discover-egypt",
  title: "اكتشف مدينتك",
  version: "0.1.0",
  instructions:
    "Tools for the Egyptian city business directory «اكتشف مدينتك» (durtown.com). Use search_businesses to find businesses by keyword/city/category, list_taxonomy to discover valid city and category slugs, and get_business to read a full profile.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchBusinessesTool, listTaxonomyTool, getBusinessTool],
});

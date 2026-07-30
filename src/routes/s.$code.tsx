import { createFileRoute, redirect } from "@tanstack/react-router";
import { decodeSearchState } from "@/lib/search-share";

/** Short share link: /s/<code> → the exact same search results (filters + sort + page). */
export const Route = createFileRoute("/s/$code")({
  beforeLoad: ({ params }) => {
    const state = decodeSearchState(params.code);
    throw redirect({ to: "/search", search: state, replace: true });
  },
  component: () => null,
});

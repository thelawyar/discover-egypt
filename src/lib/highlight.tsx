import { Fragment } from "react";

/** Splits a query into the same tokens the search backend uses. */
export function searchTokens(q: string | undefined | null): string[] {
  return (q ?? "")
    .replace(/[%,()]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlights the matched search words inside a text so the user can tell
 * why a result showed up.
 */
export function Highlight({
  text,
  terms,
  className = "rounded bg-warning/35 px-0.5 font-semibold text-foreground",
}: {
  text: string | null | undefined;
  terms?: string[];
  className?: string;
}) {
  if (!text) return null;
  const list = (terms ?? []).filter(Boolean);
  if (!list.length) return <>{text}</>;

  const re = new RegExp(`(${list.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        list.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className={className}>
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** True when any search word appears in the value. */
export function matchesTerms(value: string | null | undefined, terms: string[]) {
  if (!value || !terms.length) return false;
  const low = value.toLowerCase();
  return terms.some((t) => low.includes(t.toLowerCase()));
}

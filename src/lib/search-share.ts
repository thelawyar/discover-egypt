/** Shareable short links + "last search" memory for the results page. */

export type SearchState = {
  q: string;
  city: string;
  gov: string;
  cat: string;
  prod: string;
  sort: "best" | "newest" | "popular";
  page: number;
};

const EMPTY: SearchState = {
  q: "",
  city: "",
  gov: "",
  cat: "",
  prod: "",
  sort: "best",
  page: 1,
};

/** Compact keys keep the generated short code small. */
const KEYS: Record<keyof SearchState, string> = {
  q: "q",
  city: "c",
  gov: "g",
  cat: "k",
  prod: "p",
  sort: "s",
  page: "n",
};

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Encodes the full search state (query + filters + sort + page) into a short code. */
export function encodeSearchState(state: Partial<SearchState>): string {
  const full = { ...EMPTY, ...state };
  const packed: Record<string, string | number> = {};
  for (const key of Object.keys(EMPTY) as (keyof SearchState)[]) {
    if (full[key] !== EMPTY[key]) packed[KEYS[key]] = full[key] as string | number;
  }
  return toBase64Url(JSON.stringify(packed));
}

/** Decodes a short code back into a complete search state. */
export function decodeSearchState(code: string): SearchState {
  try {
    const packed = JSON.parse(fromBase64Url(code)) as Record<string, unknown>;
    const out = { ...EMPTY };
    for (const key of Object.keys(EMPTY) as (keyof SearchState)[]) {
      const raw = packed[KEYS[key]];
      if (raw === undefined) continue;
      if (key === "page") out.page = Number(raw) || 1;
      else if (key === "sort")
        out.sort = ["best", "newest", "popular"].includes(String(raw))
          ? (String(raw) as SearchState["sort"])
          : "best";
      else out[key] = String(raw) as never;
    }
    return out;
  } catch {
    return { ...EMPTY };
  }
}

/** Absolute short URL, e.g. https://durtown.com/s/eyJx... */
export function shortShareUrl(origin: string, state: Partial<SearchState>): string {
  return `${origin.replace(/\/$/, "")}/s/${encodeSearchState(state)}`;
}

/* ---------------- last search memory ---------------- */

const STORAGE_KEY = "durtown:last-search";

export function saveLastSearch(state: SearchState) {
  if (typeof window === "undefined") return;
  const hasContent =
    state.q || state.city || state.gov || state.cat || state.prod || state.sort !== "best";
  if (!hasContent) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, page: 1, savedAt: Date.now() }),
    );
  } catch {
    /* storage unavailable */
  }
}

export function readLastSearch(): SearchState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchState>;
    return { ...EMPTY, ...parsed, page: 1 };
  } catch {
    return null;
  }
}

export function clearLastSearch() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function sameSearchState(a: SearchState, b: SearchState): boolean {
  return (
    a.q.trim() === b.q.trim() &&
    a.city === b.city &&
    a.gov === b.gov &&
    a.cat === b.cat &&
    a.prod === b.prod &&
    a.sort === b.sort
  );
}

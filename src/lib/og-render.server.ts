/** Rasterizes SVG Open Graph cards to PNG at the edge (no filesystem, no native deps). */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
// Bundled as a WebAssembly module by the worker build.
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?module";
import { CAIRO_BOLD_B64, CAIRO_REGULAR_B64 } from "./og-fonts.b64";

let ready: Promise<void> | null = null;

function decode(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let fonts: Uint8Array[] | null = null;

function fontBuffers(): Uint8Array[] {
  if (!fonts) fonts = [decode(CAIRO_REGULAR_B64), decode(CAIRO_BOLD_B64)];
  return fonts;
}

async function ensureWasm(): Promise<void> {
  if (!ready) {
    ready = initWasm(resvgWasm as unknown as WebAssembly.Module).catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
}

/** SVG string -> PNG bytes. Throws if the runtime cannot rasterize. */
export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      fontBuffers: fontBuffers(),
      defaultFontFamily: "Cairo",
      loadSystemFonts: false,
    },
  });
  return resvg.render().asPng();
}

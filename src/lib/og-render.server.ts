/** Rasterizes SVG Open Graph cards to PNG at the edge (no filesystem, no native deps). */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { RESVG_WASM_GZ_B64 } from "./og-wasm.b64";
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

/** Inflates the embedded gzip payload back into the raw wasm bytes. */
async function wasmBytes(): Promise<Uint8Array> {
  const gz = decode(RESVG_WASM_GZ_B64);
  const stream = new Blob([gz as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function ensureWasm(): Promise<void> {
  if (!ready) {
    ready = wasmBytes()
      .then((bytes) => initWasm(bytes))
      .catch((e) => {
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

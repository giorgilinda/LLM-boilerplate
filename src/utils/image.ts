/**
 * Client-side image preparation for multimodal LLM input.
 *
 * The gateway contract (see `src/lib/llm-gateway/types.ts` and DESIGN.md
 * "Multimodal") accepts images as Anthropic-shaped `ImageBlock`s: raw base64
 * with the `data:...;base64,` prefix stripped, plus a `media_type`. Producing
 * those blocks — including downscaling to keep payloads and vision-token cost
 * under control — is explicitly an app responsibility, which is why this lives
 * here rather than in the shared gateway code.
 *
 * Browser-only: uses `FileReader`, `Image`, and `<canvas>`. Import it from
 * client components ("use client") only.
 *
 * CSP NOTE: decoding goes through a `data:` URL (via `FileReader`), never a
 * `blob:` object URL. The project's Content-Security-Policy allows `data:` but
 * not `blob:` for `img-src` (see `next.config.ts`), so a blob URL would be
 * blocked by the browser and the image would fail to decode.
 */

import type { ImageBlock } from "@/lib/llm-gateway/types";

/**
 * Longest-edge cap (px) applied when downscaling. Mirrors Anthropic's vision
 * guidance: images larger than ~1568px on the long edge are downscaled by the
 * API anyway, so shrinking client-side first saves upload size and tokens.
 */
const MAX_EDGE_PX = 1568;

/** JPEG quality used when re-encoding the downscaled image (0–1). */
const JPEG_QUALITY = 0.85;

/** Media type every prepared image is normalised to after re-encoding. */
const OUTPUT_MEDIA_TYPE = "image/jpeg" as const;

/** A user-attached image, ready both for the LLM call and for UI preview. */
export interface PreparedImage {
  /** Gateway-ready block (base64 with no data URL prefix). */
  block: ImageBlock;
  /** Downscaled `data:` URL for rendering a thumbnail preview in the UI. */
  previewUrl: string;
  /** Original file name, handy for `alt` text and remove-button labels. */
  name: string;
}

/** Narrow a `File` to an image before attempting to prepare it. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image file."));
    img.src = src;
  });
}

/**
 * Downscale an image `File` and encode it as an `ImageBlock` plus a preview URL.
 *
 * The image is scaled so its longest edge is at most {@link MAX_EDGE_PX}
 * (never upscaled) and re-encoded as JPEG, then the `data:` prefix is stripped
 * to satisfy the gateway contract.
 *
 * @param file - An image file (validate with {@link isImageFile} first).
 * @returns The prepared image (block + preview + name).
 * @throws If the file cannot be decoded or the canvas context is unavailable.
 *
 * @example
 * ```ts
 * const prepared = await prepareImage(file);
 * send({ systemPrompt, messages: [{ role: "user", content: [prepared.block] }] });
 * ```
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(sourceDataUrl);

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable.");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(OUTPUT_MEDIA_TYPE, JPEG_QUALITY);
  const base64 = dataUrl.split(",", 2)[1] ?? "";

  return {
    block: {
      type: "image",
      source: { type: "base64", media_type: OUTPUT_MEDIA_TYPE, data: base64 },
    },
    previewUrl: dataUrl,
    name: file.name,
  };
}

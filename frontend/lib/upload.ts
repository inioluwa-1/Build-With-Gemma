/**
 * Prepare a captured file for /api/extract.
 *
 * Two kinds of document arrive here. Photos are downscaled on-device before
 * upload (technical.md §8) — a modern Android camera produces 4–8MB JPEGs, and
 * on the 3G connections this app targets, uploading one raw is the difference
 * between a demo and a timeout. 1280px on the long edge is comfortably enough
 * for Gemma to read a bill.
 *
 * PDFs pass through untouched: the Gemini API accepts `application/pdf`
 * directly and tokenises it as a document, so rendering pages to images in the
 * browser would cost a ~350KB dependency and lose text fidelity for nothing.
 */

const MAX_DIMENSION = 1280;
const QUALITY = 0.8;

/** Inline request data is capped by the API; well above any real bill. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_TYPES = "image/*,application/pdf";

export interface EncodedDocument {
  mimeType: string;
  /** Base64 without the `data:` prefix — the shape the Gemini API wants. */
  data: string;
}

export class FileTooLargeError extends Error {
  constructor() {
    super("File exceeds the inline upload limit");
    this.name = "FileTooLargeError";
  }
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function prepareUpload(file: File): Promise<EncodedDocument> {
  if (isPdf(file)) {
    if (file.size > MAX_PDF_BYTES) throw new FileTooLargeError();
    return { mimeType: "application/pdf", data: await toBase64(file) };
  }
  return downscaleImage(file);
}

async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Chunked so a multi-megabyte PDF cannot blow the argument limit.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function downscaleImage(
  file: File,
  maxDimension: number = MAX_DIMENSION,
): Promise<EncodedDocument> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return { mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

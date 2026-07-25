/**
 * Confidence gating, kept free of Zod so the Confirm screen does not drag the
 * validation library into the client bundle (design.md §4: JS budget).
 */

/** Below this, a field is presented as an empty input with the ask copy. */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * An absent confidence score reads as zero, which routes the field to
 * "I couldn't read this — type it here". Unknown must mean ask, never assume.
 */
export function isConfident(
  confidence: Record<string, number> | undefined,
  field: string,
): boolean {
  return (confidence?.[field] ?? 0) >= CONFIDENCE_THRESHOLD;
}

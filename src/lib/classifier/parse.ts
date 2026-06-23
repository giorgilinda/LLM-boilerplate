/**
 * Extract JSON from a model's text response.
 *
 * Models often wrap JSON in markdown fences despite being asked not to.
 * Returns `null` on parse failure — callers should fall back to defaults.
 */
export function parseJsonFromModelText(text: string): unknown | null {
  const clean = text.replace(/```json|```/g, "").trim();
  if (!clean) return null;

  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

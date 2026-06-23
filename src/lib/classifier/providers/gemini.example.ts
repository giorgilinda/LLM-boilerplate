import type { ClassifierAdapter, ClassifyRequest, ClassifyResult } from "../types";

/**
 * Gemini classifier adapter — EXAMPLE second provider.
 *
 * NOT wired into the classifier gateway by default. To use it:
 * 1. Add "google" to ClassifierProviderName in classifier.config.ts
 * 2. Add a case for "google" in gateway.ts getClassifierAdapter()
 * 3. Set GEMINI_API_KEY in .env.local
 *
 * See HOW_TO_USE.md → "Adding a new provider" for the parallel LLM walkthrough.
 *
 * SERVER-ONLY: reads GEMINI_API_KEY directly.
 */
export class GeminiClassifierAdapter implements ClassifierAdapter {
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: { message: "GEMINI_API_KEY is not set." },
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${request.model.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: request.message }] }],
            generationConfig: { maxOutputTokens: request.maxTokens },
          }),
        },
      );

      if (!response.ok) {
        return {
          ok: false,
          error: { message: `Gemini API error ${response.status}.` },
        };
      }

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

      if (!text) {
        return { ok: false, error: { message: "Empty classifier response." } };
      }

      return { ok: true, text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: { message } };
    }
  }
}

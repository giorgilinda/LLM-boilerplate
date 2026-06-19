import type {
  LLMProviderAdapter,
  LLMResponse,
  LLMMessage,
} from "../types";

/**
 * GeminiProviderAdapter — EXAMPLE second provider, written as the worked
 * example for "Adding a new provider" in HOW_TO_USE.md.
 *
 * This file is NOT wired into the gateway by default. To actually use it:
 * 1. Add "google" to the LLMModelRef["provider"] union in types.ts
 * 2. Add a case for "google" in gateway.ts's getAdapter()
 * 3. Add Gemini pricing to PRICING_PER_MILLION_TOKENS in budget.ts
 * 4. Add a Gemini entry to your fallbackChain in llm.config.ts
 *
 * See HOW_TO_USE.md → "Adding a new provider" for the full walkthrough.
 *
 * IMPORTANT: server-only, like claude.ts. Reads GEMINI_API_KEY directly —
 * never import this from a client component.
 */
export class GeminiProviderAdapter implements LLMProviderAdapter {
  async chat({
    model,
    systemPrompt,
    messages,
    maxTokens = 1000,
  }: {
    model: string;
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: {
          code: "PROVIDER_ERROR",
          message: "GEMINI_API_KEY is not set. Check .env.local.",
          retryable: false,
        },
      };
    }

    try {
      // Gemini's API shape differs from Claude's: system prompt is a
      // separate top-level field, and conversation history uses "parts"
      // instead of a flat "content" string. This translation step is
      // exactly the kind of thing each adapter is responsible for —
      // the gateway and the rest of the app never see this shape.
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            // NOTE: this example handles text-only content. `m.content` can
            // now also be an array of text/image blocks (see MessageContent in
            // types.ts). Unlike Claude, Gemini does not share Anthropic's block
            // shape, so a real multimodal Gemini adapter must translate each
            // block into Gemini's `parts` format (e.g. `inlineData` for images)
            // here. Left text-only since this file is a template, not wired in.
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        }
      );

      if (response.status === 429) {
        return {
          ok: false,
          error: { code: "RATE_LIMITED", message: "Gemini API rate limit hit.", retryable: true },
        };
      }

      if (!response.ok) {
        const body = await response.text();
        return {
          ok: false,
          error: {
            code: "PROVIDER_ERROR",
            message: `Gemini API error (${response.status}): ${body}`,
            retryable: response.status >= 500,
          },
        };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return {
          ok: false,
          error: { code: "PROVIDER_ERROR", message: "No text content in Gemini response.", retryable: false },
        };
      }

      // Gemini reports usage under a different field name than Claude.
      // This is normalised here so the rest of the app only ever sees the
      // shared LLMUsage shape from types.ts, regardless of provider.
      const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

      return {
        ok: true,
        message: text,
        servedBy: { provider: "google", model },
        usage: {
          inputTokens,
          outputTokens,
          // 👉 Add real Gemini pricing to budget.ts's PRICING_PER_MILLION_TOKENS
          // and compute it the same way claude.ts does. Left at 0 here since
          // this file is a template, not wired in by default.
          estimatedCostUsd: 0,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Unknown error calling Gemini API",
          retryable: true,
        },
      };
    }
  }
}
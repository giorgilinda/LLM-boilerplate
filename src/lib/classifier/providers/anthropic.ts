import type { ClassifierAdapter, ClassifyRequest, ClassifyResult } from "../types";

/**
 * Anthropic Messages API adapter for pre-flight classification.
 *
 * SERVER-ONLY: reads ANTHROPIC_API_KEY directly.
 */
export class AnthropicClassifierAdapter implements ClassifierAdapter {
  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: { message: "ANTHROPIC_API_KEY is not set." },
      };
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: request.model.model,
          max_tokens: request.maxTokens,
          system: request.systemPrompt,
          messages: [{ role: "user", content: request.message }],
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: { message: `Anthropic API error ${response.status}.` },
        };
      }

      const data = await response.json();
      const text =
        data.content?.find((block: { type: string }) => block.type === "text")
          ?.text ?? "";

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

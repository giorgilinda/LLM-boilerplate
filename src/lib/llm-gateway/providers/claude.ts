import type {
    LLMProviderAdapter,
    LLMResponse,
    LLMMessage,
  } from "../types";
  
  /**
   * ClaudeProviderAdapter — the only real provider implemented in v1.
   *
   * IMPORTANT: this file must only ever be imported server-side (inside
   * src/app/api/llm/chat/route.ts). It reads ANTHROPIC_API_KEY directly,
   * which must never reach the client bundle.
   *
   * This adapter makes ONE attempt and reports success/failure. It does NOT
   * retry or fall back to another model — that orchestration lives in
   * gateway.ts. Keeping this adapter "dumb" means the same retry/fallback
   * logic works identically for every future provider.
   */
  
  const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  };
  
  function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING_PER_MILLION_TOKENS[model];
    if (!pricing) return 0;
    return (
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output
    );
  }
  
  export class ClaudeProviderAdapter implements LLMProviderAdapter {
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
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          ok: false,
          error: {
            code: "PROVIDER_ERROR",
            message: "ANTHROPIC_API_KEY is not set. Check .env.local.",
            retryable: false,
          },
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
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          // content is either a string or an array of text/image blocks whose
          // shape already matches Anthropic's API exactly, so it passes
          // through with no translation. See DESIGN.md "Multimodal".
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
  
        if (response.status === 429) {
          return {
            ok: false,
            error: {
              code: "RATE_LIMITED",
              message: "Anthropic API rate limit hit.",
              retryable: true,
            },
          };
        }
  
        if (!response.ok) {
          const body = await response.text();
          return {
            ok: false,
            error: {
              code: "PROVIDER_ERROR",
              message: `Anthropic API error (${response.status}): ${body}`,
              retryable: response.status >= 500, // 5xx is worth retrying, 4xx usually isn't
            },
          };
        }
  
        const data = await response.json();
        const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  
        if (!textBlock) {
          return {
            ok: false,
            error: {
              code: "PROVIDER_ERROR",
              message: "No text content in Anthropic response.",
              retryable: false,
            },
          };
        }
  
        const inputTokens = data.usage?.input_tokens ?? 0;
        const outputTokens = data.usage?.output_tokens ?? 0;
  
        return {
          ok: true,
          message: textBlock.text,
          servedBy: { provider: "anthropic", model },
          usage: {
            inputTokens,
            outputTokens,
            estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: {
            code: "UNKNOWN",
            message: err instanceof Error ? err.message : "Unknown error calling Anthropic API",
            retryable: true,
          },
        };
      }
    }
  }
import type { LLMProviderAdapter, LLMResponse, LLMMessage } from "../types";

/**
 * MockProviderAdapter — used when NEXT_PUBLIC_MOCK_MODE=true.
 *
 * Returns canned responses with simulated latency so loading states get
 * tested during development. Never makes a network call, never costs a
 * token. See DESIGN.md "Mock mode" section — this is the single source of
 * truth for mock behavior; `useLLM()` has zero awareness of this.
 */

const SIMULATED_LATENCY_MS = 700;

const MOCK_RESPONSES: string[] = [
  "This is a mock response from the LLM gateway. Replace this array in `src/lib/llm-gateway/providers/mock.ts`.",
  "Mock response 2 — cycles through this array in order on each call.",
  "Mock response 3 — useful for testing multi-turn UI without burning tokens.",
];

let mockIndex = 0;

export class MockProviderAdapter implements LLMProviderAdapter {
  async chat({
    messages,
  }: {
    model: string;
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
  }): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

    // Optional: inspect the last message to make mock responses context-aware
    const lastMessage = messages.at(-1)?.content ?? "";
    void lastMessage; // remove when adding context-aware mock logic

    const message = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
    mockIndex++;

    return {
      ok: true,
      message,
      servedBy: { provider: "anthropic", model: "mock" },
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    };
  }
}

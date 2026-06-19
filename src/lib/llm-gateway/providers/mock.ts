import type {
  LLMProviderAdapter,
  LLMResponse,
  LLMMessage,
  MessageContent,
} from "../types";

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

function countImages(content: MessageContent | undefined): number {
  if (!content || typeof content === "string") return 0;
  return content.filter((block) => block.type === "image").length;
}

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

    // Acknowledge image blocks so multimodal flows are testable end-to-end in
    // NEXT_PUBLIC_MOCK_MODE without a real provider. When the latest message
    // carries images, the mock calls them out instead of returning canned text.
    const imageCount = countImages(messages.at(-1)?.content);
    if (imageCount > 0) {
      return {
        ok: true,
        message: `Mock vision response: received ${imageCount} image${imageCount === 1 ? "" : "s"}. Replace this branch in \`src/lib/llm-gateway/providers/mock.ts\`.`,
        servedBy: { provider: "anthropic", model: "mock" },
        usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
      };
    }

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

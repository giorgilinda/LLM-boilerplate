import type { LLMService, LLMResponse, Message } from "./types";

/**
 * MockLLMService — a zero-cost, zero-latency stand-in for a real LLM.
 *
 * WHY THIS EXISTS:
 * Real LLM API calls cost tokens and take 1–3 seconds. During UI development
 * you're testing layout, state, and interactions — not LLM output quality.
 * Using real calls for this burns money and slows you down.
 *
 * MockLLMService returns canned responses instantly (with simulated latency
 * so loading states actually get tested). Switch it on with:
 *
 *   NEXT_PUBLIC_MOCK_MODE=true   in .env.local
 *
 * HOW TO CUSTOMISE:
 * Replace the MOCK_RESPONSES array with responses relevant to your project.
 * You can also make responses context-aware by inspecting `messages` —
 * for example, returning different canned replies for different keywords.
 *
 * RECORDING REAL RESPONSES:
 * When you do make real API calls during development, save interesting
 * responses to a `fixtures/llm-responses.json` file and replay them here
 * instead of calling the API again.
 */

const SIMULATED_LATENCY_MS = 700;

const MOCK_RESPONSES: string[] = [
  "This is a mock response. Replace this array in `src/lib/llm/mock.ts` with responses relevant to your project.",
  "Mock response 2 — add more entries to cycle through different canned replies.",
  "Mock response 3 — the MockLLMService cycles through this array in order.",
];

let mockIndex = 0;

export class MockLLMService implements LLMService {
  async chat({
    messages,
  }: {
    systemPrompt: string;
    messages: Message[];
    maxTokens?: number;
  }): Promise<LLMResponse> {
    // Simulate network latency so loading states are tested during development
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

    // Optional: make responses context-aware by inspecting the last message
    const lastMessage = messages.at(-1)?.content ?? "";
    void lastMessage; // remove this line when you add context-aware logic

    const message = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
    mockIndex++;

    return { message, ok: true };
  }
}

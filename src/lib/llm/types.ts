/**
 * LLM abstraction layer — types and interface.
 *
 * PATTERN: All LLM interaction in this project goes through the `LLMService`
 * interface. Never call an LLM provider directly from components, pages, or
 * API routes. Always use the factory in `index.ts`.
 *
 * WHY: This gives you:
 * - A `MockLLMService` for development (zero API cost, instant responses)
 * - A real `ClaudeLLMService` (or any other provider) for production
 * - A single seam to swap providers without touching product logic
 * - A clean interface to test against
 *
 * HOW TO EXTEND:
 * 1. Add a method to `LLMService` below
 * 2. Implement it in `mock.ts` (canned response)
 * 3. Implement it in your real provider file (e.g. `claude.ts`)
 * 4. The factory in `index.ts` picks the right one automatically
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  /** The assistant's reply text */
  message: string;
  /** True when the API call succeeded */
  ok: boolean;
  /** Error message if ok is false */
  error?: string;
}

// ---------------------------------------------------------------------------
// LLMService interface
// ---------------------------------------------------------------------------

/**
 * The single interface all LLM providers must satisfy.
 *
 * Add methods here as the project needs them. Keep each method focused on
 * one concern — don't build a mega-method that does everything.
 *
 * @example
 * ```ts
 * import { llmService } from "@/lib/llm";
 *
 * const response = await llmService.chat({
 *   systemPrompt: "You are a helpful assistant.",
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * ```
 */
export interface LLMService {
  /**
   * Send a conversation to the LLM and get a reply.
   *
   * @param params.systemPrompt - Instructions for the LLM (role, rules, context)
   * @param params.messages - Full conversation history including the latest user message
   * @param params.maxTokens - Optional token limit for the response (default: 1000)
   */
  chat(params: {
    systemPrompt: string;
    messages: Message[];
    maxTokens?: number;
  }): Promise<LLMResponse>;
}

/**
 * Core types for the LLM gateway.
 *
 * Read DESIGN.md before changing anything here — these shapes are the
 * contract every provider adapter, the gateway itself, and every consuming
 * app are built against.
 */

// ---------------------------------------------------------------------------
// Conversation primitives
// ---------------------------------------------------------------------------

/**
 * Multimodal content blocks.
 *
 * The block shapes below match Anthropic's Messages API exactly, so a
 * MessageContent array passes straight through the Claude adapter with no
 * translation step. See DESIGN.md "Multimodal".
 */
export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    /** Raw base64 — the `data:...;base64,` prefix must be stripped by the app. */
    data: string;
  };
}

/**
 * A message's content is either a plain string (text-only, the common case)
 * or an array of content blocks (text + base64 images) for vision input.
 *
 * Keeping `string` in the union means every existing text-only call site
 * keeps working unchanged — widening here is fully backward compatible.
 */
export type MessageContent = string | Array<TextBlock | ImageBlock>;

export interface LLMMessage {
  role: "user" | "assistant";
  content: MessageContent;
}

// ---------------------------------------------------------------------------
// Response shape — no call ever throws. Every call resolves to this.
// ---------------------------------------------------------------------------

export type LLMErrorCode =
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "PROVIDER_ERROR"
  | "CONTEXT_TOO_LONG"
  | "UNKNOWN";

export interface LLMError {
  code: LLMErrorCode;
  message: string;
  /**
   * True if the gateway believes retrying (or letting the fallback chain
   * continue) could succeed. False for hard stops like BUDGET_EXCEEDED.
   * Computed by the gateway — callers should not need to hardcode which
   * codes are retryable.
   */
  retryable: boolean;
}

export interface LLMResponse {
  ok: boolean;
  message?: string;
  /** Present when ok is false */
  error?: LLMError;
  /** Which provider/model actually produced this response (after fallback) */
  servedBy?: LLMModelRef;
  /** Token + cost accounting for this call */
  usage?: LLMUsage;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// ---------------------------------------------------------------------------
// Config-related (re-exported here for convenience in provider files)
// ---------------------------------------------------------------------------

export interface LLMModelRef {
  provider: "anthropic" | "google"; // extend as new providers are added
  model: string;
}

// ---------------------------------------------------------------------------
// Provider adapter interface
// ---------------------------------------------------------------------------

/**
 * Every provider (Claude, and any future provider) implements this interface.
 * The gateway only ever talks to providers through this contract — it never
 * knows about Anthropic/Google/OpenAI SDK specifics directly.
 *
 * STREAMING NOTE (see DESIGN.md): the interface is designed so a streaming
 * variant can be added later (e.g. `chatStream(): AsyncIterable<string>`)
 * without breaking this contract. Not implemented in v1 — `chat()` only.
 */
export interface LLMProviderAdapter {
  /**
   * Send a conversation to this specific provider/model and get a reply.
   * Adapters should NOT implement retry or fallback logic themselves —
   * that's the gateway's job. An adapter just makes one attempt and
   * reports success or failure.
   */
  chat(params: {
    model: string;
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
  }): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Gateway call options (per-call overrides)
// ---------------------------------------------------------------------------

export interface LLMChatOptions {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
  /** Override the default fallback chain from llm.config.ts for this call only */
  fallbackChain?: LLMModelRef[];
}

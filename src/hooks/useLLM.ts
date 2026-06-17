"use client";

import { useState, useCallback } from "react";
import type { LLMMessage, LLMResponse } from "@/lib/llm-gateway/types";

/**
 * useLLM — the client-side piece every chat-like UI needs.
 *
 * Deliberately "dumb": always calls /api/llm/chat over fetch, has zero
 * awareness of mock mode, providers, or fallback chains. All of that lives
 * server-side in the gateway. This hook just manages the request lifecycle
 * (loading/error/response) so every project doesn't rebuild this state
 * machine by hand.
 *
 * @example
 * ```tsx
 * const { send, response, isLoading, error } = useLLM();
 *
 * const handleSubmit = () => {
 *   send({
 *     systemPrompt: "You are a helpful assistant.",
 *     messages: [...history, { role: "user", content: input }],
 *   });
 * };
 * ```
 */

interface UseLLMParams {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
}

export function useLLM() {
  const [response, setResponse] = useState<LLMResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (params: UseLLMParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data: LLMResponse = await res.json();
      setResponse(data);

      if (!data.ok && data.error) {
        setError(data.error.message);
      }

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error calling /api/llm/chat";
      setError(message);
      const failedResponse: LLMResponse = {
        ok: false,
        error: { code: "UNKNOWN", message, retryable: true },
      };
      setResponse(failedResponse);
      return failedResponse;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { send, response, isLoading, error };
}

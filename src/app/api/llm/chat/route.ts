import { NextRequest, NextResponse } from "next/server";
import { llmGateway } from "@/lib/llm-gateway/gateway";
import type { LLMMessage, LLMResponse } from "@/lib/llm-gateway/types";

/**
 * POST /api/llm/chat
 *
 * The one API route every project built on this boilerplate calls via
 * `useLLM()`. Keeps the gateway (and ANTHROPIC_API_KEY) entirely server-side.
 *
 * Body: { systemPrompt: string, messages: LLMMessage[], maxTokens?: number }
 * Response: LLMResponse (see src/lib/llm-gateway/types.ts) — always 200,
 * even on failure. Failures are communicated via `ok: false` in the body,
 * not HTTP status codes, so the client never needs special-case handling
 * for "the gateway failed" vs "the gateway succeeded but reported an error".
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const { systemPrompt, messages, maxTokens } = body as {
      systemPrompt?: string;
      messages?: LLMMessage[];
      maxTokens?: number;
    };

    if (!systemPrompt || !messages) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNKNOWN",
            message: "Request body must include systemPrompt and messages.",
            retryable: false,
          },
        },
        { status: 200 },
      );
    }

    const response = await llmGateway.chat({
      systemPrompt,
      messages,
      maxTokens,
    });
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

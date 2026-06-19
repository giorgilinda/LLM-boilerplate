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
 *
 * PAYLOAD SIZE NOTE (multimodal): a message's content may be an array of
 * text/image blocks, and base64-encoded images make request bodies far
 * larger than text-only chats. Apps that accept image input should downscale
 * client-side before encoding and enforce their own size limits. If you hit
 * the platform body-size cap (e.g. Vercel's ~4.5MB serverless request limit),
 * raise the route's limit via `export const config`/route segment options, or
 * switch large uploads to a presigned-URL flow — both are app responsibilities.
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

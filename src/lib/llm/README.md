# `src/lib/llm` — LLM abstraction layer

A provider-agnostic interface for LLM calls. All AI interaction in this project goes through this module.

## Why this exists

Calling an LLM API directly from components or pages creates three problems:

1. **Cost during development** — every button click during UI work burns tokens
2. **Vendor lock-in** — switching providers means hunting call sites across the codebase
3. **Untestable logic** — product logic tangled with API calls is hard to unit test

This module solves all three with a single interface and a mock/real adapter pair.

## How to use it

```ts
import { llmService } from "@/lib/llm";

// Always server-side (API routes only — never import in components/pages)
const response = await llmService.chat({
  systemPrompt: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
});

if (response.ok) {
  console.log(response.message);
}
```

## Mock mode

Set `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local` to use `MockLLMService`. No API calls are made. Responses are instant (with simulated latency so loading states get tested).

Use mock mode for **all UI development**. Only disable it when testing actual LLM response quality.

## Adding a real provider

1. Create `src/lib/llm/claude.ts` (or `openai.ts`, etc.)
2. Implement `LLMService` from `types.ts`:

```ts
import type { LLMService, LLMResponse, Message } from "./types";

export class ClaudeLLMService implements LLMService {
  async chat({ systemPrompt, messages, maxTokens = 1000 }): Promise<LLMResponse> {
    const response = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, messages, maxTokens }),
    });
    return response.json();
  }
}
```

3. Wire it into `index.ts`:

```ts
import { ClaudeLLMService } from "./claude";
// ...
return new ClaudeLLMService();
```

4. Create a server-side API route at `src/app/api/llm/chat/route.ts` that calls the actual provider and keeps your API key server-side.

## Files

| File | Purpose |
|---|---|
| `types.ts` | `LLMService` interface and shared types |
| `mock.ts` | `MockLLMService` — canned responses for development |
| `index.ts` | Factory — reads `NEXT_PUBLIC_MOCK_MODE`, returns the right adapter |
| `README.md` | This file |

Add your real provider files (e.g. `claude.ts`) alongside these.

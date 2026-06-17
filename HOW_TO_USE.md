# Using the LLM Gateway — Step-by-Step Guide

This guide walks through using the LLM features in this boilerplate, from your first test call to a working chat UI in your own project. Read `DESIGN.md` first if you haven't — it explains *why* things are built this way. This guide is about *how* to actually use them.

---

## Step 0 — Set up your environment

Copy `.env.local` from `env.example` if you haven't already, then set:

```bash
NEXT_PUBLIC_MOCK_MODE=true
ANTHROPIC_API_KEY=
```

**Leave `ANTHROPIC_API_KEY` empty and `MOCK_MODE=true` for now.** You don't need a real key until Step 5. Working in mock mode first means zero cost while you build your UI.

---

## Step 1 — Make your first call (mock mode)

The gateway is already wired up. You don't need to write any new code to test it — just call the existing API route.

Start your dev server:

```bash
npm run dev
```

Then in a new terminal, hit the route directly to see the shape of a response:

```bash
curl -X POST http://localhost:3000/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'
```

You should get back something like:

```json
{
  "ok": true,
  "message": "This is a mock response from the LLM gateway...",
  "servedBy": { "provider": "anthropic", "model": "mock" },
  "usage": { "inputTokens": 0, "outputTokens": 0, "estimatedCostUsd": 0 }
}
```

If you see this, the gateway, the mock adapter, and the API route are all working end to end.

---

## Step 2 — Use `useLLM()` in a component

This is how you'll actually call the gateway from your app — never `fetch("/api/llm/chat")` directly from a component, always through the hook.

```tsx
"use client";

import { useState } from "react";
import { useLLM } from "@/hooks/useLLM";

export function ExampleChat() {
  const { send, response, isLoading, error } = useLLM();
  const [input, setInput] = useState("");

  const handleSend = () => {
    send({
      systemPrompt: "You are a helpful assistant.",
      messages: [{ role: "user", content: input }],
    });
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={isLoading}>
        {isLoading ? "Thinking..." : "Send"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {response?.ok && <p>{response.message}</p>}
    </div>
  );
}
```

> **👉 YOUR LOGIC GOES HERE:** the `systemPrompt` string and what you put in `messages` is where your actual product lives. This example sends one throwaway message with a generic prompt — your real component will probably maintain a running `messages` array in state (or in a Zustand store) and build a `systemPrompt` specific to your app. See Step 4.

---

## Step 3 — Handle multi-turn conversation

Most real features need conversation history, not a single message. Track it in component state (or lift it to a store if it needs to persist):

```tsx
"use client";

import { useState } from "react";
import { useLLM } from "@/hooks/useLLM";
import type { LLMMessage } from "@/lib/llm-gateway/types";

export function ConversationExample() {
  const { send, isLoading } = useLLM();
  const [history, setHistory] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    const userMessage: LLMMessage = { role: "user", content: input };
    const updatedHistory = [...history, userMessage];
    setHistory(updatedHistory);
    setInput("");

    const result = await send({
      systemPrompt: "You are a helpful assistant.",
      messages: updatedHistory,
    });

    if (result.ok && result.message) {
      setHistory([...updatedHistory, { role: "assistant", content: result.message }]);
    }
  };

  return (
    <div>
      {history.map((msg, i) => (
        <p key={i}><strong>{msg.role}:</strong> {msg.content}</p>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={isLoading}>Send</button>
    </div>
  );
}
```

> **👉 YOUR LOGIC GOES HERE:** deciding *what* counts as conversation history, whether to trim it client-side, whether to persist it (localStorage, a Zustand store, a database later) — that's all app-specific. The gateway will also trim history server-side via `trimToTokenLimit()` before it hits the model, so you don't have to get this perfect on the client.

---

## Step 4 — Write your real system prompt

The gateway and the boilerplate deliberately know nothing about prompt content (see `DESIGN.md` → "Prompt utilities"). This is the part you own completely.

A reasonable pattern is a small builder function, kept in your own project (not in the boilerplate):

```ts
// src/lib/prompts/buildSystemPrompt.ts  ← lives in YOUR project, not the boilerplate

interface PromptContext {
  userName?: string;
  // add whatever context your feature actually needs
}

export function buildSystemPrompt(context: PromptContext): string {
  return [
    "You are a helpful assistant for [your product].",
    context.userName ? `The user's name is ${context.userName}.` : "",
    // 👉 YOUR LOGIC GOES HERE: rules, tone, constraints, pedagogy,
    // anything that defines what your product actually IS.
  ]
    .filter(Boolean)
    .join("\n\n");
}
```

Then use it in your component instead of a hardcoded string:

```tsx
const result = await send({
  systemPrompt: buildSystemPrompt({ userName: "Linda" }),
  messages: updatedHistory,
});
```

---

## Step 5 — Switch to real Claude calls

Once your UI feels right in mock mode, flip the switch:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Set in `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   NEXT_PUBLIC_MOCK_MODE=false
   ```
3. Restart your dev server (env vars are read at startup)

No code changes needed — the gateway's `getAdapter()` function reads `NEXT_PUBLIC_MOCK_MODE` and switches automatically. Your component code in Steps 2–4 is identical either way.

**Tip:** keep `MOCK_MODE=true` as your default and only flip it temporarily when you need to check real response quality. Flip it back when you're done. See `DESIGN.md` for the full cost-discipline reasoning.

---

## Step 6 — Understand the budget cap behavior

Open `llm.config.ts` at the project root:

```ts
export const llmConfig: LLMConfig = {
  fallbackChain: [
    { provider: "anthropic", model: "claude-sonnet-4-6" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  ],
  budgetCapUsdPerDay: 3,
  maxHistoryTokens: 8000,
  retriesPerModel: 2,
};
```

**Important behavior to understand:** the budget cap is checked *per model*, not as one gate in front of the whole chain. If Sonnet would push you over the $3 cap but Haiku wouldn't, the gateway skips Sonnet and tries Haiku automatically — it doesn't give up just because the first (more expensive) model is unaffordable. You only get a `BUDGET_EXCEEDED` response once *every* model in the chain would exceed the cap.

This means putting your cheapest model last in the chain is usually wrong — put models in the order you'd actually prefer to use them (best quality first), and let the budget logic naturally fall back to cheaper ones as the cap gets closer.

> **👉 YOUR LOGIC GOES HERE:** if your feature is cost-sensitive, lower `budgetCapUsdPerDay`. If a specific call needs different behavior than the project default — e.g. a background feature that should only ever use the cheap model, never the expensive one — override the chain per-call instead of changing the global config:

```ts
await send({
  systemPrompt,
  messages,
  // this call only ever uses Haiku, regardless of the project-wide default chain
  fallbackChain: [{ provider: "anthropic", model: "claude-haiku-4-5-20251001" }],
});
```

(Note: per-call `fallbackChain` override needs to be threaded through `useLLM()`'s `send()` params → the API route → `llmGateway.chat()`. The gateway already accepts it in `LLMChatOptions`; wire it through `useLLM()` if you need this.)

---

## Step 7 — Handle errors properly

Every response has a consistent shape — never a thrown exception. Always check `ok` before using `message`:

```tsx
const result = await send({ systemPrompt, messages });

if (!result.ok && result.error) {
  switch (result.error.code) {
    case "BUDGET_EXCEEDED":
      // 👉 YOUR LOGIC GOES HERE: show a friendly "try again tomorrow" message
      break;
    case "RATE_LIMITED":
      // 👉 YOUR LOGIC GOES HERE: maybe auto-retry, or ask the user to wait
      break;
    case "CONTEXT_TOO_LONG":
      // 👉 YOUR LOGIC GOES HERE: trim history more aggressively and retry
      break;
    default:
      // 👉 YOUR LOGIC GOES HERE: generic fallback error UI
  }
}
```

`result.error.retryable` tells you whether the gateway thinks trying again could help — useful if you want to add a "Try again" button only when it's actually worth showing one:

```tsx
{error && result?.error?.retryable && (
  <button onClick={handleSend}>Try again</button>
)}
```

---

---

## Step 8 — Add a new provider

The gateway is provider-agnostic by design, but v1 ships with only one real adapter (Claude). Here's the full walkthrough for adding a second one, using Gemini as the worked example. A template file already exists at `src/lib/llm-gateway/providers/gemini.example.ts` — read it alongside this section.

**8a. Add the provider to the type union**

```ts
// src/lib/llm-gateway/types.ts

export interface LLMModelRef {
  provider: "anthropic" | "google"; // 👈 add the new provider here
  model: string;
}
```

**8b. Write the adapter**

Copy `gemini.example.ts` to `gemini.ts` and remove the `.example` framing comments. Every adapter implements the same `LLMProviderAdapter` interface — one `chat()` method, one attempt, no retry logic (the gateway handles retries):

```ts
// src/lib/llm-gateway/providers/gemini.ts
export class GeminiProviderAdapter implements LLMProviderAdapter {
  async chat({ model, systemPrompt, messages, maxTokens }) {
    // 👉 YOUR LOGIC GOES HERE: translate the generic { systemPrompt, messages }
    // shape into whatever this specific provider's API expects, call it,
    // then translate the response back into the shared LLMResponse shape.
    // claude.ts and gemini.example.ts both show this pattern.
  }
}
```

**8c. Register it in the gateway's factory**

```ts
// src/lib/llm-gateway/gateway.ts

function getAdapter(provider: LLMModelRef["provider"]): LLMProviderAdapter {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return new MockProviderAdapter();
  }

  switch (provider) {
    case "anthropic":
      return new ClaudeProviderAdapter();
    case "google": // 👈 add this case
      return new GeminiProviderAdapter();
    default:
      throw new Error(`No adapter configured for provider: ${provider}`);
  }
}
```

**8d. Add its pricing**

```ts
// src/lib/llm-gateway/budget.ts

const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 }, // 👈 add real pricing here
};
```

> **👉 YOUR LOGIC GOES HERE:** check the provider's current pricing page — these numbers go stale. If you skip this step, `wouldExceedBudget()` treats the model as free (see the comment in `budget.ts`), which means it won't be blocked by the cap, but its real cost also won't be tracked in `getSpentTodayUsd()`.

**8e. Add the API key**

```bash
# .env.local
GEMINI_API_KEY=
```

**8f. Use it**

Either add it to your default chain in `llm.config.ts`, or reference it in a per-call override (see Step 6) or in the provider-switching UI below.

---

## Step 9 — Switch between providers

There are two different reasons you might want to switch providers, and they call for different mechanisms. Don't conflate them.

### 9a. Automatic switching (because of errors or cost)

**This already works with zero extra code**, as long as your `fallbackChain` includes more than one provider. The gateway tries each entry in order and moves to the next one whenever the current one fails with a `retryable` error — rate limits, server errors, or (per Step 6) would exceed the budget cap:

```ts
// llm.config.ts
fallbackChain: [
  { provider: "anthropic", model: "claude-sonnet-4-6" },
  { provider: "google", model: "gemini-2.0-flash" }, // tried if Claude fails or is unaffordable
],
```

You don't need to write any switching logic yourself for this case — it's the gateway's whole job. If you want to confirm which provider actually served a given response (useful for debugging or logging), check `response.servedBy`:

```ts
console.log(`Answered by ${response.servedBy?.provider} / ${response.servedBy?.model}`);
```

### 9b. Manual switching (the user picks)

This is a different feature: letting a person choose which provider/model to use, rather than the gateway deciding automatically. This is entirely app-level UI — the gateway already supports it via the per-call `fallbackChain` override (Step 6), you just need a component to drive it.

```tsx
"use client";

import { useState } from "react";
import { useLLM } from "@/hooks/useLLM";
import type { LLMModelRef } from "@/lib/llm-gateway/types";

const PROVIDER_OPTIONS: { label: string; value: LLMModelRef }[] = [
  { label: "Claude Sonnet", value: { provider: "anthropic", model: "claude-sonnet-4-6" } },
  { label: "Claude Haiku (faster, cheaper)", value: { provider: "anthropic", model: "claude-haiku-4-5-20251001" } },
  { label: "Gemini Flash", value: { provider: "google", model: "gemini-2.0-flash" } },
];

export function ProviderSwitchExample() {
  const { send, response, isLoading } = useLLM();
  const [selected, setSelected] = useState(PROVIDER_OPTIONS[0]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    send({
      systemPrompt: "You are a helpful assistant.",
      messages: [{ role: "user", content: input }],
      // 👉 forces this call to use only the user's chosen model —
      // no fallback to anything else, since the user made an explicit choice
      fallbackChain: [selected.value],
    });
  };

  return (
    <div>
      <select
        value={selected.label}
        onChange={(e) =>
          setSelected(PROVIDER_OPTIONS.find((o) => o.label === e.target.value)!)
        }
      >
        {PROVIDER_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.label}>{opt.label}</option>
        ))}
      </select>

      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={isLoading}>Send</button>

      {response?.ok && <p>{response.message}</p>}
    </div>
  );
}
```

> **👉 YOUR LOGIC GOES HERE:** the `PROVIDER_OPTIONS` list, the labels you show the user ("faster, cheaper" vs raw model names), and whether the user's choice should still fall back automatically on error (pass `[selected.value, ...llmConfig.fallbackChain]` instead of just `[selected.value]`) or be respected exactly with no fallback at all, as in the example above. Both are valid product decisions — pick based on whether your users care more about "exactly this model" or "an answer, one way or another."

**Reminder:** the per-call `fallbackChain` override needs to be threaded through `useLLM()` → the API route → the gateway, same as noted in Step 6. The gateway and types already support it end to end; only `useLLM()`'s `send()` signature needs to accept and forward the extra field.

---

## Quick reference — where things live

| What you want to do | Where to look |
|---|---|
| Call the LLM from a component | `useLLM()` hook — Step 2 |
| Change what the assistant says/how it behaves | Your own `buildSystemPrompt()` — Step 4, lives in your project |
| Change which model(s) are tried, and in what order | `llm.config.ts` `fallbackChain` — Step 6 |
| Change the daily budget cap | `llm.config.ts` `budgetCapUsdPerDay` — Step 6 |
| Add a new mock response for testing | `src/lib/llm-gateway/providers/mock.ts` `MOCK_RESPONSES` array |
| Add a second real provider (Gemini, OpenAI, etc.) | Full walkthrough in Step 8, using `providers/gemini.example.ts` as a template |
| Let the gateway auto-switch providers on failure/cost | Already works — just list multiple providers in `fallbackChain` (Step 9a) |
| Let the user pick a provider/model themselves | Build a select component, pass their choice as a per-call `fallbackChain` override (Step 9b) |
| See which provider/model actually answered a call | `response.servedBy` |
| Debug why a call failed | Check `result.error.code` and `result.error.message` — never throws, always in the response |

---

## What NOT to do

- ❌ Don't `fetch("/api/llm/chat")` directly from a component — always go through `useLLM()`
- ❌ Don't import `src/lib/llm-gateway/providers/claude.ts` or `gateway.ts` from client components — they're server-only and `claude.ts` reads your API key
- ❌ Don't put product-specific prompt logic inside `src/lib/llm-gateway/` — that folder stays generic so it can sync with future boilerplate updates (see `DESIGN.md`)
- ❌ Don't set `NEXT_PUBLIC_MOCK_MODE=false` while doing UI/layout work — switch back to mock mode for anything that isn't specifically testing response quality
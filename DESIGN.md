# LLM Boilerplate

A fork of [`nextjs-boilerplate`](https://github.com/giorgilinda/nextjs-boilerplate) that adds a generic, provider-agnostic LLM gateway layer — connection handling, error handling, fallbacks, streaming-ready interfaces, and cost control — so every future AI-powered project starts from a production-grade foundation instead of rebuilding this plumbing from scratch.

This document captures the design decisions behind this fork. Read it before implementing anything in `src/lib/llm-gateway/`.

---

## Relationship to the base boilerplate

This repo is a **fork**, intended to **stay in sync** with `nextjs-boilerplate` over time.

**Hard constraint:** all LLM-specific work lives in new, clearly-namespaced files and folders. It never edits files that already exist in the base boilerplate, beyond strictly additive entries (e.g. adding a new script to `package.json`, never modifying an existing one).

Why this matters: every sync with upstream is a merge between two diverging histories. As long as this fork only _adds_ files, merges from `nextjs-boilerplate` stay conflict-free. The moment this fork starts editing shared files (`tsconfig.json`, existing components, existing scripts), every future sync becomes a manual conflict-resolution chore — and "staying in sync" quietly stops happening.

**Sync workflow:**

```bash
git remote add upstream https://github.com/giorgilinda/nextjs-boilerplate.git
git fetch upstream
git merge upstream/main
```

Run this periodically (no automation planned for v1) — whenever you remember to check, or before starting a new project off this fork.

**Namespacing convention:** anything LLM-related lives under:

- `src/lib/llm-gateway/` — the gateway itself
- `src/hooks/useLLM.ts` — the client hook
- `llm.config.ts` — project-root config file
- `.env.local` additions — documented in `env.example`, additive only

---

## Scope

This boilerplate is a **transport and reliability layer** for talking to LLMs. It is explicitly **not**:

- An orchestrator (no chains, no agent loops, no multi-step planning)
- A prompt template library (no opinions about prompt content)
- A pedagogy or personality system (that's 100% app-level)

If a future project needs orchestration or agent logic, that logic is built _on top of_ this gateway, inside the project, not inside this boilerplate. Keeping this boundary firm is what keeps the boilerplate reusable — the moment it absorbs app-specific logic, it stops being generic.

---

## Provider support

The interface (`LLMGateway` / provider adapter contract) is **provider-agnostic from day one** — designed so Claude, Gemini, OpenAI, or any future provider can be added as an adapter without changing calling code.

**v1 ships with exactly one real adapter: Claude.**

No second provider is implemented speculatively. A second adapter gets built only once a real project actually needs it — at which point the interface is already proven against one real implementation, making the second easier and better-informed than building two from a blank page.

---

## Streaming

Streaming is the single most architecturally invasive feature in this gateway (it changes the return shape from `Promise<T>` to `AsyncIterable<T>`). Deciding the shape now and implementing later is far cheaper than retrofitting it after call sites exist.

**v1 approach:**

- All types and adapter interfaces are designed to support streaming (`AsyncIterable<string>` shape considered in the contract)
- The actual streaming code path is stubbed / `TODO`
- Non-streaming request/response ships first and is what gets used in practice until a project needs real streaming UX

---

## Multimodal (image input)

Like streaming, multimodal I/O is a generic **transport** concern, not app logic — so it belongs in the gateway contract, not in every app. Putting it here keeps the contract proven and changes the shared files at the source, avoiding the fork-conflict problem of every app widening the message shape independently.

**v1 approach (supported at the contract level):**

- A message's `content` is a union: a plain `string` (unchanged) **or** an array of content blocks (`TextBlock | ImageBlock`). See `MessageContent` in `src/lib/llm-gateway/types.ts`.
- **Backward compatible:** keeping `string` in the union means every existing text-only call site keeps working with no changes.
- **Image format = Anthropic's format:** base64 `data` (with the `data:...;base64,` prefix stripped) plus a `media_type`. Choosing this exact shape means the Claude adapter passes `content` straight through with no translation step.
- `trimToTokenLimit` understands arrays: it sums text-block lengths normally and charges each image a flat estimate (~1,300 tokens — a safe over-estimate; Claude bills roughly `(w × h) / 750`).
- The mock adapter acknowledges image blocks, so vision flows are testable end-to-end in `NEXT_PUBLIC_MOCK_MODE=true`.

**App responsibility (explicitly out of scope for the boilerplate):**

- The upload UI — file input with `capture` for mobile camera, drag-and-drop, paste-from-clipboard.
- Client-side downscaling before base64 encoding, to control payload size and vision token cost.
- Image validation and limits (file type, dimensions, count, total request size). Note that base64 images make request bodies large — see the payload-size note in `src/app/api/llm/chat/route.ts`.

---

## Fallback chain

When a call fails, the gateway should try to recover automatically rather than failing immediately.

**v1 approach:**

- One sensible default fallback chain defined once in `llm.config.ts` (e.g. Claude Sonnet → Claude Haiku → fail)
- Any individual call can override the chain if that specific use case needs different behavior
- The default exists so most calls "just work" without every call site having to think about its own fallback strategy

---

## Cost tracking & budget control

This is the feature most directly motivated by real pain — a prior project burned through Gemini tokens quickly during testing with no guardrail in place.

**v1 approach:**

- Token counting + cost estimation per call (using known per-provider/per-model pricing)
- A single **global** hard budget cap (e.g. "$3/day total")
- The cap is checked **per model as the gateway walks the fallback chain**, not as one gate in front of the whole chain. If a pricier model would exceed the cap, the gateway skips it and tries the next, cheaper model in the chain — it doesn't give up immediately just because the first option is unaffordable. A typed `BUDGET_EXCEEDED` error is only returned once _every_ model in the chain would exceed the cap.
- This means model ordering in `fallbackChain` should reflect actual preference (best first), not cost — the budget logic naturally falls back to cheaper options as spend approaches the cap, so there's no need to manually order by price.

**Deferred to v2 (only if this boilerplate proves it gets reused often):**

- Per-purpose budget caps (e.g. different limits for different features within one app)
- A local dashboard or structured log file for after-the-fact cost analysis

---

## Error handling

**No call ever throws.** Every call resolves to a consistent response shape, matching the pattern already established in the homework helper project:

```ts
interface LLMResponse {
  ok: boolean;
  message?: string;
  error?: {
    code:
      | "RATE_LIMITED"
      | "BUDGET_EXCEEDED"
      | "PROVIDER_ERROR"
      | "CONTEXT_TOO_LONG"
      | "UNKNOWN";
    message: string;
    retryable: boolean;
  };
}
```

Why a flag and not just an error code list: the gateway already knows, after walking the fallback chain, whether a failure was transient (worth retrying) or a hard stop (like budget exceeded). Surfacing `retryable` directly means every calling app gets this for free instead of re-deriving "which error codes are retryable" logic itself.

Budget exceeded is just another typed error case — not a special mechanism, not a thrown exception, not a different code path for callers to learn.

---

## Prompt utilities

A firm boundary, deliberately narrow:

**The boilerplate owns:**

- A generic message-history token trimmer (`trimToTokenLimit(messages, maxTokens)`) — genuinely provider-agnostic, tedious to rebuild per project

**The app owns:**

- System prompt construction
- All content, tone, rules, and personality (e.g. a homework helper's Socratic pedagogy rules)
- Anything that encodes what the product _is_, rather than how it talks to an LLM

---

## Client/server architecture

**The gateway is server-only.** It is only ever imported inside Next.js API routes (`src/app/api/.../route.ts`). It never runs in the browser, and API keys never reach the client.

**`useLLM()` ships as a React hook in the boilerplate:**

```ts
const { send, response, isLoading, error } = useLLM();
```

This hook is intentionally "dumb" — it always calls your project's own API route over `fetch`, with zero awareness of mock mode or provider details. Every AI-powered project ends up rebuilding this exact loading/error/response state machine for chat-like UI; shipping it once here removes real, repeated work.

---

## Mock mode

**Single source of truth, server-side only.** Same pattern as the homework helper's `NEXT_PUBLIC_MOCK_MODE`:

```
NEXT_PUBLIC_MOCK_MODE=true
```

When true, the gateway factory returns a `MockLLMProvider` instead of the real Claude adapter. The `useLLM()` hook has no opinion about this whatsoever — it always calls the real API route, and the API route's gateway decides whether that call is mocked.

This is a deliberate tradeoff: pure component/UI work still requires `npm run dev` running, in exchange for never having two competing definitions of "are we in mock mode right now."

---

## Configuration

Two files, two different jobs:

**`llm.config.ts`** (project root, typed, committed to git) — structural and behavioral decisions that deserve code review and version history:

```ts
export const llmConfig = {
  fallbackChain: [
    { provider: "anthropic", model: "claude-sonnet-4-6" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  ],
  budgetCapUsdPerDay: 3,
};
```

**`.env.local`** (never committed) — secrets and per-environment values:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_MOCK_MODE=true
```

---

## Implementation checklist

When building this out, in rough order:

- [ ] `llm.config.ts` — typed config shape (fallback chain, budget cap)
- [ ] `src/lib/llm-gateway/types.ts` — `LLMResponse`, error codes, provider adapter interface (streaming-ready shape)
- [ ] `src/lib/llm-gateway/providers/claude.ts` — real Claude adapter
- [ ] `src/lib/llm-gateway/providers/mock.ts` — mock adapter
- [ ] `src/lib/llm-gateway/gateway.ts` — fallback chain walker, budget enforcement, factory
- [ ] `src/lib/llm-gateway/trim.ts` — message history token trimmer
- [ ] `src/app/api/llm/chat/route.ts` — the one API route every project's `useLLM()` calls
- [ ] `src/hooks/useLLM.ts` — the client hook
- [ ] `env.example` additions — `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_MOCK_MODE`
- [ ] Tests: gateway fallback logic, budget cap enforcement, mock adapter — pure logic, no real API calls needed
- [ ] `fix_plan.md` entries for anything deferred (streaming implementation, per-purpose budgets, cost dashboard)

---

## Explicitly deferred (not in v1, don't build yet)

- A second real provider adapter (Gemini, OpenAI) — until a real project needs one
- Actual streaming implementation — interface ready, code path stubbed
- Per-purpose budget granularity — single global cap only
- Cost dashboard / structured log file — revisit once this boilerplate has been reused across 2–3 real projects
- Any orchestration, agent loops, or multi-step planning — explicitly out of scope for this repo, forever

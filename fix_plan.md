# fix_plan.md

> Living task list for this project. Read at the start of every session.
> AI assistants: pick the highest-priority incomplete item and implement it.
> Update this file after every session — mark completed items, add newly discovered ones.
>
> Format: `- [ ]` = todo, `- [x]` = done, `- [~]` = in progress

## Priority: High

- [ ] _TODO: add first real task here_

## Priority: Medium

<!-- Items that matter but aren't blocking -->

## Priority: Low

<!-- Nice-to-haves, polish, refactors -->

## Backlog

<!-- Discovered issues not yet prioritised -->

## Completed

<!-- Move items here when done — don't delete them, they're a record -->

- [x] Dependency-free, type-safe i18n layer: `src/lib/i18n/messages.ts` + `locales/en.json` (canonical) + `locales/es.json` (example); `useTranslation()` hook (mount-guarded); `locale`/`setLocale` added to Zustand store; `layout.tsx` `<html lang={DEFAULT_LOCALE}>`; `BaseTemplate` language switcher + `<html lang>` sync effect; README documented.
- [x] Multimodal (image) message support at the gateway contract level: widened `LLMMessage.content` to `MessageContent` union (`string | Array<TextBlock | ImageBlock>`, Anthropic block shape) in `types.ts`; `trim.ts` `estimateTokens` now sums text blocks + flat ~1,300/image; Claude adapter passes content through unchanged (commented); `mock.ts` acknowledges image blocks for `NEXT_PUBLIC_MOCK_MODE` testing; `route.ts` payload-size note; `gemini.example.ts` multimodal-translation caveat; DESIGN.md "Multimodal" section added. Upload UI, client-side downscaling, and image validation/limits remain app-level (documented as out of scope).

---

_Last updated: 2026-06-19_

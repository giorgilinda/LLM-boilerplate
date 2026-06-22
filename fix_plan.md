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
- [x] Claude-style chat example page: replaced the default Next.js welcome `src/app/page.tsx` with a self-contained chat UI built on `useLLM()` (text + image input, attachment previews, auto-growing composer, loading "thinking" indicator, error banner with retry, new-chat reset, mock-mode badge). Added app-level image helper `src/utils/image.ts` (`prepareImage`/`isImageFile`: canvas downscale to ≤1568px long edge, JPEG re-encode, strip data-URL prefix → gateway `ImageBlock`), re-exported from `src/utils/index.ts`. All UI strings via i18n (`chat.*` keys added to `en.json`/`es.json`). Rewrote `src/app/page.module.css` (Claude-like, token-based, dark-mode + reduced-motion aware). README updated with structure entries and an "AI / LLM" section.
- [x] Bugfix (image input failed to decode): `prepareImage` decoded via `URL.createObjectURL` (a `blob:` URL), which the app CSP (`img-src 'self' data: https:` in `next.config.ts`) blocks → `img.onerror` "Failed to decode image file." Switched decoding to a `data:` URL via `FileReader` (CSP-allowed); removed the blob/`revokeObjectURL` path. Created `.env.local` (gitignored) from `env.example` with `NEXT_PUBLIC_MOCK_MODE=true` so the chat (text + image) works out of the box without an API key — the text "error" was just the missing key surfacing because no `.env.local` existed. Added tests: `tests/utils/image.test.ts` (isImageFile, prepareImage downscale/encode/strip-prefix, CSP-safe no-blob, decode-failure) and `tests/app/page.test.tsx` (welcome state, send-disabled, text send + reply, Enter-to-send, image attach + block in request, error banner + retry, new-chat reset). NOTE: tests verified statically (IDE TS/ESLint clean); `npm test` not run because the PowerShell→WSL bridge hung the terminal session.

- [x] Image input methods (drag-and-drop + paste): the composer previously only accepted images via the `+` file picker. Added drag-and-drop (`onDragOver`/`onDragLeave`/`onDrop` on the composer with a dashed highlight + "Drop image to attach" overlay, `chat.dropHint` i18n key) and clipboard paste (`onPaste` on the textarea, reads `clipboardData.items` of `kind: "file"`) in `src/app/page.tsx`. Generalised `handleFiles` to accept `FileList | File[]`. Added `tests/app/page.test.tsx` cases for paste and drop. CSS: `.dragging` + `.dropHint` (pointer-events:none so drag events keep flowing). README updated.

---

_Last updated: 2026-06-22_

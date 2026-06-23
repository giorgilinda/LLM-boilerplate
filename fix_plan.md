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

- [x] Refactor chat UI into focused modules: extracted the monolithic `src/app/page.tsx` (~900 lines) into a thin route (`page.tsx` → `<Chat />`) plus `src/components/Chat/`, `Composer/`, `Message/`, `MessageThread/`, `FeedbackDialog/`; hooks `useAttachments`, `useChatSession` (incl. regenerate), `useFeedback`; lib `src/lib/chat/` (`types`, `messages`, `constants`, `feedback`). CSS moved to `Chat.module.css`. All features preserved: text+image input (picker/paste/drop), copy, thumbs up/down + detail dialog, regenerate, error retry, new chat, mock badge. Generic `DEFAULT_SYSTEM_PROMPT`. Added `src/lib/chat/messages.test.ts`. Fixed `jest.config.js` moduleNameMapper order (CSS proxy before `@/` alias) so component CSS imports resolve in tests. README structure + Architecture updated. `npm test --testPathPattern='page.test|messages.test'`: 13 passed.

- [x] Feedback detail dialog (Claude-style): rating a response now opens a modal (`FeedbackDialog` in `src/components/FeedbackDialog/`) for optional free-text details, plus an optional issue-category `<select>` on thumbs-down (`NEGATIVE_FEEDBACK_CATEGORIES`: ui_bug, overcautious_refusal, poor_image_understanding, didnt_follow_instructions, factually_incorrect, incomplete_response, should_have_used_reasoning, should_have_searched_web, memory_issue, report_content). Flow records exactly one event per user action: rating ON opens the dialog (logs on submit incl. category+details, or on cancel/Esc/backdrop with rating only); rating OFF logs `rating:null` and skips the dialog. Extracted `postFeedback`; added `submitFeedback`/`closeFeedback`; dialog autofocuses details + closes on Escape/backdrop. API `route.ts` widened with optional `category`/`details` (trimmed+length-capped via `optionalString`). New i18n `feedback.*` keys incl. all categories (en + es); modal CSS (`.dialog*`) using existing tokens. README + fix_plan updated. Lint: IDE ESLint/TS clean.

- [x] Per-response actions (copy / feedback / regenerate): each assistant reply in `src/app/page.tsx` now renders a Claude-style action row — copy-to-clipboard (transient "Copied" check via `copiedId`), thumbs up/down feedback (toggle, `feedback?: "up"|"down"` on `ChatMessage`), and a regenerate button (`regenerateMessage` re-sends history sliced before that message and replaces its text, with an inline "thinking" indicator gated by `regeneratingId`; the bottom indicator now hides while regenerating). Feedback persists to a new append-only JSON log via `POST /api/feedback` (`src/app/api/feedback/route.ts` → `data/feedback.json`, one event per click incl. `null` for un-toggle; manual validation, no zod dependency). PRODUCTION CAVEAT documented: filesystem write requires a persistent Node server — swap `appendFeedback` for a DB insert on serverless. Added i18n keys `chat.copy/copied/goodResponse/badResponse/regenerate` (en + es); CSS `.actions/.actionButton/.actionActive` (muted until message hover, reduced-motion aware); `data/` gitignored; README structure + Architecture sections updated. NOTE: verified via IDE ESLint/TS (clean); `npm`/`eslint` not runnable through the PowerShell→WSL UNC bridge. TODO (not done): add tests in `tests/app/page.test.tsx` for copy/feedback/regenerate and a `tests/app/feedback-route.test.ts`.

---

_Last updated: 2026-06-23_

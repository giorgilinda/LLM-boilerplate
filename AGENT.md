# AGENT.md

> This file is read by AI coding assistants (Claude Code, Cursor, Copilot, etc.) at the start of every session.
> Keep it accurate and brief. Update it when you learn something new about this project.
> For Cursor-specific slash commands and rules, see CURSOR.md

## What this project is

<!-- One sentence. What does this app do? Who is it for? -->

_TODO: describe the project_

## How to build and run

```bash
npm install
npm run dev        # development server at http://localhost:3000
npm run build      # production build
npm start          # production server
```

## How to test

```bash
npm test           # run all tests
npm run test:watch # watch mode
npm run check      # lint + test (run before committing)
```

## Environment variables

Copy `env.example` to `.env.local` before running locally.

See `env.example` for the full list.

## Project structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Reusable UI components (CSS Modules)
├── hooks/            # Custom React hooks
├── lib/              # Deep modules: complex logic behind clean interfaces
│   └── i18n/         # UI translations: messages.ts + locales/*.json
├── providers/        # React context providers
├── services/         # Server state (TanStack Query CRUD factory)
├── store/            # Client state (Zustand)
├── styles/           # Global styles and CSS token system
└── utils/            # Pure utility functions
```

## Conventions

See `CONVENTIONS.md` for the full list. Key rules:

- Components: arrow functions with `React.FC<Props>`, PascalCase filenames
- Server state: TanStack Query via `createCrudService<T>()` in `src/services/`
- Client state: Zustand in `src/store/`, use `persist` when localStorage needed
- Styling: CSS Modules scoped to components, global tokens in `src/styles/tokens/`
- UI labels: never hardcode display strings — add a key to `src/lib/i18n/locales/en.json` (+ each other locale) and read it via the `useTranslation()` hook
- Never hardcode API keys or secrets — use `.env.local`

## AI assistant rules

- **Research before implementing**: read relevant files before making changes
- **One thing at a time**: implement one feature or fix per session, commit when tests pass
- **No placeholder implementations**: if a function is called, it must be fully implemented
- **Tests document intent**: when writing tests, explain in a JSDoc block _why_ the test exists and what it protects against
- **Update this file**: if you learn something new about how to build or run this project, update `AGENT.md`
- **Read `fix_plan.md` first**: at the start of every session, read `fix_plan.md`
  to understand where the project stands. After completing work, update it —
  mark done items `[x]`, add newly discovered issues, keep it accurate.
- `useTranslation()` is mount-guarded for the same reason: it renders `DEFAULT_LOCALE` during SSR/first paint, then swaps to the persisted locale — expect a brief flash to English if a non-default locale is stored
- `<html lang>` is SSR-rendered with `DEFAULT_LOCALE` (`layout.tsx`) and synced to the active locale by an effect in `BaseTemplate` — `layout.tsx` is a server component and can't read the client-persisted locale directly

## Known gotchas

<!-- Add project-specific traps here as you discover them -->

- Zustand persisted state requires `useIsMounted` check to avoid Next.js hydration mismatch (see `src/hooks/useIsMounted.ts`)
- _TODO: add more as you discover them_

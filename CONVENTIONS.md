# Conventions

Project-level conventions reflected in the codebase. When in doubt, follow existing patterns in `src/`.

## Components

- **Definition**: Use arrow function components with `React.FC<Props>` (see `Button.tsx`, `Card.tsx`).
- **Naming**: PascalCase for component files (e.g. `BaseTemplate.tsx`, `Button.tsx`).
- **Documentation**: TSDoc/JSDoc on exported components; document props via TypeScript interfaces and optional `@example` blocks.

## Hooks

- **Naming**: camelCase with `use` prefix (e.g. `useIsMounted.ts`, `useAppStore.ts`).
- **Documentation**: JSDoc with `@returns` and `@example` where helpful for hydration or usage.

## State

- **Server state**: TanStack Query in `src/services/`. Use `createCrudService<T>()` from `CRUDService.ts` for new entities; it provides a query key factory and hooks with optimistic updates for create/delete. Default is single numeric `id`; for composite keys use the fourth generic `Id` and config `getItemUrl` + `getKeyFromEntity`. List responses: raw array, `listFromResponse` (unwrap to T[]), or `parseListResponse` (list + metadata). Optional third generic `ListParams` types query params for the list endpoint; pass to `useGetList(params)` for server-side filtering. For server-only contexts (route handlers/server components), use pure helpers from `CRUDLogic.ts` (`fetchList`, `fetchItem`, `createItem`, `updateItem`, `deleteItem`) instead of hooks. See JSDoc in both files.
- **Client state**: Zustand in `src/store/`. Use `persist` + `createJSONStorage(() => localStorage)` when persistence is needed. For Next.js, read persisted state only after mount (e.g. `useIsMounted`).

## Styling

- **Scoped styles**: CSS Modules (`.module.css`) next to components.
- **Global/theme**: `src/app/layout.tsx` imports `src/styles/globals.css`. Keep the global layer order in `src/styles/layers.css`, primitive tokens in `src/styles/tokens/primitives.css`, and semantic tokens in `src/styles/tokens/semantics.css`.

## Internationalization (i18n)

- **No hardcoded UI strings**: every user-facing label goes through the translation layer in `src/lib/i18n/`, never inline in JSX.
- **Catalog**: translations live in `src/lib/i18n/locales/<locale>.json` (one file per language, identical key sets). `en.json` is the source of truth for which keys exist; `messages.ts` wires the JSON files together and types each locale as `Record<MessageKey, string>`, so a missing key fails type-checking.
- **Usage**: read strings in client components via `const { t } = useTranslation()` then `t("chat.send")`. The hook also returns `locale` + `setLocale` for building language switchers (e.g. the header `<select>` in `BaseTemplate.tsx`).
- **Adding a string**: add the key to `en.json`, then translate it in every other locale file (TypeScript flags the gaps). Supported locales: `en`, `es` (see `LOCALES` in `messages.ts`).
- **Hydration**: `useTranslation()` is mount-guarded (renders `DEFAULT_LOCALE` until mounted) to avoid Next.js hydration mismatches, mirroring the `useIsMounted` pattern.
- **`<html lang>`**: rendered server-side with `DEFAULT_LOCALE` in `layout.tsx`, then synced to the active locale by an effect in `BaseTemplate`. Update both if you change how the locale is sourced.

## Constants and config

- **App branding**: `src/utils/constants.ts` holds `APP_NAME`, `APP_DESCRIPTION`, `APP_EMOJI` for metadata and layout.
- **Environment**: Copy `env.example` to `.env.local`; document new env vars in README.

## File layout

- **App Router**: Pages and layouts under `src/app/`; shared layout in `src/app/templates/BaseTemplate.tsx`.
- **Reusable UI**: `src/components/`.
- **Utilities**: Pure helpers in `src/utils/`; re-export from `src/utils/index.ts` when shared.

## Documentation

- **In-code**: TSDoc/JSDoc for all exported functions and components; explain "why" for non-obvious logic.
- **README**: Keep feature list, project structure, and code samples in sync with the implementation. After adding env vars or npm scripts, update README.

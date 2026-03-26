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
- **Global/theme**: `src/app/globals.css` imports `src/styles/theme.css` for CSS variables. Use variables for colors, typography, and spacing.

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

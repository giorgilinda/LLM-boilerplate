# Next.js Boilerplate

A modern, production-ready Next.js boilerplate with TypeScript, Jest, ESLint, and comprehensive developer tools. Perfect for quickly starting new projects, code challenges, and personal applications.

## 🚀 Features

- **Next.js 16** - Latest version with App Router
- **React 19** - Latest React with improved performance
- **TypeScript** - Type-safe development
- **TanStack Query** - Server state with CRUD examples and optimistic updates
- **Zustand** - Client state with localStorage persistence
- **i18n** - Dependency-free, type-safe translations with a locale switcher
- **LLM Gateway** - Server-side provider gateway (Claude) with fallback, retries, budget caps, and a Claude-style chat example with image input
- **Jest** - Unit and integration testing with coverage
- **ESLint** - Code quality and consistency
- **CSS Modules** - Scoped styling
- **Theme System** - Customizable CSS variables
- **Dark Mode Support** - Automatic dark mode via prefers-color-scheme
- **Mobile-First** - Responsive design out of the box
- **Production Ready** - Security headers, optimized builds
- **BaseTemplate Layout** - Pre-built responsive header and footer
- **Centralized Constants** - App-wide configuration via `constants.ts`
- **Dynamic Favicon** - Emoji-based favicon support
- **PWA Ready** - Enhanced metadata for mobile web apps
- **Cursor AI Workflow** - Pre-configured rules and commands for AI-assisted development

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout with metadata
│   ├── page.tsx      # Thin home route — renders <Chat />
│   ├── not-found.tsx # Custom 404 page
│   ├── api/llm/chat/ # POST route the chat UI calls (server-side gateway)
│   ├── api/feedback/ # POST route storing thumbs up/down on responses (JSON log)
│   └── templates/    # Page templates
│       ├── BaseTemplate.tsx        # Main layout with header/footer
│       └── BaseTemplate.module.css # Template styles
├── components/       # Reusable React components
│   ├── Chat/         # Composition root: thread + composer + feedback dialog
│   ├── Composer/     # Message input (textarea, attach, send, drag-and-drop)
│   ├── Message/      # Single rendered message + per-response actions
│   ├── MessageThread/# Conversation list, loading/error states, docked composer
│   └── FeedbackDialog/ # Optional detail modal for thumbs up/down
├── hooks/            # Custom React hooks
│   ├── useIsMounted.ts   # Hydration-safe mounting hook
│   ├── useLLM.ts         # Client hook to call /api/llm/chat: { send, response, isLoading, error }
│   ├── useAttachments.ts # Staging images from picker / paste / drop
│   ├── useChatSession.ts # Message history + send / retry / regenerate / new-chat
│   ├── useFeedback.ts    # Thumbs up/down + optional detail dialog
│   └── useTranslation.ts # i18n hook: { t, locale, setLocale }
├── lib/              # Framework-agnostic libraries
│   ├── chat/         # Chat UI types, wire-format helpers, feedback categories
│   │   ├── types.ts           # ChatMessage, Feedback
│   │   ├── messages.ts        # createId, toLLMMessages
│   │   ├── constants.ts       # DEFAULT_SYSTEM_PROMPT, IS_MOCK_MODE
│   │   ├── feedback.ts        # NEGATIVE_FEEDBACK_CATEGORIES
│   │   └── message-metadata.example.ts # Opt-in classifier wrapper (not wired in)
│   ├── classifier/   # Opt-in pre-flight classifier (server-only; not used by default chat)
│   │   ├── gateway.ts         # classify<T>() entry point
│   │   ├── parse.ts           # parseJsonFromModelText()
│   │   └── providers/         # Anthropic adapter + gemini.example.ts
│   ├── i18n/         # Dependency-free translation layer
│   │   ├── messages.ts        # Types, LOCALES, assembled messages map
│   │   └── locales/           # Per-language JSON files (identical key sets)
│   │       ├── en.json        # Canonical source of truth for keys
│   │       └── es.json         # Example second locale
│   └── llm-gateway/  # Server-side LLM gateway (providers, fallback, budget, trim)
│       ├── gateway.ts         # Single entry point: fallback chain + retries + budget
│       ├── types.ts           # Message/response contract (incl. multimodal blocks)
│       └── providers/         # Claude adapter + mock adapter (NEXT_PUBLIC_MOCK_MODE)
├── providers/        # React context providers
│   └── TanStackProvider.tsx  # TanStack Query provider with devtools
├── services/         # API services and reusable CRUD logic
│   ├── CRUDLogic.ts          # Pure async CRUD helpers (server-safe)
│   └── CRUDService.ts        # TanStack Query CRUD factory + optimistic updates
├── store/            # Zustand state stores
│   └── useAppStore.ts        # Global app state with persistence
├── utils/            # Utility functions
│   ├── constants.ts  # App-wide constants (name, description, emoji)
│   ├── image.ts      # Client-side image downscale + base64 for LLM image input
│   └── index.ts      # Common utilities (formatDate, capitalize, debounce)
└── styles/           # Layered global styles and design tokens
    ├── globals.css   # Main global stylesheet imported by app layout
    ├── layers.css    # CSS layer order declaration
    └── tokens/       # Primitive + semantic CSS variables
.cursor/              # Cursor AI workflow configuration
├── commands/         # Slash command templates
└── rules/            # Auto-applied behavior rules for the AI agent
tests/                # Test files
public/               # Static assets
classifier.config.ts  # Pre-flight classifier provider + model (opt-in; see DESIGN.md)
```

## 🛠️ Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run lint and tests together (e.g. before commit or in CI):

```bash
npm run check
```

### Building for Production

```bash
npm run build
npm start
```

## 🎨 Theming

The boilerplate includes a layered CSS token system. Customize core palettes in `src/styles/tokens/primitives.css` and semantic tokens (component-facing variables) in `src/styles/tokens/semantics.css`.

```css
:root {
  --color-primary: #0070f3;
  --color-secondary: #7c3aed;
  /* ... more variables */
}
```

Dark mode is automatically enabled based on system preferences. Customize dark mode values in `src/styles/tokens/semantics.css` under `@media (prefers-color-scheme: dark)`.

## 🏗️ Templates

The boilerplate includes a `BaseTemplate` layout component that wraps all pages with:

- **Responsive Header** - App name with emoji and navigation links
- **Main Content Area** - Flexible container for page content
- **Footer** - Quick links and contact information with social icons

### Customizing the Template

Edit `src/app/templates/BaseTemplate.tsx` to customize the header navigation, footer links, and overall layout structure. The template uses CSS Modules for scoped styling.

## ⚙️ Constants

Centralized application constants are stored in `src/utils/constants.ts`:

```typescript
export const APP_NAME = "MyApp";
export const APP_DESCRIPTION = "This is a boilerplate for my apps";
export const APP_EMOJI = "🆕";
```

These constants are used throughout the app for:

- Page metadata (title, description)
- Dynamic emoji favicon
- Header and footer branding

## 🗃️ State Management

The boilerplate includes two complementary state management solutions:

### TanStack Query (Server State)

TanStack Query handles all server state - data fetching, caching, and synchronization. The app is wrapped with `TanStackProvider` which includes:

- Query caching with 1-minute stale time
- React Query Devtools (in development)

The CRUD service (`src/services/CRUDService.ts`) exports a **generic `createCrudService<T>()` factory**. Create services for any entity by calling the factory. Default is a single numeric `id`; for **composite keys** (e.g. `memberId` + `key`), use the fourth generic `Id` and provide `getItemUrl` and `getKeyFromEntity` in config (see JSDoc in CRUDService.ts). List responses can be plain arrays, unwrapped via `listFromResponse`, or list-plus-metadata via `parseListResponse`. Optional third generic `ListParams` types query params for the list endpoint; pass an object to `useGetList(params)` for server-side filtering (e.g. `useGetList({ status: "alive" })`).

For server-side logic (route handlers, server components), the same CRUD HTTP logic is available as **pure async functions** in `src/services/CRUDLogic.ts` (no React Query hooks).

```typescript
import { createCrudService, type CrudEntity } from "@/services/CRUDService";

interface User extends CrudEntity {
  name: string;
  email: string;
}

const userService = createCrudService<User>({
  entityKey: "users",
  baseUrl: "/api/users",  // or your API base URL
});

// Use the generated hooks
const { useGetList, useGetItem, useCreate, useUpdate, useDelete } = userService;
const { data: users } = useGetList();  // optional: useGetList({ role: "admin" }) when using ListParams
const { mutate: createUser } = useCreate();
createUser({ name: "Jane", email: "jane@example.com" });  // id omitted
```

Example server-side usage (pure functions):

```typescript
import { fetchList } from "@/services/CRUDLogic";

const users = await fetchList(
  { entityKey: "users", baseUrl: "/api/users" },
  { status: "active" }
);
```

All hooks support optimistic updates for create and delete. See in-code examples in `CRUDService.ts` for list-only, `listFromResponse`, and list-plus-metadata patterns.

### Zustand (Client State with Persistence)

Zustand handles client-only state like UI state, user preferences, etc. The example store (`src/store/useAppStore.ts`) includes **localStorage persistence**:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AppState {
  isMenuOpen: boolean;
  fontSize: number;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  setFontSize: (size: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isMenuOpen: false,
      fontSize: 16,
      setMenuOpen: (open) => set({ isMenuOpen: open }),
      toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: "app-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Note:** For Next.js hydration, check if the component is mounted before using persisted values. Use the included `useIsMounted` hook:

```typescript
import { useIsMounted } from "@/hooks/useIsMounted";

const MyComponent = () => {
  const isMounted = useIsMounted();
  const fontSize = useAppStore((s) => s.fontSize);

  if (!isMounted) return null;
  return <div style={{ fontSize }}>Content</div>;
};
```

## 🌍 Internationalization (i18n)

A lightweight, **type-safe** translation layer with **zero runtime dependencies** (no `next-intl` / `react-i18next`). UI labels live in per-language JSON files that share an identical key set, and components read them through a `useTranslation()` hook.

### How it works

- `src/lib/i18n/locales/en.json` is the **canonical source of truth** for keys.
- `src/lib/i18n/messages.ts` derives `MessageKey` from `en.json` and types the assembled map as `Record<Locale, Messages>`, so **a locale file missing a key is a compile error**.
- The active locale is persisted in the Zustand store (`locale` + `setLocale`) and synced to `<html lang>`.

```tsx
import { useTranslation } from "@/hooks/useTranslation";

const MyComponent = () => {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div>
      <h2>{t("footer.contact")}</h2>
      <button onClick={() => setLocale("es")}>Español</button>
    </div>
  );
};
```

### Adding a string

1. Add the key + English text to `src/lib/i18n/locales/en.json`.
2. Translate the same key in **every other locale file** (e.g. `es.json`). TypeScript flags any file that is missing the new key.

### Adding a locale

1. Create `src/lib/i18n/locales/<code>.json` with the full key set.
2. Add the code to `LOCALES` and a label to `LOCALE_LABELS` in `messages.ts`, then import the file into the `messages` map.

### Hydration notes

The locale comes from `localStorage` (client only), so `useTranslation()` is mount-guarded via `useIsMounted`: it renders `DEFAULT_LOCALE` during SSR/first paint, then swaps to the stored locale — expect a brief flash if a non-default locale is stored. `<html lang>` is server-rendered with `DEFAULT_LOCALE` and corrected client-side (in `BaseTemplate`) because `layout.tsx` is a server component and can't read persisted state directly.

`BaseTemplate` consumes the hook and renders a header language `<select>`, doubling as the reference implementation.

## 🤖 AI / LLM

The boilerplate ships a small **server-side LLM gateway** plus a **Claude-style chat example** (the home page) so a new project can start talking to an LLM — including image input — immediately.

### Architecture

- **`src/lib/llm-gateway/`** (server-only) — the gateway is the single entry point. It walks a configurable **fallback chain** (`llm.config.ts`), **retries** each model with backoff, **trims** history to a token budget, and enforces a daily **budget cap**. It never throws: every call resolves to an `LLMResponse` with `ok: true/false`.
- **`src/app/api/llm/chat/route.ts`** — the one API route. It keeps the gateway and `ANTHROPIC_API_KEY` entirely server-side.
- **`src/hooks/useLLM.ts`** — the client hook. It POSTs to `/api/llm/chat` and manages `{ send, response, isLoading, error }`. It is deliberately unaware of providers, mock mode, or fallback — all of that lives in the gateway.
- **`src/components/Chat/Chat.tsx`** — the Claude-style chat UI built on `useLLM()`. Copy it as the starting point for a new project. Each assistant reply has a **copy** button, **thumbs up/down** feedback, and a **regenerate** button. Rating a response opens a Claude-style dialog for optional details (and, on thumbs-down, an optional issue category). `src/app/page.tsx` is a thin route that renders `<Chat />`.
- **`src/hooks/useChatSession.ts`** — owns message history and send / retry / regenerate / new-chat orchestration.
- **`src/hooks/useAttachments.ts`** — owns image staging (file picker, paste, drag-and-drop).
- **`src/hooks/useFeedback.ts`** — owns thumbs up/down state and the optional detail dialog.
- **`src/app/api/feedback/route.ts`** — records feedback (`rating`, optional `category` + free-text `details`, and a snapshot of the response) to an append-only JSON log at `data/feedback.json` (gitignored). This is intentionally simple for a boilerplate; it requires a persistent filesystem, so on serverless platforms (e.g. Vercel) swap the file write for a database insert — the route contract stays the same.

### Configuration

Copy `env.example` to `.env.local`:

```bash
# Use mock responses while building UI — no API calls, no tokens spent
NEXT_PUBLIC_MOCK_MODE=true

# Real provider key (server-side only). Get one at https://console.anthropic.com
ANTHROPIC_API_KEY=
```

With `NEXT_PUBLIC_MOCK_MODE=true` the gateway returns canned responses (and acknowledges attached images), so the full chat flow — including the loading and image states — is testable offline. The chat page shows a "Mock mode" badge while it's on. Set it to `false` and add your `ANTHROPIC_API_KEY` to hit the real Claude API.

### Sending a message

```tsx
import { useLLM } from "@/hooks/useLLM";

const { send, isLoading, error } = useLLM();

await send({
  systemPrompt: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Image (multimodal) input

A message's `content` can be a plain string **or** an array of text/image blocks. Images use Anthropic's shape: base64 with the `data:...;base64,` prefix stripped, plus a `media_type`. The `prepareImage` helper downscales a `File` client-side and returns a gateway-ready block plus a preview URL:

```tsx
import { prepareImage, isImageFile } from "@/utils";

const prepared = await prepareImage(file); // file from <input type="file">

await send({
  systemPrompt: "Describe the image.",
  messages: [
    {
      role: "user",
      content: [prepared.block, { type: "text", text: "What is this?" }],
    },
  ],
});
```

The chat example accepts images three ways: the **+** button (file picker), **drag-and-drop** onto the composer, and **paste** (Ctrl/Cmd+V) for screenshots. All three funnel through `prepareImage`.

> CSP note: images are decoded via a `data:` URL (`FileReader`), not a `blob:` object URL, because the project's `Content-Security-Policy` (`next.config.ts`) allows `img-src ... data:` but not `blob:`.

See `src/components/Chat/Chat.tsx` for the complete reference (attachments, previews, retry, reset, feedback, regenerate) and `DESIGN.md` for the gateway's design rationale.

### Pre-flight classification (opt-in)

Some apps run a **cheap classifier call before the main response** to infer metadata (intent, language, mood, etc.) and build a dynamic system prompt. This is **not enabled by default** — the classifier does nothing until you explicitly call it from your own API route.

- **`src/lib/classifier/`** — provider-agnostic `classify<T>()` gateway (mirrors the LLM gateway pattern). Respects `NEXT_PUBLIC_MOCK_MODE` (returns your default immediately, no API call).
- **`classifier.config.ts`** — committed provider + model config. Override model via `CLASSIFIER_MODEL` in `.env.local`.
- **`src/lib/chat/message-metadata.example.ts`** — example wrapper showing how to define your metadata shape and call `classify()` before `llmGateway.chat()`.

The default `/api/llm/chat` route and chat UI **never import** the classifier. See `DESIGN.md` → "Pre-flight classification" for the design rationale and `HOW_TO_USE.md` → "Optional — Pre-flight classification" for a step-by-step wiring guide.

## 📝 Example Components

The boilerplate includes a few example components to get you started:

- **Button** - Accessible button component with variants
- **Card** - Card container component

These serve as examples of best practices for component structure and CSS Modules usage.

## 🧪 Testing

Tests are located in the `tests/` directory. Example tests are included for:

- Utility functions (`tests/utils.test.ts`, `tests/utils/image.test.ts`) – formatDate, capitalize, debounce, image downscale/encode
- Components (`tests/components/Button.test.tsx`, `tests/components/Card.test.tsx`)
- CRUD logic (`tests/services/CRUDLogic.test.ts`) - URL building, request contracts, composite-key helpers
- CRUD service (`tests/services/CRUDService.test.tsx`) - query keys, optimistic updates, list/metadata handling
- Chat UI (`tests/app/page.test.tsx`) – send, attachments, copy, feedback, regenerate
- Feedback API (`tests/app/feedback-route.test.ts`) – append-only JSON log validation
- Classifier (`tests/lib/classifier/`) – mock-mode skip, parse, non-fatal fallbacks

CI runs on push/PR to `main` or `master` (`.github/workflows/ci.yml`): install, lint, test, build.

### Writing Tests

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

## 🔧 Configuration

### TypeScript

TypeScript configuration is in `tsconfig.json`. Key settings include:

- Path aliases: `@/*` pointing to `src/*`
- `strictNullChecks` enabled for null safety
- ES2017 target for broad compatibility
- Node module resolution

### ESLint

ESLint configuration extends Next.js recommended rules. Customize in `eslint.config.mjs`.

### Jest

Jest is configured to work with TypeScript and React Testing Library. Configuration is in `jest.config.js`.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Deploy!

### Other Platforms

The project can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted (Node.js)

## 📦 What's Included

- ✅ Next.js 16 with App Router
- ✅ React 19
- ✅ TypeScript configuration
- ✅ TanStack Query with CRUD patterns and optimistic updates
- ✅ Zustand with localStorage persistence
- ✅ Dependency-free, type-safe i18n layer with locale switcher
- ✅ Server-side LLM gateway (Claude) with fallback, retries, and budget caps
- ✅ Claude-style chat example with image (multimodal) input and mock mode
- ✅ Jest with React Testing Library
- ✅ ESLint configuration
- ✅ CSS Modules with theme system
- ✅ Dark mode support
- ✅ Security headers
- ✅ Example components and tests
- ✅ Generic CRUD service (CRUDService.ts) with query key factory and list/metadata options
- ✅ Mobile-first responsive design
- ✅ Production optimizations
- ✅ BaseTemplate layout with header/footer
- ✅ Centralized app constants
- ✅ Dynamic emoji favicon
- ✅ PWA-ready metadata (viewport, theme color, Apple Web App)

## 🤖 Cursor AI Workflow

This boilerplate includes a pre-configured Cursor AI workflow for efficient AI-assisted development. See `CURSOR.md` for full details.

### Quick Start

1. **Start a task:** `/request` followed by your feature or fix description
2. **Debug persistent issues:** `/refresh` for deep root-cause analysis
3. **Improve over time:** `/retro` to reflect and update project rules
4. **Sync docs:** `/docs` to audit and synchronize documentation with code
5. **Review code:** `/review` for code review before commits
6. **Run tests:** `/test` to run and verify test coverage
7. **Commit changes:** `/commit` for structured commit messages
8. **Security audit:** `/secure` for OWASP-focused vulnerability and threat modeling
9. **Brainstorm (no code):** `/spark` for Socratic exploration and architectural options
10. **Modernize code:** `/upgrade` to audit legacy patterns and propose upgrades

See `CURSOR.md` for the full command table and rules reference.

### Structure

- `.cursor/rules/` - Behavioral rules automatically applied to the AI agent
- `.cursor/commands/` - Slash command templates for structured workflows

The AI agent follows a research-first protocol, prioritizes code over documentation as source of truth, and performs self-audits before reporting completion.

## 🔮 Next Steps

- Add Storybook for component development
- Configure CI/CD pipeline
- Add end-to-end testing (Playwright, Cypress)
- Set up authentication
- Add a UI library (Tailwind CSS, Material-UI, etc.)

## 📄 License

MIT

## 🤝 Contributing

This is a boilerplate template. Feel free to fork and customize for your needs!

---

Made with ❤️ using Next.js

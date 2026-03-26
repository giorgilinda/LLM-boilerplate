# Next.js Boilerplate

A modern, production-ready Next.js boilerplate with TypeScript, Jest, ESLint, and comprehensive developer tools. Perfect for quickly starting new projects, code challenges, and personal applications.

## 🚀 Features

- **Next.js 16** - Latest version with App Router
- **React 19** - Latest React with improved performance
- **TypeScript** - Type-safe development
- **TanStack Query** - Server state with CRUD examples and optimistic updates
- **Zustand** - Client state with localStorage persistence
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
│   ├── page.tsx      # Home page
│   ├── not-found.tsx # Custom 404 page
│   ├── globals.css   # Global styles
│   └── templates/    # Page templates
│       ├── BaseTemplate.tsx        # Main layout with header/footer
│       └── BaseTemplate.module.css # Template styles
├── components/       # Reusable React components
├── hooks/            # Custom React hooks
│   └── useIsMounted.ts  # Hydration-safe mounting hook
├── providers/        # React context providers
│   └── TanStackProvider.tsx  # TanStack Query provider with devtools
├── services/         # API services and reusable CRUD logic
│   ├── CRUDLogic.ts          # Pure async CRUD helpers (server-safe)
│   └── CRUDService.ts        # TanStack Query CRUD factory + optimistic updates
├── store/            # Zustand state stores
│   └── useAppStore.ts        # Global app state with persistence
├── utils/            # Utility functions
│   ├── constants.ts  # App-wide constants (name, description, emoji)
│   └── index.ts      # Common utilities (formatDate, capitalize, debounce)
└── styles/           # Global styles and theme
    └── theme.css     # CSS variables for theming
.cursor/              # Cursor AI workflow configuration
├── commands/         # Slash command templates
└── rules/            # Auto-applied behavior rules for the AI agent
tests/                # Test files
public/               # Static assets
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

The boilerplate includes a comprehensive theme system using CSS variables. Customize colors, spacing, typography, and more in `src/styles/theme.css`:

```css
:root {
  --color-primary: #0070f3;
  --color-secondary: #7c3aed;
  /* ... more variables */
}
```

Dark mode is automatically enabled based on system preferences. Customize dark mode styles in the `@media (prefers-color-scheme: dark)` section.

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

## 📝 Example Components

The boilerplate includes a few example components to get you started:

- **Button** - Accessible button component with variants
- **Card** - Card container component

These serve as examples of best practices for component structure and CSS Modules usage.

## 🧪 Testing

Tests are located in the `tests/` directory. Example tests are included for:

- Utility functions (`tests/utils.test.ts`) – formatDate, capitalize, debounce
- Components (`tests/components/Button.test.tsx`, `tests/components/Card.test.tsx`)
- CRUD logic (`tests/services/CRUDLogic.test.ts`) - URL building, request contracts, composite-key helpers
- CRUD service (`tests/services/CRUDService.test.tsx`) - query keys, optimistic updates, list/metadata handling

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

- Set up internationalization (i18n)
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

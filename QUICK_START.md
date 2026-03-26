# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Copy this boilerplate to your new project

```bash
# Copy the entire boilerplate folder
cp -r ./nextjs-boilerplate ./my-new-project

# Or clone from GitHub (after you push it)
git clone <your-github-repo-url> my-new-project
cd my-new-project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start developing

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 What to Customize

### Project Name

1. Update `package.json`:
   - Change `name` to your project name
   - Update `description`

2. Update `src/utils/constants.ts`:
   - Change `APP_NAME` to your app name
   - Change `APP_DESCRIPTION` to your app description
   - Change `APP_EMOJI` for the favicon

### Colors & Theme

Edit `src/styles/theme.css` to customize colors:

```css
:root {
  --color-primary: #your-color;
  --color-secondary: #your-color;
  /* ... */
}
```

### Add New Pages

Create new files in `src/app/`:

- `about/page.tsx` → `/about`
- `contact/page.tsx` → `/contact`

### Add API Routes

Create Route Handlers in `src/app/api/`:

- `src/app/api/users/route.ts` → `/api/users`

```typescript
// src/app/api/users/route.ts
export async function GET() {
  return Response.json({ users: [] });
}
```

### Add Components

Create components in `src/components/`:

- `src/components/Header.tsx`
- `src/components/Header.module.css`

### Add API Services (TanStack Query)

Use the generic `createCrudService` from `src/services/CRUDService.ts` for new entities:

```typescript
// src/services/userService.ts
import { createCrudService, type CrudEntity } from "@/services/CRUDService";

interface User extends CrudEntity {
  name: string;
  email: string;
}

const userService = createCrudService<User>({
  entityKey: "users",
  baseUrl: "/api/users",
});

export const { useGetList, useGetItem, useCreate, useUpdate, useDelete } = userService;
// Or alias: export const useGetUsers = userService.useGetList;
// For server-side filtering, use third generic: createCrudService<User, undefined, { role: string }>(...)
// then useGetList({ role: "admin" }) to fetch /api/users?role=admin
// For composite keys (e.g. memberId + key), use fourth generic Id and config.getItemUrl + config.getKeyFromEntity — see CRUDService.ts
```

If you need the same CRUD operations outside React hooks (e.g. in route handlers or server components), use pure async helpers from `src/services/CRUDLogic.ts`.

### Add Client State (Zustand with Persistence)

The boilerplate includes a persisted store example in `src/store/useAppStore.ts`. Copy this pattern:

```typescript
// src/store/useUserStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserState {
  name: string;
  theme: "light" | "dark";
  setName: (name: string) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: "",
      theme: "light",
      setName: (name) => set({ name }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "user-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

## 🧪 Run Tests

```bash
npm test
```

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📚 Next Steps

- [ ] Update README.md with your project details
- [ ] Customize theme colors
- [ ] Add your first feature
- [ ] Write tests for your code
- [ ] Deploy to Vercel

## 💡 Tips

- Use CSS Modules for component-specific styles
- Leverage the theme variables for consistent styling
- Write tests alongside your code
- Use TypeScript for type safety
- Follow the existing component patterns
- Use TanStack Query for all server state (API data)
- Use Zustand for client-only state (UI state, preferences)

## 🆘 Need Help?

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)

Happy coding! 🎉

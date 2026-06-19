import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/messages";

/**
 * Interface representing the Global Application State.
 * Add new state properties and their setter functions here for Type Safety.
 */
interface AppState {
  /** Tracks whether the mobile menu or sidebar is currently visible */
  isMenuOpen: boolean;
  /** Tracks the font size to use (persisted) */
  fontSize: number;
  /** The active UI locale (persisted) */
  locale: Locale;
  /** Sets the menu visibility state */
  setMenuOpen: (open: boolean) => void;
  /** Toggles the current menu state (True -> False / False -> True) */
  toggleMenu: () => void;
  /** Sets the font size state */
  setFontSize: (size: number) => void;
  /** Sets the active UI locale */
  setLocale: (locale: Locale) => void;
}

/**
 * Global App Store using Zustand with Persistence.
 * * PERSISTENCE:
 * This store is wrapped in `persist` middleware, which automatically
 * syncs the state with `localStorage`.
 * * @example
 * // To access state:
 * const isMenuOpen = useAppStore((state) => state.isMenuOpen);
 * * // To access an action:
 * const setMenuOpen = useAppStore((state) => state.setMenuOpen);
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // --- INITIAL STATE ---
      isMenuOpen: false,
      fontSize: 16,
      locale: DEFAULT_LOCALE,

      // --- ACTIONS ---
      setMenuOpen: (open) => set({ isMenuOpen: open }),
      toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
      setFontSize: (size) => set({ fontSize: size }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      /** Unique name for the item in localStorage */
      name: "app-storage",
      /** Use localStorage for persistence (Standard Web API) */
      storage: createJSONStorage(() => localStorage),
      /** * OPTIONAL: Specify which fields to save.
       * If omitted, the entire store is persisted.
       * partialize: (state) => ({ fontSize: state.fontSize }),
       */
    }
  )
);

/* --- DOCUMENTATION & USAGE EXAMPLES ---

  1. PERSISTENCE & NEXT.JS HYDRATION:
     When using Next.js, localStorage is only available on the client. 
     To avoid hydration mismatches, ensure you only render persisted values 
     inside a useEffect or after a 'mounted' check:
     
     const [mounted, setMounted] = useState(false);
     useEffect(() => setMounted(true), []);
     if (!mounted) return null;
     return <div>{your-zustand-state}px</div>;

     OR use the useIsMounted hook:

     const isMounted = useIsMounted();
     if (!isMounted) return null;
     return <div>{your-zustand-state}px</div>;

  2. MANUALLY CLEARING STORAGE:
     useAppStore.persist.clearStorage();

  3. SELECTING SPECIFIC STATE (Performance Optimized):
     const isMenuOpen = useAppStore((s) => s.isMenuOpen);

  4. SELECTING MULTIPLE ACTIONS:
     const { setMenuOpen, toggleMenu } = useAppStore();

  5. UPDATING STATE OUTSIDE OF REACT:
     useAppStore.getState().setMenuOpen(false);
*/

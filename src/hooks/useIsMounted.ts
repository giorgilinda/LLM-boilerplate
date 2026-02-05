import { useState, useEffect } from "react";

/**
 * Hook to safely check if a component has mounted on the client.
 *
 * Use this to prevent hydration mismatches when accessing browser-only APIs
 * or Zustand persisted state in Next.js.
 *
 * @returns `true` after the component has mounted, `false` during SSR
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const isMounted = useIsMounted();
 *   const fontSize = useAppStore((s) => s.fontSize);
 *
 *   if (!isMounted) return null; // or a loading skeleton
 *   return <div style={{ fontSize }}>Content</div>;
 * };
 * ```
 */
export const useIsMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount detection is the purpose of this hook
    setMounted(true);
  }, []);
  return mounted;
};

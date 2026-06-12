"use client";

import React from "react";
import styles from "./error.module.css";

/**
 * Default error boundary for the root App Router segment.
 *
 * Next.js renders this component whenever an unhandled error is thrown
 * inside the root layout tree. Without this file, errors produce a blank
 * white screen with no recovery path.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 *
 * HOW TO CUSTOMISE:
 * - Update the copy to match your app's tone and branding
 * - Add error reporting (e.g. Sentry) inside the `useEffect` below
 * - Add nested `error.tsx` files in sub-segments for more granular handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // TODO: report to your error tracking service (e.g. Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <p className={styles.emoji}>⚠️</p>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          An unexpected error occurred. You can try again or come back later.
        </p>
        {error.digest && (
          <p className={styles.digest}>Error ID: {error.digest}</p>
        )}
        <button className={styles.button} onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}

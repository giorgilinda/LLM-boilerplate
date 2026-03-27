import React from "react";
import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import BaseLayout from "./templates/BaseTemplate";
import { APP_NAME, APP_DESCRIPTION, APP_EMOJI } from "@/utils/constants";
import TanStackProvider from "@/providers/TanStackProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff6b35",
};

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

/**
 * Root layout for the Next.js App Router.
 * Renders HTML shell, viewport/metadata, dynamic emoji favicon, TanStack Query provider, and BaseTemplate around all pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.90em%22 font-size=%2290%22>${encodeURIComponent(
            APP_EMOJI
          )}</text></svg>`}
        ></link>
      </head>
      <body>
        <TanStackProvider>
          <BaseLayout>{children}</BaseLayout>
        </TanStackProvider>
      </body>
    </html>
  );
}

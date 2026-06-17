import React from "react";
import RootLayout, { metadata, viewport } from "@/app/layout";
import { APP_DESCRIPTION, APP_NAME } from "@/utils/constants";

describe("app/layout", () => {
  it("creates the html shell structure with head and body", () => {
    const element = RootLayout({
      children: <div>Page content</div>,
    }) as React.ReactElement<{ lang: string; children: React.ReactNode }>;

    expect(element.type).toBe("html");
    expect(element.props.lang).toBe("en");

    const children = React.Children.toArray(element.props.children) as React.ReactElement[];
    const [head, body] = children;
    expect(head.type).toBe("head");
    expect(body.type).toBe("body");
  });

  it("exports metadata based on app constants", () => {
    expect(metadata.title).toBe(APP_NAME);
    expect(metadata.description).toBe(APP_DESCRIPTION);
    const appleWebApp = metadata.appleWebApp as Exclude<
      typeof metadata.appleWebApp,
      boolean
    >;
    expect(appleWebApp?.title).toBe(APP_NAME);
  });

  it("exports mobile-friendly viewport defaults", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
    expect(viewport.maximumScale).toBe(1);
    expect(viewport.userScalable).toBe(false);
    expect(viewport.themeColor).toBe("#ff6b35");
  });
});

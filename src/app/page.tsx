import React from "react";
import { Chat } from "@/components/Chat/Chat";

/**
 * Home route — the chat example page.
 *
 * The whole experience lives in the {@link Chat} component (rendered inside
 * BaseTemplate's <main> from the root layout), so this route stays a thin entry
 * point.
 */
export default function Home() {
  return <Chat />;
}

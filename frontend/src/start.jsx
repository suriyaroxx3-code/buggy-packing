// start.jsx — TanStack Start instance configuration
// This file is auto-detected as the '#tanstack-start-entry' virtual module.
// Setting defaultSsr: false here disables server-side rendering globally —
// the server returns a lightweight HTML shell and React boots fully in the browser.
// This is correct for this app since all data lives in localStorage (no SSR benefit).
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(async () => ({
  defaultSsr: false,
}));

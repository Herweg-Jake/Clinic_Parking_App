"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

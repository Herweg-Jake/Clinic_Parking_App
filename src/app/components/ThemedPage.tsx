"use client";

import { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

type ThemedPageProps = {
  children: ReactNode;
  variant?: "default" | "success";
};

export function ThemedPage({ children, variant = "default" }: ThemedPageProps) {
  const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-[#003366]"
    : variant === "success"
    ? "bg-gradient-to-br from-green-50 to-emerald-100"
    : "bg-gradient-to-br from-blue-50 to-indigo-100";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgClass}`}>
      <ThemeToggle />
      {children}
    </div>
  );
}

// Themed text classes
export function useThemedClasses() {
  const { isDark } = useTheme();

  return {
    isDark,
    // Text
    textPrimary: isDark ? "text-gray-100" : "text-gray-900",
    textSecondary: isDark ? "text-gray-300" : "text-gray-600",
    textMuted: isDark ? "text-gray-400" : "text-gray-500",
    // Cards/Backgrounds
    cardBg: isDark ? "bg-[#002244]" : "bg-white",
    cardBorder: isDark ? "border-gray-600" : "border-gray-300",
    // Inputs
    inputBg: isDark ? "bg-[#001a33]" : "bg-white",
    inputBorder: isDark ? "border-gray-500" : "border-gray-300",
    inputText: isDark ? "text-gray-100" : "text-gray-900",
    inputPlaceholder: isDark ? "placeholder-gray-400" : "placeholder-gray-400",
    // Buttons
    primaryBtn: isDark
      ? "bg-gray-100 text-[#003366] hover:bg-white"
      : "bg-blue-600 text-white hover:bg-blue-700",
    secondaryBtn: isDark
      ? "border-gray-300 bg-transparent text-gray-200 hover:bg-gray-100 hover:text-[#003366]"
      : "border-blue-600 bg-white text-blue-600 hover:bg-blue-50",
    // Links
    link: isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700",
    // Status colors (keep same for both themes for clarity)
    success: isDark ? "bg-green-900/30 text-green-300 border-green-600" : "bg-green-50 text-green-800 border-green-500",
    error: isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-800",
    warning: isDark ? "bg-amber-900/30 text-amber-300 border-amber-600" : "bg-amber-50 text-amber-800 border-amber-200",
    info: isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-900",
  };
}

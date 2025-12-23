"use client";

import Link from "next/link";
import { SpotAvailability } from "./components/SpotAvailability";
import { Logo } from "./components/Logo";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";

function HomeContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-[#003366]"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <ThemeToggle />
      <main className="container mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo/Branding */}
          <div className="mb-6">
            <Logo />
          </div>

          {/* Hero Section */}
          <div className="mb-8 max-w-3xl w-full">
            <h1
              className={`mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl transition-colors ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              Midtown Location Parking
            </h1>

            {/* Spot Availability */}
            <SpotAvailability />

            <p
              className={`mb-8 text-lg sm:text-xl transition-colors ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Scan the QR code at your parking spot or enter your spot number to get started.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/checkin"
                className={`rounded-lg px-8 py-4 text-lg font-semibold shadow-lg transition-all hover:shadow-xl ${
                  isDark
                    ? "bg-gray-100 text-[#003366] hover:bg-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Start Parking Session
              </Link>
              <Link
                href="/status"
                className={`rounded-lg border-2 px-8 py-4 text-lg font-semibold shadow-lg transition-all ${
                  isDark
                    ? "border-gray-300 bg-transparent text-gray-200 hover:bg-gray-100 hover:text-[#003366]"
                    : "border-blue-600 bg-white text-blue-600 hover:bg-blue-50"
                }`}
              >
                Check Status
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <HomeContent />
    </ThemeProvider>
  );
}

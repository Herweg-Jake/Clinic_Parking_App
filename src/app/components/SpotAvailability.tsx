"use client";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";

type AvailabilityData = {
  total: number;
  available: number;
  occupied: number;
};

export function SpotAvailability() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    fetch("/api/spots/availability")
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetch("/api/spots/availability")
        .then((res) => res.json())
        .then((d) => {
          if (!d.error) setData(d);
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return null;
  }

  const availabilityPercent = (data.available / data.total) * 100;

  // Colors for dark theme (navy background)
  const darkStatusColor =
    availabilityPercent > 50
      ? "text-green-400"
      : availabilityPercent > 20
      ? "text-yellow-400"
      : "text-red-400";

  // Colors for light theme
  const lightStatusColor =
    availabilityPercent > 50
      ? "text-green-600"
      : availabilityPercent > 20
      ? "text-yellow-600"
      : "text-red-600";

  const lightBgColor =
    availabilityPercent > 50
      ? "bg-green-100"
      : availabilityPercent > 20
      ? "bg-yellow-100"
      : "bg-red-100";

  const statusColor = isDark ? darkStatusColor : lightStatusColor;
  const bgColor = isDark ? "bg-white/10 backdrop-blur-sm" : lightBgColor;

  return (
    <div className={`mb-6 inline-flex items-center rounded-full ${bgColor} px-6 py-3 transition-colors`}>
      <div className="flex items-center gap-2">
        <svg
          className={`h-5 w-5 ${statusColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className={`text-lg font-semibold ${statusColor}`}>
          {data.available} of {data.total} spots available
        </span>
      </div>
    </div>
  );
}

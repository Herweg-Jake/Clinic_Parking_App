"use client";
import { useState, useEffect } from "react";

type AvailabilityData = {
  total: number;
  available: number;
  occupied: number;
};

export function SpotAvailability() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

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
  const statusColor =
    availabilityPercent > 50
      ? "text-green-600 dark:text-green-400"
      : availabilityPercent > 20
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const bgColor =
    availabilityPercent > 50
      ? "bg-green-100 dark:bg-green-900/30"
      : availabilityPercent > 20
      ? "bg-yellow-100 dark:bg-yellow-900/30"
      : "bg-red-100 dark:bg-red-900/30";

  return (
    <div className={`mb-6 inline-flex items-center rounded-full ${bgColor} px-6 py-3`}>
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

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HelpFooter } from "../../components/HelpFooter";
import { displaySpot } from "@/lib/spot";

type SessionInfo = {
  id: string;
  spotLabel: string;
  licensePlate: string;
  expiresAt: string;
  currentRateCents: number;
  isWeekend: boolean;
};

type PricingInfo = {
  rateCents: number;
  isWeekend: boolean;
};

export default function ExtendPage() {
  const params = useParams();
  const token = params.token as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session info and pricing
    Promise.all([
      fetch(`/api/session/info?token=${token}`).then((r) => r.json()),
      fetch("/api/pricing").then((r) => r.json()),
    ])
      .then(([sessionData, pricingData]) => {
        if (sessionData.error) {
          setError(sessionData.error);
        } else {
          setSession(sessionData);
          setPricing(pricingData);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session information");
        setLoading(false);
      });
  }, [token]);

  async function handleExtend() {
    setExtending(true);
    setError(null);

    try {
      const res = await fetch("/api/session/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, hours }),
      });

      const data = await res.json();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.error) {
        setError(data.error);
        setExtending(false);
      }
    } catch {
      setError("Failed to process extension request");
      setExtending(false);
    }
  }

  const hourlyRate = pricing ? pricing.rateCents / 100 : 2;
  const totalPrice = hours * hourlyRate;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto max-w-lg px-4 py-8">
          <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 text-center">
            <svg className="mx-auto h-16 w-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Link Expired or Invalid
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <Link
              href="/checkin"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
            >
              Go to Check-In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const expiresAt = session ? new Date(session.expiresAt) : null;
  const timeRemaining = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000)) : 0;
  const isExpired = timeRemaining <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Extend Your Parking
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Nevada Physical Therapy - Midtown
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          {/* Current Session Info */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Spot</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {displaySpot(session?.spotLabel)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Vehicle</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {session?.licensePlate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isExpired ? "Expired" : "Expires in"}
              </span>
              <span className={`font-semibold ${isExpired ? "text-red-600" : timeRemaining <= 10 ? "text-orange-600" : "text-green-600"}`}>
                {isExpired
                  ? "Session expired"
                  : `${timeRemaining} minute${timeRemaining !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>

          {isExpired ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your session has expired. Please check in again to continue parking.
              </p>
              <Link
                href="/checkin"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
              >
                New Check-In
              </Link>
            </div>
          ) : (
            <>
              {/* Hours Selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Add more time
                </label>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      +{h} {h === 1 ? "hour" : "hours"} - ${(h * hourlyRate).toFixed(2)}
                    </option>
                  ))}
                </select>

                <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    Total: ${totalPrice.toFixed(2)}
                    {pricing?.isWeekend && (
                      <span className="ml-2 text-xs font-normal text-orange-600 dark:text-orange-400">
                        (Weekend pricing)
                      </span>
                    )}
                  </p>
                  {expiresAt && (
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      New expiration: {new Date(expiresAt.getTime() + hours * 60 * 60 * 1000).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Extend Button */}
              <button
                onClick={handleExtend}
                disabled={extending}
                className="w-full rounded-lg bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {extending ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Extend Parking - $${totalPrice.toFixed(2)}`
                )}
              </button>
            </>
          )}
        </div>

        <HelpFooter />
      </main>
    </div>
  );
}

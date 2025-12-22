"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type SessionInfo = {
  id: string;
  spotLabel: string;
  licensePlate: string;
  expiresAt: string | null;
  status: string;
};

function StatusContent() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [sessionId, setSessionId] = useState(sessionParam || "");
  const [plate, setPlate] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupType, setLookupType] = useState<"session" | "plate" | "phone">(
    sessionParam ? "session" : "plate"
  );
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Auto-load if session ID is in URL
  useEffect(() => {
    if (sessionParam && !autoLoaded) {
      setAutoLoaded(true);
      handleLookup();
    }
  }, [sessionParam, autoLoaded]);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setSession(null);

    try {
      let url = "/api/session/lookup?";
      if (lookupType === "session") {
        url += `session=${encodeURIComponent(sessionId)}`;
      } else if (lookupType === "plate") {
        url += `plate=${encodeURIComponent(plate.toUpperCase().replace(/\s/g, ""))}`;
      } else {
        url += `phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSession(data);
      }
    } catch {
      setError("Failed to look up parking status");
    } finally {
      setLoading(false);
    }
  }

  const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
  const timeRemaining = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
    : null;
  const isExpired = timeRemaining !== null && timeRemaining <= 0;
  const isNoExpiry = session && !session.expiresAt;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block mb-4 text-blue-600 hover:text-blue-700 dark:text-blue-400">
            <svg className="inline h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Check Parking Status
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Look up your current parking session
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          {!session && (
            <>
              {/* Lookup Type Selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Look up by
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLookupType("plate")}
                    className={`rounded-lg py-2 px-4 text-sm font-medium transition-colors ${
                      lookupType === "plate"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    License Plate
                  </button>
                  <button
                    onClick={() => setLookupType("phone")}
                    className={`rounded-lg py-2 px-4 text-sm font-medium transition-colors ${
                      lookupType === "phone"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Phone Number
                  </button>
                </div>
              </div>

              {/* Input Field */}
              <div className="mb-6">
                {lookupType === "plate" ? (
                  <>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      License Plate
                    </label>
                    <input
                      type="text"
                      placeholder="ABC1234"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      maxLength={8}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </>
                ) : lookupType === "phone" ? (
                  <>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </>
                ) : null}
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleLookup}
                disabled={loading || (lookupType === "plate" ? plate.length < 2 : phone.replace(/\D/g, "").length < 10)}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Looking up...
                  </span>
                ) : (
                  "Check Status"
                )}
              </button>
            </>
          )}

          {session && (
            <>
              {/* Session Status Display */}
              <div className="text-center mb-6">
                {isNoExpiry ? (
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isExpired ? (
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                    <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                    <span className="text-2xl font-bold text-blue-600">{timeRemaining}</span>
                  </div>
                )}

                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isNoExpiry
                    ? "Active - No Time Limit"
                    : isExpired
                    ? "Session Expired"
                    : `${timeRemaining} minute${timeRemaining !== 1 ? "s" : ""} remaining`}
                </h2>
              </div>

              {/* Session Details */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Spot</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.spotLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Vehicle</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {session.licensePlate}
                  </span>
                </div>
                {expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isExpired ? "Expired at" : "Expires at"}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {expiresAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {!isNoExpiry && !isExpired && (
                  <Link
                    href="/checkin"
                    className="block w-full rounded-lg bg-green-600 px-6 py-3 text-center text-lg font-semibold text-white shadow-lg hover:bg-green-700"
                  >
                    Extend Time
                  </Link>
                )}

                {isExpired && (
                  <Link
                    href="/checkin"
                    className="block w-full rounded-lg bg-blue-600 px-6 py-3 text-center text-lg font-semibold text-white shadow-lg hover:bg-blue-700"
                  >
                    New Check-In
                  </Link>
                )}

                <button
                  onClick={() => {
                    setSession(null);
                    setError(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Look Up Another
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Need help? Contact Nevada PT front desk
        </p>
      </main>
    </div>
  );
}

function StatusLoading() {
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

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusLoading />}>
      <StatusContent />
    </Suspense>
  );
}

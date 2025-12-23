"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemedPage, useThemedClasses } from "../components/ThemedPage";

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
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, inputBg, inputBorder, inputText, primaryBtn, secondaryBtn, link, error: errorClass } = useThemedClasses();

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

  const tabActiveClass = isDark ? "bg-gray-100 text-[#003366]" : "bg-blue-600 text-white";
  const tabInactiveClass = isDark ? "bg-[#001a33] text-gray-300 hover:bg-[#002244]" : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  const detailsBg = isDark ? "bg-[#001a33]" : "bg-gray-50";

  return (
    <ThemedPage>
      <main className="container mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <Link href="/" className={`inline-block mb-4 ${link}`}>
            <svg className="inline h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className={`text-3xl font-bold ${textPrimary}`}>
            Check Parking Status
          </h1>
          <p className={`mt-2 ${textSecondary}`}>
            Look up your current parking session
          </p>
        </div>

        <div className={`rounded-2xl p-6 shadow-xl ${cardBg}`}>
          {!session && (
            <>
              {/* Lookup Type Selection */}
              <div className="mb-6">
                <label className={`mb-2 block text-sm font-medium ${textSecondary}`}>
                  Look up by
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLookupType("plate")}
                    className={`rounded-lg py-2 px-4 text-sm font-medium transition-colors ${
                      lookupType === "plate" ? tabActiveClass : tabInactiveClass
                    }`}
                  >
                    License Plate
                  </button>
                  <button
                    onClick={() => setLookupType("phone")}
                    className={`rounded-lg py-2 px-4 text-sm font-medium transition-colors ${
                      lookupType === "phone" ? tabActiveClass : tabInactiveClass
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
                    <label className={`mb-2 block text-sm font-medium ${textSecondary}`}>
                      License Plate
                    </label>
                    <input
                      type="text"
                      placeholder="ABC1234"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      maxLength={8}
                      className={`block w-full rounded-lg border px-4 py-3 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${inputBg} ${inputBorder} ${inputText}`}
                    />
                  </>
                ) : lookupType === "phone" ? (
                  <>
                    <label className={`mb-2 block text-sm font-medium ${textSecondary}`}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      className={`block w-full rounded-lg border px-4 py-3 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${inputBg} ${inputBorder} ${inputText}`}
                    />
                  </>
                ) : null}
              </div>

              {error && (
                <div className={`mb-4 rounded-lg p-3 ${errorClass}`}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLookup}
                disabled={loading || (lookupType === "plate" ? plate.length < 2 : phone.replace(/\D/g, "").length < 10)}
                className={`w-full rounded-lg px-6 py-3 text-lg font-semibold shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white ${primaryBtn}`}
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
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
                    <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isExpired ? (
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${isDark ? "bg-red-900/30" : "bg-red-100"}`}>
                    <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
                    <span className="text-2xl font-bold text-blue-600">{timeRemaining}</span>
                  </div>
                )}

                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  {isNoExpiry
                    ? "Active - No Time Limit"
                    : isExpired
                    ? "Session Expired"
                    : `${timeRemaining} minute${timeRemaining !== 1 ? "s" : ""} remaining`}
                </h2>
              </div>

              {/* Session Details */}
              <div className={`rounded-lg p-4 mb-6 ${detailsBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm ${textMuted}`}>Spot</span>
                  <span className={`text-xl font-bold ${textPrimary}`}>
                    {session.spotLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm ${textMuted}`}>Vehicle</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {session.licensePlate}
                  </span>
                </div>
                {expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${textMuted}`}>
                      {isExpired ? "Expired at" : "Expires at"}
                    </span>
                    <span className={`font-medium ${textPrimary}`}>
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
                    className={`block w-full rounded-lg px-6 py-3 text-center text-lg font-semibold shadow-lg ${isDark ? "bg-green-700 text-white hover:bg-green-600" : "bg-green-600 text-white hover:bg-green-700"}`}
                  >
                    Extend Time
                  </Link>
                )}

                {isExpired && (
                  <Link
                    href="/checkin"
                    className={`block w-full rounded-lg px-6 py-3 text-center text-lg font-semibold shadow-lg ${primaryBtn}`}
                  >
                    New Check-In
                  </Link>
                )}

                <button
                  onClick={() => {
                    setSession(null);
                    setError(null);
                  }}
                  className={`w-full rounded-lg border px-6 py-3 font-semibold ${secondaryBtn}`}
                >
                  Look Up Another
                </button>
              </div>
            </>
          )}
        </div>

        <p className={`mt-6 text-center text-sm ${textMuted}`}>
          Need help? Contact Nevada PT front desk
        </p>
      </main>
    </ThemedPage>
  );
}

function StatusLoading() {
  const { isDark, textMuted } = useThemedClasses();

  return (
    <ThemedPage>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className={`mt-4 ${textMuted}`}>Loading...</p>
        </div>
      </div>
    </ThemedPage>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusLoading />}>
      <StatusContent />
    </Suspense>
  );
}

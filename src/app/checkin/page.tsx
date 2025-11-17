"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CheckinPage() {
  const sp = useSearchParams();
  const spotLabel = sp.get("spot") || "";
  const [plate, setPlate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parkingType, setParkingType] = useState<"visitor" | "nevada_pt" | null>(null);
  const [nevadaPtCode, setNevadaPtCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkin/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: plate.trim(),
          email,
          phone,
          spotLabel,
          parkingType,
          nevadaPtCode: parkingType === "nevada_pt" ? nevadaPtCode : undefined
        }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setMsg(res.ok ? data.message : data.error || "Error");
    } catch (err) {
      setMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = plate.trim() && spotLabel && parkingType &&
    (parkingType === "visitor" || (parkingType === "nevada_pt" && nevadaPtCode.trim()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-4 text-blue-600 hover:text-blue-700 dark:text-blue-400">
            <svg className="inline h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Parking Check-In
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Nevada Physical Therapy - Midtown Location
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          {/* Spot Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Parking Spot <span className="text-red-500">*</span>
            </label>
            {spotLabel ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
                <div className="flex items-center">
                  <svg className="mr-3 h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    Spot {spotLabel}
                  </span>
                </div>
                <Link
                  href="/checkin"
                  className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                >
                  Change
                </Link>
              </div>
            ) : (
              <select
                onChange={(e) => window.location.search = `?spot=${e.target.value}`}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select your parking spot</option>
                {Array.from({ length: 20 }, (_, i) => `A${i + 1}`).map(s => (
                  <option key={s} value={s}>Spot {s}</option>
                ))}
              </select>
            )}
          </div>

          {/* License Plate */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              License Plate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ABC1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Contact Info */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email (Optional)
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Parking Type Selection */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Parking Type <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Visitor Parking */}
              <button
                type="button"
                onClick={() => {
                  setParkingType("visitor");
                  setNevadaPtCode("");
                }}
                className={`rounded-lg border-2 p-6 text-left transition-all ${
                  parkingType === "visitor"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                    : "border-gray-300 bg-white hover:border-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-blue-400"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {parkingType === "visitor" && (
                    <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                  Pay for Parking
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  $2 per hour
                </p>
              </button>

              {/* Nevada PT */}
              <button
                type="button"
                onClick={() => setParkingType("nevada_pt")}
                className={`rounded-lg border-2 p-6 text-left transition-all ${
                  parkingType === "nevada_pt"
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-500"
                    : "border-gray-300 bg-white hover:border-green-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-green-400"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {parkingType === "nevada_pt" && (
                    <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                  Here for Nevada PT
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Patients & Staff
                </p>
              </button>
            </div>
          </div>

          {/* Nevada PT Code Input */}
          {parkingType === "nevada_pt" && (
            <div className="mb-6 rounded-lg border-2 border-green-500 bg-green-50 p-4 dark:bg-green-900/20 dark:border-green-600">
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                Enter Nevada PT Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter code"
                value={nevadaPtCode}
                onChange={(e) => setNevadaPtCode(e.target.value.toUpperCase())}
                className="block w-full rounded-lg border border-green-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500 dark:border-green-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Ask front desk staff if you don't have your code
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : parkingType === "visitor" ? (
              "Continue to Payment"
            ) : (
              "Complete Check-In"
            )}
          </button>

          {/* Message Display */}
          {msg && (
            <div className={`mt-4 rounded-lg p-4 ${
              msg.includes("Error") || msg.includes("error") || msg.includes("failed") || msg.includes("Invalid")
                ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            }`}>
              <div className="flex items-center">
                {msg.includes("Error") || msg.includes("error") || msg.includes("failed") || msg.includes("Invalid") ? (
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{msg}</span>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Need help? Contact Nevada PT front desk
        </p>
      </main>
    </div>
  );
}

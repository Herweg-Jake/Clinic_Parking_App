"use client";
import { useState } from "react";
import Link from "next/link";

export default function ValidatePage() {
  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const [hours, setHours] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          plate: plate.trim(),
          hours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Validation failed" });
      } else {
        setResult({ ok: true, message: data.message });
        setPlate("");
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-md px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Validate Parking
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Partner businesses: enter your code to validate a customer&apos;s parking
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700"
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
              Business Code
            </label>
            <input
              required
              type="text"
              placeholder="e.g. ACMECAFE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-silver-300 px-4 py-2 font-mono uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
              License Plate
            </label>
            <input
              required
              type="text"
              placeholder="ABC1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-silver-300 px-4 py-2 font-mono uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
              Hours to add
            </label>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            >
              {Array.from({ length: 6 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          </div>

          {result && (
            <div
              className={`mb-4 rounded-lg p-4 ${
                result.ok
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !code || !plate}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-silver-400"
          >
            {submitting ? "Validating..." : "Validate Parking"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

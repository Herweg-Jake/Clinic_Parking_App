"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FINE_PRESETS = [2500, 5000, 7500, 10000]; // cents

export default function NewTicketPage() {
  const router = useRouter();
  const [spot, setSpot] = useState("");
  const [plate, setPlate] = useState("");
  const [amountCents, setAmountCents] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [citedBy, setCitedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const finalAmount = useCustom
      ? Math.round(parseFloat(customAmount) * 100)
      : amountCents;

    if (!finalAmount || finalAmount < 100) {
      setError("Fine amount must be at least $1.00");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot: spot.trim(),
          plate: plate.trim(),
          amountCents: finalAmount,
          notes: notes.trim() || undefined,
          citedBy: citedBy.trim() || undefined,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to create ticket");
        return;
      }

      const data = await res.json();
      router.push(`/admin/tickets/${data.ticket.id}/print`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Issue Ticket
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Create a new parking violation ticket
            </p>
          </div>
          <Link
            href="/admin/tickets"
            className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
          >
            Back
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
            {/* Spot */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
                Spot Label
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A5"
                value={spot}
                onChange={(e) => setSpot(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Plate */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
                License Plate
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ABC1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Fine Amount */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                Fine Amount
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FINE_PRESETS.map((cents) => (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => {
                      setAmountCents(cents);
                      setUseCustom(false);
                    }}
                    className={`rounded-lg px-4 py-2 font-medium transition-all ${
                      !useCustom && amountCents === cents
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-silver-100 text-gray-700 hover:bg-silver-200 dark:bg-silver-800 dark:text-gray-300"
                    }`}
                  >
                    ${(cents / 100).toFixed(0)}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    useCustom
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-silver-100 text-gray-700 hover:bg-silver-200 dark:bg-silver-800 dark:text-gray-300"
                  }`}
                >
                  Custom Amount
                </button>
                {useCustom && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-32 rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cited By */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
                Cited By (optional)
              </label>
              <input
                type="text"
                placeholder="Officer or staff name who wrote this ticket"
                value={citedBy}
                onChange={(e) => setCitedBy(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Parked in reserved spot, no permit displayed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !spot || !plate}
            className="w-full rounded-lg bg-red-600 px-6 py-3 text-lg font-bold text-white transition-all hover:bg-red-700 disabled:bg-silver-400"
          >
            {submitting ? "Issuing..." : "Issue Ticket"}
          </button>
        </form>
      </main>
    </div>
  );
}

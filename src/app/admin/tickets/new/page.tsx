"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizePlate } from "@/lib/plates";

const FINE_PRESETS = [2500, 5000, 7500, 10000]; // cents

const REASON_OPTIONS = [
  { value: "failure_to_pay", label: "Failure to Pay" },
  { value: "unauthorized_business_hours", label: "Unauthorized Parking During Business Hours" },
];

type Officer = {
  id: string;
  name: string;
  badgeNumber: string;
  isActive: boolean;
};

type PlateStatus = {
  plate: string;
  priorTicketCount: number;
  priorUnpaidCount: number;
  shouldTow: boolean;
};

export default function NewTicketPage() {
  const router = useRouter();
  const [spot, setSpot] = useState("");
  const [plate, setPlate] = useState("");
  const [amountCents, setAmountCents] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [reason, setReason] = useState("");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plateStatus, setPlateStatus] = useState<PlateStatus | null>(null);

  useEffect(() => {
    async function loadOfficers() {
      try {
        const res = await fetch("/api/admin/officers?active=true", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setOfficers(data.officers);
        }
      } catch {
        // non-fatal; officer dropdown will be empty
      }
    }
    void loadOfficers();
  }, []);

  // Look up prior ticket history for the entered plate (debounced) so staff are
  // warned to tow rather than re-ticket a vehicle with an unpaid ticket on file.
  useEffect(() => {
    const trimmed = plate.trim();
    // Clear any prior result immediately so a stale warning is never shown for a
    // plate the user has since edited (or after a failed/pending lookup).
    setPlateStatus(null);

    if (trimmed.length < 2) {
      return;
    }

    const normalized = normalizePlate(trimmed);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tickets/check-plate?plate=${encodeURIComponent(trimmed)}`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) return;
        const data: PlateStatus = await res.json();
        // Only apply results that still match the current (normalized) plate.
        if (data.plate === normalized) {
          setPlateStatus(data);
        }
      } catch {
        // non-fatal; the warning is advisory only
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [plate]);

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
          officerId: officerId || undefined,
          reason: reason || undefined,
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
                Spot Number
              </label>
              <select
                required
                value={spot}
                onChange={(e) => setSpot(e.target.value)}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select spot</option>
                {Array.from({ length: 21 }, (_, i) => i).map((n) => (
                  <option key={n} value={`A${n}`}>{n}</option>
                ))}
                <option value="N/A">N/A</option>
              </select>
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

              {/* Repeat-offender / tow warning */}
              {plateStatus?.shouldTow && (
                <div className="mt-3 rounded-lg border-2 border-red-500 bg-red-50 p-3 dark:border-red-600 dark:bg-red-900/30">
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">
                        🚩 Tow Alert — repeat offender
                      </p>
                      <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                        This vehicle has {plateStatus.priorUnpaidCount} unpaid ticket
                        {plateStatus.priorUnpaidCount === 1 ? "" : "s"} on file
                        {plateStatus.priorTicketCount > plateStatus.priorUnpaidCount &&
                          ` (${plateStatus.priorTicketCount} tickets total)`}
                        . Consider towing instead of issuing another ticket.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {plateStatus && !plateStatus.shouldTow && plateStatus.priorTicketCount > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  This vehicle has {plateStatus.priorTicketCount} prior ticket
                  {plateStatus.priorTicketCount === 1 ? "" : "s"} (all paid).
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">
                Reason for Ticket
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select reason</option>
                {REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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
              <select
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                className="w-full rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">— None —</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} (Badge #{o.badgeNumber})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only the badge number will print on the ticket.{" "}
                <Link href="/admin/officers" className="text-blue-600 hover:underline">
                  Manage officers
                </Link>
              </p>
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

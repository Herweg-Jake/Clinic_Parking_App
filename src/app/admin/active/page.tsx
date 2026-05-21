"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
} | null;

type Row = {
  id: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  source: string;
  spot: { label: string };
  vehicle: { licensePlate: string };
  payment: Payment;
};

type RevenueBucket = {
  total: number;
  today: number;
  month: number;
  transactions: number;
};

type RevenueData = {
  parking: RevenueBucket;
  tickets: RevenueBucket;
  combined: RevenueBucket;
};

export default function AdminActivePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterQ, setFilterQ] = useState("");
  const [filterSpot, setFilterSpot] = useState("");
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showRevenue, setShowRevenue] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    scanned: number;
    alreadyOk: number;
    created: number;
    skipped: number;
    errors: { checkoutId: string; error: string }[];
    createdSessions: { checkoutId: string; sessionId: string; plate: string; spotLabel: string }[];
  } | null>(null);

  const loadRevenue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/revenue", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRevenue(data);
      }
    } catch (e) {
      console.error("Failed to load revenue:", e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", tab);
      if (filterQ) params.set("q", filterQ.trim().toUpperCase());
      if (filterSpot) params.set("spot", filterSpot.trim().toUpperCase());

      const res = await fetch(`/api/admin/sessions?${params.toString()}`, {
        cache: "no-store",
      });

      // Handle non-2xx
      if (!res.ok) {
        // Redirect to login if unauthorized
        if (res.status === 401) {
          router.push("/login");
          return;
        }

        let msg = `Request failed (${res.status})`;
        try {
          const err = await res.json();
          if (err?.error) msg = err.error;
        } catch {}
        setRows([]);
        setError(msg);
        return;
      }

      const data = await res.json();

      // Ensure we only set arrays
      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
        setError("Unexpected response from server.");
      }
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [tab, filterQ, filterSpot, router]);

  useEffect(() => {
    void load();
    if (showRevenue) {
      void loadRevenue();
    }
  }, [tab, load, loadRevenue, showRevenue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void load();
      if (showRevenue) {
        void loadRevenue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, load, loadRevenue, showRevenue]);

  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Row | null>(null);
  const [refundReason, setRefundReason] = useState("");

  async function syncStripe() {
    setError(null);
    setSyncing(true);
    setSyncReport(null);
    try {
      const res = await fetch("/api/admin/reconcile-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Sync failed (${res.status})`);
        return;
      }
      setSyncReport(data);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function performRefund(row: Row) {
    setError(null);
    setRefundingId(row.id);
    try {
      const res = await fetch(`/api/admin/sessions/${row.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Refund failed (${res.status})`);
        return;
      }
      setConfirmRefund(null);
      setRefundReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundingId(null);
    }
  }

  async function extend(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/sessions/${id}/extend`, { method: "POST" });
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      try {
        const err = await res.json();
        setError(err?.error || `Extend failed (${res.status})`);
      } catch {
        setError(`Extend failed (${res.status})`);
      }
      return;
    }
    await load();
  }

  // Show loading state while checking authentication
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Manage parking sessions and view revenue
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/tickets"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Tickets
            </Link>
            <Link
              href="/admin/permits"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Manage Permits
            </Link>
            <Link
              href="/admin/businesses"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Businesses
            </Link>
            <button
              onClick={syncStripe}
              disabled={syncing}
              title="Pull recent paid Stripe checkouts and create any missing sessions"
              className="rounded-lg border-2 border-purple-300 bg-white px-4 py-2 font-medium text-purple-700 transition-all hover:border-purple-500 dark:border-purple-700 dark:bg-gray-700 dark:text-purple-300 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Stripe"}
            </button>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Revenue Stats Toggle */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowRevenue(!showRevenue);
              if (!showRevenue && !revenue) {
                loadRevenue();
              }
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {showRevenue ? 'Hide Revenue Stats' : 'Show Revenue Stats'}
            <svg className={`h-4 w-4 transition-transform ${showRevenue ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Revenue Stats */}
        {showRevenue && revenue && (
          <div className="mb-6 space-y-6">
            <RevenueSection
              title="Parking Revenue"
              subtitle="Visitor parking session payments"
              data={revenue.parking}
              accent="blue"
            />
            <RevenueSection
              title="Ticket Revenue"
              subtitle="Paid parking violation tickets"
              data={revenue.tickets}
              accent="red"
            />
            <RevenueSection
              title="Combined Revenue"
              subtitle="Parking + tickets"
              data={revenue.combined}
              accent="indigo"
              highlight
            />
          </div>
        )}

        {/* Filters Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => setTab("active")}
                className={`rounded-lg px-6 py-2 font-medium transition-all ${
                  tab === "active"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-silver-100 text-gray-700 hover:bg-silver-200 dark:bg-silver-800 dark:text-gray-300 dark:hover:bg-silver-700"
                }`}
              >
                Active Sessions
              </button>
              <button
                onClick={() => setTab("expired")}
                className={`rounded-lg px-6 py-2 font-medium transition-all ${
                  tab === "expired"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-silver-100 text-gray-700 hover:bg-silver-200 dark:bg-silver-800 dark:text-gray-300 dark:hover:bg-silver-700"
                }`}
              >
                Expired Sessions
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-silver-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-refresh (30s)
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Filter by plate (e.g., ABC)"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              className="flex-1 rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              placeholder="Filter by spot (e.g., A3)"
              value={filterSpot}
              onChange={(e) => setFilterSpot(e.target.value)}
              className="flex-1 rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700 disabled:bg-silver-400"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center text-red-800 dark:text-red-400">
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-silver-50 dark:bg-silver-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Spot</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Plate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Started</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Expires</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Payment</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-200 dark:divide-silver-700">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-silver-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.spot.label}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">{s.vehicle.licensePlate}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        s.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                        s.status === "approved_pt" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" :
                        s.status === "expired" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" :
                        "bg-silver-100 text-silver-800 dark:bg-silver-700 dark:text-silver-300"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{s.source}</td>
                    <td className="px-6 py-4 text-sm">
                      {s.payment ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ${(s.payment.amountCents / 100).toFixed(2)}
                          </div>
                          <div className={`text-xs ${
                            s.payment.status === "paid" ? "text-green-600 dark:text-green-400" :
                            s.payment.status === "refunded" ? "text-orange-600 dark:text-orange-400" :
                            "text-gray-500"
                          }`}>
                            {s.payment.status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 sm:flex-row">
                        {tab === "active" && (
                          <button
                            onClick={() => extend(s.id)}
                            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-95"
                          >
                            +15m
                          </button>
                        )}
                        {s.payment && s.payment.status === "paid" && (
                          <button
                            onClick={() => { setConfirmRefund(s); setRefundReason(""); }}
                            disabled={refundingId === s.id}
                            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-95 disabled:bg-silver-400"
                          >
                            Refund
                          </button>
                        )}
                        {tab !== "active" && !(s.payment && s.payment.status === "paid") && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && !error && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto mb-3 h-12 w-12 text-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="font-medium">No sessions found</p>
                      <p className="mt-1 text-sm">Try adjusting your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {syncReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Stripe Sync Report
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Scanned the last 7 days of Stripe checkouts.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-silver-50 p-3 dark:bg-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scanned</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{syncReport.scanned}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                  <p className="text-xs text-green-700 dark:text-green-300">Created</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{syncReport.created}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                  <p className="text-xs text-blue-700 dark:text-blue-300">Already OK</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{syncReport.alreadyOk}</p>
                </div>
                <div className="rounded-lg bg-silver-50 p-3 dark:bg-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Skipped</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{syncReport.skipped}</p>
                </div>
              </div>
              {syncReport.createdSessions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Recovered sessions:
                  </p>
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-silver-200 bg-silver-50 p-3 text-sm dark:border-silver-700 dark:bg-gray-900">
                    {syncReport.createdSessions.map((s) => (
                      <li key={s.checkoutId} className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {s.spotLabel} · {s.plate}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syncReport.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Errors ({syncReport.errors.length}):
                  </p>
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20">
                    {syncReport.errors.map((e) => (
                      <li key={e.checkoutId} className="text-red-700 dark:text-red-300">
                        {e.checkoutId}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syncReport.scanned === 0 && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  No Stripe checkouts found in the last 7 days. If you expect activity here,
                  verify <code className="font-mono">STRIPE_SECRET_KEY</code> matches the
                  account customers are paying into.
                </p>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSyncReport(null)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmRefund && confirmRefund.payment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Refund Payment?
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                This will refund <span className="font-semibold">${(confirmRefund.payment.amountCents / 100).toFixed(2)}</span> to the customer&apos;s
                card via Stripe and void the parking session for spot{" "}
                <span className="font-mono font-bold">{confirmRefund.spot.label}</span> ({confirmRefund.vehicle.licensePlate}).
                This cannot be undone from the dashboard.
              </p>
              <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason (optional, for records)
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer left early, duplicate charge"
                className="mt-1 w-full rounded-lg border border-silver-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => { setConfirmRefund(null); setRefundReason(""); }}
                  disabled={refundingId === confirmRefund.id}
                  className="rounded-lg border border-silver-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-silver-50 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performRefund(confirmRefund)}
                  disabled={refundingId === confirmRefund.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:bg-silver-400"
                >
                  {refundingId === confirmRefund.id ? "Refunding..." : "Confirm Refund"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

type Accent = "blue" | "red" | "indigo";

const ACCENT_STYLES: Record<Accent, { border: string; chip: string; chipText: string }> = {
  blue: {
    border: "border-blue-600",
    chip: "bg-blue-100 dark:bg-blue-900",
    chipText: "text-blue-700 dark:text-blue-300",
  },
  red: {
    border: "border-red-600",
    chip: "bg-red-100 dark:bg-red-900",
    chipText: "text-red-700 dark:text-red-300",
  },
  indigo: {
    border: "border-indigo-600",
    chip: "bg-indigo-100 dark:bg-indigo-900",
    chipText: "text-indigo-700 dark:text-indigo-300",
  },
};

function RevenueSection({
  title,
  subtitle,
  data,
  accent,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  data: RevenueBucket;
  accent: Accent;
  highlight?: boolean;
}) {
  const styles = ACCENT_STYLES[accent];
  const valueClass = highlight
    ? "mt-2 text-3xl font-extrabold text-gray-900 dark:text-white"
    : "mt-2 text-3xl font-bold text-gray-900 dark:text-white";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${styles.chip}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 ${styles.border}`}>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
          <p className={valueClass}>${data.total.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 ${styles.border}`}>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</p>
          <p className={valueClass}>${data.today.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 ${styles.border}`}>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
          <p className={valueClass}>${data.month.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 ${styles.border}`}>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
          <p className={valueClass}>{data.transactions}</p>
        </div>
      </div>
    </div>
  );
}

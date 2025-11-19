"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  source: string;
  spot: { label: string };
  vehicle: { licensePlate: string };
};

type RevenueData = {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  totalTransactions: number;
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
    void loadRevenue();
  }, [tab, load, loadRevenue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void load();
      void loadRevenue();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, load, loadRevenue]);

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
              href="/admin/permits"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Manage Permits
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Revenue Stats */}
        {revenue && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ${revenue.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-green-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Revenue</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ${revenue.todayRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-silver-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ${revenue.monthRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-full bg-silver-100 p-3 dark:bg-silver-800">
                  <svg className="h-6 w-6 text-silver-600 dark:text-silver-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-indigo-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {revenue.totalTransactions}
                  </p>
                </div>
                <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900">
                  <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
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
                    <td className="px-6 py-4">
                      {tab === "active" ? (
                        <button
                          onClick={() => extend(s.id)}
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-95"
                        >
                          +15m
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && !error && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
      </main>
    </div>
  );
}

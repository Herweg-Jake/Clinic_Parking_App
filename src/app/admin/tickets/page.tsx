"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displaySpot } from "@/lib/spot";

type Ticket = {
  id: string;
  code: string;
  plate: string;
  spot: string;
  amountCents: number;
  notes: string | null;
  issuedBy: string;
  citedBy: string | null;
  citedByBadge: string | null;
  reason: string | null;
  issuedAt: string;
  paidAt: string | null;
  flagged?: boolean;
};

type Stats = {
  totalIssued: number;
  totalUnpaid: number;
  totalCollectedCents: number;
  towCandidates: number;
};

export default function TicketsDashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPlate, setFilterPlate] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPlate) params.set("plate", filterPlate.trim().toUpperCase());
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/tickets/list?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to load tickets");
        return;
      }

      const data = await res.json();
      setTickets(data.tickets);
      setStats(data.stats);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [filterPlate, filterStatus, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
              Parking Tickets
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Manage parking violation tickets
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/tickets/new"
              className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-all hover:bg-red-700"
            >
              Issue New Ticket
            </Link>
            <Link
              href="/admin/officers"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Officers
            </Link>
            <Link
              href="/admin/active"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-blue-600">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Issued</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalIssued}</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-red-600">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unpaid</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUnpaid}</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-amber-500">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tow Candidates</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.towCandidates}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Repeat plates with unpaid tickets</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border-l-4 border-green-600">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Collected</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${(stats.totalCollectedCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Filter by plate (e.g., ABC)"
              value={filterPlate}
              onChange={(e) => setFilterPlate(e.target.value)}
              className="flex-1 rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "paid" | "unpaid")}
              className="rounded-lg border border-silver-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Tickets</option>
              <option value="unpaid">Unpaid Only</option>
              <option value="paid">Paid Only</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700 disabled:bg-silver-400"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-silver-50 dark:bg-silver-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ticket #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Plate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Spot</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Cited By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Issued</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-200 dark:divide-silver-700">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-silver-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{t.code}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{t.plate}</span>
                        {t.flagged && (
                          <span
                            title="Repeat offender with an unpaid ticket — tow candidate"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                          >
                            🚩 Tow
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{displaySpot(t.spot)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {t.citedByBadge
                        ? `Badge #${t.citedByBadge}`
                        : t.citedBy
                          ? t.citedBy
                          : <span className="text-silver-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(t.issuedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      ${(t.amountCents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        t.paidAt
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                      }`}>
                        {t.paidAt ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/tickets/${t.id}/print`}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
                      >
                        Print
                      </Link>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && !loading && !error && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto mb-3 h-12 w-12 text-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-medium">No tickets found</p>
                      <p className="mt-1 text-sm">Issue a ticket to get started</p>
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

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type PermitRow = {
  id: string;
  kind: "appointment" | "staff" | "long_term";
  validFrom: string;
  validTo: string;
  vehicle: { licensePlate: string; ownerEmail?: string | null; ownerPhone?: string | null };
};

export default function PermitsPage() {
  const [rows, setRows] = useState<PermitRow[]>([]);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/permits?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/permits/import", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
      await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function downloadTemplate() {
    const csv = [
      "licensePlate,kind,validFrom,validTo,email,phone",
      "TEST123,appointment,2025-01-01,2025-12-31,pt@example.com,555-1234",
      "ABC987,staff,2025-01-01,2026-01-01,,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "permits_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Permits Management
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Manage parking permits for PT patients and staff
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/active"
              className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              View Sessions
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Actions Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Import & Search
          </h2>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center justify-center rounded-lg border-2 border-blue-600 bg-white px-4 py-2 font-medium text-blue-600 transition-all hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV Template
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-all hover:bg-green-700">
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploading ? "Uploading..." : "Import CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-1 gap-3 lg:ml-auto">
              <input
                type="text"
                placeholder="Search by plate (e.g., ABC)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={load}
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>

          {/* Import Result */}
          {result && (
            <div className={`mt-4 rounded-lg p-4 ${
              result?.summary?.errors > 0
                ? "bg-yellow-50 dark:bg-yellow-900/20"
                : "bg-green-50 dark:bg-green-900/20"
            }`}>
              <div className="flex items-center">
                <svg className={`mr-2 h-5 w-5 ${
                  result?.summary?.errors > 0
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
                }`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`font-medium ${
                  result?.summary?.errors > 0
                    ? "text-yellow-800 dark:text-yellow-400"
                    : "text-green-800 dark:text-green-400"
                }`}>
                  Import completed: {result?.summary?.ok ?? 0} successful, {result?.summary?.errors ?? 0} errors, {result?.summary?.total ?? 0} total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Plate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Valid From</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Valid To</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {p.vehicle.licensePlate}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.kind === "staff" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" :
                        p.kind === "long_term" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" :
                        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      }`}>
                        {p.kind}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(p.validFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(p.validTo).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {p.vehicle.ownerEmail || "-"}
                      {p.vehicle.ownerPhone ? ` / ${p.vehicle.ownerPhone}` : ""}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto mb-3 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-medium">No permits found</p>
                      <p className="mt-1 text-sm">Import a CSV file or create permits manually</p>
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

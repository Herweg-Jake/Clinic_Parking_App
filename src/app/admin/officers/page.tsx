"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Officer = {
  id: string;
  name: string;
  badgeNumber: string;
  isActive: boolean;
  createdAt: string;
};

export default function OfficersPage() {
  const router = useRouter();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/officers", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to load officers");
        return;
      }
      const data = await res.json();
      setOfficers(data.officers);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), badgeNumber: badgeNumber.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create officer");
        return;
      }
      setName("");
      setBadgeNumber("");
      setShowForm(false);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(o: Officer) {
    try {
      const res = await fetch(`/api/admin/officers/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !o.isActive }),
      });
      if (res.ok) await load();
    } catch {
      setError("Failed to update officer");
    }
  }

  async function remove(o: Officer) {
    if (!confirm(`Delete officer ${o.name} (Badge #${o.badgeNumber})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/officers/${o.id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {
      setError("Failed to delete officer");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Officers</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Manage staff who issue tickets. Only the badge number is printed on tickets.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              {showForm ? "Cancel" : "Add Officer"}
            </button>
            <Link
              href="/admin/active"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700"
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">New Officer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name (internal)</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Badge Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 034"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 font-mono dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !name || !badgeNumber}
              className="mt-4 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-all hover:bg-green-700 disabled:bg-silver-400"
            >
              {submitting ? "Saving..." : "Create Officer"}
            </button>
          </form>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800 border border-silver-200 dark:border-silver-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-silver-50 dark:bg-silver-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Badge #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-200 dark:divide-silver-700">
                {officers.map((o) => (
                  <tr key={o.id} className="hover:bg-silver-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{o.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{o.badgeNumber}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        o.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-silver-100 text-silver-800 dark:bg-silver-700 dark:text-silver-300"
                      }`}>
                        {o.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(o)}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-700"
                        >
                          {o.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => remove(o)}
                          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {officers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="font-medium">No officers yet</p>
                      <p className="mt-1 text-sm">Add an officer so they can be selected when issuing tickets.</p>
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

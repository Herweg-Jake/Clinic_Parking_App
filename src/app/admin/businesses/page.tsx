"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  contactPhone: string | null;
  monthlyFeeCents: number;
  isActive: boolean;
  createdAt: string;
  totalValidations: number;
  monthValidations: number;
};

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/businesses", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to load businesses");
        return;
      }
      const data = await res.json();
      setBusinesses(data.businesses);
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

    const fee = parseFloat(monthlyFee);
    const monthlyFeeCents = !isNaN(fee) && fee >= 0 ? Math.round(fee * 100) : 0;

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          monthlyFeeCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create business");
        return;
      }
      setName("");
      setCode("");
      setContactEmail("");
      setContactPhone("");
      setMonthlyFee("");
      setShowForm(false);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(b: Business) {
    try {
      const res = await fetch(`/api/admin/businesses/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (res.ok) await load();
    } catch {
      setError("Failed to update business");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Partner Businesses
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Manage businesses that pay a monthly fee to validate parking
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700"
            >
              {showForm ? "Cancel" : "Add Business"}
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
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              New Partner Business
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Validation Code
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. ACMECAFE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 font-mono uppercase dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Monthly Fee (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="w-full rounded-lg border border-silver-300 px-4 py-2 dark:border-silver-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !name || !code}
              className="mt-4 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-all hover:bg-green-700 disabled:bg-silver-400"
            >
              {submitting ? "Saving..." : "Create Business"}
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Monthly Fee</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">This Month</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-200 dark:divide-silver-700">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-silver-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{b.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{b.code}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      ${(b.monthlyFeeCents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">
                      {b.monthValidations}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {b.totalValidations}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        b.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-silver-100 text-silver-800 dark:bg-silver-700 dark:text-silver-300"
                      }`}>
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(b)}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
                      >
                        {b.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {businesses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="font-medium">No partner businesses yet</p>
                      <p className="mt-1 text-sm">Add a business to start tracking validations</p>
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

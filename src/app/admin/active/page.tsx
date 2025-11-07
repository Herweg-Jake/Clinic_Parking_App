"use client";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  source: string;
  spot: { label: string };
  vehicle: { licensePlate: string };
};

export default function AdminActivePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const [filterSpot, setFilterSpot] = useState("");
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [error, setError] = useState<string | null>(null);

  async function load() {
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
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function extend(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/sessions/${id}/extend`, { method: "POST" });
    if (!res.ok) {
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

  return (
    <main style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Sessions</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <button onClick={() => setTab("active")} disabled={tab === "active"}>Active</button>
        <button onClick={() => setTab("expired")} disabled={tab === "expired"}>Expired</button>
        <input
          placeholder="Filter plate (e.g., ABC)"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          style={{ marginLeft: 12 }}
        />
        <input
          placeholder="Spot (e.g., A3)"
          value={filterSpot}
          onChange={(e) => setFilterSpot(e.target.value)}
        />
        <button onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      {error && (
        <div style={{ margin: "8px 0", color: "crimson" }}>
          {error}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Spot</th>
            <th align="left">Plate</th>
            <th align="left">Status</th>
            <th align="left">Started</th>
            <th align="left">Expires</th>
            <th align="left">Source</th>
            <th align="left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{s.spot.label}</td>
              <td>{s.vehicle.licensePlate}</td>
              <td>{s.status}</td>
              <td>{new Date(s.startedAt).toLocaleString()}</td>
              <td>{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "-"}</td>
              <td>{s.source}</td>
              <td>
                {tab === "active" ? (
                  <button onClick={() => extend(s.id)}>+15m</button>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && !loading && !error && (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: "#666" }}>
                No rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

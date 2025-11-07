"use client";
import { useEffect, useState } from "react";

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
    <main style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <h1>Permits</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <button onClick={downloadTemplate}>Download CSV template</button>
        <input type="file" accept=".csv,text/csv" onChange={onUpload} disabled={uploading} />
        <input
          placeholder="Search plate (ABC)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginLeft: "auto" }}
        />
        <button onClick={load}>Search</button>
      </div>

      {result && (
        <div style={{ margin: "8px 0", fontSize: 14 }}>
          <b>Import:</b> ok {result?.summary?.ok ?? 0}, errors {result?.summary?.errors ?? 0}, total {result?.summary?.total ?? 0}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th align="left">Plate</th>
            <th align="left">Kind</th>
            <th align="left">Valid From</th>
            <th align="left">Valid To</th>
            <th align="left">Contact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{p.vehicle.licensePlate}</td>
              <td>{p.kind}</td>
              <td>{new Date(p.validFrom).toLocaleDateString()}</td>
              <td>{new Date(p.validTo).toLocaleDateString()}</td>
              <td>
                {p.vehicle.ownerEmail || "-"}{p.vehicle.ownerPhone ? ` / ${p.vehicle.ownerPhone}` : ""}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 12, color: "#666" }}>No permits yet.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

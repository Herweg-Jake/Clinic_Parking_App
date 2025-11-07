"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CheckinPage() {
  const sp = useSearchParams();
  const spotLabel = sp.get("spot") || "";
  const [plate, setPlate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isVisitor, setIsVisitor] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    const res = await fetch("/api/checkin/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate, email, phone, spotLabel, isVisitor }),
    });
    const data = await res.json();
    if (res.ok && data.redirectUrl) {
      window.location.href = data.redirectUrl;
      return;
    }
    setMsg(res.ok ? data.message : data.error || "Error");
  }

  return (
    <main style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
      <h1>Clinic Parking</h1>
      <p>Spot: <b>{spotLabel || "Select below"}</b></p>

      {!spotLabel && (
        <select onChange={(e) => window.location.search = `?spot=${e.target.value}`}>
          <option value="">Select a spot</option>
          {Array.from({ length: 20 }, (_, i) => `A${i + 1}`).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <input placeholder="License plate" value={plate} onChange={(e)=>setPlate(e.target.value)} />
        <input placeholder="Email (optional)" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        <label>
          <input type="checkbox" checked={isVisitor} onChange={e=>setIsVisitor(e.target.checked)} /> I’m a visitor (pay)
        </label>
        <button disabled={!plate || !spotLabel} onClick={submit}>Continue</button>
      </div>

      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </main>
  );
}

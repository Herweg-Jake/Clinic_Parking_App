// app/status/page.tsx
export default function StatusPage() {
  const hasDb = !!process.env.DATABASE_URL;
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  return (
    <main style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
      <h1>Environment Status</h1>
      <ul>
        <li>DATABASE_URL: {hasDb ? "✔️ set" : "❌ missing"}</li>
        <li>STRIPE_SECRET_KEY: {hasStripe ? "✔️ set" : "❌ missing"}</li>
      </ul>
      <p>Health API: <a href="/api/health">/api/health</a></p>
    </main>
  );
}

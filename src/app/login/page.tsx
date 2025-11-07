"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main style={{ padding: 16, maxWidth: 420, margin: "0 auto" }}>
      <h1>Admin Sign In</h1>
      {!sent ? (
        <>
          <input
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", marginTop: 8 }}
          />
          <button onClick={sendMagicLink} style={{ marginTop: 8 }} disabled={!email}>
            Send magic link
          </button>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
        </>
      ) : (
        <p>Check your email for a sign-in link.</p>
      )}
    </main>
  );
}

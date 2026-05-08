"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemedPage, useThemedClasses } from "../components/ThemedPage";
import { HelpFooter } from "../components/HelpFooter";
import { displaySpot } from "@/lib/spot";

type TicketData = {
  id: string;
  code: string;
  plate: string;
  spot: string;
  amountCents: number;
  notes: string | null;
  issuedAt: string;
  paidAt: string | null;
  isPaid: boolean;
};

function PayTicketContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { isDark, textPrimary, textSecondary, cardBg, primaryBtn, secondaryBtn } = useThemedClasses();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("No ticket code provided");
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(code!)}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Ticket not found");
          return;
        }
        const data = await res.json();
        setTicket(data.ticket);
      } catch {
        setError("Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  async function handlePay() {
    if (!ticket) return;
    setPaying(true);
    try {
      const res = await fetch("/api/tickets/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ticket.code }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Payment failed");
        setPaying(false);
        return;
      }
      const data = await res.json();
      window.location.href = data.redirectUrl;
    } catch {
      setError("Network error");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <ThemedPage>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading ticket...</p>
          </div>
        </div>
      </ThemedPage>
    );
  }

  if (error && !ticket) {
    return (
      <ThemedPage>
        <main className="container mx-auto max-w-2xl px-4 py-16">
          <div className={`rounded-2xl p-8 shadow-2xl ${cardBg} text-center`}>
            <svg className="mx-auto mb-4 h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>{error}</h1>
            <p className={`mt-2 ${textSecondary}`}>
              Please check the ticket code and try again.
            </p>
            <Link href="/" className={`mt-6 inline-block rounded-lg px-6 py-3 font-semibold ${primaryBtn}`}>
              Return to Home
            </Link>
          </div>
        </main>
      </ThemedPage>
    );
  }

  if (!ticket) return null;

  // Already paid
  if (ticket.isPaid) {
    return (
      <ThemedPage variant="success">
        <main className="container mx-auto max-w-2xl px-4 py-16">
          <div className={`rounded-2xl p-8 shadow-2xl ${cardBg}`}>
            <div className="mb-6 text-center">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${isDark ? "bg-green-900/50" : "bg-green-100"}`}>
                <svg className={`h-12 w-12 ${isDark ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className={`text-3xl font-bold ${textPrimary}`}>Ticket Already Paid</h1>
              <p className={`mt-2 text-lg ${textSecondary}`}>
                Ticket {ticket.code} was paid on {new Date(ticket.paidAt!).toLocaleString()}.
              </p>
            </div>
            <div className="mt-8 text-center">
              <Link href="/" className={`inline-block rounded-lg px-6 py-3 font-semibold ${primaryBtn}`}>
                Return to Home
              </Link>
            </div>
          </div>
          <HelpFooter />
        </main>
      </ThemedPage>
    );
  }

  // Unpaid - show details and pay button
  return (
    <ThemedPage>
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <div className={`rounded-2xl p-8 shadow-2xl ${cardBg}`}>
          {/* Header */}
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isDark ? "bg-red-900/50" : "bg-red-100"}`}>
              <svg className={`h-10 w-10 ${isDark ? "text-red-400" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-red-600">PARKING VIOLATION</h1>
            <p className={`mt-1 text-3xl font-black ${textPrimary}`}>{ticket.code}</p>
          </div>

          {/* Details */}
          <div className={`rounded-lg p-6 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`font-semibold ${textSecondary}`}>Spot:</span>
                <span className={`font-bold ${textPrimary}`}>{displaySpot(ticket.spot)}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${textSecondary}`}>License Plate:</span>
                <span className={`font-mono font-bold ${textPrimary}`}>{ticket.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${textSecondary}`}>Issued:</span>
                <span className={textPrimary}>{new Date(ticket.issuedAt).toLocaleString()}</span>
              </div>
              {ticket.notes && (
                <div>
                  <span className={`font-semibold ${textSecondary}`}>Notes:</span>
                  <p className={`mt-1 ${textPrimary}`}>{ticket.notes}</p>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-3">
                <span className={`text-lg font-semibold ${textSecondary}`}>Fine Amount:</span>
                <span className="text-2xl font-black text-red-600">
                  ${(ticket.amountCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={paying}
            className="mt-6 w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-red-700 disabled:bg-gray-400"
          >
            {paying ? "Processing..." : `Pay $${(ticket.amountCents / 100).toFixed(2)} Now`}
          </button>

          <p className={`mt-4 text-center text-sm ${textSecondary}`}>
            You will be redirected to a secure payment page.
          </p>
        </div>
        <HelpFooter />
      </main>
    </ThemedPage>
  );
}

function PayTicketLoading() {
  return (
    <ThemedPage>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    </ThemedPage>
  );
}

export default function PayTicketPage() {
  return (
    <Suspense fallback={<PayTicketLoading />}>
      <PayTicketContent />
    </Suspense>
  );
}

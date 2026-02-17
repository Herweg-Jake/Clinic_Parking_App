"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemedPage, useThemedClasses } from "../components/ThemedPage";
import { HelpFooter } from "../components/HelpFooter";

type TicketData = {
  code: string;
  plate: string;
  spot: string;
  amountCents: number;
  issuedAt: string;
  paidAt: string | null;
  isPaid: boolean;
};

function TicketPaidContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { isDark, textPrimary, textSecondary, cardBg, primaryBtn, secondaryBtn } = useThemedClasses();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(code!)}`);
        if (res.ok) {
          const data = await res.json();
          setTicket(data.ticket);
        }
      } catch {
        // silently fail, still show generic success
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <ThemedPage variant="success">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading...</p>
          </div>
        </div>
      </ThemedPage>
    );
  }

  return (
    <ThemedPage variant="success">
      <main className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className={`rounded-2xl p-8 shadow-2xl ${cardBg}`}>
          {/* Success Icon */}
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${isDark ? "bg-green-900/50" : "bg-green-100"}`}>
              <svg
                className={`h-12 w-12 ${isDark ? "text-green-400" : "text-green-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className={`mb-2 text-4xl font-bold ${textPrimary}`}>
              Ticket Paid!
            </h1>

            <p className={`text-lg ${textSecondary}`}>
              Your parking violation has been resolved.
            </p>
          </div>

          {/* Ticket details */}
          {ticket && (
            <div className={`my-6 rounded-lg p-6 ${isDark ? "bg-green-900/30" : "bg-green-50"}`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={`font-semibold ${textSecondary}`}>Ticket:</span>
                  <span className={`font-bold ${textPrimary}`}>{ticket.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-semibold ${textSecondary}`}>Amount Paid:</span>
                  <span className={`font-bold ${textPrimary}`}>
                    ${(ticket.amountCents / 100).toFixed(2)}
                  </span>
                </div>
                {ticket.paidAt && (
                  <div className="flex justify-between">
                    <span className={`font-semibold ${textSecondary}`}>Paid At:</span>
                    <span className={textPrimary}>
                      {new Date(ticket.paidAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className={`font-semibold ${textSecondary}`}>Plate:</span>
                  <span className={`font-mono ${textPrimary}`}>{ticket.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-semibold ${textSecondary}`}>Spot:</span>
                  <span className={textPrimary}>{ticket.spot}</span>
                </div>
              </div>
            </div>
          )}

          {/* Receipt note */}
          <div className={`rounded-lg border-2 p-4 ${isDark ? "bg-amber-900/30 border-amber-700" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start">
              <svg className={`mr-3 mt-0.5 h-5 w-5 flex-shrink-0 ${isDark ? "text-amber-400" : "text-amber-600"}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className={`text-sm font-semibold ${isDark ? "text-amber-400" : "text-amber-800"}`}>
                  Keep This Page
                </h3>
                <p className={`mt-1 text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  Save or screenshot this page as your payment receipt.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className={`inline-block rounded-lg px-6 py-3 font-semibold shadow-md transition-all hover:shadow-lg ${secondaryBtn}`}
            >
              Return to Home
            </Link>
          </div>
        </div>

        <HelpFooter />
      </main>
    </ThemedPage>
  );
}

function TicketPaidLoading() {
  const { isDark } = useThemedClasses();
  return (
    <ThemedPage variant="success">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading...</p>
        </div>
      </div>
    </ThemedPage>
  );
}

export default function TicketPaidPage() {
  return (
    <Suspense fallback={<TicketPaidLoading />}>
      <TicketPaidContent />
    </Suspense>
  );
}

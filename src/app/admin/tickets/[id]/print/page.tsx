"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { displaySpot } from "@/lib/spot";

type Ticket = {
  id: string;
  code: string;
  plate: string;
  spot: string;
  amountCents: number;
  notes: string | null;
  issuedBy: string;
  citedBy: string | null;
  citedByBadge: string | null;
  reason: string | null;
  issuedAt: string;
  paidAt: string | null;
};

const REASON_LABELS: Record<string, string> = {
  failure_to_pay: "Failure to Pay",
  unauthorized_business_hours: "Unauthorized Parking During Business Hours",
};

export default function PrintTicketPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // First fetch ticket by ID via the list endpoint with a filter,
        // or we can use a direct fetch. We'll fetch from the list and find by ID.
        const res = await fetch("/api/tickets/list", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          setError("Failed to load ticket");
          return;
        }
        const data = await res.json();
        const found = data.tickets.find((t: Ticket) => t.id === params.id);
        if (!found) {
          setError("Ticket not found");
          return;
        }
        setTicket(found);

        // Generate QR code
        const baseUrl = window.location.origin;
        const payUrl = `${baseUrl}/pay-ticket?code=${encodeURIComponent(found.code)}`;
        const dataUrl = await QRCode.toDataURL(payUrl, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      } catch {
        setError("Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  // Auto-trigger print dialog once ticket and QR are loaded
  useEffect(() => {
    if (ticket && qrDataUrl) {
      const timeout = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timeout);
    }
  }, [ticket, qrDataUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || "Ticket not found"}</p>
          <Link href="/admin/tickets" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const payUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pay-ticket?code=${encodeURIComponent(ticket.code)}`;

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-ticket,
          #print-ticket * {
            visibility: visible;
          }
          #print-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-silver-100 dark:from-gray-900 dark:to-gray-800">
        {/* Admin controls (hidden when printing) */}
        <div className="no-print container mx-auto max-w-lg px-4 pt-8">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/admin/tickets"
              className="rounded-lg border-2 border-silver-300 bg-white px-4 py-2 font-medium text-gray-700 hover:border-blue-500 dark:border-silver-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Back to Tickets
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
            >
              Print Again
            </button>
          </div>
        </div>

        {/* Printable ticket content */}
        <div id="print-ticket" className="container mx-auto max-w-lg px-4 py-4">
          <div className="rounded-xl border-2 border-red-600 bg-white p-6 shadow-lg">
            {/* Header */}
            <div className="mb-4 border-b-2 border-red-600 pb-4 text-center">
              <h1 className="text-2xl font-black text-red-600 tracking-wide">
                PARKING VIOLATION
              </h1>
              <p className="mt-1 text-lg font-bold text-gray-900">
                Nevada PT Clinic
              </p>
              <p className="text-3xl font-black text-gray-900 mt-2">
                {ticket.code}
              </p>
            </div>

            {/* Details */}
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold text-gray-600">Date/Time:</span>
                <span className="text-gray-900">
                  {new Date(ticket.issuedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold text-gray-600">Spot:</span>
                <span className="font-bold text-gray-900">{displaySpot(ticket.spot)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold text-gray-600">License Plate:</span>
                <span className="font-mono font-bold text-gray-900">{ticket.plate}</span>
              </div>
              {ticket.reason && REASON_LABELS[ticket.reason] && (
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="font-semibold text-gray-600">Reason:</span>
                  <span className="text-right font-bold text-gray-900">
                    {REASON_LABELS[ticket.reason]}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold text-gray-600">Fine Amount:</span>
                <span className="text-xl font-black text-red-600">
                  ${(ticket.amountCents / 100).toFixed(2)}
                </span>
              </div>
              {ticket.citedByBadge && (
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="font-semibold text-gray-600">Cited By:</span>
                  <span className="font-bold text-gray-900">Badge #{ticket.citedByBadge}</span>
                </div>
              )}
              {!ticket.citedByBadge && ticket.citedBy && (
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="font-semibold text-gray-600">Cited By:</span>
                  <span className="font-bold text-gray-900">{ticket.citedBy}</span>
                </div>
              )}
              {ticket.notes && (
                <div className="border-b border-gray-200 pb-1">
                  <span className="font-semibold text-gray-600">Notes:</span>
                  <p className="mt-1 text-gray-900">{ticket.notes}</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="my-4 text-center">
              <p className="mb-2 text-sm font-semibold text-gray-600">
                Scan to pay your fine online:
              </p>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code to pay ticket"
                  className="mx-auto h-48 w-48"
                />
              )}
              <p className="mt-2 break-all text-xs text-gray-500">
                {payUrl}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-4 border-t-2 border-red-600 pt-3 text-center text-xs text-gray-500">
              <p>
                Failure to pay within 30 days will result in additional $50 late fee charge.
                Vehicles with outstanding fines will be subject to automatic tow for repeat
                violations. For disputes, you can contact parkingservices@nevpt.com.
              </p>
              <p className="mt-1">nvptparking.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

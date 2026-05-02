"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ThemedPage, useThemedClasses } from "../components/ThemedPage";
import { HelpFooter } from "../components/HelpFooter";

type PricingInfo = {
  rateCents: number;
  rateDisplay: string;
  isWeekend: boolean;
  weekdayRate: number;
  weekendRate: number;
};

function CheckinForm() {
  const sp = useSearchParams();
  const initialSpot = sp.get("spot") || "";
  const [spotLabel, setSpotLabel] = useState(initialSpot);
  const [plate, setPlate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parkingType, setParkingType] = useState<"visitor" | "nevada_pt" | null>(null);
  const [nevadaPtCode, setNevadaPtCode] = useState("");
  const [hours, setHours] = useState(1);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);

  const theme = useThemedClasses();

  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => setPricing(data))
      .catch(() => setPricing({ rateCents: 300, rateDisplay: "3", isWeekend: false, weekdayRate: 300, weekendRate: 500 }));
  }, []);

  async function submit() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkin/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: plate.trim(),
          email: parkingType === "visitor" ? email : "",
          phone: parkingType === "visitor" ? phone : "",
          spotLabel,
          parkingType,
          nevadaPtCode: parkingType === "nevada_pt" ? nevadaPtCode : undefined,
          hours: parkingType === "visitor" ? hours : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setMsg(res.ok ? data.message : data.error || "Error");
    } catch (err) {
      setMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const phoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = phoneDigits.length >= 10;
  const canSubmit = plate.trim().length >= 2 && spotLabel && parkingType &&
    (parkingType === "visitor" ? isPhoneValid : (parkingType === "nevada_pt" && nevadaPtCode.trim()));
  const hourlyRate = pricing ? pricing.rateCents / 100 : 3;
  const totalPrice = hours * hourlyRate;

  const validatePlate = (value: string) => value.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const validatePhone = (value: string) => value.replace(/[^0-9\-\(\)\s]/g, '').slice(0, 20);
  const validateCode = (value: string) => value.replace(/[^A-Z0-9]/g, '').slice(0, 20);

  return (
    <ThemedPage>
      <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <Link href="/" className={`inline-block mb-4 ${theme.link}`}>
            <svg className="inline h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className={`text-4xl font-bold ${theme.textPrimary}`}>Parking Check-In</h1>
          <p className={`mt-2 ${theme.textSecondary}`}>Nevada Physical Therapy - Midtown Location</p>
        </div>

        <div className={`rounded-2xl p-8 shadow-xl ${theme.cardBg}`}>
          <div className="mb-8">
            <label className={`mb-3 block text-lg font-semibold ${theme.textPrimary}`}>
              Are you a patient or paying for parking? <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setParkingType("visitor"); setNevadaPtCode(""); }}
                className={`rounded-lg border-2 p-6 text-left transition-all ${
                  parkingType === "visitor" ? "border-blue-500 bg-blue-500/10" : `${theme.cardBorder} ${theme.cardBg} hover:border-blue-400`
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {parkingType === "visitor" && <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                </div>
                <h3 className={`mb-1 text-lg font-semibold ${theme.textPrimary}`}>Pay for Parking</h3>
                <p className={theme.textSecondary}>${hourlyRate} per hour{pricing?.isWeekend && <span className="ml-2 inline-block rounded bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-500">Weekend Rate</span>}</p>
              </button>

              <button
                type="button"
                onClick={() => setParkingType("nevada_pt")}
                className={`rounded-lg border-2 p-6 text-left transition-all ${
                  parkingType === "nevada_pt" ? "border-green-500 bg-green-500/10" : `${theme.cardBorder} ${theme.cardBg} hover:border-green-400`
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {parkingType === "nevada_pt" && <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                </div>
                <h3 className={`mb-1 text-lg font-semibold ${theme.textPrimary}`}>Nevada PT Patient</h3>
                <p className={theme.textSecondary}>Patients & Staff</p>
              </button>
            </div>
          </div>

          {parkingType && (
            <>
              <div className="mb-6">
                <label className={`mb-2 block text-sm font-medium ${theme.textSecondary}`}>Parking Spot <span className="text-red-500">*</span></label>
                {spotLabel ? (
                  <div className={`flex items-center justify-between rounded-lg border-2 p-4 ${theme.success}`}>
                    <div className="flex items-center">
                      <svg className="mr-3 h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className={`text-2xl font-bold ${theme.textPrimary}`}>Spot {spotLabel}</span>
                    </div>
                    <button type="button" onClick={() => setSpotLabel("")} className={theme.link}>Change</button>
                  </div>
                ) : (
                  <select value="" onChange={(e) => setSpotLabel(e.target.value)} className={`block w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText}`}>
                    <option value="">Select your parking spot</option>
                    {Array.from({ length: 21 }, (_, i) => `A${i}`).map(s => <option key={s} value={s}>Spot {s}</option>)}
                  </select>
                )}
              </div>

              <div className="mb-6">
                <label className={`mb-2 block text-sm font-medium ${theme.textSecondary}`}>License Plate <span className="text-red-500">*</span></label>
                <input type="text" placeholder="ABC1234" value={plate} onChange={(e) => setPlate(validatePlate(e.target.value.toUpperCase()))} maxLength={8} className={`block w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText} ${theme.inputPlaceholder}`} />
                {plate.length > 0 && plate.length < 2 && <p className="mt-1 text-xs text-red-500">License plate must be at least 2 characters</p>}
                <p className={`mt-1 text-xs ${theme.textMuted}`}>2-8 alphanumeric characters</p>
              </div>

              {parkingType === "nevada_pt" && (
                <div className={`mb-6 rounded-lg border-2 p-4 ${theme.success}`}>
                  <label className={`mb-2 block text-sm font-medium ${theme.textPrimary}`}>Enter Nevada PT Code <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Enter code" value={nevadaPtCode} onChange={(e) => setNevadaPtCode(validateCode(e.target.value.toUpperCase()))} maxLength={20} className={`block w-full rounded-lg border border-green-400 px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-500 ${theme.inputBg} ${theme.inputText}`} />
                  <p className={`mt-2 text-xs ${theme.textMuted}`}>Ask front desk staff if you don't have your code</p>
                </div>
              )}

              {parkingType === "visitor" && (
                <>
                  <div className="mb-6">
                    <label className={`mb-2 block text-sm font-medium ${theme.textSecondary}`}>Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(validatePhone(e.target.value))} maxLength={20} className={`block w-full rounded-lg border px-4 py-3 focus:ring-2 ${theme.inputBg} ${theme.inputText} ${theme.inputPlaceholder} ${phone && !isPhoneValid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : `${theme.inputBorder} focus:border-blue-500 focus:ring-blue-500`}`} />
                    {phone && !isPhoneValid && <p className="mt-1 text-xs text-red-500">Please enter a valid 10-digit phone number</p>}
                    <p className={`mt-2 text-xs leading-relaxed ${theme.textMuted}`}>
                      By entering your phone number, you agree to receive SMS notifications from Nevada Physical Therapy Parking, including parking confirmations, expiration warnings, and extension links. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe. See our{" "}
                      <Link href="/terms" className={theme.link}>Terms &amp; Conditions</Link>.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className={`mb-2 block text-sm font-medium ${theme.textSecondary}`}>Email (Optional)</label>
                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value.trim())} maxLength={100} className={`block w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText} ${theme.inputPlaceholder}`} />
                  </div>

                  <div className="mb-6">
                    <label className={`mb-2 block text-sm font-medium ${theme.textSecondary}`}>How many hours? <span className="text-red-500">*</span></label>
                    <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`block w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText}`}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'} - ${(h * hourlyRate).toFixed(2)}</option>)}
                    </select>
                    <div className={`mt-3 rounded-lg p-3 ${theme.info}`}>
                      <p className="text-sm font-semibold">Total: ${totalPrice.toFixed(2)}{pricing?.isWeekend && <span className="ml-2 text-xs font-normal text-orange-500">(Weekend pricing)</span>}</p>
                    </div>
                  </div>
                </>
              )}

              <button onClick={submit} disabled={!canSubmit || loading} className={`w-full rounded-lg px-6 py-4 text-lg font-semibold shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-gray-400 ${theme.primaryBtn}`}>
                {loading ? <span className="flex items-center justify-center"><svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</span> : parkingType === "visitor" ? `Continue to Payment - $${totalPrice.toFixed(2)}` : "Complete Check-In"}
              </button>

              {msg && (
                <div className={`mt-4 rounded-lg p-4 ${msg.includes("Error") || msg.includes("error") || msg.includes("failed") || msg.includes("Invalid") ? theme.error : theme.success}`}>
                  <div className="flex items-center"><span className="font-medium">{msg}</span></div>
                </div>
              )}
            </>
          )}

          {!parkingType && <div className={`text-center py-8 ${theme.textMuted}`}>Please select whether you're paying for parking or a Nevada PT patient to continue</div>}
        </div>

        <HelpFooter />
      </main>
    </ThemedPage>
  );
}

function CheckinLoading() {
  const theme = useThemedClasses();
  return (
    <ThemedPage>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className={`mt-4 ${theme.textMuted}`}>Loading...</p>
        </div>
      </div>
    </ThemedPage>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<CheckinLoading />}>
      <CheckinForm />
    </Suspense>
  );
}

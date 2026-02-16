"use client";

import Link from "next/link";
import { ThemedPage, useThemedClasses } from "../components/ThemedPage";
import { HelpFooter } from "../components/HelpFooter";

export default function TermsPage() {
  const theme = useThemedClasses();

  const sectionTitle = `text-xl font-bold mt-8 mb-3 ${theme.textPrimary}`;
  const paragraph = `mb-3 text-sm leading-relaxed ${theme.textSecondary}`;
  const list = `mb-3 list-disc pl-6 text-sm leading-relaxed ${theme.textSecondary}`;

  return (
    <ThemedPage>
      <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className={`inline-flex items-center ${theme.link}`}>
            <svg className="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className={`rounded-2xl p-8 shadow-xl ${theme.cardBg}`}>
          <h1 className={`text-3xl font-bold mb-2 ${theme.textPrimary}`}>
            Terms &amp; Conditions
          </h1>
          <p className={`text-sm mb-6 ${theme.textMuted}`}>
            Last updated: February 2026
          </p>

          <p className={paragraph}>
            Welcome to Nevada Physical Therapy Parking ("we," "us," or "our"). By using our parking
            management system at the Midtown location, you agree to the following terms and conditions.
            Please read them carefully before using our services.
          </p>

          {/* Service Overview */}
          <h2 className={sectionTitle}>1. Service Overview</h2>
          <p className={paragraph}>
            We provide a digital parking management system for the Nevada Physical Therapy Midtown
            location. Our service allows visitors to check in to a parking spot, pay for parking
            time, receive SMS notifications, and extend parking sessions. Patients and staff of
            Nevada Physical Therapy may use the system with a valid clinic code at no charge.
          </p>

          {/* Data Collection & Storage */}
          <h2 id="privacy" className={sectionTitle}>2. Data Collection &amp; Privacy</h2>
          <p className={paragraph}>
            To provide our parking services, we collect and securely store the following information:
          </p>
          <ul className={list}>
            <li><strong>License plate number</strong> &mdash; used to identify your vehicle and manage your parking session.</li>
            <li><strong>Phone number</strong> &mdash; used to send SMS parking confirmations, expiration warnings, and extension links.</li>
            <li><strong>Email address</strong> (optional) &mdash; collected if provided, used for communication related to your parking session.</li>
          </ul>
          <p className={paragraph}>
            All personal data is stored securely using industry-standard encryption and access
            controls. We do not sell, share, or distribute your personal information to third
            parties except as necessary to provide our services (e.g., sending SMS via our
            messaging provider).
          </p>

          {/* Payment Information */}
          <h2 className={sectionTitle}>3. Payment Information</h2>
          <p className={paragraph}>
            <strong>We do not store your payment card information.</strong> All payment processing is
            handled securely by <strong>Stripe</strong>, a PCI-DSS Level 1 certified third-party
            payment processor. When you make a payment, you are redirected to Stripe's secure
            checkout page. Your card details are transmitted directly to Stripe and are never sent to
            or stored on our servers. We only store a reference to the transaction for record-keeping
            purposes (transaction ID, amount, and payment status).
          </p>

          {/* SMS Communications */}
          <h2 className={sectionTitle}>4. SMS Communications</h2>
          <p className={paragraph}>
            By providing your phone number during check-in, you consent to receive SMS text messages
            from Nevada Physical Therapy Parking. These messages include:
          </p>
          <ul className={list}>
            <li>Parking session confirmation</li>
            <li>Expiration warning notifications (sent before your session expires)</li>
            <li>Links to extend your parking session</li>
            <li>Replies to STATUS or EXTEND commands you send</li>
          </ul>
          <p className={paragraph}>
            Message frequency varies based on your parking activity. Message and data rates may
            apply. You can opt out of SMS notifications at any time by replying <strong>STOP</strong> to
            any message. Reply <strong>HELP</strong> for assistance.
          </p>

          {/* Refund Policy */}
          <h2 className={sectionTitle}>5. Refund Policy</h2>
          <p className={paragraph}>
            If you believe you were charged in error or need a refund for any reason, you may
            request one by contacting us at{" "}
            <a href="mailto:nvptparking@gmail.com" className={theme.link}>
              nvptparking@gmail.com
            </a>.
            Please include your license plate number and approximate date and time of your parking
            session so we can locate your transaction.
          </p>
          <p className={paragraph}>
            Refund requests are reviewed on a case-by-case basis. Approved refunds will be
            processed back to the original payment method through Stripe. Please allow 5&ndash;10
            business days for the refund to appear on your statement after approval.
          </p>

          {/* Parking Rules */}
          <h2 className={sectionTitle}>6. Parking Rules</h2>
          <ul className={list}>
            <li>You must park only in the spot you selected during check-in.</li>
            <li>Your vehicle's license plate must be visible and match the plate entered during check-in.</li>
            <li>Parking sessions have a defined duration based on the hours purchased. You are responsible for extending or vacating before your session expires.</li>
            <li>Vehicles parked beyond their session time or without a valid session may be subject to towing at the owner's expense.</li>
          </ul>

          {/* Limitation of Liability */}
          <h2 className={sectionTitle}>7. Limitation of Liability</h2>
          <p className={paragraph}>
            Nevada Physical Therapy Parking provides this service on an "as is" basis. While we
            strive to ensure reliable operation, we are not responsible for:
          </p>
          <ul className={list}>
            <li>Vehicle damage, theft, or loss while parked in the lot.</li>
            <li>Service interruptions due to technical issues, network outages, or maintenance.</li>
            <li>Failure to receive SMS notifications due to carrier issues, phone settings, or incorrect phone numbers.</li>
          </ul>
          <p className={paragraph}>
            Our total liability for any claim arising from use of the parking service shall not
            exceed the amount you paid for your parking session.
          </p>

          {/* Changes to Terms */}
          <h2 className={sectionTitle}>8. Changes to These Terms</h2>
          <p className={paragraph}>
            We may update these terms from time to time. Continued use of our parking system after
            changes are posted constitutes acceptance of the updated terms. We encourage you to
            review this page periodically.
          </p>

          {/* Contact */}
          <h2 className={sectionTitle}>9. Contact Us</h2>
          <p className={paragraph}>
            If you have questions, concerns, or requests regarding these terms, your data, or our
            parking services, please contact us:
          </p>
          <p className={paragraph}>
            <strong>Email:</strong>{" "}
            <a href="mailto:nvptparking@gmail.com" className={theme.link}>
              nvptparking@gmail.com
            </a>
          </p>
          <p className={paragraph}>
            <strong>Location:</strong> Nevada Physical Therapy &mdash; Midtown, Reno, NV
          </p>
        </div>

        <HelpFooter />
      </main>
    </ThemedPage>
  );
}

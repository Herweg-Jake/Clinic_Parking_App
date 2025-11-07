"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Success Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800">
          {/* Success Icon */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg
                className="h-12 w-12 text-green-600 dark:text-green-400"
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

            <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
              Payment Confirmed!
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-300">
              Your parking session is now active
            </p>
          </div>

          {/* Info Section */}
          <div className="my-8 space-y-4 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
            <div className="flex items-start">
              <svg className="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  What's next?
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Your parking session will be processed shortly
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    You'll receive a confirmation email if you provided one
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Session duration is typically 2 hours (check with clinic)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-start">
              <svg className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                  Important
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Please ensure your vehicle's license plate is visible and matches the one you entered during check-in.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/"
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              Return to Home
            </Link>

            <Link
              href="/checkin"
              className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 shadow-md transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              New Session
            </Link>
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Questions about your parking session?
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Contact the clinic front desk: (555) 123-4567
          </p>
        </div>
      </main>
    </div>
  );
}

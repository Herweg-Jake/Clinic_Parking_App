"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const isExtension = searchParams.get("extended") === "true";

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
              {isExtension ? "Time Extended!" : "Payment Confirmed!"}
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-300">
              {isExtension
                ? "Your parking time has been extended"
                : "Your parking session is now active"}
            </p>
          </div>

          {/* SMS Notifications Info */}
          <div className="my-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-start">
              <svg className="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  SMS Notifications Active
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-400">
                  <li>You'll receive a confirmation text shortly</li>
                  <li>We'll text you 10 minutes before expiration</li>
                  <li>Reply <strong>STATUS</strong> to check your time</li>
                  <li>Reply <strong>EXTEND</strong> to add more time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="my-6 space-y-4 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
            <div className="flex items-start">
              <svg className="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {isExtension ? "Extension Complete" : "What's next?"}
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {isExtension ? (
                    <>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Your new expiration time is active now
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Check your status anytime using the link below
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Your parking session is now active
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Park in the spot you selected during check-in
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Your parking duration is based on the hours you purchased
                      </li>
                    </>
                  )}
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
              href="/status"
              className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-center font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
            >
              Check Status
            </Link>

            <Link
              href="/"
              className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 shadow-md transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Return to Home
            </Link>
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Questions about your parking session?
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Contact the clinic front desk
          </p>
        </div>
      </main>
    </div>
  );
}

function SuccessLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessContent />
    </Suspense>
  );
}

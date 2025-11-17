import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Hero Section */}
          <div className="mb-12 max-w-3xl">
            <div className="mb-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-white shadow-lg">
              <svg className="inline-block h-8 w-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-xl font-bold">PT Clinic Parking</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Nevada Physical Therapy
            </h1>
            <h2 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Midtown Location Parking
            </h2>

            <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">
              Scan the QR code at your parking spot or enter your spot number to get started. Just $2/hour for visitors.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/checkin"
                className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
              >
                Start Parking Session
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
              <div className="mb-4 inline-block rounded-full bg-green-100 p-3 dark:bg-green-900">
                <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                PT Patients & Staff
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Use your Nevada PT code for complimentary parking during your visit.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                $2 Per Hour
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Affordable visitor parking with secure credit card payment processing.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
              <div className="mb-4 inline-block rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                QR Code Check-In
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Scan the QR code at your spot for instant check-in, or enter your spot number manually.
              </p>
            </div>
          </div>

          {/* Admin Link */}
          <div className="mt-16">
            <Link
              href="/admin/active"
              className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

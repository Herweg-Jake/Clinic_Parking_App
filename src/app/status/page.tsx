import Link from "next/link";

export default function StatusPage() {
  const hasDb = !!process.env.DATABASE_URL;
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  const allGood = hasDb && hasStripe;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400">
            <svg className="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
              System Status
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Environment configuration and health check
            </p>
          </div>

          {/* Overall Status */}
          <div className={`mb-6 rounded-lg p-4 ${
            allGood
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          }`}>
            <div className="flex items-center">
              {allGood ? (
                <>
                  <svg className="mr-3 h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-xl font-bold text-green-800 dark:text-green-400">
                      All Systems Operational
                    </h2>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      All required services are configured correctly
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg className="mr-3 h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-xl font-bold text-red-800 dark:text-red-400">
                      Configuration Issues Detected
                    </h2>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Some required environment variables are missing
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Environment Configuration
            </h3>

            <div className={`flex items-center justify-between rounded-lg p-4 ${
              hasDb
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}>
              <div className="flex items-center">
                <svg className={`mr-3 h-6 w-6 ${
                  hasDb
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">
                  DATABASE_URL
                </span>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                hasDb
                  ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                  : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
              }`}>
                {hasDb ? "Configured" : "Missing"}
              </span>
            </div>

            <div className={`flex items-center justify-between rounded-lg p-4 ${
              hasStripe
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}>
              <div className="flex items-center">
                <svg className={`mr-3 h-6 w-6 ${
                  hasStripe
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">
                  STRIPE_SECRET_KEY
                </span>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                hasStripe
                  ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                  : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
              }`}>
                {hasStripe ? "Configured" : "Missing"}
              </span>
            </div>
          </div>

          {/* Health API Link */}
          <div className="mt-6 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              API Health Check
            </h3>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              Test the API health endpoint:
            </p>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              /api/health
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

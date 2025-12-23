import Link from "next/link";
import { SpotAvailability } from "./components/SpotAvailability";
import { Logo } from "./components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo/Branding */}
          <div className="mb-6">
            <Logo />
          </div>

          {/* Hero Section */}
          <div className="mb-8 max-w-3xl w-full">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              Midtown Location Parking
            </h1>

            {/* Spot Availability */}
            <SpotAvailability />

            <p className="mb-8 text-lg text-gray-600 sm:text-xl">
              Scan the QR code at your parking spot or enter your spot number to get started.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/checkin"
                className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
              >
                Start Parking Session
              </Link>
              <Link
                href="/status"
                className="rounded-lg border-2 border-blue-600 bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition-all hover:bg-blue-50"
              >
                Check Status
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

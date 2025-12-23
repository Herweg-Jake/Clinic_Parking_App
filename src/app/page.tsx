import Link from "next/link";
import { SpotAvailability } from "./components/SpotAvailability";
import { Logo } from "./components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#003366]">
      <main className="container mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo/Branding */}
          <div className="mb-6">
            <Logo />
          </div>

          {/* Hero Section */}
          <div className="mb-8 max-w-3xl w-full">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-200 sm:text-4xl md:text-5xl">
              Midtown Location Parking
            </h1>

            {/* Spot Availability */}
            <SpotAvailability />

            <p className="mb-8 text-lg text-gray-300 sm:text-xl">
              Scan the QR code at your parking spot or enter your spot number to get started.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/checkin"
                className="rounded-lg bg-gray-100 px-8 py-4 text-lg font-semibold text-[#003366] shadow-lg transition-all hover:bg-white hover:shadow-xl"
              >
                Start Parking Session
              </Link>
              <Link
                href="/status"
                className="rounded-lg border-2 border-gray-300 bg-transparent px-8 py-4 text-lg font-semibold text-gray-200 shadow-lg transition-all hover:bg-gray-100 hover:text-[#003366]"
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

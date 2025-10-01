import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import ApplicationPageClient from "./ApplicationPageClient";
import ApplicationClosedMessage from "./ApplicationClosedMessage";

interface PageProps {
  searchParams: Promise<{ latePass?: string }>;
}

export default async function FundingCommonsResidencyApplicationPage({
  searchParams,
}: PageProps) {
  // Check for late pass parameter
  const resolvedSearchParams = await searchParams;
  const hasLatePass = !!resolvedSearchParams.latePass;

  // If no late pass, show closed message
  if (!hasLatePass) {
    return (
      <div>
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 px-4 py-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-0 sm:space-x-3">
                <div className="hidden sm:flex bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-900 font-semibold">FtC RealFi Residency • Buenos Aires 2025</p>
                  <p className="text-blue-700 text-sm">Building real-world blockchain applications for everyday Argentinians</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link 
                  href="/events/funding-commons-residency-2025"
                  className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
                >
                  ← Back to Overview
                </Link>
                <Link 
                  href="/events/funding-commons-residency-2025/about"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center"
                >
                  Residency Focus
                </Link>
                <Link 
                  href="/events/funding-commons-residency-2025/faq"
                  className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
                >
                  View FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
        <ApplicationClosedMessage />
      </div>
    );
  }

  // Check authentication but don't redirect
  const session = await auth();

  // Fetch event details for the specific residency
  const event = await db.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
    include: {
      applications: session?.user
        ? {
            where: { userId: session.user.id },
            include: {
              responses: {
                include: {
                  question: true,
                },
              },
            },
          }
        : false, // Don't fetch applications if not authenticated
    },
  });

  if (!event) {
    // If specific event doesn't exist, fallback to the generic dynamic route
    redirect("/events/funding-commons-residency-2025");
  }

  // Check if user has an existing application (only if authenticated)  
  const userApplication = session?.user && Array.isArray(event.applications) 
    ? (event.applications[0] ?? null) 
    : null;

  // Create a properly typed event for ApplicationPageClient
  const typedEvent = {
    ...event,
    applications: Array.isArray(event.applications) ? event.applications : []
  };

  return (
    <div>
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 px-4 py-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-0 sm:space-x-3">
              <div className="hidden sm:flex bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-blue-900 font-semibold">FtC RealFi Residency • Buenos Aires 2025</p>
                <p className="text-blue-700 text-sm">Building real-world blockchain applications for everyday Argentinians</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link 
                href="/events/funding-commons-residency-2025"
                className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
              >
                ← Back to Overview
              </Link>
              <Link 
                href="/events/funding-commons-residency-2025/about"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center"
              >
                Residency Focus
              </Link>
              <Link 
                href="/events/funding-commons-residency-2025/faq"
                className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ApplicationPageClient 
        event={typedEvent} 
        initialUserApplication={userApplication}
        initialUserId={session?.user?.id}
      />
    </div>
  );
}
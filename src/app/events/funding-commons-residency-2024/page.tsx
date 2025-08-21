import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import EventDetailClient from "../[eventId]/EventDetailClient";
import Link from "next/link";

export default async function FundingCommonsResidencyPage() {
  // Check authentication
  const session = await auth();
  
  // Must be authenticated to view event details
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=/events/funding-commons-residency-2024`);
  }

  // Fetch event details for the specific residency
  const event = await db.event.findUnique({
    where: { id: "funding-commons-residency-2024" },
    include: {
      applications: {
        where: { userId: session.user.id },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    // If specific event doesn't exist, fallback to the generic dynamic route
    redirect("/events/funding-commons-residency-2024");
  }

  // Check if user has an existing application
  const userApplication = event.applications[0] ?? null;

  return (
    <div>
      {/* FAQ Link Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-800 font-medium">Have questions about the application process?</span>
            </div>
            <Link 
              href="/events/funding-commons-residency-2024/faq"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>

      <EventDetailClient 
        event={event} 
        userApplication={userApplication}
        userId={session.user.id}
      />
    </div>
  );
}
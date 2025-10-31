import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import ResidentProfilesClient from "./ResidentProfilesClient";

interface ResidentProfilesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ResidentProfilesPage({ params }: ResidentProfilesPageProps) {
  // Await params in Next.js 15
  const { eventId } = await params;

  // Check authentication and admin access
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/profiles`);
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Fetch event details to ensure it exists
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!event) {
    notFound();
  }

  return <ResidentProfilesClient event={event} />;
}

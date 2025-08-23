import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import EventDetailClient from "./EventDetailClient";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  // Await params in Next.js 15
  const { eventId } = await params;
  
  // Check authentication
  const session = await auth();
  
  // Must be authenticated to view event details
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/events/${eventId}`);
  }

  // Fetch event details
  const event = await db.event.findUnique({
    where: { id: eventId },
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
    notFound();
  }

  // Check if user has an existing application
  const userApplication = event.applications[0] ?? null;

  return (
    <EventDetailClient 
      event={event} 
      userApplication={userApplication}
      userId={session.user.id}
    />
  );
}
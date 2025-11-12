import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import UpdatesFeedClient from "./UpdatesFeedClient";

interface UpdatesPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata({ params }: UpdatesPageProps) {
  const resolvedParams = await params;
  return {
    title: `Project Updates - ${resolvedParams.eventId}`,
    description: "View all project updates from event participants",
  };
}

export default async function UpdatesPage({ params }: UpdatesPageProps) {
  const resolvedParams = await params;

  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect(`/events/${resolvedParams.eventId}`);
  }

  return <UpdatesFeedClient eventId={resolvedParams.eventId} />;
}

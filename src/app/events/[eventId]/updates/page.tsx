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
  return <UpdatesFeedClient eventId={resolvedParams.eventId} />;
}

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { HyperboardClient } from "./HyperboardClient";

interface HyperboardPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata({ params }: HyperboardPageProps) {
  const resolvedParams = await params;
  return {
    title: `Hyperboard - ${resolvedParams.eventId}`,
    description: "Visualize event sponsors and their impact",
  };
}

export default async function HyperboardPage({ params }: HyperboardPageProps) {
  const resolvedParams = await params;

  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect(`/events/${resolvedParams.eventId}`);
  }

  return <HyperboardClient eventId={resolvedParams.eventId} />;
}

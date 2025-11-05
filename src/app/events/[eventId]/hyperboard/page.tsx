import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { HyperboardClient } from "./HyperboardClient";

// Force dynamic rendering to avoid static generation for all events
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface HyperboardPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export const metadata = {
  title: "Hyperboard",
  description: "Visualize event sponsors and their impact",
};

export default async function HyperboardPage({ params }: HyperboardPageProps) {
  const resolvedParams = await params;

  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect(`/events/${resolvedParams.eventId}`);
  }

  return <HyperboardClient eventId={resolvedParams.eventId} />;
}

import { db } from "~/server/db";
import EventSubNavigation from "~/app/_components/EventSubNavigation";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { eventId } = await params;

  const featureFlagSelect = {
    featureAsksOffers: true,
    featureProjects: true,
    featureNewsfeed: true,
    featureImpactAnalytics: true,
  } as const;

  let event = await db.event.findUnique({
    where: { id: eventId },
    select: featureFlagSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: featureFlagSelect,
  });

  return (
    <>
      <EventSubNavigation eventId={eventId} featureFlags={event ?? undefined} />
      {children}
    </>
  );
}

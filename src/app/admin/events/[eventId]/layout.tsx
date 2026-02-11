import { db } from "~/server/db";
import AdminEventSubNavigation from "~/app/admin/events/AdminEventSubNavigation";

interface AdminEventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventLayout({ children, params }: AdminEventLayoutProps) {
  const { eventId } = await params;

  const featureFlagSelect = {
    featureAsksOffers: true,
    featureProjects: true,
    featureNewsfeed: true,
    featurePraise: true,
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
      <AdminEventSubNavigation eventId={eventId} featureFlags={event ?? undefined} />
      {children}
    </>
  );
}

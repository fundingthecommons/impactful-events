import EventSubNavigation from "~/app/_components/EventSubNavigation";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { eventId } = await params;

  return (
    <>
      <EventSubNavigation eventId={eventId} />
      {children}
    </>
  );
}

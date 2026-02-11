import AdminEventSubNavigation from "~/app/admin/events/AdminEventSubNavigation";

interface AdminEventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventLayout({ children, params }: AdminEventLayoutProps) {
  const { eventId } = await params;

  return (
    <>
      <AdminEventSubNavigation eventId={eventId} />
      {children}
    </>
  );
}

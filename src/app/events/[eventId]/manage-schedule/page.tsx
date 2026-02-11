import type { Metadata } from "next";
import ManageScheduleClient from "./ManageScheduleClient";

export const metadata: Metadata = {
  title: "Manage Schedule",
  description: "Manage your floor schedule",
};

interface ManageSchedulePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ManageSchedulePage({ params }: ManageSchedulePageProps) {
  const { eventId } = await params;
  return <ManageScheduleClient eventId={eventId} />;
}

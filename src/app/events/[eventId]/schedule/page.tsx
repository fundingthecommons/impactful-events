import type { Metadata } from "next";
import SchedulePageClient from "./SchedulePageClient";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Event schedule",
};

interface SchedulePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { eventId } = await params;
  return <SchedulePageClient eventId={eventId} />;
}

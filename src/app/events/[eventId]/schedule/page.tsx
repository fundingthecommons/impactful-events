import type { Metadata } from "next";
import SchedulePageClient from "./SchedulePageClient";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Event schedule",
};

interface SchedulePageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ my?: string }>;
}

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const { eventId } = await params;
  const { my } = await searchParams;
  return <SchedulePageClient eventId={eventId} initialMySchedule={my === "true"} />;
}

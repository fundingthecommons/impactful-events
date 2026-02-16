import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ManageScheduleClient from "./ManageScheduleClient";

export const metadata: Metadata = {
  title: "Manage Floors",
  description: "Manage your floor schedule",
};

interface ManageSchedulePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ManageSchedulePage({ params }: ManageSchedulePageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/events/${eventId}/manage-schedule`);
  }

  return <ManageScheduleClient eventId={eventId} />;
}

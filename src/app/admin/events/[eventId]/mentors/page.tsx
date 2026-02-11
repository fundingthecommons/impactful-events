import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import AdminMentorApplicationsClient from "./AdminMentorApplicationsClient";

export const metadata: Metadata = {
  title: "Mentor Applications",
  description: "Review and manage mentor applications for this event",
};

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function MentorApplicationsPage({ params }: Props) {
  const { eventId } = await params;

  const session = await auth();

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/mentors`);
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminMentorApplicationsClient eventId={eventId} />;
}

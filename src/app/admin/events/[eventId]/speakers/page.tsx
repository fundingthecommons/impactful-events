import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import AdminSpeakerManagementClient from "./AdminSpeakerManagementClient";

export const metadata: Metadata = {
  title: "Speaker Management",
  description: "Manage speaker invitations and applications for this event",
};

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function SpeakerManagementPage({ params }: Props) {
  const { eventId } = await params;

  const session = await auth();

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/speakers`);
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminSpeakerManagementClient eventId={eventId} />;
}

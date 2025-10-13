import { type Metadata } from "next";
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
  return <AdminMentorApplicationsClient eventId={eventId} />;
}
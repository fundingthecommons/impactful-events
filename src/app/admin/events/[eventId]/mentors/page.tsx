import { type Metadata } from "next";
import MentorInvitationsClient from "./MentorInvitationsClient";

export const metadata: Metadata = {
  title: "Mentor Management",
  description: "Invite and manage mentors for this event",
};

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function MentorInvitationsPage({ params }: Props) {
  const { eventId } = await params;
  return <MentorInvitationsClient eventId={eventId} />;
}
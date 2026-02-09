import { type Metadata } from "next";
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
  return <AdminSpeakerManagementClient eventId={eventId} />;
}

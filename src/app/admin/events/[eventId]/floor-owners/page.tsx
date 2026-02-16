import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import FloorOwnersClient from "./FloorOwnersClient";

export const metadata: Metadata = {
  title: "Floor Leads",
  description: "Manage floor lead assignments for this event",
};

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function FloorOwnersPage({ params }: Props) {
  const { eventId } = await params;

  const session = await auth();

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/floor-owners`);
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <FloorOwnersClient eventId={eventId} />;
}

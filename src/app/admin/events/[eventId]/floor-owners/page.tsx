import { type Metadata } from "next";
import FloorOwnersClient from "./FloorOwnersClient";

export const metadata: Metadata = {
  title: "Floor Owners",
  description: "Manage floor owner assignments for this event",
};

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function FloorOwnersPage({ params }: Props) {
  const { eventId } = await params;
  return <FloorOwnersClient eventId={eventId} />;
}

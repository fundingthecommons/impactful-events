import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SelectionRubricClient from "./SelectionRubricClient";

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function SelectionRubricPage({ params }: PageProps) {
  // Check authentication and role
  const session = await auth();
  
  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/events");
  }
  
  // Must have staff or admin role
  if (!session.user.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  // Await params to get eventId
  const { eventId } = await params;

  return <SelectionRubricClient eventId={eventId} />;
}

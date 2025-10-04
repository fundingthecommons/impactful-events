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
  
  // TEMPORARY: Bypass role check for debugging
  console.log("🔧 DEBUGGING: Bypassing role check temporarily");
  console.log("User role:", session.user.role);
  
  // TODO: Re-enable role check after debugging
  // if (!session.user.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
  //   redirect("/dashboard");
  // }

  // Await params to get eventId
  const { eventId } = await params;

  return <SelectionRubricClient eventId={eventId} />;
}

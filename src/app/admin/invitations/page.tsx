import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import InvitationsClient from "./InvitationsClient";

export default async function InvitationsPage() {
  // Check authentication and role
  const session = await auth();
  
  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/invitations");
  }
  
  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }
  
  return <InvitationsClient />;
}
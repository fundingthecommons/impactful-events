import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import ProfilesAdminClient from "./ProfilesAdminClient";

export default async function ProfilesAdminPage() {
  // Check authentication and admin access
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/profiles");
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Fetch all events for the filter dropdown
  const events = await db.event.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      startDate: true,
      endDate: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return <ProfilesAdminClient events={events} />;
}

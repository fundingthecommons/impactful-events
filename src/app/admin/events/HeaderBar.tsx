import { Group, Paper } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { UserDropdownMenu } from "~/app/_components/UserDropdownMenu";
import AdminNavigation from "./AdminNavigation";
import UserNavigation from "~/app/_components/UserNavigation";
import CommunityNavigation from "~/app/_components/CommunityNavigation";

export default async function HeaderBar() {
  const session = await auth();

  // Check if user has access to residency navigation
  let hasResidencyAccess = false;

  if (session?.user) {
    // Admins and staff always have access
    const isAdmin = session.user.role === "admin" || session.user.role === "staff";

    if (isAdmin) {
      hasResidencyAccess = false; // Admins get AdminNavigation, not residency nav
    } else {
      // Check if user has an accepted application for the residency
      const RESIDENCY_EVENT_ID = "funding-commons-residency-2025";

      const application = await db.application.findFirst({
        where: {
          userId: session.user.id,
          eventId: RESIDENCY_EVENT_ID,
          status: "ACCEPTED",
        },
        select: {
          id: true,
          status: true,
        },
      });

      // Also check if user is a mentor for the event
      const mentorRole = await db.userRole.findFirst({
        where: {
          userId: session.user.id,
          eventId: RESIDENCY_EVENT_ID,
          role: {
            name: "mentor",
          },
        },
        select: {
          id: true,
        },
      });

      hasResidencyAccess = !!application || !!mentorRole;
    }
  }

  return (
    <div>
      <Paper withBorder radius={0} p="md" style={{ paddingLeft: 32, paddingRight: 32, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
        <Group justify="space-between" align="center">
          <Group align="center" gap={8}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Image src="/images/ftc-logo.avif" alt="FtC" width={100} height={100} />
            </Link>
          </Group>

          <Group gap={16}>
            {session?.user && <UserDropdownMenu session={session} />}
          </Group>
        </Group>
      </Paper>

      {/* Navigation - Show appropriate menu based on user role and residency status */}
      {session?.user && (
        <Paper withBorder radius={0} px="lg" style={{ borderTop: 0, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
          {(session.user.role === "admin" || session.user.role === "staff") ? (
            <AdminNavigation />
          ) : hasResidencyAccess ? (
            <UserNavigation />
          ) : (
            <CommunityNavigation />
          )}
        </Paper>
      )}
    </div>
  );
} 
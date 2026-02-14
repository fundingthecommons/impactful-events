import { Group, Paper } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { UserDropdownMenu } from "~/app/_components/UserDropdownMenu";
import AdminNavigation from "./AdminNavigation";
import MainNavigation from "~/app/_components/MainNavigation";

interface AcceptedEvent {
  id: string;
  name: string;
}

export default async function HeaderBar() {
  const session = await auth();

  // Get all events the user has access to (accepted applications or mentor roles)
  let acceptedEvents: AcceptedEvent[] = [];

  if (session?.user) {
    const isAdmin = session.user.role === "admin" || session.user.role === "staff";

    if (!isAdmin) {
      // Query all accepted applications
      const acceptedApplications = await db.application.findMany({
        where: {
          userId: session.user.id,
          status: "ACCEPTED",
        },
        select: {
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Query all mentor roles
      const mentorRoles = await db.userRole.findMany({
        where: {
          userId: session.user.id,
          role: {
            name: "mentor",
          },
        },
        select: {
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Combine and deduplicate events
      const eventMap = new Map<string, AcceptedEvent>();

      for (const app of acceptedApplications) {
        eventMap.set(app.event.id, {
          id: app.event.id,
          name: app.event.name,
        });
      }

      for (const role of mentorRoles) {
        eventMap.set(role.event.id, {
          id: role.event.id,
          name: role.event.name,
        });
      }

      acceptedEvents = Array.from(eventMap.values());
    }
  }

  return (
    <div>
      <Paper withBorder radius={0} className="px-8 py-4 shadow-sm">
        <Group justify="space-between" align="center">
          <Group align="center" gap={8}>
            <Link href="/" className="flex items-center cursor-pointer">
              <Image src="/images/ftc-logo.avif" alt="FtC" width={100} height={100} />
            </Link>
          </Group>

          <Group gap={16}>
            {session?.user && <UserDropdownMenu session={session} />}
          </Group>
        </Group>
      </Paper>

      {/* Navigation - Show appropriate menu based on user role */}
      {session?.user && (
        <>
          {(session.user.role === "admin" || session.user.role === "staff") ? (
            <AdminNavigation />
          ) : (
            <MainNavigation acceptedEvents={acceptedEvents} />
          )}
        </>
      )}
    </div>
  );
}
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import SpeakerPageClient from "./SpeakerPageClient";

export default async function SpeakerApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ invitation?: string }>;
}) {
  const session = await auth();
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  let invitationToken = resolvedSearchParams.invitation;

  // Clean up doubled token (e.g., "token?invitation=token" -> "token")
  if (invitationToken?.includes("?invitation=")) {
    invitationToken = invitationToken.split("?invitation=")[0];
  }

  // Fetch invitation details for form pre-population
  let invitationData: { email: string; firstName?: string } | undefined;
  if (invitationToken) {
    const invitation = await db.invitation.findUnique({
      where: { token: invitationToken },
    });
    if (invitation) {
      const inviteeName = invitation.inviteeName;
      invitationData = {
        email: invitation.email,
        firstName: inviteeName ?? undefined,
      };
    }
  }

  // Fetch event details - try by slug first, then by id
  let event = await db.event.findFirst({
    where: { slug: eventId },
    include: {
      applications: session?.user
        ? {
            where: {
              userId: session.user.id,
              applicationType: "SPEAKER",
            },
            include: {
              responses: {
                include: {
                  question: true,
                },
              },
            },
          }
        : false,
    },
  });

  event ??= await db.event.findUnique({
    where: { id: eventId },
    include: {
      applications: session?.user
        ? {
            where: {
              userId: session.user.id,
              applicationType: "SPEAKER",
            },
            include: {
              responses: {
                include: {
                  question: true,
                },
              },
            },
          }
        : false,
    },
  });

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Event not found</p>
      </div>
    );
  }

  const userApplication =
    session?.user && Array.isArray(event.applications)
      ? (event.applications[0] ?? null)
      : null;

  const typedEvent = {
    ...event,
    applications: Array.isArray(event.applications) ? event.applications : [],
  };

  return (
    <SpeakerPageClient
      event={typedEvent}
      initialUserApplication={userApplication}
      initialUserId={session?.user?.id}
      invitationToken={invitationToken}
      invitationData={invitationData}
    />
  );
}

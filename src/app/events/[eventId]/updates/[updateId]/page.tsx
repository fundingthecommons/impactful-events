import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import UpdateDetailClient from "./UpdateDetailClient";

interface PageProps {
  params: Promise<{
    eventId: string;
    updateId: string;
  }>;
}

export default async function UpdateDetailPage({ params }: PageProps) {
  const { eventId, updateId } = await params;
  const session = await auth();

  try {
    const update = await api.project.getUpdateById({ updateId });

    if (!update) {
      notFound();
    }

    return (
      <UpdateDetailClient
        update={update}
        eventId={eventId}
        userId={session?.user?.id}
      />
    );
  } catch (error) {
    console.error("Error loading update details:", error);
    notFound();
  }
}

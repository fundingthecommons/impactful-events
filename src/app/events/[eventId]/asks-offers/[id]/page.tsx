import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import AskOfferDetailClient from "./AskOfferDetailClient";

interface PageProps {
  params: Promise<{
    eventId: string;
    id: string;
  }>;
}

export default async function AskOfferDetailPage({ params }: PageProps) {
  const { eventId, id } = await params;
  const session = await auth();

  try {
    const askOffer = await api.askOffer.getById({ id });

    if (!askOffer) {
      notFound();
    }

    const isOwner = session?.user?.id === askOffer.userId;

    return (
      <AskOfferDetailClient
        askOffer={askOffer}
        eventId={eventId}
        isOwner={isOwner}
        userId={session?.user?.id}
      />
    );
  } catch (error) {
    console.error("Error loading ask/offer details:", error);
    notFound();
  }
}

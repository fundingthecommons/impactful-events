import { redirect } from "next/navigation";

interface ApplyPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { eventId } = await params;
  
  // Redirect to the main event page with application tab
  redirect(`/events/${eventId}?tab=application`);
}
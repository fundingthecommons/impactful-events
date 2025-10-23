import { redirect } from "next/navigation";

interface ApplyPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApplyPage({ params, searchParams }: ApplyPageProps) {
  const { eventId } = await params;
  const search = await searchParams;
  
  // Preserve all query parameters (especially latePass) when redirecting
  const searchParamsString = new URLSearchParams();
  searchParamsString.set('tab', 'application');
  
  // Add all existing query parameters
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === 'string') {
      searchParamsString.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(v => searchParamsString.append(key, v));
    }
  });
  
  // Redirect to the main event page with application tab and preserved parameters
  redirect(`/events/${eventId}?${searchParamsString.toString()}`);
}
"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { HyperboardClient } from "./HyperboardClient";
import { Center, Loader } from "@mantine/core";

interface HyperboardPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default function HyperboardPage({ params }: HyperboardPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const { data: session, status } = useSession();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Check authentication
  useEffect(() => {
    if (status === "loading" || !eventId) return;

    if (!session?.user) {
      redirect(`/events/${eventId}`);
    }
  }, [session, status, eventId]);

  if (status === "loading" || !eventId) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  return <HyperboardClient eventId={eventId} />;
}

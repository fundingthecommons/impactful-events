"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EventDetailClient from "./EventDetailClient";
import { Alert, Title, Text, Container, Stack, Group, Button, ActionIcon } from "@mantine/core";
import { IconCheck, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventPage({ params }: EventPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const { data: session, status } = useSession();
  const router = useRouter();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Fetch event details using tRPC
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user }
  );

  // Get user application
  const { data: userApplication } = api.application.getApplication.useQuery(
    { eventId },
    { enabled: !!eventId && !!session?.user }
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/events/${eventId}`);
    }
  }, [status, eventId, router]);

  if (status === "loading" || eventLoading) {
    return <div>Loading...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <>
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Back Button */}
        <Group gap="xs">
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
              Back to Events
            </Button>
          </Link>

          {/* Language Toggle */}
          <Group gap="xs" ml="auto">
            <ActionIcon
              variant={language === "en" ? "filled" : "outline"}
              onClick={() => setLanguage("en")}
              size="sm"
            >
              EN
            </ActionIcon>
            <ActionIcon
              variant={language === "es" ? "filled" : "outline"}
              onClick={() => setLanguage("es")}
              size="sm"
            >
              ES
            </ActionIcon>
          </Group>
        </Group>
      {/* Congratulations Banner for Accepted Users */}
      {session?.user && userApplication?.status === "ACCEPTED" && (
        <Alert 
          color="green"
          title="🎉 Congratulations!"
          icon={<IconCheck />}
          variant="filled"
          radius="md"
        >
          <Title order={3} c="white" mb="xs">
            You have been accepted to the {event.name}!
          </Title>
          <Text c="white" size="md">
            We&apos;re excited to have you participate in this residency program. Check your email for next steps and program details.
          </Text>
        </Alert>
      )}
      
    </Stack>
    </Container>
    </>
  );
}
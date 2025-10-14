"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import EventDetailClient from "./EventDetailClient";
import ResidentDashboard from "./ResidentDashboard";
import ApplicationClosedMessage from "~/app/_components/ApplicationClosedMessage";
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
  const [hasLatePassAccess, setHasLatePassAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [defaultTab, setDefaultTab] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Handle tab query parameter for redirects
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setDefaultTab(tab);
      // Clean URL by removing query parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  // Late pass access logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const latePassParam = searchParams.get("latePass");
    const invitationParam = searchParams.get("invitation");
    
    // Check existing latePass cookie
    const existingCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftc-late-pass="));
    
    const hasCookie = !!existingCookie;
    
    // Handle latePass parameter (existing logic)
    if (latePassParam) {
      // Set cookie for 24 hours
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `ftc-late-pass=${latePassParam}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Clean URL by removing query parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      setHasLatePassAccess(true);
    } 
    // Handle invitation parameter - allow access and let server-side validation handle the rest
    else if (invitationParam) {
      // Set a temporary cookie to remember we had an invitation
      const expires = new Date();
      expires.setTime(expires.getTime() + 60 * 60 * 1000); // 1 hour
      document.cookie = `ftc-invitation-access=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Clean URL by removing query parameter  
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      setHasLatePassAccess(true);
    } 
    // Check existing latePass cookie
    else if (hasCookie) {
      setHasLatePassAccess(true);
    }
    // Check if we have invitation access cookie
    else if (document.cookie.includes("ftc-invitation-access=true")) {
      setHasLatePassAccess(true);
    }
    
    setIsCheckingAccess(false);
  }, [searchParams, router]);

  // Fetch event details using tRPC (now works for both auth and unauth users)
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  );

  // Get user application (only for authenticated users)
  const { data: userApplication } = api.application.getApplication.useQuery(
    { eventId },
    { enabled: !!eventId && !!session?.user }
  );

  // Check if user is a mentor for this event (bypass latePass requirement)
  const { data: isMentor } = api.event.checkMentorRole.useQuery(
    { eventId },
    { enabled: !!session?.user && !!eventId }
  );

  // Don't redirect unauthenticated users - let them see the page content
  // Authentication will be handled by individual components (like DynamicApplicationForm)

  if (status === "loading" || eventLoading) {
    return <div>Loading...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  // Check if user is accepted and should see resident dashboard
  const isAcceptedResident = session?.user && userApplication?.status === "ACCEPTED";
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "staff";
  
  // Check if applications are closed (no late pass, no admin/mentor privileges)
  const applicationsAreClosed = !hasLatePassAccess && !isAdmin && !isMentor && !isCheckingAccess;

  console.log("isAcceptedResident", isAcceptedResident);
  console.log("isAdmin", isAdmin);
  console.log("userApplication", userApplication);
  console.log("session", session);
  console.log("applicationsAreClosed", applicationsAreClosed);
  console.log("hasLatePassAccess", hasLatePassAccess);
  console.log("isMentor", isMentor);
  
  // Show resident dashboard for accepted users and admins
  if (isAcceptedResident || isAdmin) {
    return (
      <>
        {/* Congratulations Banner for Accepted Users */}
        {isAcceptedResident && (
          <Container size="lg" py="md">
            <Alert 
              color="green"
              title="🎉 Congratulations!"
              icon={<IconCheck />}
              variant="filled"
              radius="md"
              mb="xl"
            >
              <Title order={3} c="white" mb="xs">
                You have been accepted to the {event.name}!
              </Title>
              <Text c="white" size="md">
                Welcome to your resident dashboard. Connect with fellow residents and showcase your projects!
              </Text>
            </Alert>
          </Container>
        )}
        
        <ResidentDashboard 
          eventId={eventId}
          eventName={event.name}
          userApplication={userApplication ?? null}
        />
      </>
    );
  }

  // Show application closed message if applications are closed
  if (applicationsAreClosed) {
    return <ApplicationClosedMessage />;
  }

  // Show application flow for non-accepted users
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
        </Stack>
      </Container>
      
      <EventDetailClient 
        event={event}
        userApplication={userApplication ?? null}
        userId={session?.user?.id ?? ""}
        defaultTab={defaultTab ?? undefined}
        language={language}
      />
    </>
  );
}
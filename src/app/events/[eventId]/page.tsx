"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import EventDetailClient from "./EventDetailClient";
import ResidentDashboard from "./ResidentDashboard";
import ApplicationClosedMessage from "~/app/_components/ApplicationClosedMessage";
import { Alert, Text, Container, Stack, Group, Button, ActionIcon } from "@mantine/core";
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
    
    setIsCheckingAccess(true);
    
    const latePassParam = searchParams.get("latePass");
    const invitationParam = searchParams.get("invitation");
    
    // Helper function to check for cookies
    const getCookie = (name: string) => {
      return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
    };
    
    const hasLatePassCookie = !!getCookie("ftc-late-pass");
    const hasInvitationCookie = !!getCookie("ftc-invitation-access");
    
    // Handle latePass parameter
    if (latePassParam) {
      console.log("🔑 Processing latePass parameter:", latePassParam);
      
      // Set cookie for 24 hours
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `ftc-late-pass=${latePassParam}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
      
      setHasLatePassAccess(true);
      setIsCheckingAccess(false);
      
      // Clean URL after state updates
      setTimeout(() => {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
      }, 100);
      
      return;
    } 
    
    // Handle invitation parameter
    if (invitationParam) {
      console.log("📧 Processing invitation parameter:", invitationParam);
      
      // Set a temporary cookie for 1 hour
      const expires = new Date();
      expires.setTime(expires.getTime() + 60 * 60 * 1000);
      document.cookie = `ftc-invitation-access=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
      
      setHasLatePassAccess(true);
      setIsCheckingAccess(false);
      
      // Clean URL after state updates
      setTimeout(() => {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
      }, 100);
      
      return;
    } 
    
    // Check existing cookies
    if (hasLatePassCookie || hasInvitationCookie) {
      console.log("🍪 Found existing access cookie:", { hasLatePassCookie, hasInvitationCookie });
      setHasLatePassAccess(true);
    } else {
      console.log("❌ No access cookies found");
      setHasLatePassAccess(false);
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


  if (status === "loading" || eventLoading) {
    return <div>Loading...</div>;
  }

  // Require authentication for this page
  if (!session?.user) {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const callbackUrl = encodeURIComponent(currentUrl);
    router.push(`/signin?callbackUrl=${callbackUrl}`);
    return <div>Redirecting to sign in...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  // Check if user is accepted for this specific event
  const isAcceptedForThisEvent = userApplication?.status === "ACCEPTED";
  const isAdmin = session.user.role === "admin" || session.user.role === "staff";
  
  // Determine if user can view this page
  const canViewPage = isAcceptedForThisEvent || isAdmin || hasLatePassAccess || isMentor;
  
  // Check if applications are closed (no late pass, no admin/mentor privileges)
  const applicationsAreClosed = !hasLatePassAccess && !isAdmin && !isMentor && !isCheckingAccess;

  console.log("🔍 Access Control Debug:", {
    isAcceptedForThisEvent,
    isAdmin,
    hasLatePassAccess,
    isMentor,
    canViewPage,
    userApplication: userApplication?.status,
    applicationsAreClosed
  });
  
  // Deny access if user doesn't meet requirements
  if (!canViewPage) {
    return (
      <Container size="md" py="xl">
        <Stack gap="xl" align="center">
          <Alert
            color="orange"
            title="Access Restricted"
            icon={<IconCheck />}
            variant="filled"
            radius="md"
            style={{ maxWidth: 500, width: '100%' }}
          >
            <Text c="white" size="md">
              This event page is only accessible to accepted residents. 
              If you have a late pass code, please use the provided link.
            </Text>
          </Alert>
          <Button
            component={Link}
            href="/events"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Events
          </Button>
        </Stack>
      </Container>
    );
  }
  
  // Show resident dashboard for accepted users, admins, and mentors
  if (isAcceptedForThisEvent || isAdmin || isMentor) {
    return (
      <ResidentDashboard
        eventId={eventId}
        eventName={event.name}
        userApplication={userApplication ?? null}
      />
    );
  }

  // Show application closed message if applications are closed
  if (applicationsAreClosed) {
    return <ApplicationClosedMessage event={event} />;
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
        hasLatePassAccess={hasLatePassAccess}
      />
    </>
  );
}
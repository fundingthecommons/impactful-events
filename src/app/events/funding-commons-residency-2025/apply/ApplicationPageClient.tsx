"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Container, Center, Loader, Text, Stack, Card, Group, Transition } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import AuthForm from "~/app/_components/AuthForm";
import EventDetailClient from "../../[eventId]/EventDetailClient";
import type { Event, Application, ApplicationResponse, ApplicationQuestion } from "@prisma/client";

interface ExtendedApplication extends Application {
  responses?: Array<ApplicationResponse & { question: ApplicationQuestion }>;
}

interface ExtendedEvent extends Event {
  applications: ExtendedApplication[];
}

// Type for EventDetailClient compatibility
interface EventDetailApplication {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED";
  language: string;
  submittedAt: Date | null;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
      questionEn: string;
      questionEs: string;
      questionType: string;
      required: boolean;
    };
  }>;
}

interface EventDetailEvent {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string | null;
  type: string;
  applications: EventDetailApplication[];
}

interface ApplicationPageClientProps {
  event: ExtendedEvent;
  initialUserApplication?: ExtendedApplication | null;
  initialUserId?: string;
}

// Helper function to convert types for EventDetailClient compatibility
function convertApplicationForEventDetail(app: ExtendedApplication): EventDetailApplication {
  return {
    id: app.id,
    status: app.status as EventDetailApplication["status"],
    language: app.language,
    submittedAt: app.submittedAt,
    responses: app.responses?.map(r => ({
      id: r.id,
      answer: r.answer,
      question: {
        id: r.question.id,
        questionKey: r.question.questionKey,
        questionEn: r.question.questionEn,
        questionEs: r.question.questionEs,
        questionType: r.question.questionType,
        required: r.question.required,
      },
    })) ?? [],
  };
}

function convertEventForEventDetail(event: ExtendedEvent): EventDetailEvent {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    type: event.type,
    applications: event.applications.map(convertApplicationForEventDetail),
  };
}

export default function ApplicationPageClient({
  event,
  initialUserApplication,
  initialUserId,
}: ApplicationPageClientProps) {
  const { data: session, status } = useSession();
  const [showApplication, setShowApplication] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // Handle authentication state changes
  useEffect(() => {
    if (status === "authenticated" && !showApplication) {
      if (!initialUserId) {
        // User just authenticated
        setJustAuthenticated(true);
        setTimeout(() => {
          setShowApplication(true);
          setJustAuthenticated(false);
        }, 1500);
      } else {
        // User was already authenticated
        setShowApplication(true);
      }
    } else if (status === "unauthenticated") {
      setShowApplication(false);
      setJustAuthenticated(false);
    }
  }, [status, initialUserId, showApplication]);

  // Loading state
  if (status === "loading") {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  // Success animation after authentication
  if (justAuthenticated) {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Transition
            mounted={justAuthenticated}
            transition="scale"
            duration={400}
            timingFunction="ease"
          >
            {(styles) => (
              <Card style={styles} p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-4">
                    <IconCheck size={32} color="white" />
                  </div>
                  <Text size="lg" fw={600}>
                    Authentication Successful!
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Redirecting to your application...
                  </Text>
                </Stack>
              </Card>
            )}
          </Transition>
        </Center>
      </Container>
    );
  }

  // Show auth form for unauthenticated users
  if (!session?.user || !showApplication) {
    return (
      <Container size="sm" py="xl">
        <Transition
          mounted={!showApplication}
          transition="fade"
          duration={300}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
              <Stack gap="xl">
                {/* Progress Indicator */}
                <Card p="md" radius="md" withBorder>
                  <Group justify="center" gap="lg">
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Text size="xs" c="white" fw={600}>1</Text>
                      </div>
                      <Text size="sm" fw={500}>Sign In</Text>
                    </Group>
                    <div className="w-8 h-0.5 bg-gray-200" />
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Text size="xs" c="dimmed" fw={600}>2</Text>
                      </div>
                      <Text size="sm" c="dimmed">Apply</Text>
                    </Group>
                    <div className="w-8 h-0.5 bg-gray-200" />
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Text size="xs" c="dimmed" fw={600}>3</Text>
                      </div>
                      <Text size="sm" c="dimmed">Submit</Text>
                    </Group>
                  </Group>
                </Card>

                {/* Event Context Card */}
                <Card p="lg" radius="md" withBorder className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <Stack gap="md">
                    <Text size="lg" fw={600} className="text-blue-900">
                      FtC RealFi Residency • Buenos Aires 2025
                    </Text>
                    <Text size="sm" className="text-blue-700">
                      Building real-world blockchain applications for everyday Argentinians
                    </Text>
                    <Text size="xs" c="dimmed">
                      Please sign in to continue with your application
                    </Text>
                  </Stack>
                </Card>

                {/* Auth Form */}
                <AuthForm 
                  callbackUrl="/events/funding-commons-residency-2025/apply" 
                  className="shadow-lg"
                />
              </Stack>
            </div>
          )}
        </Transition>
      </Container>
    );
  }

  // Show application form for authenticated users
  return (
    <Transition
      mounted={showApplication}
      transition="fade"
      duration={300}
      timingFunction="ease"
    >
      {(styles) => (
        <div style={styles}>
          <EventDetailClient
            event={convertEventForEventDetail(event)}
            userApplication={initialUserApplication ? convertApplicationForEventDetail(initialUserApplication) : null}
            userId={session.user.id}
          />
        </div>
      )}
    </Transition>
  );
}
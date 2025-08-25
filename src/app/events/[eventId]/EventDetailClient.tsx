"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Group, 
  Stack, 
  Button,
  ThemeIcon,
  Badge,
  Divider,
  Paper,
  Tabs,
  Alert,
  ActionIcon,
} from "@mantine/core";
import { 
  IconCalendarEvent,
  IconMapPin,
  IconClock,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconEdit,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import DynamicApplicationForm from "~/app/_components/DynamicApplicationForm";

type Application = {
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
};

type Event = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string | null;
  type: string;
  applications: Application[];
};

interface EventDetailClientProps {
  event: Event;
  userApplication: Application | null;
  userId: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusMessage(status: string) {
  switch (status) {
    case "DRAFT":
      return "Your application is saved as a draft. Submit when you're ready!";
    case "SUBMITTED":
      return "Your application has been submitted and is pending review. You can still edit it until it's under review.";
    case "UNDER_REVIEW":
      return "Your application is currently under review by our team. Editing is no longer available.";
    case "ACCEPTED":
      return "Congratulations! Your application has been accepted.";
    case "REJECTED":
      return "Unfortunately, your application was not accepted this time.";
    case "WAITLISTED":
      return "You've been placed on the waitlist. We'll contact you if spots become available.";
    default:
      return "";
  }
}

export default function EventDetailClient({ 
  event, 
  userApplication, 
  userId: _userId 
}: EventDetailClientProps) {
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const { data: session } = useSession();

  const utils = api.useUtils();

  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  // Handle successful application submission
  const handleApplicationSubmitted = async () => {
    // Refetch data to update UI
    await utils.application.getApplication.invalidate({ eventId: event.id });
    await utils.application.getUserApplications.invalidate();
  };

  // Handle application update
  const handleApplicationUpdated = async () => {
    // Refetch data to update UI
    await utils.application.getApplication.invalidate({ eventId: event.id });
  };

  return (
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

        {/* Event Header */}
        <Card shadow="lg" padding="xl" radius="md" withBorder>
          <Group align="flex-start" gap="lg">
            <div className="hidden-mobile">
              <ThemeIcon size={80} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
                <IconCalendarEvent size={40} />
              </ThemeIcon>
            </div>
            
            <Stack gap="sm" style={{ flex: 1 }}>
              <Group justify="space-between" align="flex-start">
                <Title order={1} size="h1">
                  {event.name}
                </Title>
                <Badge size="lg" variant="light" tt="uppercase">
                  {event.type}
                </Badge>
              </Group>
              
              <Text size="lg" c="dimmed">
                {event.description}
              </Text>

              <Group gap="xl" mt="md">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>Start Date</Text>
                    <Text size="xs" c="dimmed">{formatDate(event.startDate)}</Text>
                  </Stack>
                </Group>

                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="green">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>End Date</Text>
                    <Text size="xs" c="dimmed">{formatDate(event.endDate)}</Text>
                  </Stack>
                </Group>

                {event.location && (
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="orange">
                      <IconMapPin size={16} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Location</Text>
                      <Text size="xs" c="dimmed">{event.location}</Text>
                    </Stack>
                  </Group>
                )}
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Application Status Alert */}
        {userApplication && (
          <Alert 
            color={getStatusColor(userApplication.status)}
            title={`Application Status: ${userApplication.status.replace("_", " ")}`}
            icon={userApplication.status === "ACCEPTED" ? <IconCheck /> : <IconAlertCircle />}
          >
            {getStatusMessage(userApplication.status)}
            {userApplication.submittedAt && (
              <Text size="sm" mt="xs" c="dimmed">
                Submitted on {formatDate(userApplication.submittedAt)}
              </Text>
            )}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="overview">
              Event Overview
            </Tabs.Tab>
            <Tabs.Tab value="application">
              {userApplication ? "Manage Application" : "Apply Now"}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" mt="md">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Title order={2}>About This Event</Title>
                <Text>
                  {event.description ?? "No detailed description available for this event."}
                </Text>
                
                <Divider />
                
                <Group gap="xl">
                  <Stack gap="xs">
                    <Text fw={500}>Duration</Text>
                    <Text c="dimmed">
                      {Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </Text>
                  </Stack>
                  
                  <Stack gap="xs">
                    <Text fw={500}>Format</Text>
                    <Text c="dimmed">
                      {event.location ? "In-person" : "Online"}
                    </Text>
                  </Stack>
                </Group>

                {!userApplication && (
                  <>
                    <Divider />
                    <Button 
                      size="lg" 
                      onClick={() => setActiveTab("application")}
                      leftSection={<IconEdit size={16} />}
                    >
                      Start Your Application
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="application" mt="md">
            <Paper p="xl" radius="md" withBorder>
              {userApplication ? (
                <Stack gap="lg">
                  <Group justify="space-between">
                    <Title order={2}>Your Application</Title>
                    <Badge 
                      color={getStatusColor(userApplication.status)}
                      size="lg" 
                      variant="light"
                    >
                      {userApplication.status.replace("_", " ")}
                    </Badge>
                  </Group>
                  
                  <DynamicApplicationForm
                    eventId={event.id}
                    existingApplication={userApplication}
                    language={language}
                    userEmail={session?.user?.email ?? undefined}
                    onSubmitted={handleApplicationSubmitted}
                    onUpdated={handleApplicationUpdated}
                  />
                </Stack>
              ) : (
                <Stack gap="lg">
                  <Title order={2}>
                    {language === "es" ? "Aplicar al Evento" : "Apply to Event"}
                  </Title>
                  <Text c="dimmed">
                    {language === "es" 
                      ? "Complete el formulario a continuación para aplicar a este evento."
                      : "Complete the form below to apply to this event."
                    }
                  </Text>
                  
                  <DynamicApplicationForm
                    eventId={event.id}
                    language={language}
                    userEmail={session?.user?.email ?? undefined}
                    onSubmitted={handleApplicationSubmitted}
                    onUpdated={handleApplicationUpdated}
                  />
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
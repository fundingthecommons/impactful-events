"use client";

import { 
  Container, 
  Title, 
  SimpleGrid, 
  Card, 
  Text, 
  Badge, 
  Group, 
  Stack, 
  Button,
  ThemeIcon,
  Box,
  Paper,
  Loader
} from "@mantine/core";
import { 
  IconCalendarEvent,
  IconHome,
  IconTrophy,
  IconMicrophone,
  IconUmbrella,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconX
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
  };
  applicationStatus?: {
    hasApplication: boolean;
    canApply: boolean;
    application?: {
      status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED";
    };
  };
}

function getEventIcon(type: string) {
  switch (type.toLowerCase()) {
    case "residency":
      return IconHome;
    case "hackathon":
      return IconTrophy;
    case "conference":
      return IconMicrophone;
    default:
      return IconUmbrella;
  }
}

function getEventGradient(type: string) {
  switch (type.toLowerCase()) {
    case "residency":
      return { from: "blue", to: "cyan" };
    case "hackathon":
      return { from: "orange", to: "red" };
    case "conference":
      return { from: "green", to: "teal" };
    default:
      return { from: "purple", to: "pink" };
  }
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

function getStatusIcon(status: string) {
  switch (status) {
    case "ACCEPTED":
      return IconCheck;
    case "REJECTED":
      return IconX;
    case "UNDER_REVIEW":
    case "SUBMITTED":
      return IconClock;
    default:
      return IconClock;
  }
}

function EventCard({ event, applicationStatus }: EventCardProps) {
  const Icon = getEventIcon(event.type);
  const gradient = getEventGradient(event.type);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const isHackathon = event.type.toLowerCase() === "hackathon";
  const showComingSoon = isHackathon && !applicationStatus?.hasApplication;
  
  return (
    <Card shadow="lg" padding="xl" radius="md" withBorder style={{ height: "100%" }}>
      <Card.Section>
        <Box
          h={120}
          style={{
            background: `linear-gradient(135deg, var(--mantine-color-${gradient.from}-6) 0%, var(--mantine-color-${gradient.to}-6) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ThemeIcon size={60} radius="xl" variant="light" color="white">
            <Icon size={30} />
          </ThemeIcon>
        </Box>
      </Card.Section>

      <Stack gap="md" mt="md" style={{ height: 'calc(100% - 120px)' }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start">
            <Title order={3} size="h2">
              {event.name}
            </Title>
            {applicationStatus?.hasApplication && (
              <Badge 
                color={getStatusColor(applicationStatus.application?.status ?? "DRAFT")} 
                variant="light" 
                size="sm"
                leftSection={(() => {
                  const StatusIcon = getStatusIcon(applicationStatus.application?.status ?? "DRAFT");
                  return <StatusIcon size={12} />;
                })()}
                tt="capitalize"
              >
                {applicationStatus.application?.status.replace("_", " ").toLowerCase()}
              </Badge>
            )}
          </Group>
          
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
          </Text>

          <Group gap="xs" mt="sm">
            <Text size="xs" c="dimmed">
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </Group>

          {event.location && (
            <Text size="xs" c="dimmed">
              📍 {event.location}
            </Text>
          )}
        </Stack>

        <Stack gap="sm">
          {showComingSoon ? (
            <Button 
              fullWidth
              variant="outline"
              disabled
              color={gradient.from}
            >
              Coming Soon
            </Button>
          ) : (
            <>
              {/* Apply Button - always show for available events */}
              {applicationStatus?.hasApplication && (applicationStatus.application?.status !== "ACCEPTED") && (
              <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                <Button 
                  fullWidth
                  variant="filled"
                  rightSection={<IconArrowRight size={16} />}
                  color={gradient.from}
                >
                  More info
                </Button>
              </Link>
              )}
              {/* Manage Button - only show for accepted applications */}
              {applicationStatus?.hasApplication && applicationStatus.application?.status === "ACCEPTED" && (
                <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                  <Button 
                    fullWidth
                    variant="outline"
                    rightSection={<IconArrowRight size={16} />}
                    color={gradient.from}
                  >
                    Manage
                  </Button>
                </Link>
              )}
            </>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function ParticipantEventsClient() {
  const { data: events, isLoading } = api.event.getAvailableEvents.useQuery();
  const { data: userApplications } = api.application.getUserApplications.useQuery();

  console.log("🔍 ParticipantEventsClient debug:", {
    eventsCount: events?.length ?? 0,
    applicationsCount: userApplications?.length ?? 0,
    isLoading
  });

  // Create a map of event applications for quick lookup
  const applicationMap = new Map(
    userApplications?.map(app => [app.eventId, app]) ?? []
  );

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Loader size="lg" />
          <Text c="dimmed">Loading events...</Text>
        </Stack>
      </Container>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Text size="xl" fw={500}>No Events Available</Text>
          <Text c="dimmed">There are currently no events available for registration.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header Section */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
              <IconCalendarEvent size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Available Events
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Discover and apply to events that match your interests. Track your applications and stay updated on your status.
          </Text>
        </Stack>

        {/* Stats Overview */}
        <Paper p="md" radius="md" withBorder>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="blue">
                {events.length}
              </Text>
              <Text size="sm" c="dimmed">Available Events</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="green">
                {userApplications?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">Your Applications</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="orange">
                {userApplications?.filter(app => app.status === "ACCEPTED").length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">Accepted</Text>
            </Stack>
          </SimpleGrid>
        </Paper>

        {/* Events Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {events.map((event) => {
            const application = applicationMap.get(event.id);
            const applicationStatus = {
              hasApplication: !!application,
              canApply: !application,
              application: application ? {
                status: application.status as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED"
              } : undefined
            };

            return (
              <EventCard 
                key={event.id} 
                event={event}
                applicationStatus={applicationStatus}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
"use client";
import { 
  Container, 
  Title, 
  SimpleGrid, 
  Card, 
  Text, 
  Group, 
  Stack, 
  Button,
  Paper,
  ThemeIcon,
  Badge,
  Loader,
  Box,
  Anchor
} from "@mantine/core";
import { 
  IconCalendarEvent,
  IconUsersGroup,
  IconClock,
  IconCheck,
  IconArrowRight,
  IconBrain,
  IconMessageDots,
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconVideo
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getEventGradient } from "~/utils/eventContent";
import { type EventType } from "~/types/event";

interface MentorEvent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  _count: {
    applications: number;
    userRoles: number;
  };
}

interface MentorshipSession {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  team: {
    name: string;
    hackathon: {
      name: string;
    };
  };
}

// Helper function to get Mantine gradient format from event type
function getMantineGradient(eventType: string) {
  if (eventType === "conference") {
    return { from: "green", to: "teal" };
  }
  
  if (eventType === "residency" || eventType === "hackathon") {
    const gradientString = getEventGradient(eventType as EventType);
    if (gradientString.includes("blue")) {
      return { from: "blue", to: "cyan" };
    } else if (gradientString.includes("orange")) {
      return { from: "orange", to: "red" };
    }
  }
  
  return { from: "purple", to: "pink" };
}

function MentorEventCard({ event }: { event: MentorEvent }) {
  const gradient = getMantineGradient(event.type);
  const isUpcoming = new Date(event.startDate) > new Date();
  const isOngoing = new Date() >= new Date(event.startDate) && new Date() <= new Date(event.endDate);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  return (
    <Card shadow="lg" padding="xl" radius="md" withBorder style={{ height: "100%" }}>
      <Card.Section>
        <Box
          h={100}
          style={{
            background: `linear-gradient(135deg, var(--mantine-color-${gradient.from}-6) 0%, var(--mantine-color-${gradient.to}-6) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ThemeIcon size={50} radius="xl" variant="light" color="white">
            <IconBrain size={24} />
          </ThemeIcon>
        </Box>
      </Card.Section>

      <Stack gap="md" mt="md" style={{ height: 'calc(100% - 100px)' }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start">
            <Title order={4} size="h3">
              {event.name}
            </Title>
            <Badge 
              color={isOngoing ? "green" : isUpcoming ? "blue" : "gray"} 
              variant="light" 
              size="sm"
            >
              {isOngoing ? "Active" : isUpcoming ? "Upcoming" : "Past"}
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            Your mentoring role for this {event.type}
          </Text>

          <Group gap="xs" mt="sm">
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </Group>

          {event.location && (
            <Group gap="xs">
              <IconMapPin size={14} />
              <Text size="xs" c="dimmed">
                {event.location}
              </Text>
            </Group>
          )}

          <Group gap="md" mt="sm">
            <Group gap="xs">
              <IconUsersGroup size={14} />
              <Text size="xs" c="dimmed">
                {event._count.userRoles} participants
              </Text>
            </Group>
          </Group>
        </Stack>

        <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
          <Button 
            fullWidth
            variant="outline"
            rightSection={<IconArrowRight size={16} />}
            color={gradient.from}
          >
            View Event Details
          </Button>
        </Link>
      </Stack>
    </Card>
  );
}

function SessionCard({ session }: { session: MentorshipSession }) {
  const isPast = new Date(session.scheduledAt) < new Date();
  const isToday = new Date(session.scheduledAt).toDateString() === new Date().toDateString();
  
  return (
    <Paper p="md" withBorder radius="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs">
            <Badge 
              color={isPast ? "gray" : isToday ? "green" : "blue"} 
              variant="light" 
              size="sm"
              leftSection={isPast ? <IconCheck size={12} /> : <IconClock size={12} />}
            >
              {isPast ? "Completed" : isToday ? "Today" : "Upcoming"}
            </Badge>
            <Text size="sm" fw={500}>
              {session.team.name}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {session.team.hackathon.name}
          </Text>
          <Group gap="xs">
            <IconClock size={14} />
            <Text size="xs" c="dimmed">
              {new Date(session.scheduledAt).toLocaleDateString()} • {session.durationMinutes} min
            </Text>
          </Group>
          {session.notes && (
            <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
              &ldquo;{session.notes}&rdquo;
            </Text>
          )}
        </Stack>
        <Group gap="xs">
          <Button size="xs" variant="light">
            <IconVideo size={14} />
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

export default function MentorDashboard() {
  const { data: mentorEvents, isLoading: loadingEvents } = api.event.getMentorEvents.useQuery();
  const { data: upcomingSessions, isLoading: loadingSessions } = api.mentorship.getUpcomingSessions.useQuery();
  const { data: mentorStats, isLoading: loadingStats } = api.mentorship.getMentorStats.useQuery();
  const { data: config } = api.config.getPublicConfig.useQuery();

  if (loadingEvents || loadingSessions || loadingStats) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  const totalEvents = mentorEvents?.length ?? 0;
  const activeEvents = mentorEvents?.filter(event => new Date(event.endDate) > new Date()).length ?? 0;
  const totalSessions = mentorStats?.totalSessions ?? 0;
  const hoursCompleted = mentorStats?.totalHours ?? 0;

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'green' }}>
              <IconBrain size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Mentor Dashboard
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Guide and support amazing builders working on public goods. Your expertise helps shape the future of decentralized impact.
          </Text>
        </Stack>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="teal">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Events
                </Text>
                <Text fw={700} size="xl">
                  {totalEvents}
                </Text>
                <Text size="xs" c="dimmed">
                  {activeEvents} active mentoring
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="blue">
                <IconMessageDots size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Sessions
                </Text>
                <Text fw={700} size="xl">
                  {totalSessions}
                </Text>
                <Text size="xs" c="dimmed">
                  mentorship sessions
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="green">
                <IconClock size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Hours
                </Text>
                <Text fw={700} size="xl">
                  {hoursCompleted}
                </Text>
                <Text size="xs" c="dimmed">
                  mentoring provided
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="orange">
                <IconTrophy size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Impact
                </Text>
                <Text fw={700} size="xl">
                  {mentorStats?.teamsSupported ?? 0}
                </Text>
                <Text size="xs" c="dimmed">
                  teams supported
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Upcoming Sessions */}
        <Stack gap="md">
          <Title order={2}>Upcoming Mentorship Sessions</Title>
          
          {!upcomingSessions || upcomingSessions.length === 0 ? (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconMessageDots size={30} />
                </ThemeIcon>
                <Stack gap="xs" align="center">
                  <Title order={3} c="dimmed">No Upcoming Sessions</Title>
                  <Text c="dimmed" ta="center" maw={400}>
                    You don&apos;t have any mentorship sessions scheduled. Teams will be able to book sessions with you during active events.
                  </Text>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="md">
              {upcomingSessions.slice(0, 5).map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
              {upcomingSessions.length > 5 && (
                <Button variant="light" fullWidth>
                  View All Sessions ({upcomingSessions.length})
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        {/* My Mentoring Events */}
        <Stack gap="md">
          <Title order={2}>My Mentoring Events</Title>
          
          {!mentorEvents || mentorEvents.length === 0 ? (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconBrain size={30} />
                </ThemeIcon>
                <Stack gap="xs" align="center">
                  <Title order={3} c="dimmed">No Mentor Roles</Title>
                  <Text c="dimmed" ta="center" maw={400}>
                    You&apos;re not currently assigned as a mentor for any events. Contact the organizers to get involved in mentoring opportunities.
                  </Text>
                </Stack>
                <Anchor href={`mailto:${config?.adminEmail ?? ''}`}>
                  <Button leftSection={<IconMessageDots size={16} />}>
                    Express Interest
                  </Button>
                </Anchor>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {mentorEvents.map((event) => (
                <MentorEventCard key={event.id} event={event} />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
"use client";

import { useState } from "react";
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
  IconUsers,
  IconBuilding,
  IconCalendarEvent,
  IconClipboardList,
  IconUserCheck
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getEventIcon, getEventGradient } from "~/utils/eventContent";
import { type EventType } from "~/types/event";
import { CreateEventModal } from "./CreateEventModal";

// Helper function to get Mantine gradient format from event type
function getMantineGradient(eventType: string) {
  // Handle legacy event types that aren't in our EventType union
  if (eventType === "conference") {
    return { from: "green", to: "teal" };
  }
  
  if (eventType === "residency" || eventType === "hackathon") {
    const gradientString = getEventGradient(eventType as EventType);
    // Convert Tailwind gradient to Mantine format
    if (gradientString.includes("blue")) {
      return { from: "blue", to: "cyan" };
    } else if (gradientString.includes("orange")) {
      return { from: "orange", to: "red" };
    }
  }
  
  // Default fallback
  return { from: "purple", to: "pink" };
}

interface EventCardProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
    isOnline: boolean;
    _count?: {
      applications?: number;
      sponsors?: number;
    };
  };
}

function EventCard({ event }: EventCardProps) {
  const Icon = getEventIcon(event.type as EventType) ?? IconCalendarEvent;
  const gradient = getMantineGradient(event.type);
  
  return (
    <Card shadow="lg" padding="xl" radius="md" withBorder h="100%">
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
            <Badge 
              color="green" 
              variant="light" 
              size="sm"
              tt="uppercase"
            >
              Active
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
          </Text>
        </Stack>

        <Stack gap="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconUsers size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                {event._count?.applications ?? 0} Applications
              </Text>
            </Group>
            <Link href={`/admin/events/${event.id}/applications`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="blue" style={{ cursor: 'pointer' }}>
                Manage
              </Badge>
            </Link>
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="orange">
                <IconBuilding size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                {event._count?.sponsors ?? 0} Sponsors
              </Text>
            </Group>
            <Link href={`/admin/events/${event.id}/sponsors`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="orange" style={{ cursor: 'pointer' }}>
                View
              </Badge>
            </Link>
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="green">
                <IconUserCheck size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                Mentors
              </Text>
            </Group>
            <Link href={`/admin/events/${event.id}/mentors`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="green" style={{ cursor: 'pointer' }}>
                Manage
              </Badge>
            </Link>
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="purple">
                <IconClipboardList size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                Selection Rubric
              </Text>
            </Group>
            <Link href={`/admin/events/${event.id}/select-rubric`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="purple" style={{ cursor: 'pointer' }}>
                View
              </Badge>
            </Link>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

type EventWithCounts = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  isOnline: boolean;
  _count?: {
    applications?: number;
    sponsors?: number;
  };
};

export default function EventsClient() {
  const [createModalOpened, setCreateModalOpened] = useState(false);

  // Fetch real events from database
  const { data: events, isLoading } = api.event.getEvents.useQuery();

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

  const eventsWithCounts: EventWithCounts[] = events ?? [];

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
              Events Center
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Manage and explore all active events, track participants and sponsors across our ecosystem.
          </Text>
        </Stack>

        {/* Stats Overview */}
        <Paper p="md" radius="md" withBorder>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="blue">
                {eventsWithCounts.length}
              </Text>
              <Text size="sm" c="dimmed">Active Events</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="green">
                {eventsWithCounts.reduce((sum: number, event: EventWithCounts) => {
                  return sum + (event._count?.applications ?? 0);
                }, 0)}
              </Text>
              <Text size="sm" c="dimmed">Total Applications</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="orange">
                {eventsWithCounts.reduce((sum: number, event: EventWithCounts) => {
                  return sum + (event._count?.sponsors ?? 0);
                }, 0)}
              </Text>
              <Text size="sm" c="dimmed">Total Sponsors</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="purple">
                100%
              </Text>
              <Text size="sm" c="dimmed">Active Rate</Text>
            </Stack>
          </SimpleGrid>
        </Paper>

        {/* Events Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {eventsWithCounts.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </SimpleGrid>

        {/* Additional Actions */}
        <Group justify="center" mt="xl">
          <Button
            variant="light"
            size="lg"
            leftSection={<IconCalendarEvent size={18} />}
            onClick={() => setCreateModalOpened(true)}
          >
            Create New Event
          </Button>
          <Button
            variant="outline"
            size="lg"
            leftSection={<IconUsers size={18} />}
          >
            Manage Participants
          </Button>
          <Button
            variant="outline"
            size="lg"
            leftSection={<IconBuilding size={18} />}
          >
            Sponsor Dashboard
          </Button>
        </Group>
      </Stack>

      <CreateEventModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />
    </Container>
  );
}
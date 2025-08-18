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
  Paper
} from "@mantine/core";
import { 
  IconUsers, 
  IconBuilding, 
  IconCalendarEvent,
  IconHome,
  IconTrophy,
  IconMicrophone,
  IconUmbrella
} from "@tabler/icons-react";
import Link from "next/link";

// Event data - in a real app this would come from your database
const events = [
  {
    id: "residency",
    name: "Residency",
    description: "Intensive residency program for selected participants to work on projects and build connections.",
    type: "residency",
    status: "active",
    icon: IconHome,
    gradient: { from: "blue", to: "cyan" },
    participantsCount: 45,
    sponsorsCount: 12
  },
  {
    id: "hackathon", 
    name: "Hackathon",
    description: "48-hour intensive hackathon where teams compete to build innovative solutions.",
    type: "hackathon",
    status: "active", 
    icon: IconTrophy,
    gradient: { from: "orange", to: "red" },
    participantsCount: 128,
    sponsorsCount: 8
  },
  {
    id: "conference",
    name: "Conference", 
    description: "Multi-day conference featuring keynotes, panels, and networking opportunities.",
    type: "conference",
    status: "active",
    icon: IconMicrophone,
    gradient: { from: "green", to: "teal" },
    participantsCount: 350,
    sponsorsCount: 25
  },
  {
    id: "umbrella",
    name: "Umbrella",
    description: "Overarching program that encompasses multiple events and ongoing initiatives.",
    type: "umbrella", 
    status: "active",
    icon: IconUmbrella,
    gradient: { from: "purple", to: "pink" },
    participantsCount: 500,
    sponsorsCount: 40
  }
];

interface EventCardProps {
  event: typeof events[0];
}

function EventCard({ event }: EventCardProps) {
  const Icon = event.icon;
  
  return (
    <Card shadow="lg" padding="xl" radius="md" withBorder h="100%">
      <Card.Section>
        <Box
          h={120}
          style={{
            background: `linear-gradient(135deg, var(--mantine-color-${event.gradient.from}-6) 0%, var(--mantine-color-${event.gradient.to}-6) 100%)`,
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
              {event.status}
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description}
          </Text>
        </Stack>

        <Stack gap="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconUsers size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                {event.participantsCount} Participants
              </Text>
            </Group>
            <Link href={`/events/${event.id}/participants`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="blue" style={{ cursor: 'pointer' }}>
                View
              </Badge>
            </Link>
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="orange">
                <IconBuilding size={12} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                {event.sponsorsCount} Sponsors
              </Text>
            </Group>
            <Link href={`/events/${event.id}/sponsors`} style={{ textDecoration: 'none' }}>
              <Badge variant="outline" color="orange" style={{ cursor: 'pointer' }}>
                View
              </Badge>
            </Link>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function EventsClient() {
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
                {events.length}
              </Text>
              <Text size="sm" c="dimmed">Active Events</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="green">
                {events.reduce((sum, event) => sum + event.participantsCount, 0)}
              </Text>
              <Text size="sm" c="dimmed">Total Participants</Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="orange">
                {events.reduce((sum, event) => sum + event.sponsorsCount, 0)}
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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </SimpleGrid>

        {/* Additional Actions */}
        <Group justify="center" mt="xl">
          <Button 
            variant="light" 
            size="lg"
            leftSection={<IconCalendarEvent size={18} />}
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
    </Container>
  );
}
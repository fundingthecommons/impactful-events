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
  IconRocket,
  IconCalendarEvent,
  IconUsersGroup,
  IconTrophy,
  IconCheck,
  IconClock,
  IconArrowRight,
  IconMail,
  IconHeart,
  IconBrain,
  IconBuildingBank,
  IconCalendar,
  IconMapPin,
  IconPlus,
  IconEye
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface AvailableEvent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  _count: {
    applications: number;
  };
}

function getEventIcon(type: string) {
  switch (type.toLowerCase()) {
    case "residency":
      return IconRocket;
    case "hackathon":
      return IconTrophy;
    case "conference":
      return IconUsersGroup;
    default:
      return IconCalendarEvent;
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

function OpportunityCard({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  action, 
  actionText 
}: {
  title: string;
  description: string;
  icon: React.FC<any>;
  color: string;
  action: string;
  actionText: string;
}) {
  return (
    <Card withBorder padding="lg" radius="md" style={{ height: "100%" }}>
      <Stack gap="md" style={{ height: "100%" }}>
        <Group>
          <ThemeIcon size="lg" radius="md" color={color} variant="light">
            <Icon size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text fw={600} size="md">{title}</Text>
          </div>
        </Group>
        
        <Text size="sm" c="dimmed" style={{ flex: 1, lineHeight: 1.5 }}>
          {description}
        </Text>
        
        <Anchor href={action}>
          <Button variant="light" fullWidth rightSection={<IconArrowRight size={16} />}>
            {actionText}
          </Button>
        </Anchor>
      </Stack>
    </Card>
  );
}

function EventCard({ event }: { event: AvailableEvent }) {
  const Icon = getEventIcon(event.type);
  const gradient = getEventGradient(event.type);
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
              color={isOngoing ? "green" : isUpcoming ? "blue" : "gray"} 
              variant="light" 
              size="sm"
            >
              {isOngoing ? "Open" : isUpcoming ? "Soon" : "Past"}
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
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

          <Group gap="xs" mt="sm">
            <IconUsersGroup size={14} />
            <Text size="xs" c="dimmed">
              {event._count.applications} applications received
            </Text>
          </Group>
        </Stack>

        <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
          <Button 
            fullWidth
            variant="filled"
            rightSection={<IconArrowRight size={16} />}
            color={gradient.from}
          >
            Learn More & Apply
          </Button>
        </Link>
      </Stack>
    </Card>
  );
}

export default function DefaultUserDashboard() {
  const { data: availableEvents, isLoading: loadingEvents } = api.event.getAvailableEvents.useQuery();
  const { data: userApplications, isLoading: loadingApplications } = api.application.getUserApplications.useQuery();

  if (loadingEvents || loadingApplications) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  const hasApplications = userApplications && userApplications.length > 0;

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'pink', to: 'grape' }}>
              <IconRocket size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Welcome to Funding the Commons
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Join our community of builders, sponsors, and mentors working together to advance public goods funding. 
            Discover events, connect with amazing people, and help build the future of decentralized impact.
          </Text>
        </Stack>

        {/* User's Applications (if any) */}
        {hasApplications && (
          <Stack gap="md">
            <Title order={2}>Your Applications</Title>
            <Link href="/events" style={{ textDecoration: 'none' }}>
              <Button variant="light" leftSection={<IconEye size={16} />}>
                View All Applications
              </Button>
            </Link>
          </Stack>
        )}

        {/* Available Events */}
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2}>Available Events</Title>
            {hasApplications && (
              <Link href="/events" style={{ textDecoration: 'none' }}>
                <Button variant="light" leftSection={<IconPlus size={16} />}>
                  New Application
                </Button>
              </Link>
            )}
          </Group>

          {!availableEvents || availableEvents.length === 0 ? (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconCalendarEvent size={30} />
                </ThemeIcon>
                <Stack gap="xs" align="center">
                  <Title order={3} c="dimmed">No Events Available</Title>
                  <Text c="dimmed" ta="center" maw={400}>
                    There are no events currently accepting applications. Check back soon for new opportunities!
                  </Text>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {availableEvents.slice(0, hasApplications ? 3 : 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </SimpleGrid>
          )}
        </Stack>

        {/* Get Involved Opportunities */}
        <Stack gap="md">
          <Title order={2}>Get Involved</Title>
          <Text c="dimmed" maw={600}>
            There are many ways to contribute to the Funding the Commons ecosystem beyond just attending events.
          </Text>
          
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <OpportunityCard
              title="Become a Mentor"
              description="Share your expertise and guide builders working on public goods projects. Help shape the next generation of impact-driven technologies."
              icon={IconBrain}
              color="teal"
              action="mailto:james@fundingthecommons.io?subject=Mentor Interest"
              actionText="Express Interest"
            />
            
            <OpportunityCard
              title="Sponsor Events"
              description="Support our events and get visibility with top builders in the space. Connect your brand with meaningful impact."
              icon={IconBuildingBank}
              color="violet"
              action="mailto:james@fundingthecommons.io?subject=Sponsorship Inquiry"
              actionText="Learn More"
            />
            
            <OpportunityCard
              title="Organize Events"
              description="Help us create amazing experiences for the community. Organize local meetups, workshops, or larger events."
              icon={IconUsersGroup}
              color="indigo"
              action="mailto:james@fundingthecommons.io?subject=Organizer Interest"
              actionText="Get Started"
            />
          </SimpleGrid>
        </Stack>

        {/* Community Stats */}
        <Paper p="xl" withBorder radius="md" style={{ 
          background: 'linear-gradient(135deg, var(--mantine-color-pink-0) 0%, var(--mantine-color-grape-0) 100%)' 
        }}>
          <Stack gap="md" ta="center">
            <Title order={3} c="grape.7">Join Our Growing Community</Title>
            <Text c="dimmed" maw={500} mx="auto">
              Be part of a vibrant ecosystem of builders, funders, and innovators working together to scale public goods funding.
            </Text>
            
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg" mt="md">
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {availableEvents?.length ?? 0}
                </Text>
                <Text size="sm" c="dimmed">Events Available</Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {userApplications?.length ?? 0}
                </Text>
                <Text size="sm" c="dimmed">Your Applications</Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {userApplications?.filter(app => app.status === "ACCEPTED").length ?? 0}
                </Text>
                <Text size="sm" c="dimmed">Acceptances</Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  ∞
                </Text>
                <Text size="sm" c="dimmed">Opportunities</Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

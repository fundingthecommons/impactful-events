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
  Progress,
  Loader
} from "@mantine/core";
import { 
  IconUsers, 
  IconMail, 
  IconCalendarEvent,
  IconAddressBook,
  IconTrendingUp,
  IconUserPlus,
  IconSend,
  IconEye,
  IconArrowRight,
  IconMailOpened,
  IconBrandGithub,
  IconClipboardCheck,
  IconUserCog,
  IconClipboardList,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function AdminDashboard() {
  // Fetch dashboard data
  const { data: invitationStats, isLoading: loadingInvitations } = api.invitation.getStats.useQuery({});
  const { data: events, isLoading: loadingEvents } = api.event.getEvents.useQuery();
  
  // Calculate some basic stats
  const totalEvents = events?.length ?? 0;
  const activeEvents = events?.filter(event => new Date(event.endDate) > new Date()).length ?? 0;

  if (loadingInvitations || loadingEvents) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Title order={1} mb="xs">Admin Dashboard</Title>
        <Text c="dimmed">Overview of your platform management</Text>
      </div>

      {/* Key Metrics */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        <Paper p="md" radius="md" withBorder>
          <Group>
            <ThemeIcon size="lg" radius="md" color="blue">
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
                {activeEvents} active
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Group>
            <ThemeIcon size="lg" radius="md" color="green">
              <IconMail size={20} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Invitations
              </Text>
              <Text fw={700} size="xl">
                {invitationStats?.total ?? 0}
              </Text>
              <Text size="xs" c="dimmed">
                {invitationStats?.pending ?? 0} pending
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Group>
            <ThemeIcon size="lg" radius="md" color="orange">
              <IconTrendingUp size={20} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Accept Rate
              </Text>
              <Text fw={700} size="xl">
                {invitationStats?.acceptanceRate ?? 0}%
              </Text>
              <Text size="xs" c="dimmed">
                invitation success
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Group>
            <ThemeIcon size="lg" radius="md" color="violet">
              <IconUsers size={20} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Registered
              </Text>
              <Text fw={700} size="xl">
                {invitationStats?.accepted ?? 0}
              </Text>
              <Text size="xs" c="dimmed">
                users signed up
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Quick Actions */}
      <SimpleGrid cols={{ base: 1, md: 3 }} mb="xl">
        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="blue" variant="light">
                <IconUserPlus size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg">User Management</Text>
                <Text size="sm" c="dimmed">
                  Manage existing users and assign event roles
                </Text>
              </div>
            </Group>
            
            <Group justify="space-between">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">Quick Actions:</Text>
                <Group gap="xs">
                  <Badge size="sm" variant="light" color="blue">View All Users</Badge>
                  <Badge size="sm" variant="light" color="green">Assign Roles</Badge>
                </Group>
              </Stack>
              <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                <Button rightSection={<IconArrowRight size={16} />}>
                  Manage Users
                </Button>
              </Link>
            </Group>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="green" variant="light">
                <IconSend size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg">Invitations</Text>
                <Text size="sm" c="dimmed">
                  Send invitations to new users for events
                </Text>
              </div>
            </Group>
            
            <Group justify="space-between">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  {invitationStats?.pending ?? 0} pending • {invitationStats?.accepted ?? 0} accepted
                </Text>
                <Progress 
                  value={invitationStats?.acceptanceRate ?? 0} 
                  color="green" 
                  size="sm"
                />
              </Stack>
              <Link href="/admin/invitations" style={{ textDecoration: 'none' }}>
                <Button rightSection={<IconArrowRight size={16} />}>
                  Manage Invitations
                </Button>
              </Link>
            </Group>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="violet" variant="light">
                <IconClipboardCheck size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg">Review Queue</Text>
                <Text size="sm" c="dimmed">
                  Pick applications to review from the queue
                </Text>
              </div>
            </Group>
            
            <Group justify="space-between">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">Quick Actions:</Text>
                <Group gap="xs">
                  <Badge size="sm" variant="light" color="violet">Self-Assign</Badge>
                  <Badge size="sm" variant="light" color="blue">Review</Badge>
                </Group>
              </Stack>
              <Link href="/admin/events/funding-commons-residency-2025/applications" style={{ textDecoration: 'none' }}>
                <Button rightSection={<IconArrowRight size={16} />}>
                  View Applications
                </Button>
              </Link>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Management Sections */}
      <SimpleGrid cols={{ base: 1, md: 3 }} mb="lg">
        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="orange" variant="light">
                <IconCalendarEvent size={18} />
              </ThemeIcon>
              <Text fw={600}>Events</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Manage events, applications, and event-specific settings
            </Text>
            <Text size="xs" c="dimmed">
              {totalEvents} total events • {activeEvents} active
            </Text>
            <Link href="/admin/events" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                View Events
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="indigo" variant="light">
                <IconMailOpened size={18} />
              </ThemeIcon>
              <Text fw={600}>Communications</Text>
            </Group>
            <Text size="sm" c="dimmed">
              View all communications sent from the platform
            </Text>
            <Text size="xs" c="dimmed">
              Email, Telegram, and message history tracking
            </Text>
            <Link href="/admin/communications" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                View Communications
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="pink" variant="light">
                <IconClipboardList size={18} />
              </ThemeIcon>
              <Text fw={600}>Onboarding</Text>
            </Group>
            <Text size="sm" c="dimmed">
              View and manage participant onboarding submissions
            </Text>
            <Text size="xs" c="dimmed">
              Travel documents, commitments, and completion status
            </Text>
            <Link href="/admin/onboarding" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                View Onboarding
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="cyan" variant="light">
                <IconAddressBook size={18} />
              </ThemeIcon>
              <Text fw={600}>Contacts</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Manage sponsor contacts and relationships
            </Text>
            <Text size="xs" c="dimmed">
              Sponsor contact management
            </Text>
            <Link href="/contacts" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                View Contacts
              </Button>
            </Link>
          </Stack>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="red" variant="light">
                <IconUsers size={18} />
              </ThemeIcon>
              <Text fw={600}>Reviewer Competencies</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Manage reviewer expertise levels for accurate consensus weighting
            </Text>
            <Text size="xs" c="dimmed">
              Technical, project, community, and video assessment competencies
            </Text>
            <Link href="/admin/reviewers" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                Manage Competencies
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="teal" variant="light">
                <IconBrandGithub size={18} />
              </ThemeIcon>
              <Text fw={600}>Project Ideas</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Sync and manage project ideas from GitHub repository
            </Text>
            <Text size="xs" c="dimmed">
              GitHub integration and content sync
            </Text>
            <Link href="/admin/project-sync" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                Manage Sync
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="grape" variant="light">
                <IconTrendingUp size={18} />
              </ThemeIcon>
              <Text fw={600}>Import</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Import data from external sources
            </Text>
            <Text size="xs" c="dimmed">
              Crypto Nomads integration
            </Text>
            <Link href="/crypto-nomads-import" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                Import Data
              </Button>
            </Link>
          </Stack>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="blue" variant="light">
                <IconUserCog size={18} />
              </ThemeIcon>
              <Text fw={600}>Profile Sync</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Bulk sync application data to user profiles
            </Text>
            <Text size="xs" c="dimmed">
              Import accepted application data to enhance user profiles
            </Text>
            <Link href="/admin/profile-sync" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                Manage Profile Sync
              </Button>
            </Link>
          </Stack>
        </Card>
      </SimpleGrid>
    </Container>
  );
}
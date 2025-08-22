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
  IconMailOpened
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
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
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
      </SimpleGrid>

      {/* Management Sections */}
      <SimpleGrid cols={{ base: 1, md: 4 }}>
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
              <Text fw={600}>Sent Emails</Text>
            </Group>
            <Text size="sm" c="dimmed">
              View all emails sent from the platform
            </Text>
            <Text size="xs" c="dimmed">
              Email history and tracking
            </Text>
            <Link href="/admin/emails" style={{ textDecoration: 'none' }}>
              <Button variant="light" fullWidth rightSection={<IconEye size={16} />}>
                View Emails
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
    </Container>
  );
}
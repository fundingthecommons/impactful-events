"use client";

import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import {
  Stack, Title, Text, Badge, Avatar, Group, Paper, Container,
  Divider, Anchor, Button, Loader, Center, Alert
} from "@mantine/core";
import {
  IconWorld, IconBuilding, IconUsers, IconCalendar, IconArrowLeft,
  IconAlertCircle, IconSend
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function OrganizationDetailsPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const organizationId = params.id as string;

  const { data: organization, isLoading, error } = api.sponsor.getSponsor.useQuery(
    { id: organizationId },
    { enabled: !!organizationId }
  );

  const { data: communications } = api.sponsor.getSponsorCommunications.useQuery(
    { sponsorId: organizationId, limit: 20 },
    { enabled: !!organizationId }
  );

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/organizations");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center h="50vh">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading organization details...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error ?? !organization) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Button
            component={Link}
            href="/organizations"
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
          >
            Back to Organizations
          </Button>

          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text fw={500}>Organization Not Found</Text>
            <Text size="sm">
              The organization you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
            </Text>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header with Back Button */}
        <Group justify="space-between">
          <Button
            component={Link}
            href="/organizations"
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
          >
            Back to Organizations
          </Button>
        </Group>

        {/* Organization Header */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Group align="flex-start" gap="xl">
            {/* Logo */}
            {organization.logoUrl ? (
              <Avatar src={organization.logoUrl} size={120} radius="md">
                {organization.name[0]?.toUpperCase()}
              </Avatar>
            ) : (
              <Avatar size={120} color="blue" radius="md">
                <IconBuilding size={60} />
              </Avatar>
            )}

            {/* Info */}
            <Stack gap="md" style={{ flex: 1 }}>
              <div>
                <Title order={1}>{organization.name}</Title>
                {organization.websiteUrl && (
                  <Anchor href={organization.websiteUrl} target="_blank" size="lg" mt="xs">
                    <Group gap={6}>
                      <IconWorld size={18} />
                      Visit Website
                    </Group>
                  </Anchor>
                )}
              </div>

              {/* Statistics Cards */}
              <Group gap="md">
                <Paper p="md" withBorder bg="blue.0" style={{ minWidth: 150 }}>
                  <Stack gap={8} align="center">
                    <IconUsers size={32} color="var(--mantine-color-blue-6)" />
                    <Text size="xl" fw={700}>{organization.contacts.length}</Text>
                    <Text size="sm" c="dimmed">Contacts</Text>
                  </Stack>
                </Paper>
                <Paper p="md" withBorder bg="green.0" style={{ minWidth: 150 }}>
                  <Stack gap={8} align="center">
                    <IconCalendar size={32} color="var(--mantine-color-green-6)" />
                    <Text size="xl" fw={700}>{organization.events.length}</Text>
                    <Text size="sm" c="dimmed">Events</Text>
                  </Stack>
                </Paper>
              </Group>
            </Stack>
          </Group>
        </Paper>

        {/* Main Content Grid */}
        <Group align="flex-start" gap="lg" grow>
          {/* Left Column */}
          <Stack gap="lg">
            {/* Contacts Section */}
            {organization.contacts.length > 0 ? (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>
                    <Group gap="sm">
                      <IconUsers size={24} />
                      Contacts ({organization.contacts.length})
                    </Group>
                  </Title>
                  <Stack gap="xs">
                    {organization.contacts.map(contact => (
                      <Paper
                        key={contact.id}
                        p="md"
                        withBorder
                        component={Link}
                        href={`/contacts/${contact.id}`}
                        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                      >
                        <Group gap="md">
                          <Avatar size="md" color="blue">
                            {contact.firstName[0]?.toUpperCase()}{contact.lastName[0]?.toUpperCase()}
                          </Avatar>
                          <Stack gap={2}>
                            <Text fw={500}>
                              {contact.firstName} {contact.lastName}
                            </Text>
                            {contact.email && (
                              <Text size="sm" c="dimmed">{contact.email}</Text>
                            )}
                          </Stack>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md" align="center" py="xl">
                  <IconUsers size={48} color="var(--mantine-color-dimmed)" />
                  <Text c="dimmed" ta="center">No contacts associated with this organization</Text>
                </Stack>
              </Paper>
            )}
          </Stack>

          {/* Right Column */}
          <Stack gap="lg">
            {/* Events Section */}
            {organization.events.length > 0 ? (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>
                    <Group gap="sm">
                      <IconCalendar size={24} />
                      Events ({organization.events.length})
                    </Group>
                  </Title>
                  <Stack gap="xs">
                    {organization.events.map(eventSponsor => (
                      <Paper key={eventSponsor.id} p="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={4}>
                            <Group gap="sm">
                              <IconCalendar size={16} />
                              <Text fw={500} size="sm">Event ID: {eventSponsor.eventId}</Text>
                            </Group>
                            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                              ID: {eventSponsor.id}
                            </Text>
                          </Stack>
                          {eventSponsor.qualified && (
                            <Badge color="green">Qualified</Badge>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md" align="center" py="xl">
                  <IconCalendar size={48} color="var(--mantine-color-dimmed)" />
                  <Text c="dimmed" ta="center">No events associated with this organization</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Group>

        {/* Communications History */}
        {communications && communications.length > 0 && (
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Stack gap="md">
              <Title order={3}>
                <Group gap="sm">
                  <IconSend size={24} />
                  Communications ({communications.length})
                </Group>
              </Title>
              <Stack gap="xs">
                {communications.map(comm => (
                  <Paper key={comm.id} p="md" withBorder>
                    <Stack gap={8}>
                      <Group justify="space-between" align="flex-start">
                        <Group gap="sm">
                          <Badge size="sm" variant="light" color={comm.channel === 'TELEGRAM' ? 'blue' : 'gray'}>
                            {comm.channel}
                          </Badge>
                          <Badge size="sm" variant="light" color={
                            comm.status === 'SENT' ? 'green' :
                            comm.status === 'FAILED' ? 'red' :
                            'gray'
                          }>
                            {comm.status}
                          </Badge>
                          {comm.contact && (
                            <Anchor component={Link} href={`/contacts/${comm.contact.id}`} size="sm">
                              To: {comm.contact.firstName} {comm.contact.lastName}
                            </Anchor>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {comm.sentAt
                            ? new Date(comm.sentAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(comm.createdAt).toLocaleDateString()}
                        </Text>
                      </Group>
                      {comm.subject && (
                        <Text size="sm" fw={500}>{comm.subject}</Text>
                      )}
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {comm.textContent}
                      </Text>
                      <Group gap="xs">
                        {comm.toTelegram && (
                          <Text size="xs" c="dimmed">
                            To: @{comm.toTelegram}
                          </Text>
                        )}
                        {comm.toEmail && (
                          <Text size="xs" c="dimmed">
                            To: {comm.toEmail}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}

        <Divider />

        {/* Footer Info */}
        <Paper p="md" withBorder bg="gray.0">
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">Organization Information</Text>
            <Group gap="xl">
              <div>
                <Text size="xs" c="dimmed">Organization ID</Text>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>{organization.id}</Text>
              </div>
              {organization.websiteUrl && (
                <div>
                  <Text size="xs" c="dimmed">Website</Text>
                  <Anchor href={organization.websiteUrl} target="_blank" size="sm">
                    {organization.websiteUrl}
                  </Anchor>
                </div>
              )}
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

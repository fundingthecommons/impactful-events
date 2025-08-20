"use client";

import React, { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Select,
  Card,
  SimpleGrid,
  Badge,
  Paper,
  Table,
  ActionIcon,
  Avatar,
  ThemeIcon,
  Alert
} from "@mantine/core";
import { 
  IconArrowLeft, 
  IconUsers, 
  IconCalendar, 
  IconMapPin,
  IconEye,
  IconMail,
  IconInfoCircle
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface Event {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string;
  location: string | null;
  type: string;
}

interface ResidencyApplicationsClientProps {
  residencyEvents: Event[];
}

export default function ResidencyApplicationsClient({ 
  residencyEvents 
}: ResidencyApplicationsClientProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    residencyEvents[0]?.id ?? ""
  );

  // Get applications for the selected event
  const { data: applications, isLoading } = api.application.getEventApplications.useQuery(
    { eventId: selectedEventId },
    { enabled: !!selectedEventId }
  );

  const selectedEvent = residencyEvents.find(e => e.id === selectedEventId);

  const eventOptions = residencyEvents.map(event => ({
    value: event.id,
    label: event.name
  }));

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Residency Applications</Title>
        <Link href="/admin/events" style={{ textDecoration: 'none' }}>
          <Button variant="outline" leftSection={<IconArrowLeft size={16} />}>
            Back to Events
          </Button>
        </Link>
      </Group>

      <Text c="dimmed">
        Manage applications for Builder Residency programs. Review participants, 
        track application status, and coordinate with sponsors.
      </Text>

      {/* Event Selection */}
      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Text fw={500}>Select Residency Event</Text>
          <Select
            placeholder="Choose a residency event"
            data={eventOptions}
            value={selectedEventId}
            onChange={(value) => setSelectedEventId(value ?? "")}
            searchable
          />
          
          {selectedEvent && (
            <Group gap="lg">
              <Group gap="xs">
                <IconCalendar size={16} />
                <Text size="sm" c="dimmed">
                  {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}
                </Text>
              </Group>
              {selectedEvent.location && (
                <Group gap="xs">
                  <IconMapPin size={16} />
                  <Text size="sm" c="dimmed">{selectedEvent.location}</Text>
                </Group>
              )}
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Applications Overview */}
      {selectedEventId && (
        <>
          {isLoading ? (
            <Text>Loading applications...</Text>
          ) : !applications || applications.length === 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} title="No Applications" color="blue">
              <Text>
                No applications have been submitted for this residency event yet.
              </Text>
            </Alert>
          ) : (
            <Stack gap="lg">
              {/* Quick Stats */}
              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <Paper p="md" withBorder>
                  <Group>
                    <ThemeIcon size="lg" color="blue">
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Total Applications
                      </Text>
                      <Text fw={700} size="xl">
                        {applications.length}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper p="md" withBorder>
                  <Group>
                    <ThemeIcon size="lg" color="green">
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Accepted
                      </Text>
                      <Text fw={700} size="xl">
                        {applications.filter(app => app.status === 'ACCEPTED').length}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper p="md" withBorder>
                  <Group>
                    <ThemeIcon size="lg" color="yellow">
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Under Review
                      </Text>
                      <Text fw={700} size="xl">
                        {applications.filter(app => app.status === 'UNDER_REVIEW').length}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper p="md" withBorder>
                  <Group>
                    <ThemeIcon size="lg" color="red">
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Pending
                      </Text>
                      <Text fw={700} size="xl">
                        {applications.filter(app => app.status === 'SUBMITTED').length}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </SimpleGrid>

              {/* Applications Table */}
              <Card withBorder>
                <Stack gap="md">
                  <Title order={4}>Applications</Title>
                  
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Applicant</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Submitted</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {applications.map((application) => (
                        <Table.Tr key={application.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar size="sm" radius="xl">
                                {application.email?.[0]?.toUpperCase() ?? 'A'}
                              </Avatar>
                              <Text fw={500}>
                                {application.user?.name ?? 'Anonymous'}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{application.email}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={getStatusColor(application.status)} 
                              variant="light"
                              size="sm"
                            >
                              {application.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {application.submittedAt 
                                ? formatDate(application.submittedAt)
                                : 'Draft'
                              }
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon 
                                variant="light" 
                                color="blue"
                                component={Link}
                                href={`/admin/events/${selectedEventId}/applications`}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                              {application.email && (
                                <ActionIcon 
                                  variant="light" 
                                  color="green"
                                  component="a"
                                  href={`mailto:${application.email}`}
                                >
                                  <IconMail size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>

              {/* Quick Actions */}
              <Group justify="end">
                <Link 
                  href={`/admin/events/${selectedEventId}/applications`} 
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="filled">
                    Detailed Application Management
                  </Button>
                </Link>
              </Group>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return 'green';
    case 'UNDER_REVIEW':
      return 'yellow';
    case 'SUBMITTED':
      return 'blue';
    case 'REJECTED':
      return 'red';
    case 'WAITLISTED':
      return 'orange';
    default:
      return 'gray';
  }
}
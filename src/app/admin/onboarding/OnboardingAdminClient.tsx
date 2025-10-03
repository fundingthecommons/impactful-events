"use client";

import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Table,
  Paper,
  Badge,
  Button,
  Group,
  Stack,
  Modal,
  Anchor,
  Divider,
  Card,
  Grid,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEye, IconDownload, IconCheck, IconX, IconClock } from "@tabler/icons-react";
import Link from "next/link";

interface OnboardingSubmission {
  id: string;
  completed: boolean;
  submittedAt: Date | null;
  eTicketUrl: string | null;
  healthInsuranceUrl: string | null;
  participateExperiments: boolean | null;
  mintHypercert: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  application: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
    event: {
      id: string;
      name: string;
    };
  };
}

interface OnboardingAdminClientProps {
  onboardingData: OnboardingSubmission[];
}

function getStatusBadge(submission: OnboardingSubmission) {
  if (submission.completed && submission.submittedAt) {
    return <Badge color="green" leftSection={<IconCheck size={12} />}>Completed</Badge>;
  }
  
  if (!submission.completed && (submission.eTicketUrl || submission.healthInsuranceUrl)) {
    return <Badge color="yellow" leftSection={<IconClock size={12} />}>In Progress</Badge>;
  }
  
  return <Badge color="gray" leftSection={<IconX size={12} />}>Not Started</Badge>;
}

function OnboardingDetailModal({ 
  submission, 
  opened, 
  onClose 
}: { 
  submission: OnboardingSubmission | null;
  opened: boolean;
  onClose: () => void;
}) {
  if (!submission) return null;

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={`Onboarding Details - ${submission.application.user.name}`}
      size="lg"
    >
      <Stack gap="md">
        <Card withBorder p="md">
          <Title order={4} mb="sm">Participant Information</Title>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Name</Text>
              <Text size="sm" c="dimmed">{submission.application.user.name ?? "N/A"}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Email</Text>
              <Text size="sm" c="dimmed">{submission.application.user.email ?? "N/A"}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Event</Text>
              <Text size="sm" c="dimmed">{submission.application.event.name}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Status</Text>
              {getStatusBadge(submission)}
            </Grid.Col>
          </Grid>
        </Card>

        <Card withBorder p="md">
          <Title order={4} mb="sm">Travel Documents</Title>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>E-Ticket</Text>
              {submission.eTicketUrl ? (
                <Anchor href={submission.eTicketUrl} target="_blank" size="sm">
                  View E-Ticket <IconDownload size={12} />
                </Anchor>
              ) : (
                <Text size="sm" c="dimmed">Not provided</Text>
              )}
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Health Insurance</Text>
              {submission.healthInsuranceUrl ? (
                <Anchor href={submission.healthInsuranceUrl} target="_blank" size="sm">
                  View Insurance <IconDownload size={12} />
                </Anchor>
              ) : (
                <Text size="sm" c="dimmed">Not provided</Text>
              )}
            </Grid.Col>
          </Grid>
        </Card>

        <Card withBorder p="md">
          <Title order={4} mb="sm">Commitments</Title>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Participate in Experiments</Text>
              <Badge 
                color={submission.participateExperiments ? "green" : "red"} 
                size="sm"
                leftSection={submission.participateExperiments ? <IconCheck size={12} /> : <IconX size={12} />}
              >
                {submission.participateExperiments ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Mint Hypercert</Text>
              <Badge 
                color={submission.mintHypercert ? "green" : "red"} 
                size="sm"
                leftSection={submission.mintHypercert ? <IconCheck size={12} /> : <IconX size={12} />}
              >
                {submission.mintHypercert ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
          </Grid>
        </Card>

        <Card withBorder p="md">
          <Title order={4} mb="sm">Timestamps</Title>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Created</Text>
              <Text size="sm" c="dimmed">
                {submission.createdAt.toLocaleDateString()} {submission.createdAt.toLocaleTimeString()}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>Last Updated</Text>
              <Text size="sm" c="dimmed">
                {submission.updatedAt.toLocaleDateString()} {submission.updatedAt.toLocaleTimeString()}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>Submitted</Text>
              <Text size="sm" c="dimmed">
                {submission.submittedAt 
                  ? `${submission.submittedAt.toLocaleDateString()} ${submission.submittedAt.toLocaleTimeString()}`
                  : "Not submitted yet"
                }
              </Text>
            </Grid.Col>
          </Grid>
        </Card>
      </Stack>
    </Modal>
  );
}

export default function OnboardingAdminClient({ onboardingData }: OnboardingAdminClientProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedSubmission, setSelectedSubmission] = useState<OnboardingSubmission | null>(null);

  const handleViewDetails = (submission: OnboardingSubmission) => {
    setSelectedSubmission(submission);
    open();
  };

  const completedCount = onboardingData.filter(s => s.completed).length;
  const inProgressCount = onboardingData.filter(s => !s.completed && (s.eTicketUrl || s.healthInsuranceUrl)).length;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="sm">Onboarding Management</Title>
          <Text c="dimmed">
            Manage and review participant onboarding submissions for events
          </Text>
        </div>

        {/* Stats Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="blue">
                {onboardingData.length}
              </Text>
              <Text size="sm" c="dimmed">Total Submissions</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="green">
                {completedCount}
              </Text>
              <Text size="sm" c="dimmed">Completed</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="yellow">
                {inProgressCount}
              </Text>
              <Text size="sm" c="dimmed">In Progress</Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Onboarding Table */}
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Participant</Table.Th>
                <Table.Th>Event</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Documents</Table.Th>
                <Table.Th>Submitted</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {onboardingData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center" py="xl">
                    <Text c="dimmed">No onboarding submissions found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                onboardingData.map((submission) => (
                  <Table.Tr key={submission.id}>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{submission.application.user.name ?? "Unknown"}</Text>
                        <Text size="sm" c="dimmed">{submission.application.user.email}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{submission.application.event.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      {getStatusBadge(submission)}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {submission.eTicketUrl && (
                          <Tooltip label="E-Ticket provided">
                            <Badge size="xs" color="blue">✈️</Badge>
                          </Tooltip>
                        )}
                        {submission.healthInsuranceUrl && (
                          <Tooltip label="Health insurance provided">
                            <Badge size="xs" color="green">🏥</Badge>
                          </Tooltip>
                        )}
                        {!submission.eTicketUrl && !submission.healthInsuranceUrl && (
                          <Text size="sm" c="dimmed">None</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {submission.submittedAt 
                          ? submission.submittedAt.toLocaleDateString()
                          : "Not submitted"
                        }
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => handleViewDetails(submission)}
                          title="View details"
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          component={Link}
                          href={`/admin/events/${submission.application.event.id}/applications`}
                          title="View application"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <OnboardingDetailModal 
        submission={selectedSubmission}
        opened={opened}
        onClose={close}
      />
    </Container>
  );
}
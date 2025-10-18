"use client";

import { useState } from "react";
import {
  Drawer,
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Tabs,
  Card,
  Table,
  Button,
  Loader,
  Avatar,
  Divider,
  Alert,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
  IconUser,
  IconMail,
  IconCalendar,
  IconEye,
  IconUsers,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface ApplicationDetailsDrawerProps {
  applicationId: string | null;
  opened: boolean;
  onClose: () => void;
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
    case "DRAFT":
      return <IconClock size={16} />;
    case "SUBMITTED":
      return <IconUpload size={16} />;
    case "UNDER_REVIEW":
      return <IconClock size={16} />;
    case "ACCEPTED":
      return <IconCheck size={16} />;
    case "REJECTED":
      return <IconX size={16} />;
    case "WAITLISTED":
      return <IconAlertTriangle size={16} />;
    default:
      return null;
  }
}

export default function ApplicationDetailsDrawer({
  applicationId,
  opened,
  onClose,
}: ApplicationDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Fetch application details
  const { data: application, isLoading, error, refetch } = api.application.getApplicationById.useQuery(
    { applicationId: applicationId! },
    { enabled: !!applicationId && opened }
  );

  // Status update mutation
  const updateApplicationStatus = api.application.updateApplicationStatus.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Application status updated successfully",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleStatusUpdate = (status: "ACCEPTED" | "REJECTED") => {
    if (!applicationId) return;
    updateApplicationStatus.mutate({ applicationId, status });
  };

  if (!opened) {
    return null;
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title=""
      size="lg"
      position="right"
      overlayProps={{ opacity: 0.55, blur: 3 }}
    >
      {isLoading && (
        <Group justify="center" mt="xl">
          <Loader size="xl" />
        </Group>
      )}

      {error && (
        <Alert
          icon={<IconAlertTriangle size="1rem" />}
          title="Error"
          color="red"
          mt="md"
        >
          {error.message}
        </Alert>
      )}

      {application && (
        <Stack gap="md">
          {/* Header */}
          <Card withBorder p="md">
            <Group justify="space-between" align="flex-start">
              <Group align="flex-start" gap="md">
                <Avatar size="lg" color="blue">
                  <IconUser size="1.5rem" />
                </Avatar>
                <div>
                  <Title order={3} mb="xs">
                    {application.user?.name ?? "Unknown"}
                  </Title>
                  <Group gap="xs" mb="xs">
                    <IconMail size={16} />
                    <Text size="sm" c="dimmed">
                      {application.email}
                    </Text>
                  </Group>
                  <Badge
                    color={getStatusColor(application.status)}
                    variant="light"
                    size="lg"
                    leftSection={getStatusIcon(application.status)}
                  >
                    {application.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
              </Group>
              <Group gap="xs">
                {application.status !== "ACCEPTED" && (
                  <Button
                    variant="light"
                    color="green"
                    size="sm"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleStatusUpdate("ACCEPTED")}
                    loading={updateApplicationStatus.isPending}
                  >
                    Accept
                  </Button>
                )}
                {application.status !== "REJECTED" && (
                  <Button
                    variant="light"
                    color="red"
                    size="sm"
                    leftSection={<IconX size={16} />}
                    onClick={() => handleStatusUpdate("REJECTED")}
                    loading={updateApplicationStatus.isPending}
                  >
                    Reject
                  </Button>
                )}
              </Group>
            </Group>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "overview")}>
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconEye size="0.8rem" />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="responses" leftSection={<IconMail size="0.8rem" />}>
                Responses
              </Tabs.Tab>
              <Tabs.Tab value="reviewers" leftSection={<IconUsers size="0.8rem" />}>
                Reviewers
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack gap="md">
                <Card withBorder p="md">
                  <Title order={4} mb="md">Application Details</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={500}>Event:</Text>
                      <Text>{application.event?.name}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={500}>Type:</Text>
                      <Badge variant="light" color="blue">
                        {application.applicationType}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={500}>Language:</Text>
                      <Text>{application.language?.toUpperCase()}</Text>
                    </Group>
                    {application.submittedAt && (
                      <Group justify="space-between">
                        <Text fw={500}>Submitted:</Text>
                        <Group gap="xs">
                          <IconCalendar size={16} />
                          <Text>{new Date(application.submittedAt).toLocaleDateString()}</Text>
                        </Group>
                      </Group>
                    )}
                    {application.affiliation && (
                      <Group justify="space-between">
                        <Text fw={500}>Affiliation:</Text>
                        <Text>{application.affiliation}</Text>
                      </Group>
                    )}
                  </Stack>
                </Card>

                {application.user?.profile && (
                  <Card withBorder p="md">
                    <Title order={4} mb="md">Profile Information</Title>
                    <Stack gap="sm">
                      {application.user.profile.bio && (
                        <div>
                          <Text fw={500} mb="xs">Bio:</Text>
                          <Text size="sm">{application.user.profile.bio}</Text>
                        </div>
                      )}
                      {application.user.profile.company && (
                        <Group justify="space-between">
                          <Text fw={500}>Company:</Text>
                          <Text>{application.user.profile.company}</Text>
                        </Group>
                      )}
                      {application.user.profile.location && (
                        <Group justify="space-between">
                          <Text fw={500}>Location:</Text>
                          <Text>{application.user.profile.location}</Text>
                        </Group>
                      )}
                      {application.user.profile.skills && application.user.profile.skills.length > 0 && (
                        <div>
                          <Text fw={500} mb="xs">Skills:</Text>
                          <Group gap="xs">
                            {application.user.profile.skills.map((skill, index) => (
                              <Badge key={index} variant="light" size="sm">
                                {skill}
                              </Badge>
                            ))}
                          </Group>
                        </div>
                      )}
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="responses" pt="md">
              <Card withBorder p="md">
                <Title order={4} mb="md">Application Responses</Title>
                {application.responses.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No responses found
                  </Text>
                ) : (
                  <Stack gap="md">
                    {application.responses.map((response) => (
                      <div key={response.id}>
                        <Text fw={500} mb="xs">
                          {response.question.questionEn}
                          {response.question.required && (
                            <Text component="span" c="red" ml="xs">*</Text>
                          )}
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          {response.question.questionKey}
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {response.answer || <Text c="dimmed">No answer provided</Text>}
                          </Text>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    ))}
                  </Stack>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="reviewers" pt="md">
              <Card withBorder p="md">
                <Title order={4} mb="md">Reviewer Assignments</Title>
                {application.reviewerAssignments.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No reviewers assigned
                  </Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Reviewer</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Assigned</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {application.reviewerAssignments.map((assignment) => (
                        <Table.Tr key={assignment.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar src={assignment.reviewer.image} size="sm">
                                {assignment.reviewer.name?.[0]}
                              </Avatar>
                              <Text size="sm">{assignment.reviewer.name}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{assignment.reviewer.email}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {new Date(assignment.assignedAt).toLocaleDateString()}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Drawer>
  );
}
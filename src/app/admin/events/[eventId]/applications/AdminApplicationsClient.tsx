"use client";

import { useState } from "react";
import { 
  Container, 
  Title, 
  Text, 
  Card,
  Group, 
  Stack, 
  Button,
  Badge,
  Table,
  Checkbox,
  Select,
  TextInput,
  ActionIcon,
  Modal,
  Paper,
  Loader,
  Menu,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { 
  IconArrowLeft,
  IconFilter,
  IconDownload,
  IconEye,
  IconCheck,
  IconX,
  IconClock,
  IconSearch,
  IconDots,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
};

type ApplicationWithUser = {
  id: string;
  email: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED";
  submittedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
      questionEn: string;
      questionEs: string;
    };
  }>;
};

interface AdminApplicationsClientProps {
  event: Event;
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
    case "ACCEPTED":
      return IconCheck;
    case "REJECTED":
      return IconX;
    default:
      return IconClock;
  }
}

export default function AdminApplicationsClient({ event }: AdminApplicationsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [viewingApplication, setViewingApplication] = useState<ApplicationWithUser | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // Fetch applications
  const { data: applications, isLoading, refetch } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: statusFilter ? (statusFilter as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED") : undefined,
  });

  // API mutations
  const updateStatus = api.application.updateApplicationStatus.useMutation();
  const bulkUpdateStatus = api.application.bulkUpdateApplicationStatus.useMutation();

  // Filter applications based on search
  const filteredApplications = applications?.filter(app => 
    !searchQuery || 
    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  // Handle individual application selection
  const toggleApplicationSelection = (applicationId: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(applicationId)) {
      newSelection.delete(applicationId);
    } else {
      newSelection.add(applicationId);
    }
    setSelectedApplications(newSelection);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)));
    }
  };

  // Handle individual status change
  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        applicationId,
        status: newStatus as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED",
      });
      
      notifications.show({
        title: "Success",
        message: "Application status updated successfully",
        color: "green",
        icon: <IconCheck />,
      });
      
      void refetch();
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to update application status",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Handle bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedApplications.size === 0) return;

    try {
      await bulkUpdateStatus.mutateAsync({
        applicationIds: Array.from(selectedApplications),
        status: newStatus as "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED",
      });
      
      notifications.show({
        title: "Success",
        message: `Updated ${selectedApplications.size} application(s) successfully`,
        color: "green",
        icon: <IconCheck />,
      });
      
      setSelectedApplications(new Set());
      void refetch();
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to update applications",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // View application details
  const viewApplication = (application: ApplicationWithUser) => {
    setViewingApplication(application);
    openModal();
  };

  // Export applications (basic CSV export)
  const exportApplications = () => {
    if (!applications || applications.length === 0) return;

    const csvData = applications.map(app => ({
      email: app.email,
      name: app.user?.name ?? "",
      status: app.status,
      submittedAt: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "",
      createdAt: new Date(app.createdAt).toLocaleDateString(),
    }));

    const headers = ["Email", "Name", "Status", "Submitted At", "Created At"];
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_applications.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusOptions = [
    { value: "SUBMITTED", label: "Submitted" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
    { value: "WAITLISTED", label: "Waitlisted" },
  ];

  const applicationStats = applications ? {
    total: applications.length,
    submitted: applications.filter(app => app.status === "SUBMITTED").length,
    underReview: applications.filter(app => app.status === "UNDER_REVIEW").length,
    accepted: applications.filter(app => app.status === "ACCEPTED").length,
    rejected: applications.filter(app => app.status === "REJECTED").length,
    waitlisted: applications.filter(app => app.status === "WAITLISTED").length,
  } : null;

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Loader size="lg" />
          <Text c="dimmed">Loading applications...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Stack gap="xs">
            <Link href="/admin/events" style={{ textDecoration: 'none' }}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                Back to Events
              </Button>
            </Link>
            <Title order={1}>
              Applications for {event.name}
            </Title>
            <Text c="dimmed">
              Manage and review applications for this event
            </Text>
          </Stack>
        </Group>

        {/* Stats Cards */}
        {applicationStats && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-around">
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="blue">
                  {applicationStats.total}
                </Text>
                <Text size="sm" c="dimmed">Total Applications</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="orange">
                  {applicationStats.submitted}
                </Text>
                <Text size="sm" c="dimmed">Submitted</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="yellow">
                  {applicationStats.underReview}
                </Text>
                <Text size="sm" c="dimmed">Under Review</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="green">
                  {applicationStats.accepted}
                </Text>
                <Text size="sm" c="dimmed">Accepted</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="red">
                  {applicationStats.rejected}
                </Text>
                <Text size="sm" c="dimmed">Rejected</Text>
              </Stack>
            </Group>
          </Card>
        )}

        {/* Filters and Actions */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="md">
              <TextInput
                placeholder="Search by name or email..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
              <Select
                placeholder="Filter by status"
                leftSection={<IconFilter size={16} />}
                data={[
                  { value: "", label: "All Statuses" },
                  ...statusOptions,
                ]}
                value={statusFilter ?? ""}
                onChange={(value) => setStatusFilter(value ?? null)}
                clearable
              />
            </Group>
            
            <Group gap="md">
              {selectedApplications.size > 0 && (
                <Menu position="bottom-end">
                  <Menu.Target>
                    <Button variant="outline">
                      Bulk Actions ({selectedApplications.size})
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {statusOptions.map((option) => (
                      <Menu.Item
                        key={option.value}
                        onClick={() => handleBulkStatusChange(option.value)}
                      >
                        Set to {option.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              )}
              
              <Button
                variant="outline"
                leftSection={<IconDownload size={16} />}
                onClick={exportApplications}
                disabled={!applications || applications.length === 0}
              >
                Export CSV
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Applications Table */}
        <Paper shadow="sm" radius="md" withBorder>
          {filteredApplications.length === 0 ? (
            <Stack align="center" p="xl" gap="md">
              <IconUsers size={48} stroke={1} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed">No applications found</Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Checkbox
                        checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                        indeterminate={selectedApplications.size > 0 && selectedApplications.size < filteredApplications.length}
                        onChange={toggleSelectAll}
                      />
                    </Table.Th>
                    <Table.Th>Applicant</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Submitted</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredApplications.map((application) => {
                    const StatusIcon = getStatusIcon(application.status);
                    
                    return (
                      <Table.Tr key={application.id}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedApplications.has(application.id)}
                            onChange={() => toggleApplicationSelection(application.id)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={500}>
                              {application.user?.name ?? "No name provided"}
                            </Text>
                            <Text size="sm" c="dimmed">
                              {application.email}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={getStatusColor(application.status)}
                            variant="light"
                            leftSection={<StatusIcon size={12} />}
                          >
                            {application.status.replace("_", " ")}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {application.submittedAt
                              ? new Date(application.submittedAt).toLocaleDateString()
                              : "Draft"
                            }
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              onClick={() => viewApplication(application)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                            
                            <Menu position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {statusOptions.map((option) => (
                                  <Menu.Item
                                    key={option.value}
                                    onClick={() => handleStatusChange(application.id, option.value)}
                                    disabled={application.status === option.value}
                                  >
                                    Set to {option.label}
                                  </Menu.Item>
                                ))}
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>

      {/* Application Detail Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Application Details"
        size="lg"
      >
        {viewingApplication && (
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap="xs">
                <Text fw={500}>
                  {viewingApplication.user?.name ?? "No name provided"}
                </Text>
                <Text size="sm" c="dimmed">
                  {viewingApplication.email}
                </Text>
              </Stack>
              <Badge color={getStatusColor(viewingApplication.status)} variant="light">
                {viewingApplication.status.replace("_", " ")}
              </Badge>
            </Group>
            
            <Divider />
            
            <Stack gap="sm">
              <Text fw={500}>Responses:</Text>
              {viewingApplication.responses.map((response) => (
                <Paper key={response.id} p="sm" withBorder>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {response.question.questionEn}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {response.answer}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
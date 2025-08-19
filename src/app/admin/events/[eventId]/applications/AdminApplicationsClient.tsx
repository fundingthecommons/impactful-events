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
  TextInput,
  ActionIcon,
  Drawer,
  Paper,
  Loader,
  Menu,
  Tabs,
  ScrollArea,
  Box,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { 
  IconArrowLeft,
  IconDownload,
  IconEye,
  IconCheck,
  IconX,
  IconClock,
  IconSearch,
  IconDots,
  IconUsers,
  IconEdit,
  IconChecklist,
  IconMail,
  IconSend,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import EditableApplicationForm from "~/app/_components/EditableApplicationForm";

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
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [viewingApplication, setViewingApplication] = useState<ApplicationWithUser | null>(null);
  const [editingApplication, setEditingApplication] = useState<ApplicationWithUser | null>(null);
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] = useDisclosure(false);
  const [editDrawerOpened, { open: openEditDrawer, close: closeEditDrawer }] = useDisclosure(false);
  const [actionsTab, setActionsTab] = useState<string>("next");

  // Fetch emails for the currently viewing application
  const { data: applicationEmails } = api.email.getApplicationEmails.useQuery(
    { applicationId: viewingApplication?.id ?? "" },
    { enabled: !!viewingApplication?.id && viewDrawerOpened }
  );

  // Determine status filter based on active tab
  const getStatusForTab = (tab: string) => {
    switch (tab) {
      case "under_review":
        return "UNDER_REVIEW" as const;
      case "accepted":
        return "ACCEPTED" as const;
      case "rejected":
        return "REJECTED" as const;
      case "all":
      default:
        return undefined;
    }
  };

  // Fetch applications based on active tab
  const { data: applications, isLoading } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: getStatusForTab(activeTab),
  });

  // Fetch counts for tab badges
  const { data: allApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
  });
  const { data: underReviewApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "UNDER_REVIEW",
  });
  const { data: acceptedApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "ACCEPTED",
  });
  const { data: rejectedApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "REJECTED",
  });

  // Get tRPC utils for invalidation
  const utils = api.useUtils();

  // API mutations
  const updateStatus = api.application.updateApplicationStatus.useMutation();
  const bulkUpdateStatus = api.application.bulkUpdateApplicationStatus.useMutation();
  const createMissingInfoEmail = api.email.createMissingInfoEmail.useMutation();
  const sendEmail = api.email.sendEmail.useMutation();
  const deleteEmail = api.email.deleteEmail.useMutation();

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
      
      // Invalidate all application queries to refresh all tabs immediately
      await utils.application.getEventApplications.invalidate({ eventId: event.id });
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
      // Invalidate all application queries to refresh all tabs immediately
      await utils.application.getEventApplications.invalidate({ eventId: event.id });
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
    openViewDrawer();
  };

  // Edit application
  const editApplication = (application: ApplicationWithUser) => {
    setEditingApplication(application);
    openEditDrawer();
  };

  // Check application for missing information
  const handleCheckApplication = async (applicationId: string) => {
    try {
      await createMissingInfoEmail.mutateAsync({
        applicationId,
      });
      
      notifications.show({
        title: "Email Draft Created",
        message: "Missing information email draft has been created and can be reviewed in the application details.",
        color: "blue",
        icon: <IconChecklist />,
      });
      
      // Refresh emails if viewing this application
      if (viewingApplication?.id === applicationId) {
        await utils.email.getApplicationEmails.invalidate({ applicationId });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to create email draft",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Send a draft email
  const handleSendEmail = async (emailId: string) => {
    try {
      const result = await sendEmail.mutateAsync({ emailId });
      
      if (result.success) {
        notifications.show({
          title: "Email Sent",
          message: "Email has been sent successfully",
          color: "green",
          icon: <IconCheck />,
        });
      } else {
        notifications.show({
          title: "Email Failed",
          message: result.error ?? "Failed to send email",
          color: "red",
          icon: <IconX />,
        });
      }
      
      // Refresh emails
      if (viewingApplication?.id) {
        await utils.email.getApplicationEmails.invalidate({ applicationId: viewingApplication.id });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to send email",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Delete a draft email
  const handleDeleteEmail = async (emailId: string) => {
    try {
      await deleteEmail.mutateAsync({ emailId });
      
      notifications.show({
        title: "Email Deleted",
        message: "Draft email has been deleted",
        color: "blue",
        icon: <IconCheck />,
      });
      
      // Refresh emails
      if (viewingApplication?.id) {
        await utils.email.getApplicationEmails.invalidate({ applicationId: viewingApplication.id });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to delete email",
        color: "red",
        icon: <IconX />,
      });
    }
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

        {/* Tabs for Application Status */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "all")}>
          <Tabs.List grow>
            <Tabs.Tab value="all">
              All Applications
              {allApplications && (
                <Badge size="sm" variant="light" ml="xs">
                  {allApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="under_review">
              Under Review
              {underReviewApplications && (
                <Badge size="sm" variant="light" color="yellow" ml="xs">
                  {underReviewApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="accepted">
              Accepted
              {acceptedApplications && (
                <Badge size="sm" variant="light" color="green" ml="xs">
                  {acceptedApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="rejected">
              Rejected
              {rejectedApplications && (
                <Badge size="sm" variant="light" color="red" ml="xs">
                  {rejectedApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} mt="md">
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
            </Group>
            
            <Group gap="md">
              {selectedApplications.size > 0 && (
                <Menu position="bottom-end">
                  <Menu.Target>
                    <Button 
                      variant="outline"
                      loading={bulkUpdateStatus.isPending}
                    >
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

                            <ActionIcon
                              variant="subtle"
                              onClick={() => editApplication(application)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>

                            {application.status === "UNDER_REVIEW" && (
                              <ActionIcon
                                variant="subtle"
                                color="orange"
                                onClick={() => void handleCheckApplication(application.id)}
                                loading={createMissingInfoEmail.isPending}
                                title="Check for missing information"
                              >
                                <IconChecklist size={16} />
                              </ActionIcon>
                            )}
                            
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
                                    onClick={() => void handleStatusChange(application.id, option.value)}
                                    disabled={application.status === option.value || updateStatus.isPending}
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
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Application Detail Drawer */}
      <Drawer
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
        position="right"
        size="lg"
        title="Application Details"
        padding="xl"
      >
        <ScrollArea h="100%" offsetScrollbars>
          {viewingApplication && (
            <Stack gap="xl">
              {/* Applicant Header */}
              <Paper p="lg" withBorder radius="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text size="xl" fw={600} mb="xs">
                        {viewingApplication.user?.name ?? "No name provided"}
                      </Text>
                      <Anchor href={`mailto:${viewingApplication.email}`} size="md" c="blue">
                        {viewingApplication.email}
                      </Anchor>
                    </Box>
                    <Badge size="lg" color={getStatusColor(viewingApplication.status)} variant="light">
                      {viewingApplication.status.replace("_", " ")}
                    </Badge>
                  </Group>
                  
                  <Group gap="xl" mt="md">
                    <Box>
                      <Text size="sm" c="dimmed" fw={500}>Submitted</Text>
                      <Text size="sm">
                        {viewingApplication.submittedAt
                          ? new Date(viewingApplication.submittedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long", 
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Draft (not submitted)"
                        }
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed" fw={500}>Created</Text>
                      <Text size="sm">
                        {new Date(viewingApplication.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </Box>
                  </Group>
                </Stack>
              </Paper>

              {/* Actions Tabs */}
              <Tabs value={actionsTab} onChange={(value) => setActionsTab(value ?? "next")}>
                <Tabs.List>
                  <Tabs.Tab value="next">
                    Next Actions
                  </Tabs.Tab>
                  <Tabs.Tab value="previous">
                    Previous Actions
                    {applicationEmails && applicationEmails.filter(e => e.status === "SENT").length > 0 && (
                      <Badge size="sm" variant="light" color="blue" ml="xs">
                        {applicationEmails.filter(e => e.status === "SENT").length}
                      </Badge>
                    )}
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="next" mt="md">
                  <Stack gap="lg">
                    {/* Show appropriate next action based on status */}
                    <Paper p="lg" withBorder radius="md">
                      {viewingApplication.status === "UNDER_REVIEW" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconChecklist size={20} color="orange" />
                            <Text fw={600} color="orange.7">Review Application</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            Review the application for completeness and missing information. If fields are missing, 
                            you can create and send an email to request additional information from the applicant.
                          </Text>
                          <Button
                            size="sm"
                            variant="filled"
                            color="orange"
                            leftSection={<IconChecklist size={16} />}
                            onClick={() => void handleCheckApplication(viewingApplication.id)}
                            loading={createMissingInfoEmail.isPending}
                          >
                            Check for Missing Information
                          </Button>
                        </Stack>
                      ) : viewingApplication.status === "ACCEPTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconCheck size={20} color="green" />
                            <Text fw={600} color="green.7">Application Accepted</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This applicant has been accepted. Consider sending a welcome email or onboarding information.
                          </Text>
                        </Stack>
                      ) : viewingApplication.status === "REJECTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconX size={20} color="red" />
                            <Text fw={600} color="red.7">Application Rejected</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This application has been rejected. Consider sending a rejection email with feedback if appropriate.
                          </Text>
                        </Stack>
                      ) : viewingApplication.status === "WAITLISTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconClock size={20} color="yellow" />
                            <Text fw={600} color="yellow.7">Application Waitlisted</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This applicant is on the waitlist. Monitor for available spots and notify when status changes.
                          </Text>
                        </Stack>
                      ) : (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconClock size={20} color="blue" />
                            <Text fw={600} color="blue.7">Application Submitted</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This application has been submitted and is ready for review. Change status to &ldquo;Under Review&rdquo; to begin evaluation.
                          </Text>
                        </Stack>
                      )}
                    </Paper>

                    {/* Draft Emails - Show as pending next actions */}
                    {applicationEmails && applicationEmails.filter(email => email.status === "DRAFT").length > 0 && (
                      <Stack gap="md">
                        <Text size="md" fw={600} c="orange.7">Pending Email Actions</Text>
                        {applicationEmails.filter(email => email.status === "DRAFT").map((email) => (
                          <Paper key={email.id} p="lg" withBorder radius="md" bg="orange.0">
                            <Stack gap="md">
                              <Group justify="space-between" align="flex-start">
                                <Box flex={1}>
                                  <Group gap="xs" mb="xs">
                                    <Badge color="blue" variant="light">
                                      DRAFT
                                    </Badge>
                                    <Badge variant="outline" color="gray">
                                      {email.type.replace("_", " ")}
                                    </Badge>
                                  </Group>
                                  <Text fw={600} size="md" mb="xs">
                                    {email.subject}
                                  </Text>
                                  <Text size="sm" c="dimmed" mb="sm">
                                    To: {email.toEmail} • Created: {new Date(email.createdAt).toLocaleDateString()}
                                  </Text>
                                  {email.type === "MISSING_INFO" && email.missingFields.length > 0 && (
                                    <Paper p="md" bg="orange.1" radius="sm" mb="md">
                                      <Group gap="xs" mb="xs">
                                        <IconAlertCircle size={16} color="orange" />
                                        <Text size="sm" fw={500} c="orange.7">Missing Fields:</Text>
                                      </Group>
                                      <Text size="sm" c="orange.7">
                                        {email.missingFields.map(field => field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())).join(", ")}
                                      </Text>
                                    </Paper>
                                  )}
                                </Box>
                                
                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    variant="filled"
                                    color="blue"
                                    leftSection={<IconSend size={14} />}
                                    onClick={() => void handleSendEmail(email.id)}
                                    loading={sendEmail.isPending}
                                  >
                                    Send
                                  </Button>
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    onClick={() => void handleDeleteEmail(email.id)}
                                    loading={deleteEmail.isPending}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Group>
                              </Group>
                              
                              {/* Email Preview */}
                              <Paper p="md" bg="white" radius="sm" withBorder>
                                <Text size="xs" c="dimmed" mb="xs">Email Preview:</Text>
                                <div 
                                  style={{ 
                                    fontSize: "12px", 
                                    maxHeight: "200px", 
                                    overflow: "auto",
                                    lineHeight: 1.4 
                                  }}
                                  dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                                />
                              </Paper>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="previous" mt="md">
                  <Stack gap="lg">
                    {/* Status Change History - Could be added later with audit log */}
                    <Paper p="lg" withBorder radius="md">
                      <Stack gap="md">
                        <Group gap="xs" align="center">
                          <IconClock size={20} color="blue" />
                          <Text fw={600} color="blue.7">Application Timeline</Text>
                        </Group>
                        <Stack gap="sm">
                          <Group gap="sm">
                            <Text size="sm" fw={500}>Created:</Text>
                            <Text size="sm" c="dimmed">
                              {new Date(viewingApplication.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </Group>
                          {viewingApplication.submittedAt && (
                            <Group gap="sm">
                              <Text size="sm" fw={500}>Submitted:</Text>
                              <Text size="sm" c="dimmed">
                                {new Date(viewingApplication.submittedAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </Group>
                          )}
                          <Group gap="sm">
                            <Text size="sm" fw={500}>Current Status:</Text>
                            <Badge color={getStatusColor(viewingApplication.status)} variant="light">
                              {viewingApplication.status.replace("_", " ")}
                            </Badge>
                          </Group>
                        </Stack>
                      </Stack>
                    </Paper>

                    {/* Sent Emails History */}
                    {applicationEmails && applicationEmails.filter(email => email.status === "SENT").length > 0 ? (
                      <Stack gap="md">
                        <Text size="md" fw={600} c="green.7">Sent Communications</Text>
                        {applicationEmails.filter(email => email.status === "SENT").map((email) => (
                          <Paper key={email.id} p="lg" withBorder radius="md" bg="green.0">
                            <Stack gap="md">
                              <Group justify="space-between" align="flex-start">
                                <Box flex={1}>
                                  <Group gap="xs" mb="xs">
                                    <Badge color="green" variant="light">
                                      SENT
                                    </Badge>
                                    <Badge variant="outline" color="gray">
                                      {email.type.replace("_", " ")}
                                    </Badge>
                                  </Group>
                                  <Text fw={600} size="md" mb="xs">
                                    {email.subject}
                                  </Text>
                                  <Text size="sm" c="dimmed" mb="sm">
                                    To: {email.toEmail} • Sent: {email.sentAt ? new Date(email.sentAt).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }) : "Unknown"}
                                  </Text>
                                  {email.type === "MISSING_INFO" && email.missingFields.length > 0 && (
                                    <Paper p="md" bg="orange.1" radius="sm" mb="md">
                                      <Group gap="xs" mb="xs">
                                        <IconAlertCircle size={16} color="orange" />
                                        <Text size="sm" fw={500} c="orange.7">Missing Fields Requested:</Text>
                                      </Group>
                                      <Text size="sm" c="orange.7">
                                        {email.missingFields.map(field => field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())).join(", ")}
                                      </Text>
                                    </Paper>
                                  )}
                                </Box>
                              </Group>
                              
                              {/* Email Preview */}
                              <Paper p="md" bg="white" radius="sm" withBorder>
                                <Text size="xs" c="dimmed" mb="xs">Email Content:</Text>
                                <div 
                                  style={{ 
                                    fontSize: "12px", 
                                    maxHeight: "200px", 
                                    overflow: "auto",
                                    lineHeight: 1.4 
                                  }}
                                  dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                                />
                              </Paper>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    ) : (
                      <Paper p="xl" withBorder radius="md" ta="center">
                        <IconMail size={48} stroke={1} color="var(--mantine-color-gray-5)" />
                        <Text c="dimmed" size="md" mt="xs">No previous actions recorded</Text>
                        <Text c="dimmed" size="sm" mt="xs">
                          Status changes and sent emails will appear here
                        </Text>
                      </Paper>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          )}
        </ScrollArea>
      </Drawer>

      {/* Application Edit Drawer */}
      <Drawer
        opened={editDrawerOpened}
        onClose={closeEditDrawer}
        position="right"
        size="xl"
        title="Edit Application"
        padding="xl"
      >
        <ScrollArea h="100%" offsetScrollbars>
          {editingApplication && (
            <Stack gap="xl">
              {/* Applicant Header */}
              <Paper p="lg" withBorder radius="md">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xl" fw={600} mb="xs">
                      {editingApplication.user?.name ?? "No name provided"}
                    </Text>
                    <Anchor href={`mailto:${editingApplication.email}`} size="md" c="blue">
                      {editingApplication.email}
                    </Anchor>
                  </Box>
                  <Badge size="lg" color={getStatusColor(editingApplication.status)} variant="light">
                    {editingApplication.status.replace("_", " ")}
                  </Badge>
                </Group>
              </Paper>
              
              {/* Editable form */}
              <EditableApplicationForm 
                application={editingApplication}
                eventId={event.id}
                onSaved={() => {
                  void utils.application.getEventApplications.invalidate({ eventId: event.id });
                  closeEditDrawer();
                }}
              />
            </Stack>
          )}
        </ScrollArea>
      </Drawer>
    </Container>
  );
}
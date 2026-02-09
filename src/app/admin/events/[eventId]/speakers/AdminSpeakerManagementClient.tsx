"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Title,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Textarea,
  Table,
  ActionIcon,
  Paper,
  Loader,
  SimpleGrid,
  Tabs,
  Checkbox,
  Modal,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
  IconArrowLeft,
  IconEye,
  IconMail,
  IconRefresh,
  IconUserPlus,
  IconMicrophone,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import ApplicationDetailsDrawer from "../applications/ApplicationDetailsDrawer";

interface Props {
  eventId: string;
}

interface InvitationForm {
  email: string;
  expiresAt?: Date;
}

interface BulkInvitationForm {
  emails: string;
  expiresAt?: Date;
}

function getAppStatusColor(status: string) {
  switch (status) {
    case "DRAFT": return "gray";
    case "SUBMITTED": return "blue";
    case "UNDER_REVIEW": return "yellow";
    case "ACCEPTED": return "green";
    case "REJECTED": return "red";
    case "WAITLISTED": return "orange";
    default: return "gray";
  }
}

function getAppStatusIcon(status: string) {
  switch (status) {
    case "DRAFT": return <IconClock size={16} />;
    case "SUBMITTED": return <IconUpload size={16} />;
    case "UNDER_REVIEW": return <IconClock size={16} />;
    case "ACCEPTED": return <IconCheck size={16} />;
    case "REJECTED": return <IconX size={16} />;
    case "WAITLISTED": return <IconAlertTriangle size={16} />;
    default: return null;
  }
}

function getInvStatusColor(status: string) {
  switch (status) {
    case "PENDING": return "blue";
    case "ACCEPTED": return "green";
    case "EXPIRED": return "orange";
    case "CANCELLED": return "red";
    default: return "gray";
  }
}

function getInvStatusIcon(status: string) {
  switch (status) {
    case "PENDING": return <IconClock size={16} />;
    case "ACCEPTED": return <IconCheck size={16} />;
    case "EXPIRED": return <IconAlertTriangle size={16} />;
    case "CANCELLED": return <IconX size={16} />;
    default: return null;
  }
}

export default function AdminSpeakerManagementClient({ eventId }: Props) {
  const [mainTab, setMainTab] = useState<string>("applications");
  const [appTab, setAppTab] = useState<string>("all");
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  const [filterEmail, setFilterEmail] = useState("");

  // Drawer state
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] = useDisclosure(false);
  const [viewingApplication, setViewingApplication] = useState<{ id: string } | null>(null);

  // Queries
  const { data: event, isLoading: loadingEvent } = api.event.getEvent.useQuery({ id: eventId });
  const { data: roles } = api.role.getEventRoles.useQuery();
  const speakerRole = useMemo(() => roles?.find(role => role.name === "speaker"), [roles]);

  const { data: speakerApplications, refetch: refetchApplications, isLoading: loadingApplications } =
    api.application.getEventApplications.useQuery({
      eventId,
      applicationType: "SPEAKER",
    });

  const { data: invitations, refetch: refetchInvitations, isLoading: loadingInvitations } =
    api.invitation.getAll.useQuery({ eventId });

  const speakerInvitations = useMemo(() => {
    if (!invitations || !speakerRole) return [];
    return invitations.filter(inv => inv.roleId === speakerRole.id);
  }, [invitations, speakerRole]);

  const { data: currentSpeakers, isLoading: loadingSpeakers } = api.role.getAllUsersWithEventRoles.useQuery({
    eventId,
    roleId: speakerRole?.id,
  });

  // Mutations
  const updateApplicationStatus = api.application.updateApplicationStatus.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Success", message: "Speaker application status updated", color: "green" });
      void refetchApplications();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const bulkUpdateApplicationStatus = api.application.bulkUpdateApplicationStatus.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Success",
        message: `${result.count} speaker applications updated`,
        color: "green",
      });
      setSelectedApplications([]);
      setBulkStatusModalOpen(false);
      setBulkStatus(null);
      void refetchApplications();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const createInvitation = api.invitation.create.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Success", message: "Speaker invitation sent", color: "green" });
      setInviteModalOpen(false);
      inviteForm.reset();
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const bulkCreateInvitations = api.invitation.bulkCreate.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Success",
        message: `${result.created.length} speaker invitations sent. ${result.skipped} skipped.`,
        color: "green",
      });
      setBulkInviteModalOpen(false);
      bulkInviteForm.reset();
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const cancelInvitation = api.invitation.cancel.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Success", message: "Speaker invitation cancelled", color: "blue" });
      void refetchInvitations();
    },
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Success", message: "Speaker invitation resent", color: "green" });
      void refetchInvitations();
    },
  });

  // Forms
  const inviteForm = useForm<InvitationForm>({
    initialValues: { email: "", expiresAt: undefined },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const bulkInviteForm = useForm<BulkInvitationForm>({
    initialValues: { emails: "", expiresAt: undefined },
    validate: {
      emails: (value) => {
        if (!value.trim()) return "Emails are required";
        const emails = value.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
        const invalidEmails = emails.filter(email => !/^\S+@\S+\.\S+$/.test(email));
        return invalidEmails.length > 0 ? `Invalid emails: ${invalidEmails.join(", ")}` : null;
      },
    },
  });

  const handleInviteSpeaker = (values: InvitationForm) => {
    if (!speakerRole) {
      notifications.show({ title: "Error", message: "Speaker role not found. Please ensure the speaker role exists.", color: "red" });
      return;
    }
    createInvitation.mutate({
      email: values.email,
      type: "EVENT_ROLE",
      eventId,
      roleId: speakerRole.id,
      expiresAt: values.expiresAt,
    });
  };

  const handleBulkInviteSpeakers = (values: BulkInvitationForm) => {
    if (!speakerRole) {
      notifications.show({ title: "Error", message: "Speaker role not found", color: "red" });
      return;
    }
    const emails = values.emails.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
    bulkCreateInvitations.mutate({
      emails,
      eventId,
      roleId: speakerRole.id,
      type: "EVENT_ROLE",
      expiresAt: values.expiresAt,
    });
  };

  // Loading
  if (loadingEvent || loadingApplications || loadingInvitations || loadingSpeakers) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center"><Loader size="xl" /></Group>
      </Container>
    );
  }

  // Application helpers
  const allApplications = speakerApplications ?? [];
  const acceptedApplications = allApplications.filter(app => app.status === "ACCEPTED");
  const rejectedApplications = allApplications.filter(app => app.status === "REJECTED");
  const pendingApplications = allApplications.filter(app => !["ACCEPTED", "REJECTED"].includes(app.status));

  const getCurrentTabApplications = () => {
    switch (appTab) {
      case "accepted": return acceptedApplications;
      case "rejected": return rejectedApplications;
      default: return allApplications;
    }
  };
  const currentApplications = getCurrentTabApplications();

  // Invitation helpers
  const filteredInvitations = speakerInvitations.filter(inv =>
    inv.email.toLowerCase().includes(filterEmail.toLowerCase())
  );

  const invStats = {
    total: speakerInvitations.length,
    pending: speakerInvitations.filter(inv => inv.status === "PENDING").length,
    accepted: speakerInvitations.filter(inv => inv.status === "ACCEPTED").length,
    currentSpeakers: currentSpeakers?.filter(user => user.userRoles.length > 0).length ?? 0,
  };

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Group mb="xs">
            <Link href="/admin/events" style={{ textDecoration: "none" }}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} size="sm">
                Back to Events
              </Button>
            </Link>
          </Group>
          <Group gap="sm">
            <IconMicrophone size={28} />
            <Title order={1}>Speaker Management</Title>
          </Group>
          <Text c="dimmed" mb="xs">{event?.name ?? "Loading..."}</Text>
        </div>
      </Group>

      {/* Statistics */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700}>{allApplications.length}</Text>
            <Text size="sm" c="dimmed">Applications</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="orange">{pendingApplications.length}</Text>
            <Text size="sm" c="dimmed">Pending</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="green">{acceptedApplications.length}</Text>
            <Text size="sm" c="dimmed">Accepted</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="blue">{invStats.currentSpeakers}</Text>
            <Text size="sm" c="dimmed">Invited Speakers</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Main Tabs */}
      <Tabs value={mainTab} onChange={(v) => setMainTab(v ?? "applications")}>
        <Tabs.List mb="md">
          <Tabs.Tab value="applications">
            Applications
            {allApplications.length > 0 && <Badge size="sm" variant="light" ml="xs">{allApplications.length}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="invitations">
            Invitations
            {speakerInvitations.length > 0 && <Badge size="sm" variant="light" ml="xs">{speakerInvitations.length}</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        {/* Applications Tab */}
        <Tabs.Panel value="applications">
          {/* Bulk Actions */}
          {selectedApplications.length > 0 && (
            <Card withBorder mb="md" p="md">
              <Group justify="space-between">
                <Text size="sm">
                  {selectedApplications.length} application{selectedApplications.length !== 1 ? "s" : ""} selected
                </Text>
                <Group gap="xs">
                  <Button variant="light" color="green" size="sm" onClick={() => { setBulkStatus("ACCEPTED"); setBulkStatusModalOpen(true); }}>
                    Accept Selected
                  </Button>
                  <Button variant="light" color="red" size="sm" onClick={() => { setBulkStatus("REJECTED"); setBulkStatusModalOpen(true); }}>
                    Reject Selected
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => setSelectedApplications([])}>
                    Clear
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          <Card withBorder>
            <Tabs value={appTab} onChange={(v) => setAppTab(v ?? "all")}>
              <Tabs.List grow>
                <Tabs.Tab value="all">
                  All {allApplications.length > 0 && <Badge size="sm" variant="light" ml="xs">{allApplications.length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="accepted">
                  Accepted {acceptedApplications.length > 0 && <Badge size="sm" variant="light" color="green" ml="xs">{acceptedApplications.length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="rejected">
                  Rejected {rejectedApplications.length > 0 && <Badge size="sm" variant="light" color="red" ml="xs">{rejectedApplications.length}</Badge>}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="all" mt="md">
                <SpeakerApplicationsTable
                  applications={allApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications(prev =>
                      prev.length === currentApplications.length ? [] : currentApplications.map(a => a.id)
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  }}
                  onStatusUpdate={(id, status) => updateApplicationStatus.mutate({ applicationId: id, status })}
                  onViewApplication={(id) => { setViewingApplication({ id }); openViewDrawer(); }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
              <Tabs.Panel value="accepted" mt="md">
                <SpeakerApplicationsTable
                  applications={acceptedApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications(prev =>
                      prev.length === acceptedApplications.length ? [] : acceptedApplications.map(a => a.id)
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  }}
                  onStatusUpdate={(id, status) => updateApplicationStatus.mutate({ applicationId: id, status })}
                  onViewApplication={(id) => { setViewingApplication({ id }); openViewDrawer(); }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
              <Tabs.Panel value="rejected" mt="md">
                <SpeakerApplicationsTable
                  applications={rejectedApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications(prev =>
                      prev.length === rejectedApplications.length ? [] : rejectedApplications.map(a => a.id)
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  }}
                  onStatusUpdate={(id, status) => updateApplicationStatus.mutate({ applicationId: id, status })}
                  onViewApplication={(id) => { setViewingApplication({ id }); openViewDrawer(); }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Tabs.Panel>

        {/* Invitations Tab */}
        <Tabs.Panel value="invitations">
          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconUserPlus size={16} />} onClick={() => setInviteModalOpen(true)}>
              Invite Speaker
            </Button>
            <Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => setBulkInviteModalOpen(true)}>
              Bulk Invite
            </Button>
          </Group>

          {/* Invitation Stats */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Text size="xl" fw={700}>{invStats.total}</Text>
                <Text size="sm" c="dimmed">Total Invites</Text>
              </Group>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Text size="xl" fw={700} c="blue">{invStats.pending}</Text>
                <Text size="sm" c="dimmed">Pending</Text>
              </Group>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Text size="xl" fw={700} c="green">{invStats.accepted}</Text>
                <Text size="sm" c="dimmed">Accepted</Text>
              </Group>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Text size="xl" fw={700} c="teal">{invStats.currentSpeakers}</Text>
                <Text size="sm" c="dimmed">Active Speakers</Text>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Current Speakers */}
          {invStats.currentSpeakers > 0 && (
            <Card withBorder mb="md">
              <Title order={3} mb="md">Current Speakers</Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Role</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {currentSpeakers?.filter(user => user.userRoles.length > 0).map((speaker) => (
                    <Table.Tr key={speaker.id}>
                      <Table.Td><Text size="sm" fw={500}>{speaker.name ?? "Unknown"}</Text></Table.Td>
                      <Table.Td><Text size="sm">{speaker.email}</Text></Table.Td>
                      <Table.Td><Badge variant="light" color="teal" size="sm">speaker</Badge></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          )}

          {/* Filter */}
          <Card withBorder mb="md">
            <TextInput
              placeholder="Filter speaker invitations by email..."
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} />}
            />
          </Card>

          {/* Invitations Table */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Speaker Invitations</Title>
              <Text size="sm" c="dimmed">
                {filteredInvitations.length} of {speakerInvitations.length} invitations
              </Text>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Invited</Table.Th>
                  <Table.Th>Expires</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredInvitations.map((invitation) => (
                  <Table.Tr key={invitation.id}>
                    <Table.Td><Text size="sm">{invitation.email}</Text></Table.Td>
                    <Table.Td>
                      <Badge color={getInvStatusColor(invitation.status)} variant="light" size="sm" leftSection={getInvStatusIcon(invitation.status)}>
                        {invitation.status.toLowerCase()}
                      </Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{new Date(invitation.createdAt).toLocaleDateString()}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{new Date(invitation.expiresAt).toLocaleDateString()}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {invitation.status === "PENDING" && (
                          <>
                            <ActionIcon variant="light" color="blue" size="sm" onClick={() => resendInvitation.mutate({ invitationId: invitation.id })} loading={resendInvitation.isPending} title="Resend invitation">
                              <IconRefresh size={14} />
                            </ActionIcon>
                            <ActionIcon variant="light" color="red" size="sm" onClick={() => cancelInvitation.mutate({ invitationId: invitation.id })} loading={cancelInvitation.isPending} title="Cancel invitation">
                              <IconX size={14} />
                            </ActionIcon>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {filteredInvitations.length === 0 && (
              <Text ta="center" py="xl" c="dimmed">
                {speakerInvitations.length === 0
                  ? "No speaker invitations yet. Send your first speaker invitation to get started."
                  : "No speaker invitations match your filter."}
              </Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Bulk Status Update Modal */}
      <Modal
        opened={bulkStatusModalOpen}
        onClose={() => { setBulkStatusModalOpen(false); setBulkStatus(null); }}
        title={`${bulkStatus === "ACCEPTED" ? "Accept" : "Reject"} Selected Applications`}
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Are you sure you want to {bulkStatus?.toLowerCase()} {selectedApplications.length} speaker application{selectedApplications.length !== 1 ? "s" : ""}?
            {bulkStatus === "ACCEPTED" && " This will send acceptance emails to the speakers."}
            {bulkStatus === "REJECTED" && " This will send rejection emails to the speakers."}
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => { setBulkStatusModalOpen(false); setBulkStatus(null); }}>Cancel</Button>
            <Button
              color={bulkStatus === "ACCEPTED" ? "green" : "red"}
              onClick={() => {
                if (!bulkStatus || selectedApplications.length === 0) return;
                bulkUpdateApplicationStatus.mutate({ applicationIds: selectedApplications, status: bulkStatus });
              }}
              loading={bulkUpdateApplicationStatus.isPending}
            >
              {bulkStatus === "ACCEPTED" ? "Accept" : "Reject"} Applications
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Invite Speaker Modal */}
      <Modal opened={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Speaker" size="md">
        <form onSubmit={inviteForm.onSubmit(handleInviteSpeaker)}>
          <Stack>
            <Text size="sm" c="dimmed">
              Invite a speaker for <strong>{event?.name ?? "this event"}</strong>. They will receive an email invitation
              and can register or login to submit their speaker application.
            </Text>
            <Divider />
            <TextInput label="Email" placeholder="speaker@example.com" {...inviteForm.getInputProps("email")} required />
            <DatePickerInput
              label="Expires At (optional)"
              description="If not set, invitation will expire in 30 days"
              placeholder="Select expiration date"
              {...inviteForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createInvitation.isPending} leftSection={<IconMail size={16} />}>
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Bulk Invite Modal */}
      <Modal opened={bulkInviteModalOpen} onClose={() => setBulkInviteModalOpen(false)} title="Bulk Invite Speakers" size="lg">
        <form onSubmit={bulkInviteForm.onSubmit(handleBulkInviteSpeakers)}>
          <Stack>
            <Text size="sm" c="dimmed">
              Invite multiple speakers for <strong>{event?.name ?? "this event"}</strong> at once.
            </Text>
            <Divider />
            <Textarea
              label="Speaker Emails"
              description="Enter one email per line or separate with commas"
              placeholder={"speaker1@example.com\nspeaker2@example.com\nspeaker3@example.com"}
              {...bulkInviteForm.getInputProps("emails")}
              rows={6}
              required
            />
            <DatePickerInput
              label="Expires At (optional)"
              description="If not set, invitations will expire in 30 days"
              placeholder="Select expiration date"
              {...bulkInviteForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setBulkInviteModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={bulkCreateInvitations.isPending} leftSection={<IconUpload size={16} />}>
                Send Invitations
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Application Detail Drawer */}
      <ApplicationDetailsDrawer
        applicationId={viewingApplication?.id ?? null}
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
      />
    </Container>
  );
}

// Applications table sub-component
interface ApplicationRow {
  id: string;
  status: string;
  email: string;
  eventId: string;
  submittedAt: Date | null;
  user?: { name: string | null } | null;
}

interface SpeakerApplicationsTableProps {
  applications: ApplicationRow[];
  selectedApplications: string[];
  onSelectAll: () => void;
  onSelectApplication: (id: string) => void;
  onStatusUpdate: (id: string, status: "ACCEPTED" | "REJECTED") => void;
  onViewApplication: (id: string) => void;
  isUpdating: boolean;
}

function SpeakerApplicationsTable({
  applications,
  selectedApplications,
  onSelectAll,
  onSelectApplication,
  onStatusUpdate,
  onViewApplication,
  isUpdating,
}: SpeakerApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <Text ta="center" py="xl" c="dimmed">
        No speaker applications found for this filter.
      </Text>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Checkbox
          checked={selectedApplications.length === applications.length && applications.length > 0}
          indeterminate={selectedApplications.length > 0 && selectedApplications.length < applications.length}
          onChange={onSelectAll}
          label={`Select all (${applications.length})`}
          size="sm"
        />
        <Text size="sm" c="dimmed">
          {applications.length} application{applications.length !== 1 ? "s" : ""}
        </Text>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Select</Table.Th>
            <Table.Th>Name</Table.Th>
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
                <Checkbox
                  checked={selectedApplications.includes(application.id)}
                  onChange={() => onSelectApplication(application.id)}
                  size="sm"
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>{application.user?.name ?? "Unknown"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{application.email}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={getAppStatusColor(application.status)} variant="light" size="sm" leftSection={getAppStatusIcon(application.status)}>
                  {application.status.replace("_", " ").toLowerCase()}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "Not submitted"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {application.status !== "ACCEPTED" && (
                    <ActionIcon variant="light" color="green" size="sm" onClick={() => onStatusUpdate(application.id, "ACCEPTED")} loading={isUpdating} title="Accept">
                      <IconCheck size={14} />
                    </ActionIcon>
                  )}
                  {application.status !== "REJECTED" && (
                    <ActionIcon variant="light" color="red" size="sm" onClick={() => onStatusUpdate(application.id, "REJECTED")} loading={isUpdating} title="Reject">
                      <IconX size={14} />
                    </ActionIcon>
                  )}
                  <ActionIcon variant="light" color="blue" size="sm" onClick={() => onViewApplication(application.id)} title="View details">
                    <IconEye size={14} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}

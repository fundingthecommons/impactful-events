"use client";

import { useState } from "react";
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
  Select,
  Textarea,
  Modal,
  Table,
  ActionIcon,
  Paper,

  Loader,

  SimpleGrid,


} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { 
  IconPlus, 
  IconMail, 
 
  IconRefresh,
  IconUsers,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface CreateInvitationForm {
  email: string;
  eventId: string;
  roleId: string;
  expiresAt?: Date;
}

interface BulkInvitationForm {
  emails: string;
  eventId: string;
  roleId: string;
  expiresAt?: Date;
}

export default function InvitationsClient() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEmail, setFilterEmail] = useState("");

  // API queries
  const { data: invitations, refetch: refetchInvitations, isLoading: loadingInvitations } = api.invitation.getAll.useQuery({
    eventId: filterEventId || undefined,
    status: (filterStatus as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED") ?? undefined,
    email: filterEmail || undefined,
  });

  const { data: events, isLoading: loadingEvents } = api.event.getEvents.useQuery();
  const { data: roles, isLoading: loadingRoles } = api.invitation.getAvailableRoles.useQuery();
  const { data: stats } = api.invitation.getStats.useQuery({
    eventId: filterEventId || undefined,
  });

  // API mutations
  const createInvitation = api.invitation.create.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Invitation sent successfully",
        color: "green",
      });
      setCreateModalOpen(false);
      createForm.reset();
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const bulkCreateInvitations = api.invitation.bulkCreate.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Success",
        message: `${result.created.length} invitations sent successfully. ${result.skipped} were skipped (already exist).`,
        color: "green",
      });
      setBulkModalOpen(false);
      bulkForm.reset();
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const cancelInvitation = api.invitation.cancel.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Invitation cancelled",
        color: "blue",
      });
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Invitation resent",
        color: "green",
      });
      void refetchInvitations();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Forms
  const createForm = useForm<CreateInvitationForm>({
    initialValues: {
      email: "",
      eventId: "",
      roleId: "",
      expiresAt: undefined,
    },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : "Invalid email"),
      eventId: (value) => (value ? null : "Event is required"),
      roleId: (value) => (value ? null : "Role is required"),
    },
  });

  const bulkForm = useForm<BulkInvitationForm>({
    initialValues: {
      emails: "",
      eventId: "",
      roleId: "",
      expiresAt: undefined,
    },
    validate: {
      emails: (value) => {
        if (!value.trim()) return "Emails are required";
        const emails = value.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
        const invalidEmails = emails.filter(email => !/^\S+@\S+\.\S+$/.test(email));
        return invalidEmails.length > 0 ? `Invalid emails: ${invalidEmails.join(", ")}` : null;
      },
      eventId: (value) => (value ? null : "Event is required"),
      roleId: (value) => (value ? null : "Role is required"),
    },
  });

  const handleCreateInvitation = (values: CreateInvitationForm) => {
    createInvitation.mutate({
      email: values.email,
      eventId: values.eventId,
      roleId: values.roleId,
      expiresAt: values.expiresAt,
    });
  };

  const handleBulkCreateInvitations = (values: BulkInvitationForm) => {
    const emails = values.emails.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
    bulkCreateInvitations.mutate({
      emails,
      eventId: values.eventId,
      roleId: values.roleId,
      expiresAt: values.expiresAt,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "blue";
      case "ACCEPTED": return "green";
      case "EXPIRED": return "orange";
      case "CANCELLED": return "red";
      default: return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <IconClock size={16} />;
      case "ACCEPTED": return <IconCheck size={16} />;
      case "EXPIRED": return <IconAlertTriangle size={16} />;
      case "CANCELLED": return <IconX size={16} />;
      default: return null;
    }
  };

  if (loadingInvitations || loadingEvents || loadingRoles) {
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
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">Event Invitations</Title>
          <Text c="dimmed">Invite users to events with specific roles</Text>
        </div>
        <Group>
          <Link href="/admin/events" style={{ textDecoration: 'none' }}>
            <Button variant="light" leftSection={<IconUsers size={16} />}>
              Back to Events
            </Button>
          </Link>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            Send Invitation
          </Button>
          <Button 
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={() => setBulkModalOpen(true)}
          >
            Bulk Invite
          </Button>
        </Group>
      </Group>

      {/* Statistics */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 5 }} mb="xl">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700}>{stats.total}</Text>
              <Text size="sm" c="dimmed">Total</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="blue">{stats.pending}</Text>
              <Text size="sm" c="dimmed">Pending</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="green">{stats.accepted}</Text>
              <Text size="sm" c="dimmed">Accepted</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="orange">{stats.expired}</Text>
              <Text size="sm" c="dimmed">Expired</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700}>{stats.acceptanceRate}%</Text>
              <Text size="sm" c="dimmed">Accept Rate</Text>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Card withBorder mb="xl">
        <Group>
          <TextInput
            placeholder="Filter by email..."
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by event"
            value={filterEventId}
            onChange={(value) => setFilterEventId(value ?? "")}
            data={events?.map(event => ({ value: event.id, label: event.name })) ?? []}
            clearable
            style={{ minWidth: 200 }}
          />
          <Select
            placeholder="Filter by status"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value ?? "")}
            data={[
              { value: "PENDING", label: "Pending" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "EXPIRED", label: "Expired" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
            clearable
            style={{ minWidth: 150 }}
          />
        </Group>
      </Card>

      {/* Invitations Table */}
      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Event</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Invited</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invitations?.map((invitation) => (
              <Table.Tr key={invitation.id}>
                <Table.Td>
                  <Text size="sm">{invitation.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{invitation.event.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="blue" size="sm">
                    {invitation.role.name}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    color={getStatusColor(invitation.status)} 
                    variant="light" 
                    size="sm"
                    leftSection={getStatusIcon(invitation.status)}
                  >
                    {invitation.status.toLowerCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {invitation.status === "PENDING" && (
                      <>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => resendInvitation.mutate({ invitationId: invitation.id })}
                          loading={resendInvitation.isPending}
                          title="Resend invitation"
                        >
                          <IconRefresh size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => cancelInvitation.mutate({ invitationId: invitation.id })}
                          loading={cancelInvitation.isPending}
                          title="Cancel invitation"
                        >
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

        {invitations?.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No invitations found. Create your first invitation to get started.
          </Text>
        )}
      </Card>

      {/* Create Invitation Modal */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Send Invitation"
        size="md"
      >
        <form onSubmit={createForm.onSubmit(handleCreateInvitation)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="user@example.com"
              {...createForm.getInputProps("email")}
              required
            />
            
            <Select
              label="Event"
              placeholder="Select an event"
              data={events?.map(event => ({ value: event.id, label: event.name })) ?? []}
              {...createForm.getInputProps("eventId")}
              required
            />
            
            <Select
              label="Role"
              placeholder="Select a role"
              data={roles?.map(role => ({ value: role.id, label: role.name })) ?? []}
              {...createForm.getInputProps("roleId")}
              required
            />
            
            <DatePickerInput
              label="Expires At (optional)"
              placeholder="Select expiration date"
              {...createForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />
            
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={createInvitation.isPending}
                leftSection={<IconMail size={16} />}
              >
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Bulk Invitation Modal */}
      <Modal
        opened={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Send Invitations"
        size="lg"
      >
        <form onSubmit={bulkForm.onSubmit(handleBulkCreateInvitations)}>
          <Stack>
            <Textarea
              label="Emails"
              description="Enter one email per line or separate with commas"
              placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
              {...bulkForm.getInputProps("emails")}
              rows={6}
              required
            />
            
            <Select
              label="Event"
              placeholder="Select an event"
              data={events?.map(event => ({ value: event.id, label: event.name })) ?? []}
              {...bulkForm.getInputProps("eventId")}
              required
            />
            
            <Select
              label="Role"
              placeholder="Select a role"
              data={roles?.map(role => ({ value: role.id, label: role.name })) ?? []}
              {...bulkForm.getInputProps("roleId")}
              required
            />
            
            <DatePickerInput
              label="Expires At (optional)"
              placeholder="Select expiration date"
              {...bulkForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />
            
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={bulkCreateInvitations.isPending}
                leftSection={<IconUpload size={16} />}
              >
                Send Invitations
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
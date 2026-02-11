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
  Modal,
  Table,
  ActionIcon,
  Paper,
  Loader,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { 
  IconMail, 
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
  IconArrowLeft,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface MentorInvitationForm {
  email: string;
  expiresAt?: Date;
}

interface BulkMentorInvitationForm {
  emails: string;
  expiresAt?: Date;
}

interface Props {
  eventId: string;
}

export default function MentorInvitationsClient({ eventId }: Props) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [filterEmail, setFilterEmail] = useState("");

  // Get event details
  const { data: event, isLoading: loadingEvent } = api.event.getEvent.useQuery({
    id: eventId,
  });

  // Get mentor role ID
  const { data: roles } = api.role.getEventRoles.useQuery();
  const mentorRole = useMemo(() => roles?.find(role => role.name === "mentor"), [roles]);

  // Get mentor invitations for this event
  const { data: invitations, refetch: refetchInvitations, isLoading: loadingInvitations } = api.invitation.getAll.useQuery({
    eventId,
    // We'll filter for mentor role on the client side since the API doesn't support roleId filter
  });

  // Filter invitations to only show mentor invitations
  const mentorInvitations = useMemo(() => {
    if (!invitations || !mentorRole) return [];
    return invitations.filter(inv => inv.roleId === mentorRole.id);
  }, [invitations, mentorRole]);

  // Note: We calculate mentor-specific stats below instead of using general invitation stats

  // Get current mentors (users with mentor role for this event)
  const { data: currentMentors, isLoading: loadingMentors } = api.role.getAllUsersWithEventRoles.useQuery({
    eventId,
    roleId: mentorRole?.id,
  });

  // API mutations
  const createInvitation = api.invitation.create.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Mentor invitation sent successfully",
        color: "green",
      });
      setInviteModalOpen(false);
      inviteForm.reset();
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
        message: `${result.created.length} mentor invitations sent successfully. ${result.skipped} were skipped (already exist).`,
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
        message: "Mentor invitation cancelled",
        color: "blue",
      });
      void refetchInvitations();
    },
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Mentor invitation resent",
        color: "green",
      });
      void refetchInvitations();
    },
  });

  // Forms
  const inviteForm = useForm<MentorInvitationForm>({
    initialValues: {
      email: "",
      expiresAt: undefined,
    },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const bulkForm = useForm<BulkMentorInvitationForm>({
    initialValues: {
      emails: "",
      expiresAt: undefined,
    },
    validate: {
      emails: (value) => {
        if (!value.trim()) return "Emails are required";
        const emails = value.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
        const invalidEmails = emails.filter(email => !/^\S+@\S+\.\S+$/.test(email));
        return invalidEmails.length > 0 ? `Invalid emails: ${invalidEmails.join(", ")}` : null;
      },
    },
  });

  const handleInviteMentor = (values: MentorInvitationForm) => {
    if (!mentorRole) {
      notifications.show({
        title: "Error",
        message: "Mentor role not found",
        color: "red",
      });
      return;
    }

    createInvitation.mutate({
      email: values.email,
      type: "EVENT_ROLE",
      eventId,
      roleId: mentorRole.id,
      expiresAt: values.expiresAt,
    });
  };

  const handleBulkInviteMentors = (values: BulkMentorInvitationForm) => {
    if (!mentorRole) {
      notifications.show({
        title: "Error",
        message: "Mentor role not found",
        color: "red",
      });
      return;
    }

    const emails = values.emails.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
    bulkCreateInvitations.mutate({
      emails,
      eventId,
      roleId: mentorRole.id,
      type: "EVENT_ROLE",
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

  // Filter invitations by email
  const filteredInvitations = mentorInvitations.filter(invitation =>
    invitation.email.toLowerCase().includes(filterEmail.toLowerCase())
  );

  if (loadingEvent || loadingInvitations || loadingMentors || !mentorRole) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  // Calculate mentor-specific stats
  const mentorStats = {
    total: mentorInvitations.length,
    pending: mentorInvitations.filter(inv => inv.status === "PENDING").length,
    accepted: mentorInvitations.filter(inv => inv.status === "ACCEPTED").length,
    expired: mentorInvitations.filter(inv => inv.status === "EXPIRED").length,
    cancelled: mentorInvitations.filter(inv => inv.status === "CANCELLED").length,
    currentMentors: currentMentors?.filter(user => user.userRoles.length > 0).length ?? 0,
  };

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Group mb="xs">
            <Link href={`/admin/events/${eventId}`} style={{ textDecoration: 'none' }}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} size="sm">
                Back to {event?.name ?? "Event"}
              </Button>
            </Link>
          </Group>
          <Title order={1} mb="xs">Mentor Management</Title>
          <Text c="dimmed" mb="xs">{event?.name ?? "Loading..."}</Text>
          <Text size="sm" c="dimmed">
            Invite and manage mentors for this event. Mentors can view and evaluate applications.
          </Text>
        </div>
        <Group>
          <Button 
            leftSection={<IconUserPlus size={16} />}
            onClick={() => setInviteModalOpen(true)}
          >
            Invite Mentor
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
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb="xl">
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="blue">{mentorStats.currentMentors}</Text>
            <Text size="sm" c="dimmed">Active Mentors</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700}>{mentorStats.total}</Text>
            <Text size="sm" c="dimmed">Total Invites</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="blue">{mentorStats.pending}</Text>
            <Text size="sm" c="dimmed">Pending</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="green">{mentorStats.accepted}</Text>
            <Text size="sm" c="dimmed">Accepted</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="orange">{mentorStats.expired}</Text>
            <Text size="sm" c="dimmed">Expired</Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="red">{mentorStats.cancelled}</Text>
            <Text size="sm" c="dimmed">Cancelled</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Current Mentors */}
      {mentorStats.currentMentors > 0 && (
        <Card withBorder mb="xl">
          <Title order={3} mb="md">Current Mentors</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role Assigned</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {currentMentors?.filter(user => user.userRoles.length > 0).map((mentor) => (
                <Table.Tr key={mentor.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{mentor.name ?? "Unknown"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{mentor.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" size="sm">
                      mentor
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Filters */}
      <Card withBorder mb="xl">
        <TextInput
          placeholder="Filter mentor invitations by email..."
          value={filterEmail}
          onChange={(e) => setFilterEmail(e.currentTarget.value)}
          leftSection={<IconMail size={16} />}
        />
      </Card>

      {/* Mentor Invitations Table */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Mentor Invitations</Title>
          <Text size="sm" c="dimmed">
            {filteredInvitations.length} of {mentorInvitations.length} invitations
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
                <Table.Td>
                  <Text size="sm">{invitation.email}</Text>
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
                          title="Resend mentor invitation"
                        >
                          <IconRefresh size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => cancelInvitation.mutate({ invitationId: invitation.id })}
                          loading={cancelInvitation.isPending}
                          title="Cancel mentor invitation"
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

        {filteredInvitations.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            {mentorInvitations.length === 0 
              ? "No mentor invitations yet. Send your first mentor invitation to get started."
              : "No mentor invitations match your filter."
            }
          </Text>
        )}
      </Card>

      {/* Invite Mentor Modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Mentor"
        size="md"
      >
        <form onSubmit={inviteForm.onSubmit(handleInviteMentor)}>
          <Stack>
            <Text size="sm" c="dimmed">
              Invite a mentor for <strong>{event?.name ?? "this event"}</strong>. They will receive an email invitation 
              and can register or login to access the mentor dashboard.
            </Text>
            
            <Divider />
            
            <TextInput
              label="Email"
              placeholder="mentor@example.com"
              {...inviteForm.getInputProps("email")}
              required
            />
            
            <DatePickerInput
              label="Expires At (optional)"
              description="If not set, invitation will expire in 30 days"
              placeholder="Select expiration date"
              {...inviteForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />
            
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setInviteModalOpen(false)}>
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

      {/* Bulk Invite Modal */}
      <Modal
        opened={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Invite Mentors"
        size="lg"
      >
        <form onSubmit={bulkForm.onSubmit(handleBulkInviteMentors)}>
          <Stack>
            <Text size="sm" c="dimmed">
              Invite multiple mentors for <strong>{event?.name ?? "this event"}</strong> at once.
            </Text>
            
            <Divider />
            
            <Textarea
              label="Mentor Emails"
              description="Enter one email per line or separate with commas"
              placeholder="mentor1@example.com&#10;mentor2@example.com&#10;mentor3@example.com"
              {...bulkForm.getInputProps("emails")}
              rows={6}
              required
            />
            
            <DatePickerInput
              label="Expires At (optional)"
              description="If not set, invitations will expire in 30 days"
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
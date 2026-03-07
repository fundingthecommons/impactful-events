"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Container,
  Title,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Table,
  ActionIcon,
  Loader,
  Tabs,
  Checkbox,
  Modal,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconUpload,
  IconEye,
  IconMail,
  IconUserPlus,
  IconMicrophone,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import ApplicationDetailsDrawer from "~/app/admin/events/[eventId]/applications/ApplicationDetailsDrawer";
import {
  getApplicationStatusColor,
  getApplicationStatusIcon,
  useInvitationManager,
  InvitationStatsGrid,
  InvitationsTable,
  InviteModal,
  BulkInviteModal,
  CurrentRoleHoldersTable,
} from "~/app/admin/_components/invitations";

interface Props {
  eventId: string;
}

export default function SpeakerManagementClient({ eventId }: Props) {
  const [mainTab, setMainTab] = useState<string>("applications");
  const [appTab, setAppTab] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string | null>(null);

  // URL hash-based tab linking
  const validMainTabs = ["applications", "invitations"];
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && validMainTabs.includes(hash)) {
      setMainTab(hash);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMainTabChange = (value: string | null) => {
    if (value) {
      setMainTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  // ── Applications State ──
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] = useDisclosure(false);
  const [viewingApplication, setViewingApplication] = useState<{ id: string } | null>(null);

  // ── Invitations (via shared hook) ──
  const inv = useInvitationManager({
    eventId,
    invitationType: "EVENT_ROLE",
    roleName: "speaker",
    roleLookupName: "speaker",
  });

  // ── Application Queries ──
  const { data: speakerApplications, refetch: refetchApplications, isLoading: loadingApplications, error: applicationsError } =
    api.application.getEventApplications.useQuery({
      eventId,
      applicationType: "SPEAKER",
    });

  const { data: currentSpeakers, isLoading: loadingSpeakers } = api.role.getAllUsersWithEventRoles.useQuery({
    eventId,
    roleId: inv.resolvedRoleId,
  });

  // ── Application Mutations ──
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

  const bulkDeleteApplications = api.application.bulkDeleteApplications.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Deleted",
        message: `${result.count} speaker application${result.count !== 1 ? "s" : ""} permanently deleted`,
        color: "red",
      });
      setSelectedApplications([]);
      setBulkDeleteModalOpen(false);
      void refetchApplications();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  // Build a set of invited emails for cross-referencing (must be before early returns)
  const invitedEmails = useMemo(() => {
    const emails = new Set<string>();
    for (const invitation of inv.invitations) {
      emails.add(invitation.email.toLowerCase());
    }
    return emails;
  }, [inv.invitations]);

  // ── Derive unique floors from applications ──
  const availableFloors = useMemo(() => {
    const floorMap = new Map<string, string>();
    for (const app of speakerApplications ?? []) {
      for (const av of app.venues ?? []) {
        floorMap.set(av.venue.id, av.venue.name);
      }
    }
    return Array.from(floorMap, ([value, label]) => ({ value, label }));
  }, [speakerApplications]);

  // ── Loading ──
  if (inv.isLoading || loadingApplications || loadingSpeakers) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center"><Loader size="xl" /></Group>
      </Container>
    );
  }

  // ── Error Handling ──
  if (applicationsError) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Failed to load applications">
          {applicationsError.message}
        </Alert>
      </Container>
    );
  }

  // ── Application Helpers ──
  const allApplications = speakerApplications ?? [];
  const acceptedApplications = allApplications.filter(app => app.status === "ACCEPTED");
  const rejectedApplications = allApplications.filter(app => app.status === "REJECTED");
  const pendingApplications = allApplications.filter(app => !["ACCEPTED", "REJECTED"].includes(app.status));
  const invitedApplications = allApplications.filter(
    app => app.invitationId != null || invitedEmails.has(app.email.toLowerCase())
  );

  const applyFloorFilter = (apps: typeof allApplications) => {
    if (!floorFilter) return apps;
    return apps.filter(app => app.venues?.some(av => av.venue.id === floorFilter));
  };

  const getCurrentTabApplications = () => {
    switch (appTab) {
      case "accepted": return applyFloorFilter(acceptedApplications);
      case "rejected": return applyFloorFilter(rejectedApplications);
      case "invited": return applyFloorFilter(invitedApplications);
      default: return applyFloorFilter(allApplications);
    }
  };
  const currentApplications = getCurrentTabApplications();

  const activeSpeakerCount = currentSpeakers?.filter(user => user.userRoles.length > 0).length ?? 0;

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Group gap="sm">
            <IconMicrophone size={28} />
            <Title order={1}>Speaker Management</Title>
          </Group>
          <Text c="dimmed" mb="xs">{inv.event?.name ?? "Loading..."}</Text>
        </div>
      </Group>

      {/* Top-level Statistics */}
      <InvitationStatsGrid
        stats={[
          { value: allApplications.length, label: "Applications" },
          { value: pendingApplications.length, label: "Pending", color: "orange" },
          { value: acceptedApplications.length, label: "Accepted", color: "green" },
          { value: activeSpeakerCount, label: "Invited Speakers", color: "blue" },
        ]}
        cols={{ base: 2, sm: 4 }}
      />

      {/* Main Tabs */}
      <Tabs value={mainTab} onChange={handleMainTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="applications">
            Applications
            {allApplications.length > 0 && <Badge size="sm" variant="light" ml="xs">{allApplications.length}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="invitations">
            Invitations
            {inv.invitations.length > 0 && <Badge size="sm" variant="light" ml="xs">{inv.invitations.length}</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Applications Tab ── */}
        <Tabs.Panel value="applications">
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
                  <Button variant="light" color="dark" size="sm" leftSection={<IconTrash size={14} />} onClick={() => setBulkDeleteModalOpen(true)}>
                    Delete Selected
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => setSelectedApplications([])}>
                    Clear
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          {availableFloors.length > 1 && (
            <Card withBorder mb="md" p="md">
              <Select
                label="Filter by floor"
                placeholder="All floors"
                data={availableFloors}
                value={floorFilter}
                onChange={setFloorFilter}
                clearable
                w={250}
              />
            </Card>
          )}

          <Card withBorder>
            <Tabs value={appTab} onChange={(v) => setAppTab(v ?? "all")}>
              <Tabs.List grow>
                <Tabs.Tab value="all">
                  All {applyFloorFilter(allApplications).length > 0 && <Badge size="sm" variant="light" ml="xs">{applyFloorFilter(allApplications).length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="accepted">
                  Accepted {applyFloorFilter(acceptedApplications).length > 0 && <Badge size="sm" variant="light" color="green" ml="xs">{applyFloorFilter(acceptedApplications).length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="rejected">
                  Rejected {applyFloorFilter(rejectedApplications).length > 0 && <Badge size="sm" variant="light" color="red" ml="xs">{applyFloorFilter(rejectedApplications).length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="invited">
                  Invited {applyFloorFilter(invitedApplications).length > 0 && <Badge size="sm" variant="light" color="violet" ml="xs">{applyFloorFilter(invitedApplications).length}</Badge>}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="all" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFloorFilter(allApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
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
                  applications={applyFloorFilter(acceptedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
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
              <Tabs.Panel value="rejected" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFloorFilter(rejectedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
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
              <Tabs.Panel value="invited" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFloorFilter(invitedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
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
            </Tabs>
          </Card>
        </Tabs.Panel>

        {/* ── Invitations Tab ── */}
        <Tabs.Panel value="invitations">
          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconUserPlus size={16} />} onClick={() => inv.setInviteModalOpen(true)}>
              Invite Speaker
            </Button>
            <Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => inv.setBulkInviteModalOpen(true)}>
              Bulk Invite
            </Button>
          </Group>

          <InvitationStatsGrid
            stats={[
              { value: inv.stats.total, label: "Total Invites" },
              { value: inv.stats.pending, label: "Pending", color: "blue" },
              { value: inv.stats.accepted, label: "Accepted", color: "green" },
              { value: activeSpeakerCount, label: "Active Speakers", color: "teal" },
            ]}
          />

          <CurrentRoleHoldersTable
            holders={currentSpeakers?.filter(user => user.userRoles.length > 0) ?? []}
            roleName="speaker"
            badgeColor="teal"
            title="Current Speakers"
          />

          <Card withBorder mb="md">
            <TextInput
              placeholder="Filter speaker invitations by email..."
              value={inv.filterEmail}
              onChange={(e) => inv.setFilterEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} />}
            />
          </Card>

          <InvitationsTable
            invitations={inv.filteredInvitations}
            totalCount={inv.invitations.length}
            roleName="speaker"
            onResend={(id) => inv.resendInvitation.mutate({ invitationId: id })}
            onCancel={(id) => inv.cancelInvitation.mutate({ invitationId: id })}
            isResending={inv.resendInvitation.isPending}
            isCancelling={inv.cancelInvitation.isPending}
          />
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

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Delete Selected Applications"
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Are you sure you want to permanently delete {selectedApplications.length} application{selectedApplications.length !== 1 ? "s" : ""}? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setBulkDeleteModalOpen(false)}>Cancel</Button>
            <Button
              color="red"
              onClick={() => {
                if (selectedApplications.length === 0) return;
                bulkDeleteApplications.mutate({ applicationIds: selectedApplications });
              }}
              loading={bulkDeleteApplications.isPending}
            >
              Delete Applications
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Invite Speaker Modal */}
      <InviteModal
        opened={inv.inviteModalOpen}
        onClose={() => inv.setInviteModalOpen(false)}
        title="Invite Speaker"
        description={`Invite a speaker for ${inv.event?.name ?? "this event"}. They will receive an email invitation and can register or login to submit their speaker application.`}
        form={inv.inviteForm}
        onSubmit={inv.handleInvite}
        isLoading={inv.createInvitation.isPending}
        emailPlaceholder="speaker@example.com"
      />

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        opened={inv.bulkInviteModalOpen}
        onClose={() => inv.setBulkInviteModalOpen(false)}
        title="Bulk Invite Speakers"
        description={`Invite multiple speakers for ${inv.event?.name ?? "this event"} at once.`}
        form={inv.bulkInviteForm}
        onSubmit={inv.handleBulkInvite}
        isLoading={inv.bulkCreateInvitations.isPending}
        emailsLabel="Speaker Emails"
      />

      {/* Application Detail Drawer */}
      <ApplicationDetailsDrawer
        applicationId={viewingApplication?.id ?? null}
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
      />
    </Container>
  );
}

// ──────────────────────────────────────────
// Applications Table (speaker-specific)
// ──────────────────────────────────────────

interface ApplicationRow {
  id: string;
  status: string;
  email: string;
  eventId: string;
  submittedAt: Date | null;
  invitationId?: string | null;
  user?: { name: string | null } | null;
  venues?: { venue: { id: string; name: string } }[];
}

interface SpeakerApplicationsTableProps {
  applications: ApplicationRow[];
  selectedApplications: string[];
  invitedEmails: Set<string>;
  onSelectAll: () => void;
  onSelectApplication: (id: string) => void;
  onStatusUpdate: (id: string, status: "ACCEPTED" | "REJECTED") => void;
  onViewApplication: (id: string) => void;
  isUpdating: boolean;
}

function SpeakerApplicationsTable({
  applications,
  selectedApplications,
  invitedEmails,
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
            <Table.Th>Floors</Table.Th>
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
                <Group gap={6} wrap="nowrap">
                  <Text size="sm" fw={500}>{application.user?.name ?? "Unknown"}</Text>
                  {(application.invitationId ?? invitedEmails.has(application.email.toLowerCase())) && (
                    <Badge size="xs" variant="light" color="violet" leftSection={<IconMail size={10} />}>
                      Invited
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{application.email}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="wrap">
                  {application.venues?.map((av) => (
                    <Badge key={av.venue.id} size="xs" variant="light" color="cyan">
                      {av.venue.name}
                    </Badge>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge color={getApplicationStatusColor(application.status)} variant="light" size="sm" leftSection={getApplicationStatusIcon(application.status)}>
                  {application.status.replace("_", " ").toLowerCase()}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Not submitted"}
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

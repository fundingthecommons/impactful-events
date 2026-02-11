"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Badge,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Modal,
  ActionIcon,
  Select,
  Switch,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconClock,
  IconUsers,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ManageScheduleClientProps {
  eventId: string;
}

type FloorSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  sessionTypeId: string | null;
  order: number;
  isPublished: boolean;
  venue: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
};

export default function ManageScheduleClient({ eventId }: ManageScheduleClientProps) {
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);

  const { data: floorsData, isLoading: floorsLoading } =
    api.schedule.getMyFloors.useQuery({ eventId });

  // Set first venue as active once loaded
  if (floorsData?.venues && floorsData.venues.length > 0 && !activeVenueId) {
    setActiveVenueId(floorsData.venues[0]!.id);
  }

  if (floorsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!floorsData?.venues || floorsData.venues.length === 0) {
    return (
      <Container size="md" py="xl">
        <Center>
          <Stack align="center" gap="md">
            <IconBuilding size={48} color="var(--mantine-color-dimmed)" />
            <Title order={3}>No Floors Assigned</Title>
            <Text c="dimmed" ta="center">
              You don&apos;t have any floors assigned to manage.
              Contact an admin to get floor ownership.
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Manage Floors</Title>
            <Text c="dimmed" size="sm">
              {floorsData.isAdmin
                ? "Admin view — managing all floors"
                : "Manage sessions for your assigned floors"}
            </Text>
          </div>
        </Group>

        {floorsData.venues.length > 1 ? (
          <Tabs value={activeVenueId} onChange={setActiveVenueId}>
            <Tabs.List>
              {floorsData.venues.map((venue) => (
                <Tabs.Tab
                  key={venue.id}
                  value={venue.id}
                  leftSection={<IconBuilding size={14} />}
                  rightSection={
                    <Badge size="sm" variant="light" circle>
                      {venue._count.sessions}
                    </Badge>
                  }
                >
                  {venue.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        ) : null}

        {activeVenueId && (
          <FloorManager
            eventId={eventId}
            venueId={activeVenueId}
            venue={floorsData.venues.find((v) => v.id === activeVenueId)}
            isAdmin={floorsData.isAdmin}
          />
        )}
      </Stack>
    </Container>
  );
}

// ──────────────────────────────────────────
// FloorManager: manages a single floor
// ──────────────────────────────────────────

interface FloorManagerProps {
  eventId: string;
  venueId: string;
  venue?: {
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    owners: { user: { id: string; firstName: string | null; surname: string | null; name: string | null; email: string | null; image: string | null } }[];
  };
  isAdmin: boolean;
}

function FloorManager({ eventId, venueId, venue, isAdmin }: FloorManagerProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState(venue?.name ?? "");
  const [metaDescription, setMetaDescription] = useState(venue?.description ?? "");
  const [metaCapacity, setMetaCapacity] = useState<number | "">(venue?.capacity ?? "");

  const utils = api.useUtils();

  const { data: sessionsData, isLoading: sessionsLoading } =
    api.schedule.getFloorSessions.useQuery({ eventId, venueId });

  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const updateVenueMutation = api.schedule.updateVenue.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Updated", message: "Floor info updated", color: "green" });
      setEditingMeta(false);
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const deleteSessionMutation = api.schedule.deleteSession.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Deleted", message: "Session deleted", color: "green" });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const handleSaveMeta = () => {
    updateVenueMutation.mutate({
      id: venueId,
      name: metaName,
      description: metaDescription || null,
      capacity: metaCapacity === "" ? null : metaCapacity,
    });
  };

  return (
    <Stack gap="md">
      {/* Floor metadata */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Floor Details</Title>
          {!editingMeta && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconEdit size={14} />}
              onClick={() => {
                setMetaName(venue?.name ?? "");
                setMetaDescription(venue?.description ?? "");
                setMetaCapacity(venue?.capacity ?? "");
                setEditingMeta(true);
              }}
            >
              Edit
            </Button>
          )}
        </Group>

        {editingMeta ? (
          <Stack gap="sm">
            <TextInput
              label="Floor Name"
              value={metaName}
              onChange={(e) => setMetaName(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            <NumberInput
              label="Capacity"
              value={metaCapacity}
              onChange={(val) => setMetaCapacity(val === "" ? "" : Number(val))}
              min={0}
            />
            <Group>
              <Button
                size="sm"
                onClick={handleSaveMeta}
                loading={updateVenueMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setEditingMeta(false)}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Text fw={500}>{venue?.name}</Text>
            {venue?.description && <Text size="sm" c="dimmed">{venue.description}</Text>}
            {venue?.capacity != null && (
              <Text size="sm" c="dimmed">
                <IconUsers size={14} style={{ verticalAlign: "middle" }} /> Capacity: {venue.capacity}
              </Text>
            )}
            {venue?.owners && venue.owners.length > 0 && (
              <Text size="sm" c="dimmed">
                Owners: {venue.owners.map((o) =>
                  o.user.firstName ?? o.user.name ?? o.user.email ?? "Unknown"
                ).join(", ")}
              </Text>
            )}
          </Stack>
        )}
      </Paper>

      {/* Sessions */}
      <Group justify="space-between">
        <Title order={4}>Sessions</Title>
        <CreateSessionButton
          eventId={eventId}
          venueId={venueId}
          sessionTypes={filterData?.sessionTypes ?? []}
        />
      </Group>

      {sessionsLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
        <Paper p="xl" withBorder>
          <Center>
            <Stack align="center" gap="sm">
              <IconClock size={32} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">No sessions yet. Create your first session.</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Stack gap="xs">
          {sessionsData.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session as FloorSession}
              eventId={eventId}
              venueId={venueId}
              sessionTypes={filterData?.sessionTypes ?? []}
              onDelete={() => deleteSessionMutation.mutate({ id: session.id })}
              isDeleting={deleteSessionMutation.isPending}
              isAdmin={isAdmin}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ──────────────────────────────────────────
// SessionCard
// ──────────────────────────────────────────

interface SessionCardProps {
  session: FloorSession;
  eventId: string;
  venueId: string;
  sessionTypes: { id: string; name: string; color: string }[];
  onDelete: () => void;
  isDeleting: boolean;
  isAdmin: boolean;
}

function SessionCard({ session, eventId, venueId, sessionTypes, onDelete, isDeleting }: SessionCardProps) {
  const [editing, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);

  const timeStr = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const dateStr = startTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <Paper p="md" withBorder>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="xs">
              <Text fw={600}>{session.title}</Text>
              {!session.isPublished && (
                <Badge size="xs" color="yellow" variant="light">Draft</Badge>
              )}
              {session.sessionType && (
                <Badge
                  size="xs"
                  variant="light"
                  style={{ backgroundColor: `${session.sessionType.color}20`, color: session.sessionType.color }}
                >
                  {session.sessionType.name}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              <IconClock size={12} style={{ verticalAlign: "middle" }} /> {dateStr} {timeStr}
            </Text>
            {session.speakers.length > 0 && (
              <Text size="sm" c="dimmed">
                <IconUsers size={12} style={{ verticalAlign: "middle" }} /> {session.speakers.join(", ")}
              </Text>
            )}
            {session.description && (
              <Text size="sm" c="dimmed" lineClamp={2}>{session.description}</Text>
            )}
          </Stack>
          <Group gap={4}>
            <ActionIcon variant="subtle" color="blue" onClick={openEdit}>
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={onDelete}
              loading={isDeleting}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      <EditSessionModal
        opened={editing}
        onClose={closeEdit}
        session={session}
        eventId={eventId}
        venueId={venueId}
        sessionTypes={sessionTypes}
      />
    </>
  );
}

// ──────────────────────────────────────────
// CreateSessionButton + Modal
// ──────────────────────────────────────────

interface CreateSessionButtonProps {
  eventId: string;
  venueId: string;
  sessionTypes: { id: string; name: string; color: string }[];
}

function CreateSessionButton({ eventId, venueId, sessionTypes }: CreateSessionButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const utils = api.useUtils();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [speakers, setSpeakers] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);

  const createMutation = api.schedule.createSession.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Created", message: "Session created", color: "green" });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      resetForm();
      close();
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime(null);
    setEndTime(null);
    setSpeakers("");
    setSessionTypeId(null);
    setIsPublished(true);
  };

  const handleSubmit = () => {
    if (!title || !startTime || !endTime) {
      notifications.show({ title: "Missing fields", message: "Title, start time, and end time are required", color: "orange" });
      return;
    }
    createMutation.mutate({
      eventId,
      title,
      description: description || undefined,
      startTime,
      endTime,
      speakers: speakers ? speakers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      venueId,
      sessionTypeId: sessionTypeId ?? undefined,
      isPublished,
    });
  };

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        Add Session
      </Button>

      <Modal opened={opened} onClose={close} title="Create Session" size="lg">
        <Stack gap="sm">
          <TextInput
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group grow>
            <DateTimePicker
              label="Start Time"
              value={startTime}
              onChange={(val) => setStartTime(val as Date | null)}
              required
            />
            <DateTimePicker
              label="End Time"
              value={endTime}
              onChange={(val) => setEndTime(val as Date | null)}
              required
            />
          </Group>
          <TextInput
            label="Speakers"
            description="Comma-separated names"
            value={speakers}
            onChange={(e) => setSpeakers(e.currentTarget.value)}
          />
          {sessionTypes.length > 0 && (
            <Select
              label="Session Type"
              placeholder="Select type"
              data={sessionTypes.map((st) => ({
                value: st.id,
                label: st.name,
              }))}
              value={sessionTypeId}
              onChange={setSessionTypeId}
              clearable
            />
          )}
          <Switch
            label="Published"
            description="Published sessions are visible on the public schedule"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>Cancel</Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              Create Session
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// ──────────────────────────────────────────
// EditSessionModal
// ──────────────────────────────────────────

interface EditSessionModalProps {
  opened: boolean;
  onClose: () => void;
  session: FloorSession;
  eventId: string;
  venueId: string;
  sessionTypes: { id: string; name: string; color: string }[];
}

function EditSessionModal({
  opened,
  onClose,
  session,
  eventId,
  venueId,
  sessionTypes,
}: EditSessionModalProps) {
  const utils = api.useUtils();

  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [startTime, setStartTime] = useState<Date | null>(new Date(session.startTime));
  const [endTime, setEndTime] = useState<Date | null>(new Date(session.endTime));
  const [speakers, setSpeakers] = useState(session.speakers.join(", "));
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(session.sessionTypeId);
  const [isPublished, setIsPublished] = useState(session.isPublished);

  const updateMutation = api.schedule.updateSession.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Updated", message: "Session updated", color: "green" });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      onClose();
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const handleSubmit = () => {
    if (!title || !startTime || !endTime) {
      notifications.show({ title: "Missing fields", message: "Title, start time, and end time are required", color: "orange" });
      return;
    }
    updateMutation.mutate({
      id: session.id,
      title,
      description: description || null,
      startTime,
      endTime,
      speakers: speakers ? speakers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      sessionTypeId: sessionTypeId ?? null,
      isPublished,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Session" size="lg">
      <Stack gap="sm">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        <Group grow>
          <DateTimePicker
            label="Start Time"
            value={startTime}
            onChange={(val) => setStartTime(val as Date | null)}
            required
          />
          <DateTimePicker
            label="End Time"
            value={endTime}
            onChange={(val) => setEndTime(val as Date | null)}
            required
          />
        </Group>
        <TextInput
          label="Speakers"
          description="Comma-separated names"
          value={speakers}
          onChange={(e) => setSpeakers(e.currentTarget.value)}
        />
        {sessionTypes.length > 0 && (
          <Select
            label="Session Type"
            placeholder="Select type"
            data={sessionTypes.map((st) => ({
              value: st.id,
              label: st.name,
            }))}
            value={sessionTypeId}
            onChange={setSessionTypeId}
            clearable
          />
        )}
        <Switch
          label="Published"
          description="Published sessions are visible on the public schedule"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.currentTarget.checked)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

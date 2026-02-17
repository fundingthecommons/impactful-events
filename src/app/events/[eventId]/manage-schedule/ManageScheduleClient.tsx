"use client";

import { useState, useRef, useEffect } from "react";
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
  Avatar,
  Collapse,
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
  IconX,
  IconSearch,
  IconFileText,
  IconDownload,
  IconDoor,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { UserSearchSelect } from "~/app/_components/UserSearchSelect";
import { getDisplayName } from "~/utils/userDisplay";

interface ManageScheduleClientProps {
  eventId: string;
}

interface SelectedSpeaker {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

const PARTICIPANT_ROLES = [
  "Speaker",
  "Facilitator",
  "Moderator",
  "Presenter",
  "Panelist",
  "Host",
] as const;

type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

interface SelectedSpeakerWithRole {
  user: SelectedSpeaker;
  role: ParticipantRole;
}

interface SessionPrefillData {
  title: string;
  description: string;
  speaker: SelectedSpeaker;
  sessionTypeId: string | null;
  trackId: string | null;
}

function findMatchingSessionType(
  talkFormat: string | null | undefined,
  sessionTypes: { id: string; name: string }[],
): string | null {
  if (!talkFormat) return null;
  const lower = talkFormat.toLowerCase();
  // Try exact match first
  const exact = sessionTypes.find((st) => st.name.toLowerCase() === lower)?.id;
  if (exact) return exact;
  // Try matching first comma-separated value (for multi-select values)
  const parts = talkFormat.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    const match = sessionTypes.find((st) => st.name.toLowerCase() === part)?.id;
    if (match) return match;
  }
  return null;
}

function findMatchingTrack(
  talkTopic: string | null | undefined,
  tracks: { id: string; name: string }[],
): string | null {
  if (!talkTopic) return null;
  const lower = talkTopic.toLowerCase();
  // Try exact match first
  const exact = tracks.find((t) => t.name.toLowerCase() === lower)?.id;
  if (exact) return exact;
  // Try matching any comma-separated topic (for multi-select values)
  const parts = talkTopic.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    const match = tracks.find((t) => t.name.toLowerCase() === part)?.id;
    if (match) return match;
  }
  return null;
}

function formatDuration(duration: string | null | undefined): string {
  if (!duration) return "";
  const map: Record<string, string> = {
    "multi-hour": "Multi-hour",
    "90": "1.5 hours",
    "60": "1 hour",
    "45": "45 min",
    "30": "30 min",
  };
  return map[duration] ?? duration;
}

type FloorSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  roomId: string | null;
  sessionTypeId: string | null;
  trackId: string | null;
  order: number;
  isPublished: boolean;
  venue: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    role: string;
    user: SelectedSpeaker;
  }>;
};

type VenueRoom = { id: string; name: string; capacity: number | null; order: number };

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
              Contact an admin to get floor lead access.
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
// FloorLead: manages a single floor
// ──────────────────────────────────────────

interface FloorManagerProps {
  eventId: string;
  venueId: string;
  venue?: {
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    rooms: VenueRoom[];
    owners: { user: { id: string; firstName: string | null; surname: string | null; name: string | null; email: string | null; image: string | null } }[];
  };
  isAdmin: boolean;
}

function FloorManager({ eventId, venueId, venue, isAdmin }: FloorManagerProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState(venue?.name ?? "");
  const [metaDescription, setMetaDescription] = useState(venue?.description ?? "");
  const [metaCapacity, setMetaCapacity] = useState<number | "">(venue?.capacity ?? "");
  const [prefillData, setPrefillData] = useState<SessionPrefillData | null>(null);
  const [createModalOpened, setCreateModalOpened] = useState(false);

  const utils = api.useUtils();

  const { data: sessionsData, isLoading: sessionsLoading } =
    api.schedule.getFloorSessions.useQuery({ eventId, venueId });

  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const { data: applicationsData } =
    api.schedule.getFloorApplications.useQuery({ eventId, venueId });

  const [newRoomName, setNewRoomName] = useState("");

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

  const createRoomMutation = api.schedule.createRoom.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Created", message: "Room added", color: "green" });
      setNewRoomName("");
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const deleteRoomMutation = api.schedule.deleteRoom.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Deleted", message: "Room removed", color: "green" });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
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

      {/* Rooms */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconDoor size={18} />
            <Title order={4}>Rooms</Title>
            <Badge size="sm" variant="light">
              {venue?.rooms?.length ?? 0} / 3
            </Badge>
          </Group>
        </Group>
        {venue?.rooms && venue.rooms.length > 0 ? (
          <Stack gap="xs" mb="sm">
            {venue.rooms.map((room) => (
              <Group key={room.id} justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={500}>{room.name}</Text>
                  {room.capacity != null && (
                    <Text size="xs" c="dimmed">(capacity: {room.capacity})</Text>
                  )}
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => deleteRoomMutation.mutate({ id: room.id })}
                  loading={deleteRoomMutation.isPending}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" mb="sm">
            No rooms. Sessions will be scheduled at the floor level.
          </Text>
        )}
        {(venue?.rooms?.length ?? 0) < 3 && (
          <Group gap="xs">
            <TextInput
              placeholder="Room name"
              size="xs"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                if (!newRoomName.trim()) return;
                createRoomMutation.mutate({
                  venueId,
                  name: newRoomName.trim(),
                  order: venue?.rooms?.length ?? 0,
                });
              }}
              loading={createRoomMutation.isPending}
              disabled={!newRoomName.trim()}
            >
              Add Room
            </Button>
          </Group>
        )}
      </Paper>

      {/* Floor Applications */}
      <FloorApplicationsList
        applicationsData={applicationsData ?? []}
        sessionTypes={filterData?.sessionTypes ?? []}
        tracks={filterData?.tracks ?? []}
        onCreateFromApplication={(data) => {
          setPrefillData(data);
          setCreateModalOpened(true);
        }}
      />

      {/* Sessions */}
      <Group justify="space-between">
        <Title order={4}>Sessions</Title>
        <CreateSessionButton
          eventId={eventId}
          venueId={venueId}
          rooms={venue?.rooms ?? []}
          sessionTypes={filterData?.sessionTypes ?? []}
          tracks={filterData?.tracks ?? []}
          isAdmin={isAdmin}
          applicationsData={applicationsData ?? []}
          prefillData={prefillData}
          externalOpened={createModalOpened ? true : undefined}
          onExternalClose={() => {
            setCreateModalOpened(false);
            setPrefillData(null);
          }}
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
              rooms={venue?.rooms ?? []}
              sessionTypes={filterData?.sessionTypes ?? []}
              tracks={filterData?.tracks ?? []}
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
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onDelete: () => void;
  isDeleting: boolean;
  isAdmin: boolean;
}

function SessionCard({ session, eventId, venueId, rooms, sessionTypes, tracks, onDelete, isDeleting, isAdmin }: SessionCardProps) {
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
              {session.track && (
                <Badge
                  size="xs"
                  variant="light"
                  style={{ backgroundColor: `${session.track.color}20`, color: session.track.color }}
                >
                  {session.track.name}
                </Badge>
              )}
              {session.room && (
                <Badge size="xs" variant="light" color="teal">
                  {session.room.name}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              <IconClock size={12} style={{ verticalAlign: "middle" }} /> {dateStr} {timeStr}
            </Text>
            {(session.sessionSpeakers.length > 0 || session.speakers.length > 0) && (
              <Text size="sm" c="dimmed">
                <IconUsers size={12} style={{ verticalAlign: "middle" }} />{" "}
                {[
                  ...session.sessionSpeakers.map((s) =>
                    s.role !== "Speaker"
                      ? `${getDisplayName(s.user, "Unknown")} (${s.role})`
                      : getDisplayName(s.user, "Unknown"),
                  ),
                  ...session.speakers,
                ].join(", ")}
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
        rooms={rooms}
        sessionTypes={sessionTypes}
        tracks={tracks}
        isAdmin={isAdmin}
      />
    </>
  );
}

// ──────────────────────────────────────────
// FloorApplicationsList
// ──────────────────────────────────────────

type FloorApplicationData = {
  id: string;
  status: string;
  applicationType: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string | null;
    surname: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
    profile: {
      speakerTalkTitle: string | null;
      speakerTalkAbstract: string | null;
      speakerTalkFormat: string | null;
      speakerTalkDuration: string | null;
      speakerTalkTopic: string | null;
      speakerEntityName: string | null;
      bio: string | null;
      jobTitle: string | null;
      company: string | null;
    } | null;
  } | null;
};

interface FloorApplicationsListProps {
  applicationsData: FloorApplicationData[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onCreateFromApplication: (data: SessionPrefillData) => void;
}

function FloorApplicationsList({
  applicationsData,
  sessionTypes,
  tracks,
  onCreateFromApplication,
}: FloorApplicationsListProps) {
  const [expanded, { toggle }] = useDisclosure(false);

  if (applicationsData.length === 0) return null;

  return (
    <Stack gap="xs">
      <Group
        justify="space-between"
        onClick={toggle}
        style={{ cursor: "pointer" }}
      >
        <Group gap="xs">
          <IconFileText size={18} />
          <Title order={4}>Floor Applications</Title>
          <Badge size="sm" variant="light" circle>
            {applicationsData.length}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {expanded ? "Hide" : "Show"}
        </Text>
      </Group>

      <Collapse in={expanded}>
        <Stack gap="xs">
          {applicationsData.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              sessionTypes={sessionTypes}
              tracks={tracks}
              onCreateSession={onCreateFromApplication}
            />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
}

// ──────────────────────────────────────────
// ApplicationCard
// ──────────────────────────────────────────

interface ApplicationCardProps {
  application: FloorApplicationData;
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onCreateSession: (data: SessionPrefillData) => void;
}

function ApplicationCard({
  application,
  sessionTypes,
  tracks,
  onCreateSession,
}: ApplicationCardProps) {
  const user = application.user;
  if (!user) return null;

  const profile = user.profile;
  const talkTitle = profile?.speakerTalkTitle;
  const talkAbstract = profile?.speakerTalkAbstract;
  const talkFormat = profile?.speakerTalkFormat;
  const talkDuration = profile?.speakerTalkDuration;
  const entityName = profile?.speakerEntityName;

  const handleCreate = () => {
    onCreateSession({
      title: talkTitle ?? entityName ?? "",
      description: talkAbstract ?? "",
      speaker: {
        id: user.id,
        firstName: user.firstName,
        surname: user.surname,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      sessionTypeId: findMatchingSessionType(talkFormat, sessionTypes),
      trackId: findMatchingTrack(profile?.speakerTalkTopic, tracks),
    });
  };

  const statusColor =
    application.status === "ACCEPTED" ? "green" : "blue";

  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar src={user.image} alt={getDisplayName(user, "User")} size="sm" />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={600} truncate>
                {getDisplayName(user, "Unknown")}
              </Text>
              {entityName && (
                <Text size="xs" c="dimmed" truncate>
                  ({entityName})
                </Text>
              )}
              <Badge size="xs" color={statusColor} variant="light">
                {application.status}
              </Badge>
              {application.applicationType !== "SPEAKER" && (
                <Badge size="xs" variant="outline">
                  {application.applicationType}
                </Badge>
              )}
            </Group>
            {talkTitle && (
              <Text size="sm" fw={500} lineClamp={1}>
                {talkTitle}
              </Text>
            )}
            <Group gap="xs" wrap="wrap">
              {talkFormat && (
                <Badge size="xs" variant="light" color="violet">
                  {talkFormat}
                </Badge>
              )}
              {talkDuration && (
                <Badge size="xs" variant="light" color="gray">
                  {formatDuration(talkDuration)}
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={handleCreate}
          style={{ flexShrink: 0 }}
        >
          Create Session
        </Button>
      </Group>
    </Paper>
  );
}

// ──────────────────────────────────────────
// SpeakerSelector
// ──────────────────────────────────────────

interface SpeakerSelectorProps {
  linkedSpeakers: SelectedSpeakerWithRole[];
  onAddLinkedSpeaker: (user: SelectedSpeaker) => void;
  onRemoveLinkedSpeaker: (userId: string) => void;
  onChangeSpeakerRole: (userId: string, role: ParticipantRole) => void;
  textSpeakers: string;
  onTextSpeakersChange: (value: string) => void;
  venueId?: string;
  isAdmin?: boolean;
}

function SpeakerSelector({
  linkedSpeakers,
  onAddLinkedSpeaker,
  onRemoveLinkedSpeaker,
  onChangeSpeakerRole,
  textSpeakers,
  onTextSpeakersChange,
  venueId,
  isAdmin,
}: SpeakerSelectorProps) {
  const useFloorSearch = venueId && !isAdmin;

  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={500} mb={4}>Participants</Text>
        {useFloorSearch ? (
          <FloorApplicantSearchSelect
            venueId={venueId}
            onSelect={onAddLinkedSpeaker}
            excludeUserIds={linkedSpeakers.map((s) => s.user.id)}
            placeholder="Search floor applicants by name or email..."
          />
        ) : (
          <UserSearchSelect
            onSelect={onAddLinkedSpeaker}
            excludeUserIds={linkedSpeakers.map((s) => s.user.id)}
            placeholder="Search by name or email..."
          />
        )}
      </div>
      {linkedSpeakers.length > 0 && (
        <Stack gap={6}>
          {linkedSpeakers.map((speakerWithRole) => (
            <Group key={speakerWithRole.user.id} gap="xs" wrap="nowrap">
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() => onRemoveLinkedSpeaker(speakerWithRole.user.id)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
                style={{ flex: 1, maxWidth: "fit-content" }}
              >
                {getDisplayName(speakerWithRole.user, "Unknown")}
              </Badge>
              <Select
                size="xs"
                w={130}
                data={PARTICIPANT_ROLES}
                value={speakerWithRole.role}
                onChange={(val) => {
                  if (val) onChangeSpeakerRole(speakerWithRole.user.id, val as ParticipantRole);
                }}
                allowDeselect={false}
              />
            </Group>
          ))}
        </Stack>
      )}
      <TextInput
        label="Additional Names"
        description="Comma-separated names for people not in the system (no role assignment)"
        value={textSpeakers}
        onChange={(e) => onTextSpeakersChange(e.currentTarget.value)}
      />
    </Stack>
  );
}

// ──────────────────────────────────────────
// FloorApplicantSearchSelect
// ──────────────────────────────────────────

interface FloorApplicantSearchSelectProps {
  venueId: string;
  onSelect: (user: SelectedSpeaker) => void;
  excludeUserIds?: string[];
  placeholder?: string;
}

function FloorApplicantSearchSelect({
  venueId,
  onSelect,
  excludeUserIds = [],
  placeholder = "Search floor applicants...",
}: FloorApplicantSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } =
    api.schedule.searchFloorApplicants.useQuery(
      { venueId, query: searchQuery, limit: 10 },
      { enabled: searchQuery.length > 0 },
    );

  const filteredResults =
    searchResults?.filter((user) => !excludeUserIds.includes(user.id)) ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (user: SelectedSpeaker) => {
    onSelect(user);
    setSearchQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(0);
  };

  return (
    <div style={{ position: "relative" }}>
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleInputChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
        leftSection={<IconSearch size={16} />}
        rightSection={isLoading ? <Loader size="xs" /> : null}
      />

      {isOpen && searchQuery.length > 0 && (
        <Paper
          ref={dropdownRef}
          shadow="md"
          p="xs"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          ) : filteredResults.length > 0 ? (
            <Stack gap="xs">
              {filteredResults.map((user, index) => (
                <Paper
                  key={user.id}
                  p="xs"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      index === selectedIndex ? "var(--mantine-color-gray-1)" : "transparent",
                  }}
                  onClick={() => handleSelect(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Group gap="sm">
                    <Avatar src={user.image} alt={getDisplayName(user, "User")} size="sm" />
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {getDisplayName(user, "Unknown")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" ta="center" p="md">
              No floor applicants found
            </Text>
          )}
        </Paper>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// CreateSessionButton + Modal
// ──────────────────────────────────────────

interface CreateSessionButtonProps {
  eventId: string;
  venueId: string;
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
  applicationsData?: FloorApplicationData[];
  prefillData?: SessionPrefillData | null;
  externalOpened?: boolean;
  onExternalClose?: () => void;
}

function CreateSessionButton({
  eventId,
  venueId,
  rooms,
  sessionTypes,
  tracks,
  isAdmin,
  applicationsData,
  prefillData,
  externalOpened,
  onExternalClose,
}: CreateSessionButtonProps) {
  const [internalOpened, { open: internalOpen, close: internalClose }] = useDisclosure(false);
  const utils = api.useUtils();

  const modalOpened = externalOpened ?? internalOpened;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(new Date(2025, 2, 14, 12, 0));
  const [endTime, setEndTime] = useState<Date | null>(new Date(2025, 2, 14, 12, 0));
  const [linkedSpeakers, setLinkedSpeakers] = useState<SelectedSpeakerWithRole[]>([]);
  const [textSpeakers, setTextSpeakers] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);

  // Apply prefill data when modal opens with prefill
  useEffect(() => {
    if (prefillData && externalOpened) {
      setTitle(prefillData.title);
      setDescription(prefillData.description);
      setLinkedSpeakers([{ user: prefillData.speaker, role: "Speaker" }]);
      setSessionTypeId(prefillData.sessionTypeId);
      setTrackId(prefillData.trackId);
    }
  }, [prefillData, externalOpened]);

  const createMutation = api.schedule.createSession.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Created", message: "Session created", color: "green" });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      resetForm();
      handleClose();
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime(new Date(2025, 2, 14, 12, 0));
    setEndTime(new Date(2025, 2, 14, 12, 0));
    setLinkedSpeakers([]);
    setTextSpeakers("");
    setRoomId(null);
    setSessionTypeId(null);
    setTrackId(null);
    setIsPublished(true);
  };

  const handleClose = () => {
    if (onExternalClose) {
      onExternalClose();
    }
    internalClose();
    resetForm();
  };

  const handleImportApplication = (appId: string | null) => {
    if (!appId || !applicationsData) return;
    const app = applicationsData.find((a) => a.id === appId);
    if (!app?.user) return;
    const profile = app.user.profile;
    setTitle(profile?.speakerTalkTitle ?? profile?.speakerEntityName ?? "");
    setDescription(profile?.speakerTalkAbstract ?? "");
    setLinkedSpeakers([{
      user: {
        id: app.user.id,
        firstName: app.user.firstName,
        surname: app.user.surname,
        name: app.user.name,
        email: app.user.email,
        image: app.user.image,
      },
      role: "Speaker",
    }]);
    setSessionTypeId(findMatchingSessionType(profile?.speakerTalkFormat, sessionTypes));
    setTrackId(findMatchingTrack(profile?.speakerTalkTopic, tracks));
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
      speakers: textSpeakers ? textSpeakers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      linkedSpeakers: linkedSpeakers.map((s) => ({
        userId: s.user.id,
        role: s.role,
      })),
      venueId,
      roomId: roomId ?? undefined,
      sessionTypeId: sessionTypeId ?? undefined,
      trackId: trackId ?? undefined,
      isPublished,
    });
  };

  const importOptions = (applicationsData ?? []).flatMap((a) => {
    if (!a.user) return [];
    const user = a.user;
    return [{
      value: a.id,
      label: `${getDisplayName(user, "Unknown")}${user.profile?.speakerTalkTitle ? ` — ${user.profile.speakerTalkTitle}` : ""}`,
    }];
  });

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={internalOpen}>
        Add Session
      </Button>

      <Modal opened={modalOpened} onClose={handleClose} title="Create Session" size="lg">
        <Stack gap="sm">
          {!isAdmin && importOptions.length > 0 && (
            <Select
              label="Import from Application"
              placeholder="Select an application to auto-fill..."
              data={importOptions}
              onChange={handleImportApplication}
              leftSection={<IconDownload size={16} />}
              clearable
              searchable
            />
          )}
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
          <SpeakerSelector
            linkedSpeakers={linkedSpeakers}
            onAddLinkedSpeaker={(user) =>
              setLinkedSpeakers((prev) => [...prev, { user, role: "Speaker" }])
            }
            onRemoveLinkedSpeaker={(userId) =>
              setLinkedSpeakers((prev) => prev.filter((s) => s.user.id !== userId))
            }
            onChangeSpeakerRole={(userId, role) =>
              setLinkedSpeakers((prev) =>
                prev.map((s) => (s.user.id === userId ? { ...s, role } : s)),
              )
            }
            textSpeakers={textSpeakers}
            onTextSpeakersChange={setTextSpeakers}
            venueId={venueId}
            isAdmin={isAdmin}
          />
          {rooms.length > 0 && (
            <Select
              label="Room"
              placeholder="Select room"
              data={rooms.map((r) => ({ value: r.id, label: r.name }))}
              value={roomId}
              onChange={setRoomId}
              clearable
              leftSection={<IconDoor size={14} />}
            />
          )}
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
          {tracks.length > 0 && (
            <Select
              label="Track"
              placeholder="Select track"
              data={tracks.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              value={trackId}
              onChange={setTrackId}
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
            <Button variant="subtle" onClick={handleClose}>Cancel</Button>
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
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
}

function EditSessionModal({
  opened,
  onClose,
  session,
  eventId,
  venueId,
  rooms,
  sessionTypes,
  tracks,
  isAdmin,
}: EditSessionModalProps) {
  const utils = api.useUtils();

  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [startTime, setStartTime] = useState<Date | null>(new Date(session.startTime));
  const [endTime, setEndTime] = useState<Date | null>(new Date(session.endTime));
  const [linkedSpeakers, setLinkedSpeakers] = useState<SelectedSpeakerWithRole[]>(
    session.sessionSpeakers.map((s) => ({ user: s.user, role: s.role as ParticipantRole })),
  );
  const [textSpeakers, setTextSpeakers] = useState(session.speakers.join(", "));
  const [roomId, setRoomId] = useState<string | null>(session.roomId);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(session.sessionTypeId);
  const [trackId, setTrackId] = useState<string | null>(session.trackId);
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
      speakers: textSpeakers ? textSpeakers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      linkedSpeakers: linkedSpeakers.map((s) => ({
        userId: s.user.id,
        role: s.role,
      })),
      roomId: roomId ?? null,
      sessionTypeId: sessionTypeId ?? null,
      trackId: trackId ?? null,
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
        <SpeakerSelector
          linkedSpeakers={linkedSpeakers}
          onAddLinkedSpeaker={(user) =>
            setLinkedSpeakers((prev) => [...prev, { user, role: "Speaker" }])
          }
          onRemoveLinkedSpeaker={(userId) =>
            setLinkedSpeakers((prev) => prev.filter((s) => s.user.id !== userId))
          }
          onChangeSpeakerRole={(userId, role) =>
            setLinkedSpeakers((prev) =>
              prev.map((s) => (s.user.id === userId ? { ...s, role } : s)),
            )
          }
          textSpeakers={textSpeakers}
          onTextSpeakersChange={setTextSpeakers}
          venueId={venueId}
          isAdmin={isAdmin}
        />
        {rooms.length > 0 && (
          <Select
            label="Room"
            placeholder="Select room"
            data={rooms.map((r) => ({ value: r.id, label: r.name }))}
            value={roomId}
            onChange={setRoomId}
            clearable
            leftSection={<IconDoor size={14} />}
          />
        )}
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
        {tracks.length > 0 && (
          <Select
            label="Track"
            placeholder="Select track"
            data={tracks.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
            value={trackId}
            onChange={setTrackId}
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

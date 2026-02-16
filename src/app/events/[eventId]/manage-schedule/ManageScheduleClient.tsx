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

type FloorSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  sessionTypeId: string | null;
  trackId: string | null;
  order: number;
  isPublished: boolean;
  venue: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    role: string;
    user: SelectedSpeaker;
  }>;
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
          tracks={filterData?.tracks ?? []}
          isAdmin={isAdmin}
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
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onDelete: () => void;
  isDeleting: boolean;
  isAdmin: boolean;
}

function SessionCard({ session, eventId, venueId, sessionTypes, tracks, onDelete, isDeleting, isAdmin }: SessionCardProps) {
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
        sessionTypes={sessionTypes}
        tracks={tracks}
        isAdmin={isAdmin}
      />
    </>
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
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
}

function CreateSessionButton({ eventId, venueId, sessionTypes, tracks, isAdmin }: CreateSessionButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const utils = api.useUtils();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(new Date(2025, 2, 14, 12, 0));
  const [endTime, setEndTime] = useState<Date | null>(new Date(2025, 2, 14, 12, 0));
  const [linkedSpeakers, setLinkedSpeakers] = useState<SelectedSpeakerWithRole[]>([]);
  const [textSpeakers, setTextSpeakers] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
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
    setStartTime(new Date(2025, 2, 14, 12, 0));
    setEndTime(new Date(2025, 2, 14, 12, 0));
    setLinkedSpeakers([]);
    setTextSpeakers("");
    setSessionTypeId(null);
    setTrackId(null);
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
      speakers: textSpeakers ? textSpeakers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      linkedSpeakers: linkedSpeakers.map((s) => ({
        userId: s.user.id,
        role: s.role,
      })),
      venueId,
      sessionTypeId: sessionTypeId ?? undefined,
      trackId: trackId ?? undefined,
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
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
}

function EditSessionModal({
  opened,
  onClose,
  session,
  eventId,
  venueId,
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

"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Avatar,
  Badge,
  Loader,
  Center,
  Anchor,
  Paper,
  Button,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconClock, IconMapPin, IconLink, IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { QuickAddSpeakerModal, type QuickAddSpeakerResult } from "~/app/_components/QuickAddSpeakerModal";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export default function SessionDetailPage() {
  const params = useParams<{ eventId: string; sessionId: string }>();
  const { data: userSession } = useSession();
  const utils = api.useUtils();

  const { data: session, isLoading } = api.schedule.getSession.useQuery({
    sessionId: params.sessionId,
  });

  // Check if current user can manage this session (only when logged in)
  const { data: permissions } = api.schedule.canManageSession.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!userSession?.user },
  );
  const canManage = permissions?.canManage ?? false;

  // Quick-add modal state
  const [quickAddOpened, { open: openQuickAdd, close: closeQuickAdd }] = useDisclosure(false);
  const [linkingTextSpeaker, setLinkingTextSpeaker] = useState<string | null>(null);

  // Link speaker to session mutation
  const linkMutation = api.schedule.linkSpeakerToSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Speaker linked",
        message: "Speaker has been connected to this session",
        color: "green",
      });
      void utils.schedule.getSession.invalidate({ sessionId: params.sessionId });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSpeakerCreated = (user: QuickAddSpeakerResult) => {
    // After creating/finding the user, link them to this session
    linkMutation.mutate({
      sessionId: params.sessionId,
      userId: user.id,
      removeTextSpeaker: linkingTextSpeaker ?? undefined,
    });
    setLinkingTextSpeaker(null);
  };

  const handleLinkTextSpeaker = (name: string) => {
    setLinkingTextSpeaker(name);
    openQuickAdd();
  };

  const handleAddNewSpeaker = () => {
    setLinkingTextSpeaker(null);
    openQuickAdd();
  };

  // Split a full name into first/last name parts (best-effort)
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
    const last = parts.pop() ?? "";
    return { first: parts.join(" "), last };
  };

  const prefillParts = linkingTextSpeaker ? splitName(linkingTextSpeaker) : null;

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Container size="md" py="xl">
        <Text c="dimmed">Session not found.</Text>
      </Container>
    );
  }

  const color = session.sessionType?.color ?? "#94a3b8";
  const hasSpeakers = session.sessionSpeakers.length > 0 || session.speakers.length > 0;

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Back link */}
        <Anchor
          component={Link}
          href={`/events/${params.eventId}/schedule`}
          size="sm"
          c="dimmed"
        >
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to schedule
          </Group>
        </Anchor>

        {/* Session type badge */}
        {session.sessionType && (
          <Badge
            size="lg"
            variant="light"
            leftSection={
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            }
            style={{
              backgroundColor: `${color}15`,
              color: "var(--mantine-color-text)",
              alignSelf: "flex-start",
            }}
          >
            {session.sessionType.name}
          </Badge>
        )}

        {/* Title */}
        <Title order={1}>{session.title}</Title>

        {/* Location */}
        {session.venue && (
          <Group gap="xs">
            <IconMapPin size={18} style={{ color: "var(--mantine-color-dimmed)" }} />
            <Text size="md" c="dimmed">
              {session.venue.name}
              {session.room ? ` \u2014 ${session.room.name}` : ""}
            </Text>
          </Group>
        )}

        {/* Date and time */}
        <Group gap="xs">
          <IconClock size={18} style={{ color: "var(--mantine-color-dimmed)" }} />
          <Text size="md" c="dimmed">
            {formatDateTime(session.startTime)}{" "}
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </Text>
        </Group>

        {/* Track */}
        {session.track && (
          <Badge
            size="md"
            variant="light"
            style={{
              backgroundColor: `${session.track.color}20`,
              color: session.track.color,
              alignSelf: "flex-start",
            }}
          >
            {session.track.name}
          </Badge>
        )}

        {/* Description */}
        {session.description && (
          <Paper p="md" withBorder radius="md">
            <Text size="md" style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {session.description}
            </Text>
          </Paper>
        )}

        {/* Speakers */}
        {(hasSpeakers || canManage) && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={3}>
                {session.sessionSpeakers.length + session.speakers.length === 1
                  ? "Speaker"
                  : "Speakers"}
              </Title>
              {canManage && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconUserPlus size={14} />}
                  onClick={handleAddNewSpeaker}
                >
                  Add speaker
                </Button>
              )}
            </Group>
            {session.sessionSpeakers.map((speaker) => {
              const avatarSrc =
                speaker.user.profile?.avatarUrl ??
                speaker.user.image ??
                undefined;
              const name = getDisplayName(speaker.user, "Unknown");
              const titleParts = [
                speaker.user.profile?.jobTitle,
                speaker.user.profile?.company,
              ].filter(Boolean);
              const titleLine = titleParts.length > 0 ? titleParts.join(", ") : null;

              return (
                <Paper key={speaker.user.id} p="md" withBorder radius="md">
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar
                      src={avatarSrc}
                      size={64}
                      radius="xl"
                      style={{ flexShrink: 0 }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={8} align="center">
                        <Text fw={700} size="lg">
                          {name}
                        </Text>
                        {speaker.role !== "Speaker" && (
                          <Badge size="sm" variant="light" color="gray">
                            {speaker.role}
                          </Badge>
                        )}
                      </Group>
                      {titleLine && (
                        <Text size="sm" c="dimmed">
                          {titleLine}
                        </Text>
                      )}
                      {speaker.user.profile?.bio && (
                        <Text size="sm" style={{ lineHeight: 1.6, marginTop: 4 }}>
                          {speaker.user.profile.bio}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
            {/* Legacy text-only speakers */}
            {session.speakers.map((speakerName) => (
              <Paper key={speakerName} p="md" withBorder radius="md">
                <Group gap="md" align="center" justify="space-between">
                  <Group gap="md" align="center">
                    <Avatar size={64} radius="xl">
                      {speakerName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text fw={700} size="lg">
                      {speakerName}
                    </Text>
                  </Group>
                  {canManage && (
                    <Tooltip label="Connect to a user profile">
                      <Button
                        variant="light"
                        size="xs"
                        leftSection={<IconLink size={14} />}
                        onClick={() => handleLinkTextSpeaker(speakerName)}
                      >
                        Link profile
                      </Button>
                    </Tooltip>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Quick Add Speaker Modal */}
      {canManage && session.event && (
        <QuickAddSpeakerModal
          opened={quickAddOpened}
          onClose={() => {
            closeQuickAdd();
            setLinkingTextSpeaker(null);
          }}
          eventId={session.event.id}
          venueId={session.venue?.id}
          onSpeakerCreated={handleSpeakerCreated}
          prefillFirstName={prefillParts?.first}
          prefillLastName={prefillParts?.last}
        />
      )}
    </Container>
  );
}

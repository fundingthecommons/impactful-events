"use client";

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
} from "@mantine/core";
import { IconArrowLeft, IconClock, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

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
  const { data: session, isLoading } = api.schedule.getSession.useQuery({
    sessionId: params.sessionId,
  });

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
        {hasSpeakers && (
          <Stack gap="md">
            <Title order={3}>
              {session.sessionSpeakers.length + session.speakers.length === 1
                ? "Speaker"
                : "Speakers"}
            </Title>
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
                <Group gap="md" align="center">
                  <Avatar size={64} radius="xl">
                    {speakerName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text fw={700} size="lg">
                    {speakerName}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

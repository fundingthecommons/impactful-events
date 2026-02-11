"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

interface ConferenceDashboardProps {
  eventId: string;
  eventName: string;
  isSpeaker: boolean;
  isFloorOwner: boolean;
  isAdmin: boolean;
}

export default function ConferenceDashboard({
  eventId,
  eventName,
  isSpeaker,
  isFloorOwner,
  isAdmin,
}: ConferenceDashboardProps) {
  const { data: mySessions, isLoading: sessionsLoading } =
    api.schedule.getMySessions.useQuery(
      { eventId },
      { enabled: isSpeaker },
    );

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{eventName}</Title>
          <Text c="dimmed" size="sm">Conference Dashboard</Text>
        </div>

        {/* Speaker: My Sessions */}
        {isSpeaker && (
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>My Speaking Sessions</Title>
                {mySessions && mySessions.length > 0 && (
                  <Badge variant="light">{mySessions.length} session{mySessions.length !== 1 ? "s" : ""}</Badge>
                )}
              </Group>

              {sessionsLoading ? (
                <Center py="md">
                  <Loader size="sm" />
                </Center>
              ) : !mySessions || mySessions.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No sessions linked to your account yet. Floor managers will assign you to sessions.
                </Text>
              ) : (
                <Stack gap="xs">
                  {mySessions.map((session) => {
                    const startTime = new Date(session.startTime);
                    const endTime = new Date(session.endTime);
                    const dateStr = startTime.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const timeStr = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

                    return (
                      <Card key={session.id} withBorder p="sm" radius="sm">
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Group gap="xs">
                              <Text fw={600} size="sm">{session.title}</Text>
                              {session.sessionType && (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  style={{
                                    backgroundColor: `${session.sessionType.color}20`,
                                    color: session.sessionType.color,
                                  }}
                                >
                                  {session.sessionType.name}
                                </Badge>
                              )}
                            </Group>
                            <Group gap="md">
                              <Text size="xs" c="dimmed">
                                <IconCalendar size={12} style={{ verticalAlign: "middle" }} /> {dateStr}
                              </Text>
                              <Text size="xs" c="dimmed">
                                <IconClock size={12} style={{ verticalAlign: "middle" }} /> {timeStr}
                              </Text>
                              {session.venue && (
                                <Text size="xs" c="dimmed">
                                  <IconMapPin size={12} style={{ verticalAlign: "middle" }} /> {session.venue.name}
                                </Text>
                              )}
                            </Group>
                            {session.sessionSpeakers.length > 1 && (
                              <Text size="xs" c="dimmed">
                                Co-speakers: {session.sessionSpeakers
                                  .map((s) => getDisplayName(s.user, "Unknown"))
                                  .join(", ")}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        {/* Floor Manager: Manage Floors */}
        {(isFloorOwner || isAdmin) && (
          <Card withBorder>
            <Stack gap="sm">
              <Title order={4}>Manage Floors</Title>
              <Text size="sm" c="dimmed">
                Create and manage sessions for your assigned floors.
              </Text>
              <Group>
                <Button
                  component={Link}
                  href={`/events/${eventId}/manage-schedule`}
                  leftSection={<IconSettings size={16} />}
                  variant="light"
                >
                  Manage Floors
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Everyone: Event Schedule */}
        <Card withBorder>
          <Stack gap="sm">
            <Title order={4}>Event Schedule</Title>
            <Text size="sm" c="dimmed">
              View the full conference schedule with all sessions and speakers.
            </Text>
            <Group>
              <Button
                component={Link}
                href={`/events/${eventId}/schedule`}
                leftSection={<IconCalendar size={16} />}
                variant="light"
              >
                View Schedule
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

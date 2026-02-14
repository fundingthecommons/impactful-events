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
  Divider,
  Spoiler,
} from "@mantine/core";
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconSettings,
  IconMicrophone,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

function getStatusColor(status: string): string {
  switch (status) {
    case "DRAFT": return "gray";
    case "SUBMITTED": return "blue";
    case "UNDER_REVIEW": return "yellow";
    case "ACCEPTED": return "green";
    case "REJECTED": return "red";
    case "WAITLISTED": return "orange";
    case "CANCELLED": return "gray";
    default: return "gray";
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "DRAFT": return "Your application is saved as a draft. Submit when ready.";
    case "SUBMITTED": return "Your application is pending review.";
    case "UNDER_REVIEW": return "Your application is currently under review.";
    case "ACCEPTED": return "Your talk has been accepted!";
    case "REJECTED": return "Unfortunately, your talk was not selected for this event.";
    case "WAITLISTED": return "Your talk has been placed on the waitlist.";
    case "CANCELLED": return "Your application has been cancelled.";
    default: return "";
  }
}

const talkFormatLabels: Record<string, string> = {
  keynote: "Keynote",
  talk: "Talk",
  panel: "Panel Discussion",
  workshop: "Workshop",
  lightning: "Lightning Talk",
  fireside: "Fireside Chat",
};

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

  // Fetch speaker application and profile for talk submission status
  const { data: speakerApplication, isLoading: applicationLoading } =
    api.application.getApplication.useQuery(
      { eventId, applicationType: "SPEAKER" },
    );

  const { data: myProfile, isLoading: profileLoading } =
    api.profile.getMyProfile.useQuery();

  const submissionLoading = applicationLoading || profileLoading;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{eventName}</Title>
          <Text c="dimmed" size="sm">Conference Dashboard</Text>
        </div>

        {/* My Talk Submission */}
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconMicrophone size={20} color="var(--mantine-color-teal-6)" />
                <Title order={4}>My Talk Submission</Title>
              </Group>
              {speakerApplication && (
                <Badge
                  variant="light"
                  color={getStatusColor(speakerApplication.status)}
                >
                  {speakerApplication.status.replace("_", " ")}
                </Badge>
              )}
            </Group>

            {submissionLoading ? (
              <Center py="md">
                <Loader size="sm" />
              </Center>
            ) : !speakerApplication ? (
              <Stack gap="sm">
                <Text c="dimmed" size="sm">
                  No speaker application found for this event.
                </Text>
                <Group>
                  <Button
                    component={Link}
                    href={`/events/${eventId}/speaker`}
                    variant="light"
                    color="teal"
                    size="sm"
                    leftSection={<IconMicrophone size={16} />}
                  >
                    Submit Speaker Application
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="sm">
                <Text size="sm" c={getStatusColor(speakerApplication.status)}>
                  {getStatusMessage(speakerApplication.status)}
                </Text>

                {myProfile?.speakerTalkTitle && (
                  <>
                    <Divider />

                    <div>
                      <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                        Talk Title
                      </Text>
                      <Text size="sm" fw={600}>
                        {myProfile.speakerTalkTitle}
                      </Text>
                    </div>

                    {myProfile.speakerTalkAbstract && (
                      <div>
                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                          Abstract
                        </Text>
                        <Spoiler maxHeight={60} showLabel="Show more" hideLabel="Show less">
                          <Text size="sm">
                            {myProfile.speakerTalkAbstract}
                          </Text>
                        </Spoiler>
                      </div>
                    )}

                    <Group gap="lg">
                      {myProfile.speakerTalkFormat && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Format
                          </Text>
                          <Text size="sm">
                            {talkFormatLabels[myProfile.speakerTalkFormat] ?? myProfile.speakerTalkFormat}
                          </Text>
                        </div>
                      )}
                      {myProfile.speakerTalkDuration && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Duration
                          </Text>
                          <Text size="sm">
                            {myProfile.speakerTalkDuration} min
                          </Text>
                        </div>
                      )}
                      {myProfile.speakerTalkTopic && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Topic
                          </Text>
                          <Text size="sm">
                            {myProfile.speakerTalkTopic}
                          </Text>
                        </div>
                      )}
                    </Group>
                  </>
                )}

                {speakerApplication.venues && speakerApplication.venues.length > 0 && (
                  <div>
                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                      Selected Floors
                    </Text>
                    <Group gap="xs" mt={4}>
                      {speakerApplication.venues.map((av) => (
                        <Badge key={av.venue.id} variant="outline" size="sm">
                          {av.venue.name}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                )}

                {speakerApplication.submittedAt && (
                  <Text size="xs" c="dimmed">
                    Submitted on{" "}
                    {new Date(speakerApplication.submittedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                )}

                {speakerApplication.status === "DRAFT" && (
                  <Group>
                    <Button
                      component={Link}
                      href={`/events/${eventId}/speaker`}
                      variant="light"
                      color="teal"
                      size="sm"
                    >
                      Continue Application
                    </Button>
                  </Group>
                )}
              </Stack>
            )}
          </Stack>
        </Card>

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
                              {session.track && (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  style={{
                                    backgroundColor: `${session.track.color}20`,
                                    color: session.track.color,
                                  }}
                                >
                                  {session.track.name}
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
                                Participants: {session.sessionSpeakers
                                  .map((s) =>
                                    s.role !== "Speaker"
                                      ? `${getDisplayName(s.user, "Unknown")} (${s.role})`
                                      : getDisplayName(s.user, "Unknown"),
                                  )
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

"use client";

import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Tabs,
  Loader,
  Center,
  Box,
  ThemeIcon,
  Timeline,
  Card,
  Divider,
  Tooltip,
} from "@mantine/core";
import {
  IconTrophy,
  IconActivity,
  IconSparkles,
  IconThumbUp,
  IconMessage,
  IconFileText,
  IconBriefcase,
  IconQuestionMark,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getKudosTier } from "~/utils/kudosCalculation";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "~/app/_components/UserAvatar";

export function KudosLeaderboardClient() {
  const { data: leaderboard, isLoading: leaderboardLoading } =
    api.kudos.getLeaderboard.useQuery({ limit: 50 });

  const { data: activityTimeline, isLoading: activityLoading } =
    api.kudos.getActivityTimeline.useQuery({ limit: 50 });

  const { data: myStats } = api.kudos.getUserStats.useQuery({});

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>
              <Group gap="sm">
                <IconTrophy size={36} />
                Kudos Leaderboard
              </Group>
            </Title>
            <Text c="dimmed" mt="xs">
              Social credit economy - recognition that matters
            </Text>
          </div>

          {myStats && (
            <Card withBorder p="md">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Your Kudos
                </Text>
                <Group gap="xs">
                  <Badge
                    size="xl"
                    variant="gradient"
                    gradient={{
                      from: getKudosTier(myStats.currentKudos).color,
                      to: "blue",
                    }}
                  >
                    {myStats.currentKudos.toFixed(1)}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {getKudosTier(myStats.currentKudos).label}
                  </Text>
                </Group>
              </Stack>
            </Card>
          )}
        </Group>

        {/* Tabs */}
        <Tabs defaultValue="leaderboard">
          <Tabs.List>
            <Tabs.Tab
              value="leaderboard"
              leftSection={<IconTrophy size={16} />}
            >
              Leaderboard
            </Tabs.Tab>
            <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
              Activity Timeline
            </Tabs.Tab>
          </Tabs.List>

          {/* Leaderboard Tab */}
          <Tabs.Panel value="leaderboard" pt="xl">
            {leaderboardLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : (
              <Stack gap="md">
                {leaderboard?.map((entry, index) => {
                  const tier = getKudosTier(entry.kudos);
                  const displayName =
                    entry.user.firstName && entry.user.surname
                      ? `${entry.user.firstName} ${entry.user.surname}`
                      : entry.user.name ?? entry.user.email;

                  return (
                    <Paper key={entry.user.id} withBorder p="lg" radius="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="lg" wrap="nowrap">
                          {/* Rank Badge */}
                          <Box style={{ minWidth: 40, textAlign: "center" }}>
                            {index < 3 ? (
                              <ThemeIcon
                                size="xl"
                                variant="gradient"
                                gradient={
                                  index === 0
                                    ? { from: "yellow", to: "orange" }
                                    : index === 1
                                      ? { from: "gray", to: "dark" }
                                      : { from: "orange", to: "red" }
                                }
                              >
                                <IconTrophy size={24} />
                              </ThemeIcon>
                            ) : (
                              <Text size="xl" fw={700} c="dimmed">
                                #{index + 1}
                              </Text>
                            )}
                          </Box>

                          {/* User Info */}
                          <Group gap="md" wrap="nowrap">
                            <UserAvatar
                              user={{
                                oauthImageUrl: entry.user.image,
                                name: entry.user.name,
                                email: entry.user.email,
                                firstName: entry.user.firstName,
                                surname: entry.user.surname,
                              }}
                              size="lg"
                              radius="xl"
                            />
                            <div>
                              <Text fw={600} size="lg">
                                {displayName}
                              </Text>
                              <Group gap="xs" mt={4}>
                                <Tooltip label="Project Updates">
                                  <Badge
                                    size="sm"
                                    variant="light"
                                    leftSection={<IconFileText size={12} />}
                                  >
                                    {entry.breakdown.updateCount} updates
                                  </Badge>
                                </Tooltip>
                                <Tooltip label="Praise Received">
                                  <Badge
                                    size="sm"
                                    variant="light"
                                    color="pink"
                                    leftSection={<IconMessage size={12} />}
                                  >
                                    {entry.breakdown.praiseReceivedCount} praise
                                  </Badge>
                                </Tooltip>
                                <Tooltip label="Likes Received">
                                  <Badge
                                    size="sm"
                                    variant="light"
                                    color="grape"
                                    leftSection={<IconThumbUp size={12} />}
                                  >
                                    {entry.breakdown.likesReceivedCount} likes
                                  </Badge>
                                </Tooltip>
                              </Group>
                            </div>
                          </Group>
                        </Group>

                        {/* Kudos Score */}
                        <Stack gap={4} align="flex-end">
                          <Badge
                            size="xl"
                            variant="gradient"
                            gradient={{ from: tier.color, to: "blue" }}
                          >
                            {entry.kudos.toFixed(1)} kudos
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {tier.label}
                          </Text>
                        </Stack>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Tabs.Panel>

          {/* Activity Timeline Tab */}
          <Tabs.Panel value="activity" pt="xl">
            {activityLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : (
              <Timeline
                active={activityTimeline?.length ?? 0}
                bulletSize={32}
                lineWidth={2}
              >
                {activityTimeline?.map((activity) => {
                  const from = activity.from as {
                    id: string;
                    firstName: string | null;
                    surname: string | null;
                    name: string | null;
                    email?: string | null;
                    image: string | null;
                  };
                  const to = activity.to as {
                    id: string;
                    firstName: string | null;
                    surname: string | null;
                    name: string | null;
                    email?: string | null;
                    image: string | null;
                  };

                  const fromName =
                    from?.firstName && from?.surname
                      ? `${from.firstName} ${from.surname}`
                      : from?.name ?? from?.email ?? "Unknown";

                  const toName =
                    to?.firstName && to?.surname
                      ? `${to.firstName} ${to.surname}`
                      : to?.name ?? to?.email ?? "Unknown";

                  let icon = <IconSparkles size={16} />;
                  let title = "";
                  let description = "";
                  let color = "blue";

                  if (activity.type === "praise") {
                    icon = <IconMessage size={16} />;
                    title = `${fromName} praised ${toName}`;
                    description = (activity.content as { message: string }).message;
                    color = "pink";
                  } else if (activity.type === "like_update") {
                    icon = <IconThumbUp size={16} />;
                    title = `${fromName} liked ${toName}'s update`;
                    description = (activity.content as { updateTitle?: string | null }).updateTitle ?? "Project update";
                    color = "grape";
                  } else if (activity.type === "like_askoffer") {
                    icon = <IconQuestionMark size={16} />;
                    title = `${fromName} liked ${toName}'s ${(activity.content as { askOfferType: string }).askOfferType}`;
                    description = (activity.content as { askOfferTitle?: string | null }).askOfferTitle ?? "";
                    color = "cyan";
                  } else if (activity.type === "like_project") {
                    icon = <IconBriefcase size={16} />;
                    title = `${fromName} liked ${toName}'s project`;
                    description = (activity.content as { projectTitle?: string | null }).projectTitle ?? "Project";
                    color = "indigo";
                  }

                  return (
                    <Timeline.Item
                      key={activity.id}
                      bullet={icon}
                      title={
                        <Group justify="space-between">
                          <Text fw={600}>{title}</Text>
                          <Badge
                            size="sm"
                            variant="light"
                            color={color}
                            leftSection={<IconSparkles size={12} />}
                          >
                            +{activity.kudosTransferred.toFixed(1)} kudos
                          </Badge>
                        </Group>
                      }
                    >
                      <Text size="sm" c="dimmed" mt={4}>
                        {description}
                      </Text>
                      <Text size="xs" c="dimmed" mt={8}>
                        {formatDistanceToNow(activity.createdAt, {
                          addSuffix: true,
                        })}
                      </Text>
                      <Divider mt="md" />
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

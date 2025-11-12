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
  Table,
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
  IconArrowUp,
  IconArrowDown,
  IconUsers,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getKudosTier, KUDOS_CONSTANTS } from "~/utils/kudosCalculation";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";
import Link from "next/link";
import { useMemo, useState } from "react";

type SortField = "projects" | "projectsWithMetrics" | "updates" | "praiseSent" | "praiseReceived" | "kudos";
type SortDirection = "asc" | "desc";

export function KudosLeaderboardClient() {
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: leaderboard, isLoading: leaderboardLoading } =
    api.kudos.getLeaderboard.useQuery({ limit: 50 });

  const { data: activityTimeline, isLoading: activityLoading } =
    api.kudos.getActivityTimeline.useQuery({ limit: 50 });

  const { data: myStats } = api.kudos.getUserStats.useQuery({});

  // Residency leaderboard data
  const eventId = "funding-commons-residency-2025";

  const { data: transactions } = api.praise.getAllTransactions.useQuery({
    limit: 100,
  });

  const { isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  );

  const { data: residentProjects } = api.application.getResidentProjects.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  const { data: residentsData } = api.application.getAcceptedResidents.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Build resident statistics
  const residentStats = useMemo(() => {
    if (!residentsData?.residents) return [];

    return residentsData.residents.map((resident) => {
      const userId = resident.user?.id;
      if (!userId) return null;

      const userProjects = residentProjects?.filter(
        (p) => p.profile?.user?.id === userId
      ) ?? [];

      const totalProjects = userProjects.length;

      const projectsWithMetrics = userProjects.filter(
        (p) => p.metrics && p.metrics.length > 0
      ).length;

      const updateCount = userProjects.reduce(
        (sum: number, p) => sum + (p.updates?.length ?? 0),
        0
      );

      const praiseSentCount = transactions?.filter(
        (t) => t.senderId === userId
      ).length ?? 0;

      const praiseReceivedCount = transactions?.filter(
        (t) => t.recipientId === userId
      ).length ?? 0;

      const actualKudos = resident.user?.kudos ?? KUDOS_CONSTANTS.BASE_KUDOS;

      return {
        userId,
        name: resident.user?.name,
        image: resident.user?.image,
        customAvatarUrl: resident.user?.profile?.avatarUrl,
        firstName: resident.user?.firstName,
        surname: resident.user?.surname,
        projects: totalProjects,
        projectsWithMetrics,
        updates: updateCount,
        praiseSent: praiseSentCount,
        praiseReceived: praiseReceivedCount,
        kudos: actualKudos,
      };
    }).filter(Boolean);
  }, [residentsData, residentProjects, transactions]);

  // Sort resident stats
  const sortedResidentStats = useMemo(() => {
    return [...residentStats].sort((a, b) => {
      const aVal = a![sortField];
      const bVal = b![sortField];
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [residentStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>
              <Group gap="sm">
                <IconTrophy size={36} />
                Kudos
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
            <Tabs.Tab value="residency" leftSection={<IconUsers size={16} />}>
              Residency Leaderboard
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
                                customAvatarUrl: entry.user.profile?.avatarUrl,
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
                                    leftSection={<IconThumbUp size={16} />}
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

          {/* Residency Leaderboard Tab */}
          <Tabs.Panel value="residency" pt="xl">
            {eventLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : (
              <Card withBorder>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Resident</Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("projects")}
                      >
                        <Group gap="xs">
                          Projects
                          <SortIcon field="projects" />
                        </Group>
                      </Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("projectsWithMetrics")}
                      >
                        <Group gap="xs">
                          Projects with Metrics
                          <SortIcon field="projectsWithMetrics" />
                        </Group>
                      </Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("updates")}
                      >
                        <Group gap="xs">
                          Updates
                          <SortIcon field="updates" />
                        </Group>
                      </Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("praiseSent")}
                      >
                        <Group gap="xs">
                          Praise Sent
                          <SortIcon field="praiseSent" />
                        </Group>
                      </Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("praiseReceived")}
                      >
                        <Group gap="xs">
                          Praise Received
                          <SortIcon field="praiseReceived" />
                        </Group>
                      </Table.Th>
                      <Table.Th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("kudos")}
                      >
                        <Group gap="xs">
                          Kudos
                          <SortIcon field="kudos" />
                        </Group>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedResidentStats.map((resident) => (
                      <Table.Tr key={resident!.userId}>
                        <Table.Td>
                          <Group gap="sm">
                            <UserAvatar
                              user={{
                                customAvatarUrl: resident!.customAvatarUrl,
                                oauthImageUrl: resident!.image,
                                name: resident!.name,
                                firstName: resident!.firstName,
                                surname: resident!.surname,
                              }}
                              radius="xl"
                              size="sm"
                            />
                            <Text
                              component={Link}
                              href={`/profiles/${resident!.userId}`}
                              size="sm"
                              fw={500}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              {getDisplayName(resident, "Unknown")}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{resident!.projects}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{resident!.projectsWithMetrics}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{resident!.updates}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue">{resident!.praiseSent}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="green">{resident!.praiseReceived}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={getKudosTier(resident!.kudos).color}
                            size="lg"
                          >
                            {Math.round(resident!.kudos)}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

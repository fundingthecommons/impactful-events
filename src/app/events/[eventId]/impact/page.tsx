"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Timeline,
  Badge,
  Divider,
  Card,
  Table,
  ThemeIcon,
  Box,
} from "@mantine/core";
import {
  IconChartBar,
  IconTable,
  IconActivity,
  IconUsers,
  IconSparkles,
  IconMessage,
  IconThumbUp,
  IconQuestionMark,
  IconBriefcase,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { Hyperboard } from "~/app/_components/Hyperboard";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";
import Link from "next/link";
import { getKudosTier, KUDOS_CONSTANTS } from "~/utils/kudosCalculation";

type SortField = "projects" | "projectsWithMetrics" | "updates" | "praiseSent" | "praiseReceived" | "kudos";
type SortDirection = "asc" | "desc";

interface ImpactPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ImpactPage({ params }: ImpactPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  );

  // Get resident projects
  const { data: residentProjects } = api.application.getResidentProjects.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get accepted residents
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get sponsors for hyperboard
  const { data: sponsors } = api.sponsor.getSponsorsForHyperboard.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get residents for hyperboard
  const { data: residentsHyperboard } = api.application.getResidentsForHyperboard.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get activity timeline
  const { data: activityTimeline, isLoading: activityLoading } =
    api.kudos.getActivityTimeline.useQuery({ limit: 50 });

  // Get praise transactions for residency leaderboard
  const { data: transactions } = api.praise.getAllTransactions.useQuery({
    limit: 100,
  });

  // Get all project updates count
  const totalUpdates = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      return sum + (project.updates?.length ?? 0);
    }, 0);
  }, [residentProjects]);

  // Get total likes across all projects (count likes on all updates)
  const totalLikes = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      const projectLikes = project.updates?.reduce((updateSum: number, update) => {
        return updateSum + (update.likes?.length ?? 0);
      }, 0) ?? 0;
      return sum + projectLikes;
    }, 0);
  }, [residentProjects]);

  // Build resident statistics for leaderboard
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

  if (eventLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Residency Impact</Title>

      <Tabs defaultValue="stats">
        <Tabs.List>
          <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
            Statistics
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
            Activity Timeline
          </Tabs.Tab>
          <Tabs.Tab value="leaderboard" leftSection={<IconUsers size={16} />}>
            Residency Leaderboard
          </Tabs.Tab>
          <Tabs.Tab value="sponsor-hyperboard" leftSection={<IconTable size={16} />}>
            Sponsor Hyperboard
          </Tabs.Tab>
          <Tabs.Tab value="residents-hyperboard" leftSection={<IconUsers size={16} />}>
            Residents Hyperboard
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="stats" pt="xl">
          <Group grow>
            <Paper p="lg" withBorder>
              <Text size="sm" c="dimmed" mb="xs">Residents</Text>
              <Text size="2xl" fw={700}>{residentsData?.visibleResidents ?? 0}</Text>
            </Paper>
            <Paper p="lg" withBorder>
              <Text size="sm" c="dimmed" mb="xs">Projects</Text>
              <Text size="2xl" fw={700}>{residentProjects?.length ?? 0}</Text>
            </Paper>
            <Paper p="lg" withBorder>
              <Text size="sm" c="dimmed" mb="xs">Project Updates</Text>
              <Text size="2xl" fw={700}>{totalUpdates}</Text>
            </Paper>
            <Paper p="lg" withBorder>
              <Text size="sm" c="dimmed" mb="xs">Total Likes</Text>
              <Text size="2xl" fw={700}>{totalLikes}</Text>
            </Paper>
          </Group>
        </Tabs.Panel>

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

        <Tabs.Panel value="leaderboard" pt="xl">
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

        <Tabs.Panel value="sponsor-hyperboard" pt="xl">
          {sponsors && sponsors.length > 0 ? (
            <Hyperboard
              data={sponsors}
              height={800}
              label="Sponsors"
              onClickLabel={() => {
                console.log("Label clicked");
              }}
              grayscaleImages={true}
              borderColor="white"
            />
          ) : (
            <Text c="dimmed">No sponsors found for this event.</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="residents-hyperboard" pt="xl">
          {residentsHyperboard && residentsHyperboard.length > 0 ? (
            <Hyperboard
              data={residentsHyperboard}
              height={800}
              label="Residents"
              onClickLabel={() => {
                console.log("Label clicked");
              }}
              grayscaleImages={false}
              borderColor="white"
            />
          ) : (
            <Text c="dimmed">No residents found for this event.</Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

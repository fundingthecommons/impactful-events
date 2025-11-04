"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Title,
  Tabs,
  Card,
  Text,
  Group,
  Avatar,
  Badge,
  Stack,
  Paper,
  Loader,
  Center,
  Table,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { getDisplayName } from "~/utils/userDisplay";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import Link from "next/link";
import { PraiseQuantifyPanel } from "./components/PraiseQuantifyPanel";
import { PraiseInstanceQuantifyPanel } from "./components/PraiseInstanceQuantifyPanel";

interface ImpactPageProps {
  params: Promise<{ eventId: string }>;
}

type SortField = "projects" | "updates" | "praiseSent" | "praiseReceived";
type SortDirection = "asc" | "desc";

export default function ImpactPage({ params }: ImpactPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string | null>("metrics");
  const [praiseSubTab, setPraiseSubTab] = useState<string | null>("stats");
  const [sortField, setSortField] = useState<SortField>("praiseReceived");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  const { data: receivedPraise, isLoading: loadingReceived } = api.praise.getMyReceivedPraise.useQuery();
  const { data: sentPraise, isLoading: loadingSent } = api.praise.getMySentPraise.useQuery();
  const { data: stats } = api.praise.getMyStats.useQuery();
  const { data: transactions, isLoading: loadingTransactions } = api.praise.getAllTransactions.useQuery({
    limit: 100,
  });

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

  // Build resident statistics
  const residentStats = useMemo(() => {
    if (!residentsData?.residents) return [];

    return residentsData.residents.map((resident) => {
      const userId = resident.user?.id;
      if (!userId) return null;

      // Count projects
      const userProjects = residentProjects?.filter(
        (p) => p.profile?.user?.id === userId
      ) ?? [];

      // Count updates across all user's projects
      const updateCount = userProjects.reduce(
        (sum: number, p) => sum + (p.updates?.length ?? 0),
        0
      );

      // Count praise sent and received
      const praiseSentCount = transactions?.filter(
        (t) => t.senderId === userId
      ).length ?? 0;

      const praiseReceivedCount = transactions?.filter(
        (t) => t.recipientId === userId
      ).length ?? 0;

      return {
        userId,
        name: resident.user?.name,
        image: resident.user?.image,
        firstName: resident.user?.firstName,
        surname: resident.user?.surname,
        projects: userProjects.length,
        updates: updateCount,
        praiseSent: praiseSentCount,
        praiseReceived: praiseReceivedCount,
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

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="metrics">Metrics</Tabs.Tab>
          <Tabs.Tab value="praise">Praise</Tabs.Tab>
          <Tabs.Tab value="residents">Residents</Tabs.Tab>
        </Tabs.List>

        {/* Metrics Tab */}
        <Tabs.Panel value="metrics" pt="md">
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

        {/* Praise Tab with Sub-tabs */}
        <Tabs.Panel value="praise" pt="md">
          <Tabs value={praiseSubTab} onChange={setPraiseSubTab}>
            <Tabs.List>
              <Tabs.Tab value="stats">Stats</Tabs.Tab>
              <Tabs.Tab value="transactions">Transactions</Tabs.Tab>
              <Tabs.Tab value="received">Received</Tabs.Tab>
              <Tabs.Tab value="sent">Sent</Tabs.Tab>
              <Tabs.Tab value="quantify">Quantify</Tabs.Tab>
              <Tabs.Tab value="quantify-instances">By Instance</Tabs.Tab>
            </Tabs.List>

            {/* Stats Sub-tab */}
            <Tabs.Panel value="stats" pt="md">
              {stats ? (
                <Group grow>
                  <Paper p="lg" withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Praise Received</Text>
                    <Text size="2xl" fw={700}>{stats.receivedCount}</Text>
                  </Paper>
                  <Paper p="lg" withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Praise Sent</Text>
                    <Text size="2xl" fw={700}>{stats.sentCount}</Text>
                  </Paper>
                </Group>
              ) : (
                <Center>
                  <Loader />
                </Center>
              )}
            </Tabs.Panel>

            {/* Transactions Sub-tab */}
            <Tabs.Panel value="transactions" pt="md">
              {loadingTransactions ? (
                <Center>
                  <Loader />
                </Center>
              ) : transactions && transactions.length > 0 ? (
                <Stack gap="md">
                  {transactions.map((transaction) => (
                    <Card key={transaction.id} withBorder p="md">
                      <Group justify="space-between" mb="sm">
                        <Group>
                          <Avatar
                            src={transaction.recipient?.image}
                            alt={getDisplayName(transaction.recipient, "Unknown")}
                            radius="xl"
                          />
                          <Text fw={500}>
                            {getDisplayName(transaction.recipient) ?? transaction.recipientName}
                          </Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                        </Text>
                      </Group>
                      {transaction.message && (
                        <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                          &quot;{transaction.message}&quot;
                        </Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Paper p="xl" withBorder>
                  <Text c="dimmed" ta="center">
                    No praise transactions yet. Be the first to send praise! 💝
                  </Text>
                </Paper>
              )}
            </Tabs.Panel>

            {/* Received Sub-tab */}
            <Tabs.Panel value="received" pt="md">
              {loadingReceived ? (
                <Center>
                  <Loader />
                </Center>
              ) : receivedPraise && receivedPraise.length > 0 ? (
                <Stack gap="md">
                  {receivedPraise.map((praise) => (
                    <Card key={praise.id} withBorder p="md">
                      <Group justify="space-between" mb="sm">
                        <Group>
                          <Avatar
                            src={praise.sender?.image}
                            alt={getDisplayName(praise.sender, "Unknown")}
                            radius="xl"
                          />
                          <div>
                            <Text fw={500}>{getDisplayName(praise.sender, "Unknown")}</Text>
                            <Text size="xs" c="dimmed">{praise.sender.email}</Text>
                          </div>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {formatDistanceToNow(new Date(praise.createdAt), { addSuffix: true })}
                        </Text>
                      </Group>
                      {praise.message && (
                        <Text size="sm" style={{ fontStyle: "italic" }}>
                          &quot;{praise.message}&quot;
                        </Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Paper p="xl" withBorder>
                  <Text c="dimmed" ta="center">
                    No praise received yet. Keep contributing! 🌟
                  </Text>
                </Paper>
              )}
            </Tabs.Panel>

            {/* Sent Sub-tab */}
            <Tabs.Panel value="sent" pt="md">
              {loadingSent ? (
                <Center>
                  <Loader />
                </Center>
              ) : sentPraise && sentPraise.length > 0 ? (
                <Stack gap="md">
                  {sentPraise.map((praise) => (
                    <Card key={praise.id} withBorder p="md">
                      <Group justify="space-between" mb="sm">
                        <Group>
                          <Avatar
                            src={praise.recipient?.image}
                            alt={getDisplayName(praise.recipient, "Unknown")}
                            radius="xl"
                          />
                          <div>
                            <Text fw={500}>{getDisplayName(praise.recipient, "Unknown")}</Text>
                            <Text size="xs" c="dimmed">{praise.recipient?.email}</Text>
                          </div>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {formatDistanceToNow(new Date(praise.createdAt), { addSuffix: true })}
                        </Text>
                      </Group>
                      {praise.message && (
                        <Text size="sm" style={{ fontStyle: "italic" }}>
                          &quot;{praise.message}&quot;
                        </Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Paper p="xl" withBorder>
                  <Text c="dimmed" ta="center">
                    You haven&apos;t sent any praise yet. Spread the love! 💖
                  </Text>
                </Paper>
              )}
            </Tabs.Panel>

            {/* Quantify Sub-tab */}
            <Tabs.Panel value="quantify" pt="md">
              <PraiseQuantifyPanel />
            </Tabs.Panel>

            {/* Quantify By Instance Sub-tab */}
            <Tabs.Panel value="quantify-instances" pt="md">
              <PraiseInstanceQuantifyPanel />
            </Tabs.Panel>
          </Tabs>
        </Tabs.Panel>

        {/* Residents Tab */}
        <Tabs.Panel value="residents" pt="md">
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedResidentStats.map((resident) => (
                  <Table.Tr key={resident!.userId}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          src={resident!.image}
                          alt={getDisplayName(resident, "Unknown")}
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
                      <Badge variant="light">{resident!.updates}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue">{resident!.praiseSent}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="green">{resident!.praiseReceived}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

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
  Paper,
  Loader,
  Center,
  Table,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import Link from "next/link";
import { KUDOS_CONSTANTS, getKudosTier } from "~/utils/kudosCalculation";

interface ImpactPageProps {
  params: Promise<{ eventId: string }>;
}

type SortField = "projects" | "updates" | "praiseSent" | "praiseReceived" | "kudos";
type SortDirection = "asc" | "desc";

export default function ImpactPage({ params }: ImpactPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string | null>("metrics");
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  const { data: transactions } = api.praise.getAllTransactions.useQuery({
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

      // Calculate kudos
      // Formula: BASE_KUDOS + (updates × 10) + (praise received × 5) - (praise sent × 5)
      // Using backfill values for historical praise transactions
      const kudos = Math.max(0,
        KUDOS_CONSTANTS.BASE_KUDOS +
        (updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT) +
        (praiseReceivedCount * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE) -
        (praiseSentCount * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE)
      );

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
        kudos,
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
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

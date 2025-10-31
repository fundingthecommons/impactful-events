"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  Table,
  Avatar,
  Progress,
  Badge,
  Group,
  Loader,
  Alert,
  Stack,
  TextInput,
  Select,
  Popover,
  Button,
  Divider,
} from "@mantine/core";
import { IconAlertCircle, IconSearch, IconExternalLink } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import TelegramMessageButton from "~/app/_components/TelegramMessageButton";
import Link from "next/link";

interface ResidentProfilesClientProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    startDate: Date;
    endDate: Date | null;
  };
}

const TELEGRAM_MESSAGE = `You are one of the few residents who hasn't yet updated their profile - please update it here and add the projects you're working on asap https://platform.fundingthecommons.io/profile/edit`;

export default function ResidentProfilesClient({
  event,
}: ResidentProfilesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByCompleteness, setFilterByCompleteness] = useState<
    string | null
  >(null);

  // Fetch resident profiles data
  const { data: residents, isLoading, error } = api.profile.getResidentProfilesForAdmin.useQuery({
    eventId: event.id,
  });

  // Filter residents based on search and completeness filter
  const filteredResidents = residents?.filter((resident) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      resident.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Completeness filter
    const matchesCompleteness =
      !filterByCompleteness ||
      (filterByCompleteness === "complete" && resident.completeness.meetsThreshold) ||
      (filterByCompleteness === "incomplete" && !resident.completeness.meetsThreshold);

    return matchesSearch && matchesCompleteness;
  });

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center" mt={50}>
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          variant="filled"
        >
          Failed to load resident profiles: {error.message}
        </Alert>
      </Container>
    );
  }

  const incompleteCount = residents?.filter(r => !r.completeness.meetsThreshold).length ?? 0;
  const completeCount = residents?.filter(r => r.completeness.meetsThreshold).length ?? 0;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Title order={1} mb="xs">
            Resident Profiles
          </Title>
          <Text c="dimmed" size="lg">
            {event.name}
          </Text>
        </div>

        {/* Stats */}
        <Group gap="md">
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed">
              Total Residents
            </Text>
            <Text size="xl" fw={700}>
              {residents?.length ?? 0}
            </Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed">
              Complete Profiles (≥70%)
            </Text>
            <Text size="xl" fw={700} c="green">
              {completeCount}
            </Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed">
              Incomplete Profiles (&lt;70%)
            </Text>
            <Text size="xl" fw={700} c="orange">
              {incompleteCount}
            </Text>
          </Paper>
        </Group>

        {/* Filters */}
        <Group gap="md">
          <TextInput
            placeholder="Search by name..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by completeness"
            data={[
              { value: "all", label: "All Residents" },
              { value: "complete", label: "Complete (≥70%)" },
              { value: "incomplete", label: "Incomplete (<70%)" },
            ]}
            value={filterByCompleteness ?? "all"}
            onChange={(value) => setFilterByCompleteness(value === "all" ? null : value)}
            clearable
            style={{ minWidth: 200 }}
          />
        </Group>

        {/* Residents Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Resident</Table.Th>
                <Table.Th>Profile Completeness</Table.Th>
                <Table.Th>Projects</Table.Th>
                <Table.Th>Timeline Updates</Table.Th>
                <Table.Th>Contact</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredResidents?.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="xl">
                      {searchQuery || filterByCompleteness
                        ? "No residents match your filters"
                        : "No accepted residents found for this event"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredResidents?.map((resident) => (
                  <Table.Tr key={resident.userId}>
                    {/* Resident Info */}
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          src={resident.image}
                          alt={resident.name ?? "Resident"}
                          radius="xl"
                          size="md"
                        />
                        <div>
                          <Text fw={500}>{resident.name ?? "Unknown"}</Text>
                        </div>
                      </Group>
                    </Table.Td>

                    {/* Profile Completeness */}
                    <Table.Td>
                      <Stack gap="xs">
                        <Group gap="xs" align="center">
                          <Progress
                            value={resident.completeness.percentage}
                            color={
                              resident.completeness.percentage >= 70
                                ? "green"
                                : resident.completeness.percentage >= 40
                                  ? "orange"
                                  : "red"
                            }
                            size="lg"
                            radius="xl"
                            style={{ flex: 1, minWidth: 150 }}
                          />
                          <Text size="sm" fw={600} style={{ minWidth: 40 }}>
                            {resident.completeness.percentage}%
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {resident.completeness.completedFields} of{" "}
                          {resident.completeness.totalFields} fields
                        </Text>
                      </Stack>
                    </Table.Td>

                    {/* Project Count with Popover */}
                    <Table.Td>
                      {resident.projectCount > 0 ? (
                        <Popover width={350} position="bottom" withArrow shadow="md">
                          <Popover.Target>
                            <Group gap="xs" align="center" style={{ cursor: "pointer" }}>
                              <Badge
                                color="blue"
                                variant="light"
                                size="lg"
                              >
                                {resident.projectCount}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {resident.projectCount === 1 ? "project" : "projects"}
                              </Text>
                            </Group>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs">
                              <Text size="sm" fw={600} mb="xs">
                                {resident.name}&apos;s Projects
                              </Text>
                              <Divider />
                              {resident.projects?.map((project) => (
                                <Button
                                  key={project.id}
                                  component={Link}
                                  href={`/events/${event.id}/projects/${project.id}`}
                                  variant="subtle"
                                  fullWidth
                                  leftSection={<IconExternalLink size={16} />}
                                  style={{
                                    justifyContent: "flex-start",
                                    height: "auto",
                                    padding: "8px 12px",
                                  }}
                                >
                                  <Stack gap={0} style={{ flex: 1, alignItems: "flex-start" }}>
                                    <Text size="sm" fw={500}>
                                      {project.title}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {project.updateCount} update{project.updateCount !== 1 ? "s" : ""}
                                    </Text>
                                  </Stack>
                                </Button>
                              ))}
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      ) : (
                        <Group gap="xs" align="center">
                          <Badge color="gray" variant="light" size="lg">
                            0
                          </Badge>
                          <Text size="xs" c="dimmed">projects</Text>
                        </Group>
                      )}
                    </Table.Td>

                    {/* Timeline Updates Count with Popover */}
                    <Table.Td>
                      {resident.projectUpdateCount > 0 ? (
                        <Popover width={350} position="bottom" withArrow shadow="md">
                          <Popover.Target>
                            <Group gap="xs" align="center" style={{ cursor: "pointer" }}>
                              <Badge
                                color="green"
                                variant="light"
                                size="lg"
                              >
                                {resident.projectUpdateCount}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {resident.projectUpdateCount === 1 ? "update" : "updates"}
                              </Text>
                            </Group>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs">
                              <Text size="sm" fw={600} mb="xs">
                                Timeline Updates by Project
                              </Text>
                              <Divider />
                              {resident.projects
                                ?.filter((project) => project.updateCount > 0)
                                .map((project) => (
                                  <Button
                                    key={project.id}
                                    component={Link}
                                    href={`/events/${event.id}/projects/${project.id}`}
                                    variant="subtle"
                                    fullWidth
                                    leftSection={<IconExternalLink size={16} />}
                                    style={{
                                      justifyContent: "flex-start",
                                      height: "auto",
                                      padding: "8px 12px",
                                    }}
                                  >
                                    <Stack gap={0} style={{ flex: 1, alignItems: "flex-start" }}>
                                      <Text size="sm" fw={500}>
                                        {project.title}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {project.updateCount} update{project.updateCount !== 1 ? "s" : ""}
                                      </Text>
                                    </Stack>
                                  </Button>
                                ))}
                              {resident.projects?.filter((p) => p.updateCount > 0).length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                  No updates yet
                                </Text>
                              )}
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      ) : (
                        <Group gap="xs" align="center">
                          <Badge color="gray" variant="light" size="lg">
                            0
                          </Badge>
                          <Text size="xs" c="dimmed">updates</Text>
                        </Group>
                      )}
                    </Table.Td>

                    {/* Telegram Contact */}
                    <Table.Td>
                      <TelegramMessageButton
                        application={resident.application}
                        customMessage={TELEGRAM_MESSAGE}
                        size={20}
                        variant="filled"
                        color="blue"
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  );
}

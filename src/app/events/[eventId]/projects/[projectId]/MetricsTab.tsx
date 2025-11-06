"use client";

import { useState } from "react";
import {
  Stack,
  Button,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Paper,
  Title,
  Divider,
  Loader,
  Center,
  Box,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconTarget,
  IconChartLine,
  IconFilter,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { type MetricType, type CollectionMethod } from "@prisma/client";

interface MetricsTabProps {
  projectId: string;
  canEdit: boolean;
}

// Metric card component for displaying a single metric
function MetricCard({
  metric,
  projectMetric,
  canEdit,
  onRemove,
}: {
  metric: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    metricType: MetricType[];
    unitOfMetric: string | null;
    collectionMethod: CollectionMethod;
    isOnChain: boolean;
  };
  projectMetric?: {
    targetValue: number | null;
    addedAt: Date;
  };
  canEdit: boolean;
  onRemove?: () => void;
}) {
  const getMetricTypeColor = (type: MetricType) => {
    const colors: Record<MetricType, string> = {
      BUILDER: "blue",
      ENVIRONMENTAL: "green",
      GIT: "grape",
      ONCHAIN: "violet",
      OFFCHAIN: "cyan",
      CUSTOM: "gray",
    };
    return colors[type];
  };

  const getCollectionMethodBadge = (method: CollectionMethod) => {
    const labels: Record<CollectionMethod, string> = {
      ONCHAIN: "On-chain",
      OFFCHAIN_API: "API",
      SELF_REPORTING: "Self-reported",
      MANUAL: "Manual",
      AUTOMATED: "Automated",
    };
    return labels[method];
  };

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb="xs">
              <Text fw={600} size="sm" lineClamp={2}>
                {metric.name}
              </Text>
              {metric.isOnChain && (
                <Tooltip label="On-chain metric">
                  <Badge size="xs" variant="dot" color="violet">
                    On-chain
                  </Badge>
                </Tooltip>
              )}
            </Group>

            {metric.description && (
              <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                {metric.description}
              </Text>
            )}

            <Group gap="xs">
              {metric.metricType.map((type) => (
                <Badge key={type} size="xs" color={getMetricTypeColor(type)}>
                  {type.toLowerCase()}
                </Badge>
              ))}
              <Badge size="xs" variant="light" color="gray">
                {getCollectionMethodBadge(metric.collectionMethod)}
              </Badge>
            </Group>
          </Box>

          {canEdit && onRemove && (
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={onRemove}
              size="sm"
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>

        {projectMetric?.targetValue && (
          <Group gap="xs">
            <IconTarget size={16} />
            <Text size="xs" c="dimmed">
              Target: {projectMetric.targetValue} {metric.unitOfMetric ?? ""}
            </Text>
          </Group>
        )}

        {metric.unitOfMetric && (
          <Text size="xs" c="dimmed">
            Unit: {metric.unitOfMetric}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

// Modal for searching and adding metrics from the metrics garden
function AddMetricModal({
  opened,
  onClose,
  projectId,
  existingMetricIds,
  onMetricAdded,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  existingMetricIds: string[];
  onMetricAdded: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);

  const { data: metricsData, isLoading } = api.metric.list.useQuery({
    search: searchQuery || undefined,
    metricType: typeFilter as MetricType | undefined,
    collectionMethod: collectionFilter as CollectionMethod | undefined,
    limit: 50,
  });

  const addMetricMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric added to project",
        color: "green",
      });
      onMetricAdded();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleAddMetric = (metricId: string) => {
    addMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const availableMetrics = metricsData?.metrics.filter(
    (m) => !existingMetricIds.includes(m.id)
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Metrics from Metrics Garden"
      size="xl"
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search metrics..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        <Group>
          <Select
            placeholder="Filter by type"
            data={[
              { value: "BUILDER", label: "Builder" },
              { value: "ENVIRONMENTAL", label: "Environmental" },
              { value: "GIT", label: "Git" },
              { value: "ONCHAIN", label: "On-chain" },
              { value: "OFFCHAIN", label: "Off-chain" },
              { value: "CUSTOM", label: "Custom" },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
            clearable
            leftSection={<IconFilter size={16} />}
          />

          <Select
            placeholder="Filter by collection"
            data={[
              { value: "ONCHAIN", label: "On-chain" },
              { value: "OFFCHAIN_API", label: "API" },
              { value: "SELF_REPORTING", label: "Self-reported" },
              { value: "MANUAL", label: "Manual" },
              { value: "AUTOMATED", label: "Automated" },
            ]}
            value={collectionFilter}
            onChange={setCollectionFilter}
            clearable
            leftSection={<IconFilter size={16} />}
          />
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        ) : availableMetrics && availableMetrics.length > 0 ? (
          <Stack gap="xs" mah={500} style={{ overflowY: "auto" }}>
            {availableMetrics.map((metric) => (
              <Paper key={metric.id} p="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" lineClamp={1} mb="xs">
                      {metric.name}
                    </Text>
                    {metric.description && (
                      <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                        {metric.description}
                      </Text>
                    )}
                    <Group gap="xs">
                      {metric.metricType.slice(0, 3).map((type) => (
                        <Badge key={type} size="xs">
                          {type.toLowerCase()}
                        </Badge>
                      ))}
                      {metric.unitOfMetric && (
                        <Text size="xs" c="dimmed">
                          • {metric.unitOfMetric}
                        </Text>
                      )}
                    </Group>
                  </Box>
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => handleAddMetric(metric.id)}
                    loading={addMetricMutation.isPending}
                  >
                    Add
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Center py="xl">
            <Text c="dimmed" size="sm">
              {searchQuery || typeFilter || collectionFilter
                ? "No metrics found matching your filters"
                : "No metrics available"}
            </Text>
          </Center>
        )}

        {metricsData && availableMetrics && availableMetrics.length === 0 && metricsData.total > 0 && (
          <Text size="xs" c="dimmed" ta="center">
            All metrics from the garden have been added to this project
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

export default function MetricsTab({ projectId, canEdit }: MetricsTabProps) {
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);

  const { data: projectMetrics, isLoading, refetch } = api.metric.getProjectMetrics.useQuery({
    projectId,
  });

  const { data: allMetrics, isLoading: isLoadingAllMetrics } = api.metric.list.useQuery({
    search: searchQuery || undefined,
    metricType: typeFilter as MetricType | undefined,
    collectionMethod: collectionFilter as CollectionMethod | undefined,
    limit: 100,
  });

  const addMetricMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric added to project",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeMetricMutation = api.metric.removeFromProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric removed from project",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleAddMetric = (metricId: string) => {
    addMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const handleRemoveMetric = (metricId: string) => {
    removeMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const existingMetricIds = projectMetrics?.map((pm) => pm.metric.id) ?? [];

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="md" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between">
            <Box>
              <Group gap="xs" mb="xs">
                <IconChartLine size={24} />
                <Title order={2}>Project Metrics</Title>
              </Group>
              <Text c="dimmed" size="sm">
                Track and measure the success of your project with metrics from the Metrics Garden
              </Text>
            </Box>
            {canEdit && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setAddModalOpened(true)}
              >
                Add Metrics
              </Button>
            )}
          </Group>

          <Divider />

          {projectMetrics && projectMetrics.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {projectMetrics.map((pm) => (
                <MetricCard
                  key={pm.id}
                  metric={pm.metric}
                  projectMetric={{
                    targetValue: pm.targetValue,
                    addedAt: pm.addedAt,
                  }}
                  canEdit={canEdit}
                  onRemove={() => handleRemoveMetric(pm.metric.id)}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconChartLine size={48} stroke={1} style={{ opacity: 0.3 }} />
                <Text c="dimmed" size="sm" ta="center">
                  No metrics added yet
                </Text>
                {canEdit && (
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setAddModalOpened(true)}
                  >
                    Add Your First Metric
                  </Button>
                )}
              </Stack>
            </Center>
          )}

          {projectMetrics && projectMetrics.length > 0 && (
            <Group gap="xs" mt="md">
              <Text size="xs" c="dimmed">
                {projectMetrics.length} metric{projectMetrics.length !== 1 ? "s" : ""} selected from the Metrics Garden
              </Text>
              <Tooltip label="Explore all 92 metrics">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  component="a"
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    setAddModalOpened(true);
                  }}
                >
                  <IconExternalLink size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Metrics Garden - Browse All Available Metrics */}
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Box>
            <Group gap="xs" mb="xs">
              <IconSearch size={24} />
              <Title order={2}>Metrics Garden</Title>
            </Group>
            <Text c="dimmed" size="sm">
              Browse and discover all {allMetrics?.total ?? 92} available metrics
            </Text>
          </Box>

          <Divider />

          {/* Search and Filters */}
          <Stack gap="md">
            <TextInput
              placeholder="Search metrics by name or description..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              size="md"
            />

            <Group>
              <Select
                placeholder="Filter by type"
                data={[
                  { value: "BUILDER", label: "Builder" },
                  { value: "ENVIRONMENTAL", label: "Environmental" },
                  { value: "GIT", label: "Git" },
                  { value: "ONCHAIN", label: "On-chain" },
                  { value: "OFFCHAIN", label: "Off-chain" },
                  { value: "CUSTOM", label: "Custom" },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                clearable
                leftSection={<IconFilter size={16} />}
              />

              <Select
                placeholder="Filter by collection method"
                data={[
                  { value: "ONCHAIN", label: "On-chain" },
                  { value: "OFFCHAIN_API", label: "API" },
                  { value: "SELF_REPORTING", label: "Self-reported" },
                  { value: "MANUAL", label: "Manual" },
                  { value: "AUTOMATED", label: "Automated" },
                ]}
                value={collectionFilter}
                onChange={setCollectionFilter}
                clearable
                leftSection={<IconFilter size={16} />}
              />
            </Group>
          </Stack>

          <Divider />

          {/* Metrics List */}
          {isLoadingAllMetrics ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : allMetrics && allMetrics.metrics.length > 0 ? (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Showing {allMetrics.metrics.length} of {allMetrics.total} metrics
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {allMetrics.metrics.map((metric) => {
                  const isAdded = existingMetricIds.includes(metric.id);
                  return (
                    <Card key={metric.id} withBorder radius="md" p="md">
                      <Stack gap="sm">
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" mb="xs">
                              <Text fw={600} size="sm" lineClamp={2}>
                                {metric.name}
                              </Text>
                              {metric.isOnChain && (
                                <Tooltip label="On-chain metric">
                                  <Badge size="xs" variant="dot" color="violet">
                                    On-chain
                                  </Badge>
                                </Tooltip>
                              )}
                            </Group>

                            {metric.description && (
                              <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                                {metric.description}
                              </Text>
                            )}

                            <Group gap="xs" mb="xs">
                              {metric.metricType.map((type) => (
                                <Badge
                                  key={type}
                                  size="xs"
                                  color={
                                    type === "BUILDER"
                                      ? "blue"
                                      : type === "ENVIRONMENTAL"
                                        ? "green"
                                        : type === "GIT"
                                          ? "grape"
                                          : type === "ONCHAIN"
                                            ? "violet"
                                            : type === "OFFCHAIN"
                                              ? "cyan"
                                              : "gray"
                                  }
                                >
                                  {type.toLowerCase()}
                                </Badge>
                              ))}
                              <Badge size="xs" variant="light" color="gray">
                                {metric.collectionMethod === "ONCHAIN"
                                  ? "On-chain"
                                  : metric.collectionMethod === "OFFCHAIN_API"
                                    ? "API"
                                    : metric.collectionMethod === "SELF_REPORTING"
                                      ? "Self-reported"
                                      : metric.collectionMethod === "MANUAL"
                                        ? "Manual"
                                        : "Automated"}
                              </Badge>
                            </Group>

                            {metric.unitOfMetric && (
                              <Text size="xs" c="dimmed">
                                Unit: {metric.unitOfMetric}
                              </Text>
                            )}
                          </Box>
                        </Group>

                        {canEdit && (
                          <Button
                            size="xs"
                            variant={isAdded ? "light" : "filled"}
                            color={isAdded ? "gray" : "blue"}
                            leftSection={
                              isAdded ? (
                                <IconTrash size={14} />
                              ) : (
                                <IconPlus size={14} />
                              )
                            }
                            onClick={() =>
                              isAdded
                                ? handleRemoveMetric(metric.id)
                                : handleAddMetric(metric.id)
                            }
                            loading={
                              addMetricMutation.isPending ||
                              removeMetricMutation.isPending
                            }
                            fullWidth
                          >
                            {isAdded ? "Remove" : "Add to Project"}
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </Stack>
          ) : (
            <Center py="xl">
              <Text c="dimmed" size="sm">
                {searchQuery || typeFilter || collectionFilter
                  ? "No metrics found matching your filters"
                  : "No metrics available"}
              </Text>
            </Center>
          )}
        </Stack>
      </Paper>

      <AddMetricModal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        projectId={projectId}
        existingMetricIds={existingMetricIds}
        onMetricAdded={() => {
          void refetch();
          setAddModalOpened(false);
        }}
      />
    </Stack>
  );
}

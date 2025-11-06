"use client";

import { useState } from "react";
import {
  Stack,
  Button,
  Text,
  Group,
  Badge,
  Modal,
  TextInput,
  Select,
  Paper,
  Title,
  Divider,
  Loader,
  Center,
  Box,
  Textarea,
  MultiSelect,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconChartLine,
  IconFilter,
  IconSparkles,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { type MetricType, type CollectionMethod } from "@prisma/client";

interface MetricsTabProps {
  projectId: string;
  canEdit: boolean;
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

// Modal for creating a new custom metric
function CreateMetricModal({
  opened,
  onClose,
  projectId,
  onMetricCreated,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  onMetricCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metricType: [] as string[],
    unitOfMetric: "",
    collectionMethod: "" as CollectionMethod | "",
  });

  const createMetricMutation = api.metric.create.useMutation({
    onSuccess: async (newMetric) => {
      // Add the newly created metric to the project
      await addToProjectMutation.mutateAsync({
        projectId,
        metricId: newMetric.id,
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const addToProjectMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Custom metric created and added to project",
        color: "green",
      });
      setFormData({
        name: "",
        description: "",
        metricType: [],
        unitOfMetric: "",
        collectionMethod: "",
      });
      onMetricCreated();
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.name || formData.metricType.length === 0 || !formData.collectionMethod) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    createMetricMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      metricType: formData.metricType as MetricType[],
      unitOfMetric: formData.unitOfMetric || undefined,
      collectionMethod: formData.collectionMethod,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Custom Metric"
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Metric Name"
          placeholder="e.g., Resident onboarding rate"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
        />

        <Textarea
          label="Description"
          placeholder="How many residents actively create a project and log in at least once."
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
        />

        <MultiSelect
          label="Metric Type"
          placeholder="Select one or more types"
          required
          data={[
            { value: "BUILDER", label: "Builder" },
            { value: "ENVIRONMENTAL", label: "Environmental" },
            { value: "GIT", label: "Git" },
            { value: "ONCHAIN", label: "On-chain" },
            { value: "OFFCHAIN", label: "Off-chain" },
            { value: "CUSTOM", label: "Custom" },
          ]}
          value={formData.metricType}
          onChange={(value) => setFormData({ ...formData, metricType: value })}
        />

        <Select
          label="Collection Method"
          placeholder="How is this metric collected?"
          required
          data={[
            { value: "ONCHAIN", label: "On-chain" },
            { value: "OFFCHAIN_API", label: "API" },
            { value: "SELF_REPORTING", label: "Self-reported" },
            { value: "MANUAL", label: "Manual" },
            { value: "AUTOMATED", label: "Automated" },
          ]}
          value={formData.collectionMethod}
          onChange={(value) => setFormData({ ...formData, collectionMethod: value as CollectionMethod })}
        />

        <TextInput
          label="Unit of Metric"
          placeholder="e.g., percentage, count, USD"
          value={formData.unitOfMetric}
          onChange={(e) => setFormData({ ...formData, unitOfMetric: e.currentTarget.value })}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleSubmit}
            loading={createMetricMutation.isPending || addToProjectMutation.isPending}
          >
            Create & Add to Project
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function MetricsTab({ projectId, canEdit }: MetricsTabProps) {
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
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
    <Stack gap="lg">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="xs" mb="xs">
                <IconChartLine size={24} />
                <Title order={2}>Project Metrics</Title>
              </Group>
              <Text c="dimmed" size="sm">
                Browse and add metrics from the Metrics Garden ({allMetrics?.total ?? 92} available)
              </Text>
            </Box>
            {canEdit && (
              <Button
                leftSection={<IconSparkles size={16} />}
                onClick={() => setCreateModalOpened(true)}
                variant="light"
              >
                Create Custom Metric
              </Button>
            )}
          </Group>

          {/* Selected Project Metrics */}
          {projectMetrics && projectMetrics.length > 0 && (
            <>
              <Divider />
              <Box>
                <Text fw={500} size="sm" mb="md">
                  Selected Metrics ({projectMetrics.length})
                </Text>
                <Stack gap="xs">
                  {projectMetrics.map((pm) => (
                    <Paper key={pm.id} p="md" withBorder bg="blue.0">
                      <Group justify="space-between" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={500} size="sm" lineClamp={1} mb="xs">
                            {pm.metric.name}
                          </Text>
                          {pm.metric.description && (
                            <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                              {pm.metric.description}
                            </Text>
                          )}
                          <Group gap="xs">
                            {pm.metric.metricType.slice(0, 3).map((type) => (
                              <Badge key={type} size="xs" color={getMetricTypeColor(type)}>
                                {type.toLowerCase()}
                              </Badge>
                            ))}
                            <Badge size="xs" variant="light" color="gray">
                              {getCollectionMethodBadge(pm.metric.collectionMethod)}
                            </Badge>
                            {pm.metric.unitOfMetric && (
                              <Text size="xs" c="dimmed">
                                • {pm.metric.unitOfMetric}
                              </Text>
                            )}
                          </Group>
                        </Box>
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleRemoveMetric(pm.metric.id)}
                            loading={removeMetricMutation.isPending}
                          >
                            Remove
                          </Button>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          <Divider />

          {/* Search and Filters */}
          <Box>
            <Text fw={500} size="sm" mb="md">
              Browse Available Metrics
            </Text>
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
          </Stack>

          {isLoadingAllMetrics ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : allMetrics && allMetrics.metrics.length > 0 ? (
            <Stack gap="xs" mah={600} style={{ overflowY: "auto" }}>
              {allMetrics.metrics.map((metric) => {
                const isAdded = existingMetricIds.includes(metric.id);
                return (
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
                            <Badge key={type} size="xs" color={getMetricTypeColor(type)}>
                              {type.toLowerCase()}
                            </Badge>
                          ))}
                          <Badge size="xs" variant="light" color="gray">
                            {getCollectionMethodBadge(metric.collectionMethod)}
                          </Badge>
                          {metric.unitOfMetric && (
                            <Text size="xs" c="dimmed">
                              • {metric.unitOfMetric}
                            </Text>
                          )}
                        </Group>
                      </Box>
                      {canEdit && (
                        <Button
                          size="xs"
                          variant={isAdded ? "light" : "filled"}
                          color={isAdded ? "red" : "blue"}
                          leftSection={
                            isAdded ? <IconTrash size={14} /> : <IconPlus size={14} />
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
                        >
                          {isAdded ? "Remove" : "Add"}
                        </Button>
                      )}
                    </Group>
                  </Paper>
                );
              })}
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
          </Box>
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

      <CreateMetricModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        projectId={projectId}
        onMetricCreated={() => {
          void refetch();
        }}
      />
    </Stack>
  );
}

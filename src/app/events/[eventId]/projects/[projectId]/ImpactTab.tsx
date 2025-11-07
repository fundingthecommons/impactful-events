"use client";

import {
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Title,
  Loader,
  Center,
  Box,
} from "@mantine/core";
import { IconChartLine } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type MetricType, type CollectionMethod } from "@prisma/client";

interface ImpactTabProps {
  projectId: string;
}

export default function ImpactTab({ projectId }: ImpactTabProps) {
  const { data: projectMetrics, isLoading } = api.metric.getProjectMetrics.useQuery({
    projectId,
  });

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
          <Box>
            <Group gap="xs" mb="xs">
              <IconChartLine size={24} />
              <Title order={2}>Project Impact Metrics</Title>
            </Group>
            <Text c="dimmed" size="sm">
              Tracking {projectMetrics?.length ?? 0} impact metrics for this project
            </Text>
          </Box>

          {projectMetrics && projectMetrics.length > 0 ? (
            <Stack gap="xs">
              {projectMetrics.map((pm) => (
                <Paper key={pm.id} p="md" withBorder bg="blue.0">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" mb="xs">
                      {pm.metric.name}
                    </Text>
                    {pm.metric.description && (
                      <Text size="xs" c="dimmed" mb="xs">
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
                </Paper>
              ))}
            </Stack>
          ) : (
            <Center py="xl">
              <Stack gap="md" align="center">
                <IconChartLine size={48} opacity={0.3} />
                <Text c="dimmed" size="sm" ta="center">
                  No impact metrics have been added to this project yet.
                </Text>
                <Text c="dimmed" size="xs" ta="center">
                  Visit the &quot;Manage metrics&quot; tab to add metrics to track your project&apos;s impact.
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

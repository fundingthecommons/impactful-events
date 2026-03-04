"use client";

import {
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Text,
  ThemeIcon,
  Badge,
  Box,
  Loader,
  Center,
  Alert,
  Anchor,
} from "@mantine/core";
import {
  IconCertificate,
  IconLeaf,
  IconStar,
  IconAward,
  IconAlertCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

export function HyperscanStatsWidget() {
  const {
    data: stats,
    isLoading,
    error,
  } = api.hyperscan.getNetworkStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (error ?? !stats) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="gray"
        variant="light"
      >
        Hypersphere network data is temporarily unavailable.
      </Alert>
    );
  }

  const cards = [
    {
      label: "Hypercerts",
      value: stats.hypercerts.activities.totalRecords,
      sublabel: `${String(stats.hypercerts.activities.uniqueUsers)} creators`,
      icon: IconCertificate,
      color: "violet",
      gradient: "rgba(103, 58, 183, 0.1)",
      gradientDark: "rgba(103, 58, 183, 0.2)",
      textColor: "rgba(103, 58, 183, 1)",
    },
    {
      label: "Biodiversity Records",
      value: stats.gainforest.occurrences.totalRecords,
      sublabel: `${String(stats.gainforest.occurrences.uniqueUsers)} observers`,
      icon: IconLeaf,
      color: "green",
      gradient: "rgba(16, 185, 129, 0.1)",
      gradientDark: "rgba(16, 185, 129, 0.2)",
      textColor: "rgba(16, 185, 129, 1)",
    },
    {
      label: "Reviews",
      value: stats.hyperscan.totalRecords,
      sublabel: `${String(stats.hyperscan.likes.totalRecords)} likes, ${String(stats.hyperscan.comments.totalRecords)} comments`,
      icon: IconStar,
      color: "blue",
      gradient: "rgba(37, 99, 235, 0.1)",
      gradientDark: "rgba(37, 99, 235, 0.2)",
      textColor: "rgba(37, 99, 235, 1)",
    },
    {
      label: "Badges Awarded",
      value: stats.certified.awards.totalRecords,
      sublabel: `${String(stats.certified.uniqueRecipients)} recipients`,
      icon: IconAward,
      color: "orange",
      gradient: "rgba(249, 115, 22, 0.1)",
      gradientDark: "rgba(249, 115, 22, 0.2)",
      textColor: "rgba(249, 115, 22, 1)",
    },
  ];

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Live data from the{" "}
          <Anchor
            href="https://www.hyperscan.dev"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            Hypersphere network
          </Anchor>
        </Text>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {cards.map((card) => (
          <Paper
            key={card.label}
            p="lg"
            radius="md"
            style={{
              background: `linear-gradient(135deg, ${card.gradient} 0%, ${card.gradient.replace("0.1", "0.05")} 100%)`,
              border: `1px solid ${card.gradient.replace("0.1", "0.2")}`,
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <ThemeIcon
                  size={44}
                  radius="md"
                  variant="light"
                  color={card.color}
                  style={{
                    background: `linear-gradient(135deg, ${card.gradientDark} 0%, ${card.gradient} 100%)`,
                  }}
                >
                  <card.icon size={24} />
                </ThemeIcon>
                <Badge variant="light" color={card.color} size="xs">
                  Live
                </Badge>
              </Group>
              <Box>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                  {card.label}
                </Text>
                <Text
                  size="2rem"
                  fw={900}
                  lh={1}
                  style={{ color: card.textColor }}
                >
                  {card.value.toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {card.sublabel}
                </Text>
              </Box>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

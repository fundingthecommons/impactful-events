"use client";

import {
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Anchor,
  Select,
  Loader,
  Center,
  Alert,
} from "@mantine/core";
import {
  IconCertificate,
  IconLeaf,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { api } from "~/trpc/react";

type FeedType = "activity" | "occurrence" | "contributor" | undefined;

export function HyperscanFeedTab() {
  const [typeFilter, setTypeFilter] = useState<FeedType>(undefined);

  const {
    data: feedItems,
    isLoading,
    error,
  } = api.hyperscan.getFeed.useQuery(
    { type: typeFilter, limit: 20 },
    { staleTime: 60 * 1000 }
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm">
          Recent activity across the{" "}
          <Anchor
            href="https://www.hyperscan.dev"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            Hypersphere network
          </Anchor>
        </Text>
        <Select
          placeholder="All types"
          clearable
          size="xs"
          w={180}
          data={[
            { value: "activity", label: "Hypercerts" },
            { value: "occurrence", label: "Biodiversity" },
            { value: "contributor", label: "Contributors" },
          ]}
          value={typeFilter ?? null}
          onChange={(val) =>
            setTypeFilter((val as FeedType) ?? undefined)
          }
        />
      </Group>

      {isLoading && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="gray"
          variant="light"
        >
          Network feed is temporarily unavailable.
        </Alert>
      )}

      {!isLoading && !error && feedItems?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No recent activity found.
        </Text>
      )}

      {feedItems?.map((item) => (
        <Card key={item.atUri} withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start" mb="xs">
            <Group gap="sm">
              {item.type === "occurrence" ? (
                <IconLeaf size={18} color="var(--mantine-color-green-6)" />
              ) : (
                <IconCertificate
                  size={18}
                  color="var(--mantine-color-violet-6)"
                />
              )}
              <Text fw={600} size="sm">
                {item.title || "Untitled"}
              </Text>
            </Group>
            <Group gap="xs">
              <Badge
                variant="light"
                color={item.type === "occurrence" ? "green" : "violet"}
                size="xs"
              >
                {item.type === "occurrence" ? "Biodiversity" : "Hypercert"}
              </Badge>
              <Text size="xs" c="dimmed">
                {item.createdAt}
              </Text>
            </Group>
          </Group>

          {item.description && (
            <Text size="sm" c="dimmed" lineClamp={2} mb="xs">
              {item.description}
            </Text>
          )}

          <Group gap="xs" wrap="wrap">
            {item.workPeriod && (
              <Badge variant="outline" size="xs" color="gray">
                {item.workPeriod.from} &rarr; {item.workPeriod.to}
              </Badge>
            )}
            {item.taxonomy && (
              <Badge variant="outline" size="xs" color="green">
                {item.taxonomy}
              </Badge>
            )}
            {item.location && (
              <Badge variant="outline" size="xs" color="blue">
                {item.location}
              </Badge>
            )}
            {item.contributors != null && item.contributors > 0 && (
              <Badge variant="outline" size="xs" color="violet">
                {String(item.contributors)} contributor
                {item.contributors > 1 ? "s" : ""}
              </Badge>
            )}
          </Group>

          <Text size="xs" mt="xs">
            <Anchor
              href={`https://www.hyperscan.dev/data?did=${encodeURIComponent(item.authorDid)}`}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
            >
              View on Hyperscan
            </Anchor>
          </Text>
        </Card>
      ))}
    </Stack>
  );
}

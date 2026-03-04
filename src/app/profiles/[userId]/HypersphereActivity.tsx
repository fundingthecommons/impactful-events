"use client";

import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Anchor,
  Loader,
  Center,
} from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface HypersphereActivityProps {
  userId: string;
}

export function HypersphereActivity({ userId }: HypersphereActivityProps) {
  const { data, isLoading } = api.hyperscan.getProfileActivity.useQuery(
    { userId },
    { staleTime: 5 * 60 * 1000, retry: 1 }
  );

  // Don't render anything if user has no AT Proto connection
  if (!isLoading && !data?.hasAtProto) {
    return null;
  }

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
        <Center py="md">
          <Loader size="sm" />
        </Center>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <IconWorld size={20} />
          <Title order={3}>Hypersphere Activity</Title>
        </Group>
        {data?.activity && (
          <Anchor
            href={data.activity.hyperscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            View on Hyperscan
          </Anchor>
        )}
      </Group>

      {!data?.activity ? (
        <Text size="sm" c="dimmed">
          Hypersphere activity data is temporarily unavailable.
        </Text>
      ) : (
        <Stack gap="md">
          <Group gap="xs">
            <Badge variant="light" color="violet">
              @{data.handle}
            </Badge>
            {data.activity.followers > 0 && (
              <Badge variant="outline" size="sm" color="gray">
                {String(data.activity.followers)} followers
              </Badge>
            )}
          </Group>

          {data.activity.collections.length > 0 && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Collections
              </Text>
              <Group gap="xs" wrap="wrap">
                {data.activity.collections.map((col) => (
                  <Badge
                    key={col.name}
                    variant="dot"
                    size="sm"
                    color={
                      col.namespace === "org.hypercerts"
                        ? "violet"
                        : col.namespace === "app.gainforest"
                          ? "green"
                          : "blue"
                    }
                  >
                    {col.name}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {data.activity.recentRecords.length > 0 && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Recent Records
              </Text>
              <Stack gap="xs">
                {data.activity.recentRecords.slice(0, 5).map((record) => (
                  <Text key={record.atUri} size="sm" c="dimmed">
                    {record.title}
                  </Text>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      )}
    </Card>
  );
}

import { SimpleGrid, Paper, Group, Text } from "@mantine/core";

interface StatItem {
  value: number;
  label: string;
  color?: string;
}

interface InvitationStatsGridProps {
  stats: StatItem[];
  cols?: { base?: number; sm?: number; md?: number };
}

export default function InvitationStatsGrid({
  stats,
  cols,
}: InvitationStatsGridProps) {
  return (
    <SimpleGrid
      cols={cols ?? { base: 2, sm: Math.min(stats.length, 4) }}
      mb="md"
    >
      {stats.map((stat) => (
        <Paper key={stat.label} p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c={stat.color}>
              {stat.value}
            </Text>
            <Text size="sm" c="dimmed">
              {stat.label}
            </Text>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

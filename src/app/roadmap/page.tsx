import { Container, Title, Text, Timeline, Badge, Stack, Paper } from "@mantine/core";
import {
  IconGitCommit,
  IconBug,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";
import { execSync } from "child_process";

interface Commit {
  hash: string;
  date: string;
  time: string;
  message: string;
  type: "feat" | "fix" | "chore" | "other";
}

// Parse git commit messages to extract type and description
function parseCommitMessage(message: string): { type: Commit["type"]; description: string } {
  const regex = /^(feat|fix|chore|refactor|docs|style|test|perf):(.+)$/;
  const match = regex.exec(message);

  if (match) {
    const type = match[1] as "feat" | "fix" | "chore";
    const description = match[2]?.trim() ?? message;
    return { type, description };
  }

  return { type: "other", description: message };
}

// Fetch commits from git (server-side)
function getRecentCommits(days = 7): Commit[] {
  try {
    const gitCommand = `git log --since="${days} days ago" --pretty=format:"%h|%ai|%s" --no-merges`;
    const output = execSync(gitCommand, { encoding: 'utf-8' });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .map(line => {
        const [hash, datetime, message] = line.split('|');
        const [date, time] = datetime?.split(' ') ?? ['', ''];
        const parsed = parseCommitMessage(message ?? '');

        return {
          hash: hash ?? '',
          date: date ?? '',
          time: time ?? '',
          message: message ?? '',
          type: parsed.type,
        };
      });
  } catch (error) {
    console.error('Failed to fetch git commits:', error);
    return [];
  }
}

// Get icon based on commit type
function getCommitIcon(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return <IconSparkles size={16} />;
    case "fix":
      return <IconBug size={16} />;
    case "chore":
      return <IconTools size={16} />;
    default:
      return <IconGitCommit size={16} />;
  }
}

// Get color based on commit type
function getCommitColor(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return "blue";
    case "fix":
      return "red";
    case "chore":
      return "gray";
    default:
      return "gray";
  }
}

// Get badge label based on commit type
function getCommitLabel(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return "Feature";
    case "fix":
      return "Fix";
    case "chore":
      return "Chore";
    default:
      return "Other";
  }
}

export default function RoadmapPage() {
  // Fetch recent commits dynamically from git
  const recentCommits = getRecentCommits(7); // Last 7 days
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Development Roadmap
          </Title>
          <Text c="dimmed">
            Recent features and fixes shipped in the last 7 days
          </Text>
        </div>

        <Paper p="lg" withBorder>
          <Timeline active={recentCommits.length} bulletSize={24} lineWidth={2}>
            {recentCommits.map((commit) => {
              const parsed = parseCommitMessage(commit.message);

              return (
                <Timeline.Item
                  key={commit.hash}
                  bullet={getCommitIcon(parsed.type)}
                  title={
                    <Stack gap={4}>
                      <div>
                        <Badge
                          size="xs"
                          color={getCommitColor(parsed.type)}
                          variant="light"
                          mr="xs"
                        >
                          {getCommitLabel(parsed.type)}
                        </Badge>
                        <Text span size="sm" fw={500}>
                          {parsed.description}
                        </Text>
                      </div>
                    </Stack>
                  }
                >
                  <Text size="xs" c="dimmed" mt={4}>
                    {commit.date} at {commit.time}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Commit: {commit.hash}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Paper>

        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Legend
            </Text>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Badge size="sm" color="blue" variant="light" leftSection={<IconSparkles size={14} />}>
                Feature
              </Badge>
              <Badge size="sm" color="red" variant="light" leftSection={<IconBug size={14} />}>
                Fix
              </Badge>
              <Badge size="sm" color="gray" variant="light" leftSection={<IconTools size={14} />}>
                Chore
              </Badge>
            </div>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

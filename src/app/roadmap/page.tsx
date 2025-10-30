"use client";
import { Container, Title, Text, Timeline, Badge, Stack, Paper } from "@mantine/core";
import {
  IconGitCommit,
  IconBug,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";

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

// Static commits data (update manually or via CI/CD)
// To auto-update: run `git log --since="7 days ago" --pretty=format:"%h|%ai|%s" --no-merges`
// and update this array with the output
const staticCommits = [
  "f84da25|2025-10-30 04:03:29 +0000|feat: add floating GitHub corner widget with issue reporting",
  "b1118eb|2025-10-30 03:54:52 +0000|feat: make roadmap page auto-update from git commits",
  "a4e5028|2025-10-30 03:49:32 +0000|fix: add 'use client' directive to roadmap page for Timeline component",
  "77599db|2025-10-30 03:44:38 +0000|fix: migrate image uploads from filesystem to Vercel Blob storage for serverless compatibility",
  "d0bfaf1|2025-10-30 02:35:41 +0000|feat: add roadmap page displaying recent development activity",
  "e8d843a|2025-10-30 02:29:31 +0000|feat: display project images on cards in Your Projects widget",
  "b37b7ff|2025-10-30 02:26:52 +0000|fix: separate project image uploads from avatar uploads",
  "ad69004|2025-10-30 02:17:27 +0000|fix: remove URL validation from server-side project imageUrl schema",
];

function getRecentCommits(): Commit[] {
  return staticCommits.map(line => {
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
  // Get recent commits from static data
  const recentCommits = getRecentCommits();
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

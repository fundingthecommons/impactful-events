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

// Recent commits from the last 24 hours (this would come from git in production)
const recentCommits: Commit[] = [
  {
    hash: "e8d843a",
    date: "2025-10-30",
    time: "02:29:31",
    message: "feat: display project images on cards in Your Projects widget",
    type: "feat",
  },
  {
    hash: "b37b7ff",
    date: "2025-10-30",
    time: "02:26:52",
    message: "fix: separate project image uploads from avatar uploads",
    type: "fix",
  },
  {
    hash: "ad69004",
    date: "2025-10-30",
    time: "02:17:27",
    message: "fix: remove URL validation from server-side project imageUrl schema",
    type: "fix",
  },
  {
    hash: "0127370",
    date: "2025-10-30",
    time: "02:14:59",
    message: "fix: allow relative paths for project image URLs in validation schema",
    type: "fix",
  },
  {
    hash: "546a1ef",
    date: "2025-10-30",
    time: "02:12:21",
    message: "feat: add image upload functionality to project update modal",
    type: "feat",
  },
  {
    hash: "cac5c0c",
    date: "2025-10-30",
    time: "02:05:01",
    message: "feat: add project editing and image upload functionality to resident dashboard",
    type: "feat",
  },
  {
    hash: "094ea21",
    date: "2025-10-30",
    time: "01:45:54",
    message: "fix: remove manual updatedAt field from Prisma update operation",
    type: "fix",
  },
  {
    hash: "0266138",
    date: "2025-10-30",
    time: "01:38:12",
    message: "fix: resolve ESLint violations in migration scripts for floating promises and template expressions",
    type: "fix",
  },
  {
    hash: "3415322",
    date: "2025-10-30",
    time: "01:34:04",
    message: "fix: include scripts directory in TypeScript project configuration for linting",
    type: "fix",
  },
  {
    hash: "343b4c9",
    date: "2025-10-30",
    time: "01:29:35",
    message: "feat: enhance avatar display in Asks and Offers components with custom and initial fallback",
    type: "feat",
  },
  {
    hash: "589baca",
    date: "2025-10-30",
    time: "01:26:19",
    message: "feat: add Asks and Offers functionality for event participants, including creation, deletion, and management of asks/offers",
    type: "feat",
  },
  {
    hash: "ce95dbc",
    date: "2025-10-30",
    time: "00:19:20",
    message: "feat: implement advanced talent search functionality for event participants, enhancing search capabilities across profiles and skills",
    type: "feat",
  },
  {
    hash: "f53e91b",
    date: "2025-10-30",
    time: "00:03:53",
    message: "feat: Add migration scripts and update UserProfile schema for prior experience and skill ratings",
    type: "feat",
  },
  {
    hash: "854ea4a",
    date: "2025-10-29",
    time: "22:41:52",
    message: "feat: add delete functionality for project updates with confirmation modal",
    type: "feat",
  },
  {
    hash: "805512c",
    date: "2025-10-29",
    time: "22:30:54",
    message: "fix: change sorting order to prioritize updatedAt over createdAt in application router",
    type: "fix",
  },
  {
    hash: "66cc3d5",
    date: "2025-10-29",
    time: "20:59:06",
    message: "fix: optimize Sentry configuration to reduce build times by limiting source map uploads",
    type: "fix",
  },
  {
    hash: "2f7f35d",
    date: "2025-10-29",
    time: "20:58:56",
    message: "feat: sort residents by profile completeness in getResidentProfilesForAdmin query",
    type: "feat",
  },
  {
    hash: "93a162d",
    date: "2025-10-29",
    time: "16:59:58",
    message: "fix: add missing question fields to resident profiles query",
    type: "fix",
  },
];

export default function RoadmapPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Development Roadmap
          </Title>
          <Text c="dimmed">
            Recent features and fixes shipped in the last 24 hours
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

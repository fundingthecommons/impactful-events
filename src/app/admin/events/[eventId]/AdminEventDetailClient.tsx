"use client";

import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Switch,
  Badge,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUsers,
  IconMicrophone,
  IconUserCheck,
  IconSparkles,
  IconBulb,
  IconHandStop,
  IconNews,
  IconHeart,
  IconMapPin,
  IconCalendarEvent,
  IconSettings,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface EventData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  isOnline: boolean;
  status: string;
  featureApplicantVetting: boolean;
  featureSpeakerVetting: boolean;
  featureMentorVetting: boolean;
  featurePraise: boolean;
  featureProjects: boolean;
  featureAsksOffers: boolean;
  featureNewsfeed: boolean;
  featureImpactAnalytics: boolean;
}

type FeatureFlagKey =
  | "featureApplicantVetting"
  | "featureSpeakerVetting"
  | "featureMentorVetting"
  | "featurePraise"
  | "featureProjects"
  | "featureAsksOffers"
  | "featureNewsfeed"
  | "featureImpactAnalytics";

const FEATURE_FLAGS: {
  key: FeatureFlagKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
}[] = [
  {
    key: "featureApplicantVetting",
    label: "Applicant Vetting Process",
    description: "Accept and review applications for residents/attendees",
    icon: IconUsers,
  },
  {
    key: "featureSpeakerVetting",
    label: "Speaker Vetting Process",
    description: "Manage speaker applications and speaker lineup",
    icon: IconMicrophone,
  },
  {
    key: "featureMentorVetting",
    label: "Mentor Vetting Process",
    description: "Manage mentor applications and mentor assignments",
    icon: IconUserCheck,
  },
  {
    key: "featurePraise",
    label: "Praise",
    description: "Enable the praise/kudos system for participants",
    icon: IconSparkles,
  },
  {
    key: "featureProjects",
    label: "Projects",
    description: "List and track projects created during the event",
    icon: IconBulb,
  },
  {
    key: "featureAsksOffers",
    label: "Asks & Offers",
    description: "Enable the asks & offers marketplace for participants",
    icon: IconHandStop,
  },
  {
    key: "featureNewsfeed",
    label: "Newsfeed",
    description: "Enable the latest updates newsfeed for the event",
    icon: IconNews,
  },
  {
    key: "featureImpactAnalytics",
    label: "Impact Analytics",
    description: "Enable impact metrics and analytics dashboard",
    icon: IconHeart,
  },
];

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "COMPLETED":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminEventDetailClientProps {
  event: EventData;
}

export default function AdminEventDetailClient({ event }: AdminEventDetailClientProps) {
  const router = useRouter();

  const updateFeatureFlags = api.event.updateEventFeatureFlags.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Feature configuration saved.",
        color: "green",
      });
      router.refresh();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update feature configuration",
        color: "red",
      });
    },
  });

  const handleToggle = (key: FeatureFlagKey, checked: boolean) => {
    updateFeatureFlags.mutate({
      id: event.id,
      [key]: checked,
    });
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Event Header */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Title order={2}>{event.name}</Title>
                {event.description && (
                  <Text size="sm" c="dimmed" maw={600}>
                    {event.description}
                  </Text>
                )}
              </Stack>
              <Group gap="xs">
                <Badge variant="light" tt="uppercase">
                  {event.type}
                </Badge>
                <Badge color={getStatusColor(event.status)} variant="light" tt="uppercase">
                  {event.status}
                </Badge>
              </Group>
            </Group>

            <Group gap="lg">
              <Group gap={4}>
                <IconCalendarEvent size={14} />
                <Text size="sm">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </Text>
              </Group>
              {event.location && (
                <Group gap={4}>
                  <IconMapPin size={14} />
                  <Text size="sm">{event.location}</Text>
                </Group>
              )}
              {event.isOnline && (
                <Badge size="sm" variant="light" color="blue">
                  Online
                </Badge>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Feature Configuration */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconSettings size={20} />
              <Title order={3}>Feature Configuration</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Toggle which features are enabled for this event. Disabled features will be hidden from the event navigation.
            </Text>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {FEATURE_FLAGS.map((flag) => {
                const FlagIcon = flag.icon;
                return (
                  <Paper key={flag.key} p="md" radius="sm" withBorder>
                    <Group wrap="nowrap" justify="space-between" align="flex-start">
                      <Group wrap="nowrap" gap="sm" style={{ flex: 1 }}>
                        <FlagIcon size={20} />
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {flag.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {flag.description}
                          </Text>
                        </Stack>
                      </Group>
                      <Switch
                        checked={event[flag.key]}
                        onChange={(e) =>
                          handleToggle(flag.key, e.currentTarget.checked)
                        }
                        disabled={updateFeatureFlags.isPending}
                      />
                    </Group>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

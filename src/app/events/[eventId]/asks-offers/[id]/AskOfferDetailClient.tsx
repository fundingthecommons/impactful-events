"use client";

import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Avatar,
  Button,
  ActionIcon,
  Divider,
  Card,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconHandStop,
  IconGift,
  IconTrash,
  IconCheck,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandGithub,
  IconWorld,
  IconBriefcase,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";

interface AskOfferDetailClientProps {
  askOffer: {
    id: string;
    type: "ASK" | "OFFER";
    title: string;
    description: string;
    tags: string[];
    isActive: boolean;
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      email: string | null;
      profile?: {
        jobTitle: string | null;
        company: string | null;
        avatarUrl: string | null;
        bio: string | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        twitterUrl: string | null;
        website: string | null;
      } | null;
    };
  };
  eventId: string;
  isOwner: boolean;
  userId?: string;
}

export default function AskOfferDetailClient({
  askOffer,
  eventId,
  isOwner,
}: AskOfferDetailClientProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
      router.push(`/events/${eventId}`);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
      await utils.askOffer.getById.invalidate({ id: askOffer.id });
      router.push(`/events/${eventId}`);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Back Navigation */}
        <Group>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => router.back()}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Text size="sm" c="dimmed">
            Back to event
          </Text>
        </Group>

        {/* Main Card */}
        <Paper shadow="lg" p="xl" radius="md" withBorder>
          <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between" align="flex-start">
              <Group gap="md">
                {askOffer.type === "ASK" ? (
                  <IconHandStop size={32} style={{ color: "var(--mantine-color-red-6)" }} />
                ) : (
                  <IconGift size={32} style={{ color: "var(--mantine-color-green-6)" }} />
                )}
                <div>
                  <Badge
                    size="lg"
                    variant="light"
                    color={askOffer.type === "ASK" ? "red" : "green"}
                  >
                    {askOffer.type}
                  </Badge>
                  {!askOffer.isActive && (
                    <Badge size="sm" color="gray" ml="xs">
                      Fulfilled
                    </Badge>
                  )}
                </div>
              </Group>
              {isOwner && askOffer.isActive && (
                <Group gap="xs">
                  <Tooltip label="Mark as fulfilled">
                    <Button
                      variant="light"
                      color="green"
                      size="sm"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => markFulfilledMutation.mutate({ id: askOffer.id })}
                      loading={markFulfilledMutation.isPending}
                    >
                      Mark Fulfilled
                    </Button>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="lg"
                      onClick={() => deleteMutation.mutate({ id: askOffer.id })}
                      loading={deleteMutation.isPending}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>

            {/* Title */}
            <div>
              <Text size="xl" fw={700} mb="xs">
                {askOffer.title}
              </Text>
              <Text size="sm" c="dimmed">
                Posted on {formatDate(askOffer.createdAt)}
              </Text>
            </div>

            {/* Description */}
            <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {askOffer.description}
            </Text>

            {/* Tags */}
            {askOffer.tags.length > 0 && (
              <Group gap="xs">
                {askOffer.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" size="md">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Author Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Posted by
            </Text>
            <Group gap="md">
              <Avatar
                src={getAvatarUrl({
                  customAvatarUrl: askOffer.user.profile?.avatarUrl,
                  oauthImageUrl: askOffer.user.image,
                  name: askOffer.user.name,
                  email: askOffer.user.email,
                })}
                alt={askOffer.user.name ?? "User"}
                size="lg"
                radius="xl"
              >
                {getAvatarInitials({
                  name: askOffer.user.name,
                  email: askOffer.user.email,
                })}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg">
                  {askOffer.user.name ?? "Anonymous"}
                </Text>
                {askOffer.user.profile?.jobTitle && (
                  <Group gap="xs" mt={4}>
                    <IconBriefcase size={14} />
                    <Text size="sm" c="dimmed">
                      {askOffer.user.profile.jobTitle}
                      {askOffer.user.profile.company && ` at ${askOffer.user.profile.company}`}
                    </Text>
                  </Group>
                )}
              </div>
            </Group>

            {/* Bio */}
            {askOffer.user.profile?.bio && (
              <>
                <Divider />
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {askOffer.user.profile.bio}
                </Text>
              </>
            )}

            {/* Contact Links */}
            {(askOffer.user.profile?.githubUrl ??
              askOffer.user.profile?.linkedinUrl ??
              askOffer.user.profile?.twitterUrl ??
              askOffer.user.profile?.website) && (
              <>
                <Divider />
                <Stack gap="xs">
                  <Text fw={500} size="sm">
                    Connect
                  </Text>
                  <Group gap="md">
                    {askOffer.user.profile?.githubUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.githubUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandGithub size={16} />}
                      >
                        GitHub
                      </Button>
                    )}
                    {askOffer.user.profile?.linkedinUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.linkedinUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandLinkedin size={16} />}
                      >
                        LinkedIn
                      </Button>
                    )}
                    {askOffer.user.profile?.twitterUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.twitterUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandTwitter size={16} />}
                      >
                        Twitter
                      </Button>
                    )}
                    {askOffer.user.profile?.website && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.website}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconWorld size={16} />}
                      >
                        Website
                      </Button>
                    )}
                  </Group>
                </Stack>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

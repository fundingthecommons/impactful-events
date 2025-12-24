"use client";

import { useState, useCallback } from "react";
import {
  Stack,
  Card,
  Text,
  Group,
  Badge,
  Box,
  Image,
  Anchor,
  SimpleGrid,
  Paper,
  Title,
  Loader,
  Center,
  Modal,
  Container,
  Button,
  Divider,
  Timeline,
  Tabs,
  Avatar,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconMessageCircle,
  IconCalendarEvent,
  IconNews,
  IconHandStop,
  IconGift,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { UserMetricsBadges } from "~/app/_components/UserMetricsBadges";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { CommentPreview } from "~/app/_components/CommentPreview";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";

// Extract static styles to prevent inline object creation
const PROJECT_TITLE_STYLE = {
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const AUTHOR_NAME_STYLE = { whiteSpace: 'nowrap' as const };

const AUTHOR_CONTAINER_STYLE = { flex: 1, minWidth: 0 };

// Layout styles for image rendering
const SINGLE_IMAGE_LAYOUT_STYLE = {
  flexDirection: 'row' as const,
};

const SINGLE_IMAGE_PAPER_STYLE = {
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  flexShrink: 0,
  width: 'calc(100% / 3)',
  minWidth: 'calc(100% / 3)',
};

const SINGLE_IMAGE_STYLE = {
  width: "100%",
  maxHeight: "400px",
  objectFit: "cover" as const,
};

const TEXT_CONTENT_CONTAINER_STYLE = { flex: 1, minWidth: 0 };

const MULTI_IMAGE_PAPER_STYLE = {
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  aspectRatio: '16/9',
};

const MULTI_IMAGE_STYLE = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

export default function LatestClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>("updates");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});

  const utils = api.useUtils();

  // Fetch all updates
  const { data: updates, isLoading: updatesLoading } = api.project.getAllUpdates.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
    }
  );

  // Fetch user metrics for badges
  const { data: userMetrics } = api.project.getAllUserMetrics.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000,
    }
  );

  // Fetch all asks and offers
  const { data: asksData = [] } = api.askOffer.getAllAsksOffers.useQuery({
    type: "ASK",
    onlyActive: true,
  });

  const { data: offersData = [] } = api.askOffer.getAllAsksOffers.useQuery({
    type: "OFFER",
    onlyActive: true,
  });

  // Mutations for asks/offers
  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      void utils.askOffer.getAllAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: () => {
      void utils.askOffer.getAllAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
    },
  });

  // Create comment mutation
  const createComment = api.project.createUpdateComment.useMutation({
    onSuccess: async () => {
      await utils.project.getAllUpdates.refetch();
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
        color: "green",
      });
    },
    onMutate: async (variables) => {
      setCommentInputs((prev) => ({ ...prev, [variables.updateId]: "" }));
      setShowCommentInput((prev) => ({ ...prev, [variables.updateId]: false }));

      await utils.project.getAllUpdates.cancel();
      const previousData = utils.project.getAllUpdates.getData();

      if (session?.user && previousData) {
        const optimisticComment = {
          id: "temp-" + Date.now(),
          content: variables.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session.user.id,
          projectUpdateId: variables.updateId,
          user: {
            id: session.user.id,
            name: session.user.name ?? null,
            firstName: null,
            surname: null,
            image: session.user.image ?? null,
            profile: null,
          },
          likes: [],
          _count: {
            likes: 0,
          },
        };

        utils.project.getAllUpdates.setData(
          undefined,
          previousData.map((update) => {
            if (update.id === variables.updateId) {
              return {
                ...update,
                comments: [optimisticComment, ...update.comments].slice(0, 2),
              };
            }
            return update;
          })
        );
      }

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        utils.project.getAllUpdates.setData(undefined, context.previousData);
      }
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const getRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return new Date(date).toLocaleDateString();
  }, []);

  const handleImageClick = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const handlePostComment = useCallback((updateId: string, eventId: string) => {
    const content = commentInputs[updateId];
    if (!content?.trim()) return;

    createComment.mutate({
      eventId,
      updateId,
      content: content.trim(),
    });
  }, [commentInputs, createComment]);

  const toggleCommentInput = useCallback((updateId: string) => {
    setShowCommentInput((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  }, []);

  const handleCommentChange = useCallback((updateId: string, value: string) => {
    setCommentInputs((prev) => ({
      ...prev,
      [updateId]: value,
    }));
  }, []);

  const isOwnAskOffer = (userId: string) => {
    return session?.user?.id === userId;
  };

  const renderAskOfferCard = (
    item: (typeof asksData)[0],
    type: "ASK" | "OFFER"
  ) => {
    const isOwn = isOwnAskOffer(item.userId);

    return (
      <Paper
        key={item.id}
        p="md"
        withBorder
        component={Link}
        href={`/events/${item.eventId}/asks-offers/${item.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease'
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <Group justify="space-between" align="flex-start" mb="xs">
          <Group gap="sm">
            <Avatar
              src={getAvatarUrl({
                customAvatarUrl: item.user.profile?.avatarUrl,
                oauthImageUrl: item.user.image,
                name: item.user.name,
                email: item.user.email,
              })}
              alt={item.user.name ?? "User"}
              size="sm"
              radius="xl"
            >
              {getAvatarInitials({
                name: item.user.name,
                email: item.user.email,
              })}
            </Avatar>
            <div>
              <Text fw={500} size="sm">
                {getDisplayName(item.user, "Unknown")}
              </Text>
              {item.user.profile?.jobTitle && (
                <Text size="xs" c="dimmed">
                  {item.user.profile.jobTitle}
                  {item.user.profile.company &&
                    ` at ${item.user.profile.company}`}
                </Text>
              )}
            </div>
          </Group>
          <Group gap="xs">
            <Badge
              size="sm"
              color={type === "ASK" ? "orange" : "blue"}
              variant="light"
            >
              {type === "ASK" ? "Ask" : "Offer"}
            </Badge>
            {item.event && (
              <Badge size="xs" variant="outline" color="gray">
                {item.event.name}
              </Badge>
            )}
            {isOwn && (
              <>
                <Tooltip label="Mark as fulfilled">
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markFulfilledMutation.mutate({ id: item.id });
                    }}
                    loading={markFulfilledMutation.isPending}
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteMutation.mutate({ id: item.id });
                    }}
                    loading={deleteMutation.isPending}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
        </Group>

        <Text fw={600} mb="xs">
          {item.title}
        </Text>
        <MarkdownRenderer content={item.description} />

        {item.tags.length > 0 && (
          <Group gap="xs" mt="sm">
            {item.tags.map((tag, idx) => (
              <Badge key={idx} size="sm" variant="light">
                {tag}
              </Badge>
            ))}
          </Group>
        )}

        <Group justify="flex-end" mt="sm">
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <LikeButton
              updateId={item.id}
              initialLikeCount={item.likes.length}
              initialHasLiked={session?.user ? item.likes.some(like => like.userId === session.user.id) : false}
              userId={session?.user?.id}
              likeType="askOffer"
            />
          </div>
        </Group>
      </Paper>
    );
  };

  const allAsksOffers = [
    ...asksData.map((ask) => ({ ...ask, itemType: "ASK" as const })),
    ...offersData.map((offer) => ({ ...offer, itemType: "OFFER" as const })),
  ].sort((a, b) => {
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const isLoading = updatesLoading;

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md">
          <Title order={1}>The Commons</Title>
          <Text c="dimmed" size="lg">
            Stay up to date with the latest from across all events
          </Text>
        </Stack>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="updates" leftSection={<IconNews size={16} />}>
              Updates
              {updates && (
                <Badge ml="xs" size="sm" variant="light">
                  {updates.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="asks-offers" leftSection={<IconHandStop size={16} />}>
              Asks & Offers
              <Badge ml="xs" size="sm" variant="light">
                {allAsksOffers.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          {/* Updates Tab */}
          <Tabs.Panel value="updates" pt="lg">
            {!updates || updates.length === 0 ? (
              <Card withBorder radius="md" p="xl">
                <Stack align="center" py="xl">
                  <Text c="dimmed" size="lg" ta="center">
                    No project updates yet. Check back later!
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Timeline active={updates.length} bulletSize={24} lineWidth={2}>
                {updates.map((update) => {
                  const updateCommentInput = commentInputs[update.id] ?? "";
                  const updateShowCommentInput = showCommentInput[update.id] ?? false;

                  return (
                    <Timeline.Item
                      key={update.id}
                      bullet={<IconCalendarEvent size={12} />}
                      title={
                        <Group justify="space-between" wrap="nowrap" mb="xs">
                          <Text fw={600} size="lg">{update.title}</Text>
                          {update.weekNumber && (
                            <Badge size="sm" variant="outline">
                              Week {update.weekNumber}
                            </Badge>
                          )}
                        </Group>
                      }
                    >
                      <Paper
                        withBorder
                        radius="md"
                        p="lg"
                        shadow="sm"
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/projects/${update.project.id}`)}
                      >
                        <Stack gap="md">
                          {/* Header with project and author info */}
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="sm" wrap="nowrap" align="flex-start">
                              <UserAvatar
                                user={{
                                  customAvatarUrl: update.author.profile?.avatarUrl,
                                  oauthImageUrl: update.author.image,
                                  name: update.author.name,
                                  firstName: update.author.firstName,
                                  surname: update.author.surname,
                                }}
                                size="md"
                                radius="xl"
                              />
                              <div style={AUTHOR_CONTAINER_STYLE}>
                                <Group gap="xs">
                                  <Text fw={500} size="sm" style={AUTHOR_NAME_STYLE}>
                                    {update.author.name ?? 'Anonymous'}
                                  </Text>
                                  <Text c="dimmed" size="sm">
                                    •
                                  </Text>
                                  <Text
                                    component={Link}
                                    href={`/projects/${update.project.id}`}
                                    c="blue"
                                    size="sm"
                                    style={PROJECT_TITLE_STYLE}
                                  >
                                    {update.project.title}
                                  </Text>
                                </Group>
                                {userMetrics?.[update.author.id] && (
                                  <Box mt={4}>
                                    <UserMetricsBadges
                                      kudos={userMetrics[update.author.id]!.kudos}
                                      updates={userMetrics[update.author.id]!.updates}
                                      projects={userMetrics[update.author.id]!.projects}
                                      praiseReceived={userMetrics[update.author.id]!.praiseReceived}
                                      size="xs"
                                    />
                                  </Box>
                                )}
                                <Text c="dimmed" size="xs" mt={4}>
                                  {getRelativeTime(update.updateDate)}
                                </Text>
                              </div>
                            </Group>
                          </Group>

                          {/* Content layout */}
                          {update.imageUrls.length > 0 && update.imageUrls.length === 1 ? (
                            <Group
                              mt="xs"
                              align="flex-start"
                              wrap="nowrap"
                              gap="md"
                              style={SINGLE_IMAGE_LAYOUT_STYLE}
                            >
                              <Paper
                                radius="md"
                                withBorder
                                style={SINGLE_IMAGE_PAPER_STYLE}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageClick(update.imageUrls[0]!);
                                }}
                              >
                                <Image
                                  src={update.imageUrls[0]}
                                  alt="Update image"
                                  style={SINGLE_IMAGE_STYLE}
                                />
                              </Paper>
                              <Box style={TEXT_CONTENT_CONTAINER_STYLE}>
                                <Box>
                                  <MarkdownRenderer content={update.content} />
                                </Box>
                              </Box>
                            </Group>
                          ) : update.imageUrls.length > 0 ? (
                            <>
                              <Box mt="xs">
                                <SimpleGrid
                                  cols={{ base: 1, sm: 2, md: update.imageUrls.length >= 3 ? 3 : 2 }}
                                  spacing="md"
                                >
                                  {update.imageUrls.map((url, imgIndex) => (
                                    <Paper
                                      key={imgIndex}
                                      radius="md"
                                      withBorder
                                      style={MULTI_IMAGE_PAPER_STYLE}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleImageClick(url);
                                      }}
                                    >
                                      <Image
                                        src={url}
                                        alt={`Update image ${imgIndex + 1}`}
                                        style={MULTI_IMAGE_STYLE}
                                      />
                                    </Paper>
                                  ))}
                                </SimpleGrid>
                              </Box>
                              <Box>
                                <MarkdownRenderer content={update.content} />
                              </Box>
                            </>
                          ) : (
                            <Box>
                              <MarkdownRenderer content={update.content} />
                            </Box>
                          )}

                          {/* Links */}
                          {(update.githubUrls.length > 0 || update.demoUrls.length > 0) && (
                            <Group gap="xs">
                              {update.githubUrls.map((url, urlIndex) => (
                                <Anchor key={urlIndex} href={url} target="_blank" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <Group gap={4}>
                                    <IconBrandGithub size={14} />
                                    GitHub
                                  </Group>
                                </Anchor>
                              ))}
                              {update.demoUrls.map((url, urlIndex) => (
                                <Anchor key={urlIndex} href={url} target="_blank" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <Group gap={4}>
                                    <IconExternalLink size={14} />
                                    Demo
                                  </Group>
                                </Anchor>
                              ))}
                            </Group>
                          )}

                          {/* Tags and Engagement Stats */}
                          <Group justify="space-between" align="center">
                            {update.tags.length > 0 ? (
                              <Group gap="xs">
                                {update.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} size="xs" variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </Group>
                            ) : (
                              <div />
                            )}
                            <Group gap="md">
                              {update.comments.length > 0 && (
                                <Group gap={4}>
                                  <IconMessageCircle size={16} style={{ color: "var(--mantine-color-gray-6)" }} />
                                  <Text size="sm" c="dimmed" fw={500}>
                                    {update.comments.length}
                                  </Text>
                                </Group>
                              )}
                              <div onClick={(e) => e.stopPropagation()}>
                                <LikeButton
                                  updateId={update.id}
                                  initialLikeCount={update.likes.length}
                                  initialHasLiked={session?.user ? update.likes.some(like => like.userId === session.user.id) : false}
                                  userId={session?.user.id}
                                />
                              </div>
                            </Group>
                          </Group>

                          {/* Comments Section */}
                          {(update.comments.length > 0 || session?.user) && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Divider my="sm" />
                              <Stack gap="sm">
                                {update.comments.length > 2 && (
                                  <Anchor
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/projects/${update.project.id}`);
                                    }}
                                  >
                                    View all {update.comments.length} comments
                                  </Anchor>
                                )}

                                {update.comments.slice(0, 2).map((comment) => (
                                  <CommentPreview
                                    key={comment.id}
                                    comment={comment}
                                    currentUserId={session?.user?.id}
                                  />
                                ))}

                                {session?.user && (
                                  <Stack gap="xs">
                                    {!updateShowCommentInput ? (
                                      <Button
                                        variant="subtle"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleCommentInput(update.id);
                                        }}
                                      >
                                        Add a comment...
                                      </Button>
                                    ) : (
                                      <Stack gap="xs">
                                        <MentionTextarea
                                          value={updateCommentInput}
                                          onChange={(value) => handleCommentChange(update.id, value)}
                                          placeholder="Write your comment... (Use @ to mention users)"
                                          description="Supports Markdown formatting: **bold**, *italic*, [links](url)"
                                          minRows={2}
                                        />
                                        <Group gap="xs" justify="flex-end">
                                          <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleCommentInput(update.id);
                                              setCommentInputs((prev) => ({
                                                ...prev,
                                                [update.id]: "",
                                              }));
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // We need an eventId for comments - use a default or get from project
                                              handlePostComment(update.id, "");
                                            }}
                                            loading={createComment.isPending}
                                            disabled={!updateCommentInput.trim()}
                                          >
                                            Post
                                          </Button>
                                        </Group>
                                      </Stack>
                                    )}
                                  </Stack>
                                )}
                              </Stack>
                            </div>
                          )}
                        </Stack>
                      </Paper>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
          </Tabs.Panel>

          {/* Asks & Offers Tab */}
          <Tabs.Panel value="asks-offers" pt="lg">
            <Tabs defaultValue="all">
              <Group justify="space-between" align="flex-start" mb="md">
                <Tabs.List>
                  <Tabs.Tab value="all" leftSection={<IconHandStop size={16} />}>
                    All
                    <Badge ml="xs" size="sm" variant="light">
                      {allAsksOffers.length}
                    </Badge>
                  </Tabs.Tab>
                  <Tabs.Tab value="asks" leftSection={<IconHandStop size={16} />}>
                    Asks
                    <Badge ml="xs" size="sm" variant="light" color="orange">
                      {asksData.length}
                    </Badge>
                  </Tabs.Tab>
                  <Tabs.Tab value="offers" leftSection={<IconGift size={16} />}>
                    Offers
                    <Badge ml="xs" size="sm" variant="light" color="blue">
                      {offersData.length}
                    </Badge>
                  </Tabs.Tab>
                </Tabs.List>
              </Group>

              <Tabs.Panel value="all" pt="lg">
                {allAsksOffers.length === 0 ? (
                  <Stack align="center" gap="md" py="xl">
                    <Text ta="center" c="dimmed">
                      No asks or offers yet
                    </Text>
                    <Text ta="center" size="sm" c="dimmed">
                      Visit an event page to add asks and offers
                    </Text>
                  </Stack>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {allAsksOffers.map((item) =>
                      renderAskOfferCard(item, item.itemType)
                    )}
                  </SimpleGrid>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="asks" pt="lg">
                {asksData.length === 0 ? (
                  <Stack align="center" gap="md" py="xl">
                    <Text ta="center" c="dimmed">
                      No asks yet
                    </Text>
                  </Stack>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {asksData.map((item) => renderAskOfferCard(item, "ASK"))}
                  </SimpleGrid>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="offers" pt="lg">
                {offersData.length === 0 ? (
                  <Stack align="center" gap="md" py="xl">
                    <Text ta="center" c="dimmed">
                      No offers yet
                    </Text>
                  </Stack>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {offersData.map((item) => renderAskOfferCard(item, "OFFER"))}
                  </SimpleGrid>
                )}
              </Tabs.Panel>
            </Tabs>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Image preview modal */}
      <Modal
        opened={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="xl"
        padding={0}
        withCloseButton
        centered
      >
        {selectedImage && (
          <Image
            src={selectedImage}
            alt="Preview"
            style={{ width: "100%", height: "auto" }}
          />
        )}
      </Modal>
    </Container>
  );
}

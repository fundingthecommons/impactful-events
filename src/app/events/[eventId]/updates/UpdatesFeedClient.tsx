"use client";

import { useState } from "react";
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
  Avatar,
  Title,
  Loader,
  Center,
  Modal,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface UpdatesFeedClientProps {
  eventId: string;
}

export default function UpdatesFeedClient({ eventId }: UpdatesFeedClientProps) {
  const { data: session } = useSession();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: updates, isLoading } = api.project.getAllEventUpdates.useQuery({
    eventId,
  });

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!updates || updates.length === 0) {
    return (
      <Card withBorder radius="md" p="xl">
        <Stack align="center" py="xl">
          <Text c="dimmed" size="lg" ta="center">
            No project updates yet. Check back later!
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <>
      <Stack gap="lg">
        {updates.map((update) => (
          <Card key={update.id} withBorder radius="md" p="lg" shadow="sm">
            <Stack gap="md">
              {/* Header with project and author info */}
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <Avatar
                    src={update.author.image}
                    alt={update.author.name ?? "Author"}
                    size="md"
                    radius="xl"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={500} size="sm" style={{ whiteSpace: 'nowrap' }}>
                        {update.author.name ?? 'Anonymous'}
                      </Text>
                      <Text c="dimmed" size="sm">
                        •
                      </Text>
                      <Text
                        component={Link}
                        href={`/events/${eventId}/projects/${update.project.id}`}
                        c="blue"
                        size="sm"
                        style={{
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {update.project.title}
                      </Text>
                    </Group>
                    <Text c="dimmed" size="xs">
                      {getRelativeTime(update.createdAt)}
                    </Text>
                  </div>
                </Group>
                {update.weekNumber && (
                  <Badge size="sm" variant="outline">
                    Week {update.weekNumber}
                  </Badge>
                )}
              </Group>

              {/* Update title */}
              <Title order={3} size="h4">
                {update.title}
              </Title>

              {/* Update content */}
              <Box>
                <MarkdownRenderer content={update.content} />
              </Box>

              {/* Images */}
              {update.imageUrls.length > 0 && (
                <Box mt="xs">
                  {update.imageUrls.length === 1 ? (
                    // Single image - display large
                    <Paper
                      radius="md"
                      withBorder
                      style={{
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onClick={() => handleImageClick(update.imageUrls[0]!)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Image
                        src={update.imageUrls[0]}
                        alt="Update image"
                        style={{
                          width: "100%",
                          maxHeight: "400px",
                          objectFit: "cover"
                        }}
                      />
                    </Paper>
                  ) : (
                    // Multiple images - display grid
                    <SimpleGrid
                      cols={{ base: 1, sm: 2, md: update.imageUrls.length >= 3 ? 3 : 2 }}
                      spacing="md"
                    >
                      {update.imageUrls.map((url, imgIndex) => (
                        <Paper
                          key={imgIndex}
                          radius="md"
                          withBorder
                          style={{
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            aspectRatio: '16/9'
                          }}
                          onClick={() => handleImageClick(url)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Image
                            src={url}
                            alt={`Update image ${imgIndex + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        </Paper>
                      ))}
                    </SimpleGrid>
                  )}
                </Box>
              )}

              {/* Links */}
              {(update.githubUrls.length > 0 || update.demoUrls.length > 0) && (
                <Group gap="xs">
                  {update.githubUrls.map((url, urlIndex) => (
                    <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                      <Group gap={4}>
                        <IconBrandGithub size={14} />
                        GitHub
                      </Group>
                    </Anchor>
                  ))}
                  {update.demoUrls.map((url, urlIndex) => (
                    <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                      <Group gap={4}>
                        <IconExternalLink size={14} />
                        Demo
                      </Group>
                    </Anchor>
                  ))}
                </Group>
              )}

              {/* Tags and Like Button */}
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
                <LikeButton
                  updateId={update.id}
                  initialLikeCount={update.likes.length}
                  initialHasLiked={session?.user ? update.likes.some(like => like.userId === session.user.id) : false}
                  userId={session?.user.id}
                />
              </Group>
            </Stack>
          </Card>
        ))}
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
    </>
  );
}
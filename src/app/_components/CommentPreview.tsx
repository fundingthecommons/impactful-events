"use client";

import { Group, Stack, Text } from "@mantine/core";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { getDisplayName } from "~/utils/userDisplay";

interface CommentPreviewProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      surname: string | null;
      image: string | null;
      profile?: {
        avatarUrl: string | null;
      } | null;
    };
  };
}

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return new Date(date).toLocaleDateString();
};

export function CommentPreview({ comment }: CommentPreviewProps) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <UserAvatar
        user={{
          customAvatarUrl: comment.user.profile?.avatarUrl,
          oauthImageUrl: comment.user.image,
          name: comment.user.name,
          firstName: comment.user.firstName,
          surname: comment.user.surname,
        }}
        size="sm"
        radius="xl"
      />
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>
            {getDisplayName(comment.user, "Anonymous")}
          </Text>
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
            {getRelativeTime(comment.createdAt)}
            {comment.updatedAt.getTime() > comment.createdAt.getTime() && (
              <Text span fs="italic">
                {" "}
                (edited)
              </Text>
            )}
          </Text>
        </Group>
        <MarkdownRenderer content={comment.content} />
      </Stack>
    </Group>
  );
}

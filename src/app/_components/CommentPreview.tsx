"use client";

import { memo, useMemo } from "react";
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

// Extract static styles
const stackStyle = { flex: 1, minWidth: 0 } as const;
const textLineStyle = { lineHeight: 1.2 } as const;

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

function CommentPreviewComponent({ comment }: CommentPreviewProps) {
  // Memoize user object to prevent UserAvatar re-renders
  const userAvatarProps = useMemo(() => ({
    customAvatarUrl: comment.user.profile?.avatarUrl,
    oauthImageUrl: comment.user.image,
    name: comment.user.name,
    firstName: comment.user.firstName,
    surname: comment.user.surname,
  }), [
    comment.user.profile?.avatarUrl,
    comment.user.image,
    comment.user.name,
    comment.user.firstName,
    comment.user.surname,
  ]);

  // Memoize relative time calculation
  const relativeTime = useMemo(() => getRelativeTime(comment.createdAt), [comment.createdAt]);

  // Memoize display name
  const displayName = useMemo(() => getDisplayName(comment.user, "Anonymous"), [
    comment.user,
  ]);

  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <UserAvatar
        user={userAvatarProps}
        size="sm"
        radius="xl"
      />
      <Stack gap={4} style={stackStyle}>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} style={textLineStyle}>
            {displayName}
          </Text>
          <Text size="xs" c="dimmed" style={textLineStyle}>
            {relativeTime}
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

// Memoize component - only re-render if comment ID or update time changes
export const CommentPreview = memo(CommentPreviewComponent, (prevProps, nextProps) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.updatedAt.getTime() === nextProps.comment.updatedAt.getTime() &&
    prevProps.comment.content === nextProps.comment.content
  );
});

"use client";

import { useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface LikeButtonProps {
  updateId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  userId?: string;
}

export function LikeButton({
  updateId,
  initialLikeCount,
  initialHasLiked,
  userId,
}: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(initialHasLiked);
  const [optimisticCount, setOptimisticCount] = useState(initialLikeCount);

  const utils = api.useUtils();

  // Fetch likes data
  const { data: likesData } = api.project.getUpdateLikes.useQuery(
    { updateId },
    {
      initialData: {
        count: initialLikeCount,
        likes: [],
        hasLiked: initialHasLiked,
      },
    }
  );

  const likeMutation = api.project.likeProjectUpdate.useMutation({
    onMutate: async () => {
      // Optimistic update
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: async () => {
      await utils.project.getUpdateLikes.invalidate({ updateId });
    },
    onError: (error) => {
      // Revert optimistic update
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);

      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const unlikeMutation = api.project.unlikeProjectUpdate.useMutation({
    onMutate: async () => {
      // Optimistic update
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
    },
    onSuccess: async () => {
      await utils.project.getUpdateLikes.invalidate({ updateId });
    },
    onError: (error) => {
      // Revert optimistic update
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);

      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleLike = () => {
    if (!userId) {
      notifications.show({
        title: "Login Required",
        message: "Please log in to like updates",
        color: "blue",
      });
      return;
    }

    if (optimisticLiked) {
      unlikeMutation.mutate({ updateId });
    } else {
      likeMutation.mutate({ updateId });
    }
  };

  const isLoading = likeMutation.isPending || unlikeMutation.isPending;
  const displayCount = likesData?.count ?? optimisticCount;
  const displayLiked = likesData?.hasLiked ?? optimisticLiked;

  return (
    <Group gap="xs" align="center">
      <Tooltip label={displayLiked ? "Unlike" : "Like"}>
        <ActionIcon
          variant={displayLiked ? "filled" : "subtle"}
          color={displayLiked ? "red" : "gray"}
          size="lg"
          onClick={handleLike}
          loading={isLoading}
          style={{
            transition: "all 0.2s ease",
          }}
        >
          {displayLiked ? (
            <IconHeartFilled
              size={20}
              style={{
                animation: displayLiked ? "heartBeat 0.3s" : "none",
              }}
            />
          ) : (
            <IconHeart size={20} />
          )}
        </ActionIcon>
      </Tooltip>
      {displayCount > 0 && (
        <Text size="sm" c="dimmed" fw={500}>
          {displayCount}
        </Text>
      )}
      <style jsx global>{`
        @keyframes heartBeat {
          0%,
          100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </Group>
  );
}

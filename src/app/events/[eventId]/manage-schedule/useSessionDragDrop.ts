"use client";

import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

export function useSessionDragDrop(eventId: string, venueId: string) {
  const utils = api.useUtils();

  const reschedule = api.schedule.rescheduleSession.useMutation({
    onSuccess: (data) => {
      const shiftCount = data.shifted.length;
      notifications.show({
        title: "Session rescheduled",
        message:
          shiftCount > 0
            ? `Session moved. ${String(shiftCount)} other session${shiftCount > 1 ? "s" : ""} shifted.`
            : "Session moved successfully.",
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
    },
    onError: (err) => {
      notifications.show({
        title: "Reschedule failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleDrop = (
    sessionId: string,
    newStartTime: Date,
    newRoomId: string | null | undefined,
  ) => {
    reschedule.mutate({
      sessionId,
      newStartTime,
      newRoomId: newRoomId ?? null,
    });
  };

  return { handleDrop, isPending: reschedule.isPending };
}

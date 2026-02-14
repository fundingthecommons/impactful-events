import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

interface UseInvitationMutationsConfig {
  /** Display name used in notification messages (e.g. "speaker", "mentor", "floor owner") */
  roleName: string;
  /** Called after successful single invitation creation */
  onCreateSuccess?: () => void;
  /** Called after successful bulk invitation creation */
  onBulkCreateSuccess?: (result: {
    created: { id: string }[];
    skipped: number;
  }) => void;
  /** Called after successful invitation cancellation */
  onCancelSuccess?: () => void;
  /** Called after successful invitation resend */
  onResendSuccess?: () => void;
}

export function useInvitationMutations({
  roleName,
  onCreateSuccess,
  onBulkCreateSuccess,
  onCancelSuccess,
  onResendSuccess,
}: UseInvitationMutationsConfig) {
  const label = capitalize(roleName);

  const createInvitation = api.invitation.create.useMutation({
    onSuccess: (result) => {
      if (result._emailSent === false) {
        notifications.show({
          title: "Invitation Created",
          message: `Invitation created but email failed to send. Use "Resend" to try again.`,
          color: "yellow",
        });
      } else {
        notifications.show({
          title: "Success",
          message: `${label} invitation sent`,
          color: "green",
        });
      }
      onCreateSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const bulkCreateInvitations = api.invitation.bulkCreate.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Success",
        message: `${result.created.length} ${roleName} invitation${result.created.length !== 1 ? "s" : ""} sent. ${result.skipped} skipped.`,
        color: "green",
      });
      onBulkCreateSuccess?.(result);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const cancelInvitation = api.invitation.cancel.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: `${label} invitation cancelled`,
        color: "blue",
      });
      onCancelSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: (result) => {
      if (result._emailSent === false) {
        notifications.show({
          title: "Resend Failed",
          message: `Invitation updated but email failed to send. Try again later.`,
          color: "yellow",
        });
      } else {
        notifications.show({
          title: "Success",
          message: `${label} invitation resent`,
          color: "green",
        });
      }
      onResendSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  return {
    createInvitation,
    bulkCreateInvitations,
    cancelInvitation,
    resendInvitation,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

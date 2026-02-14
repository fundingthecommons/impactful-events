import { useState, useMemo } from "react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useInvitationMutations } from "./useInvitationMutations";
import {
  validateEmail,
  validateBulkEmails,
  parseEmails,
} from "./invitation-utils";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface UseInvitationManagerConfig {
  eventId: string;
  invitationType: "EVENT_ROLE" | "VENUE_OWNER";
  /** Display name for notification messages (e.g. "speaker", "mentor") */
  roleName: string;
  /** If provided, the hook looks up the roleId from role.getEventRoles by this name */
  roleLookupName?: string;
  /** If known upfront, skip the role lookup */
  roleId?: string;
  /** Only for VENUE_OWNER invitations */
  venueId?: string;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
}

interface InviteFormValues {
  email: string;
  firstName: string;
  expiresAt: Date | undefined;
}

interface BulkInviteFormValues {
  emails: string;
  expiresAt: Date | undefined;
}

// ──────────────────────────────────────────
// Hook
// ──────────────────────────────────────────

export function useInvitationManager({
  eventId,
  invitationType,
  roleName,
  roleLookupName,
  roleId: providedRoleId,
  venueId,
}: UseInvitationManagerConfig) {
  // ── UI State ──
  const [filterEmail, setFilterEmail] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);

  // ── Role Resolution ──
  const { data: roles, isLoading: rolesLoading } =
    api.role.getEventRoles.useQuery(undefined, {
      enabled: !providedRoleId && !!roleLookupName,
    });

  const resolvedRoleId = useMemo(() => {
    if (providedRoleId) return providedRoleId;
    if (!roleLookupName || !roles) return undefined;
    return roles.find((r) => r.name === roleLookupName)?.id;
  }, [providedRoleId, roleLookupName, roles]);

  // ── Queries ──
  const { data: event } = api.event.getEvent.useQuery({ id: eventId });

  const {
    data: allInvitations,
    refetch: refetchInvitations,
    isLoading: invitationsLoading,
  } = api.invitation.getAll.useQuery({ eventId });

  // Filter invitations to this role/type
  const invitations = useMemo(() => {
    if (!allInvitations) return [];
    if (invitationType === "EVENT_ROLE" && resolvedRoleId) {
      return allInvitations.filter((inv) => inv.roleId === resolvedRoleId);
    }
    if (invitationType === "VENUE_OWNER") {
      return allInvitations.filter((inv) => inv.type === "VENUE_OWNER");
    }
    return allInvitations;
  }, [allInvitations, invitationType, resolvedRoleId]);

  // Apply email filter
  const filteredInvitations = useMemo(() => {
    if (!filterEmail) return invitations;
    return invitations.filter((inv) =>
      inv.email.toLowerCase().includes(filterEmail.toLowerCase()),
    );
  }, [invitations, filterEmail]);

  // Stats
  const stats: InvitationStats = useMemo(
    () => ({
      total: invitations.length,
      pending: invitations.filter((inv) => inv.status === "PENDING").length,
      accepted: invitations.filter((inv) => inv.status === "ACCEPTED").length,
      expired: invitations.filter((inv) => inv.status === "EXPIRED").length,
      cancelled: invitations.filter((inv) => inv.status === "CANCELLED").length,
    }),
    [invitations],
  );

  // ── Forms ──
  const inviteForm = useForm<InviteFormValues>({
    initialValues: { email: "", firstName: "", expiresAt: undefined },
    validate: {
      email: (value) => validateEmail(value),
    },
  });

  const bulkInviteForm = useForm<BulkInviteFormValues>({
    initialValues: { emails: "", expiresAt: undefined },
    validate: {
      emails: (value) => validateBulkEmails(value),
    },
  });

  // ── Mutations ──
  const refetch = () => void refetchInvitations();

  const mutations = useInvitationMutations({
    roleName,
    onCreateSuccess: () => {
      setInviteModalOpen(false);
      inviteForm.reset();
      refetch();
    },
    onBulkCreateSuccess: () => {
      setBulkInviteModalOpen(false);
      bulkInviteForm.reset();
      refetch();
    },
    onCancelSuccess: refetch,
    onResendSuccess: refetch,
  });

  // ── Form Handlers ──
  const handleInvite = (values: InviteFormValues) => {
    if (invitationType === "EVENT_ROLE" && !resolvedRoleId) {
      notifications.show({
        title: "Error",
        message: `${capitalize(roleName)} role not found`,
        color: "red",
      });
      return;
    }

    mutations.createInvitation.mutate({
      email: values.email,
      inviteeName: values.firstName || undefined,
      type: invitationType,
      eventId,
      roleId: invitationType === "EVENT_ROLE" ? resolvedRoleId : undefined,
      venueId: invitationType === "VENUE_OWNER" ? venueId : undefined,
      expiresAt: values.expiresAt,
    });
  };

  const handleBulkInvite = (values: BulkInviteFormValues) => {
    if (invitationType === "EVENT_ROLE" && !resolvedRoleId) {
      notifications.show({
        title: "Error",
        message: `${capitalize(roleName)} role not found`,
        color: "red",
      });
      return;
    }

    const emails = parseEmails(values.emails);
    mutations.bulkCreateInvitations.mutate({
      emails,
      eventId,
      type: invitationType,
      roleId: invitationType === "EVENT_ROLE" ? resolvedRoleId : undefined,
      venueId: invitationType === "VENUE_OWNER" ? venueId : undefined,
      expiresAt: values.expiresAt,
    });
  };

  // ── Loading State ──
  const isLoading =
    invitationsLoading || (!providedRoleId && !!roleLookupName && rolesLoading);

  return {
    // Role
    resolvedRoleId,
    roleLoading: rolesLoading,

    // Data
    invitations,
    filteredInvitations,
    isLoading,
    stats,
    event,

    // Mutations
    ...mutations,

    // Forms
    inviteForm,
    bulkInviteForm,
    handleInvite,
    handleBulkInvite,

    // UI State
    filterEmail,
    setFilterEmail,
    inviteModalOpen,
    setInviteModalOpen,
    bulkInviteModalOpen,
    setBulkInviteModalOpen,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

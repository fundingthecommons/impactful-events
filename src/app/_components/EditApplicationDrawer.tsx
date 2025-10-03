"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  Text,
  MultiSelect,
  Textarea,
  Title,
  Paper,
  Group,
  Button,
} from "@mantine/core";
import { 
  IconDeviceFloppy, 
  IconCheck, 
  IconAlertCircle, 
  IconX 
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface EditApplicationDrawerProps {
  opened: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    adminNotes: string | null;
    adminLabels: string[];
  } | null;
  eventId: string;
}

export default function EditApplicationDrawer({ 
  opened, 
  onClose, 
  user, 
  eventId 
}: EditApplicationDrawerProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [adminLabels, setAdminLabels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // tRPC mutations and utils
  const utils = api.useUtils();
  const updateUserAdminNotes = api.user.updateUserAdminNotes.useMutation();
  const updateUserAdminLabels = api.user.updateUserAdminLabels.useMutation();

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setAdminNotes(user.adminNotes ?? "");
      setAdminLabels(user.adminLabels ?? []);
    }
  }, [user]);

  // Save admin notes
  const saveAdminNotes = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await updateUserAdminNotes.mutateAsync({
        userId: user.id,
        adminNotes: adminNotes.trim() || null,
      });
      
      // Invalidate queries to refresh data
      await utils.application.getEventApplications.invalidate({ eventId });
      await utils.application.getConsensusApplications.invalidate({ eventId });
      
      notifications.show({
        title: "Success",
        message: "Admin notes saved",
        color: "green",
        icon: <IconCheck />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save admin notes",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save admin labels
  const saveAdminLabels = async (newLabels: string[]) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await updateUserAdminLabels.mutateAsync({
        userId: user.id,
        adminLabels: newLabels as ("AI / ML expert" | "Designer" | "Developer" | "Entrepreneur" | "Lawyer" | "Non-Technical" | "Project manager" | "REFI" | "Regen" | "Researcher" | "Scientist" | "Woman" | "Writer" | "ZK")[],
      });
      
      // Invalidate queries to refresh data
      await utils.application.getEventApplications.invalidate({ eventId });
      await utils.application.getConsensusApplications.invalidate({ eventId });
      
      notifications.show({
        title: "Success",
        message: "Admin labels saved",
        color: "green",
        icon: <IconCheck />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save admin labels",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save all changes at once
  const saveAllChanges = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Save both notes and labels
      await Promise.all([
        updateUserAdminNotes.mutateAsync({
          userId: user.id,
          adminNotes: adminNotes.trim() || null,
        }),
        updateUserAdminLabels.mutateAsync({
          userId: user.id,
          adminLabels: adminLabels as (typeof adminLabels),
        })
      ]);
      
      // Invalidate queries to refresh data
      await utils.application.getEventApplications.invalidate({ eventId });
      await utils.application.getConsensusApplications.invalidate({ eventId });
      
      notifications.show({
        title: "Success",
        message: "All changes saved successfully",
        color: "green",
        icon: <IconCheck />,
      });
      
      onClose();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save changes",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Check for unsaved changes
    const hasUnsavedNotes = adminNotes !== (user?.adminNotes ?? "");
    const hasUnsavedLabels = JSON.stringify(adminLabels.sort()) !== JSON.stringify((user?.adminLabels ?? []).sort());
    
    if (hasUnsavedNotes || hasUnsavedLabels) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmed) return;
    }
    
    onClose();
  };

  if (!user) return null;

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size="lg"
      title={
        <Group>
          <Title order={4}>Edit Person</Title>
          <Text size="sm" c="dimmed">
            {user.name} ({user.email})
          </Text>
        </Group>
      }
      padding="xl"
    >
      <Stack gap="lg">
        {/* Admin Section */}
        <Paper p="xl" withBorder radius="md" bg="yellow.0">
          <Stack gap="lg">
            <Text fw={600} size="lg" c="orange.8">Internal Admin Notes</Text>
            <Text size="sm" c="dimmed">
              These fields are for internal use only and are not visible to the applicant.
            </Text>
            
            <MultiSelect
              label="Admin Labels"
              placeholder="Select applicable labels"
              data={[
                { value: "AI / ML expert", label: "AI / ML expert" },
                { value: "Designer", label: "Designer" },
                { value: "Developer", label: "Developer" },
                { value: "Entrepreneur", label: "Entrepreneur" },
                { value: "Lawyer", label: "Lawyer" },
                { value: "Non-Technical", label: "Non-Technical" },
                { value: "Project manager", label: "Project manager" },
                { value: "REFI", label: "REFI" },
                { value: "Regen", label: "Regen" },
                { value: "Researcher", label: "Researcher" },
                { value: "Scientist", label: "Scientist" },
                { value: "Woman", label: "Woman" },
                { value: "Writer", label: "Writer" },
                { value: "ZK", label: "ZK" },
              ]}
              value={adminLabels}
              onChange={setAdminLabels}
              size="md"
              disabled={isSaving}
              rightSection={
                adminLabels.length !== (user.adminLabels?.length ?? 0) || 
                !adminLabels.every(label => user.adminLabels?.includes(label)) ? (
                  <IconDeviceFloppy size={18} color="orange" />
                ) : (
                  <IconCheck size={18} color="green" />
                )
              }
              styles={{
                label: { fontSize: '14px', fontWeight: 600, marginBottom: '8px' },
                input: { fontSize: '14px' }
              }}
            />
            
            <Textarea
              label="Admin Notes"
              placeholder="Add internal notes about this applicant..."
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.currentTarget.value)}
              minRows={6}
              size="md"
              disabled={isSaving}
              rightSection={
                adminNotes !== (user.adminNotes ?? "") ? (
                  <IconDeviceFloppy size={18} color="orange" />
                ) : (
                  <IconCheck size={18} color="green" />
                )
              }
              styles={{
                label: { fontSize: '14px', fontWeight: 600, marginBottom: '8px' },
                input: { fontSize: '14px' }
              }}
            />
          </Stack>
        </Paper>

        {/* Action buttons */}
        <Group justify="flex-end">
          <Button
            variant="outline"
            onClick={handleClose}
            leftSection={<IconX size={16} />}
            disabled={isSaving}
          >
            Close
          </Button>
          <Button
            onClick={saveAllChanges}
            leftSection={<IconDeviceFloppy size={16} />}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
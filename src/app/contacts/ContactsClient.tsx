"use client";

import { useState } from "react";
import { Button, Paper, Stack, Text, Alert, Group, Loader } from "@mantine/core";
import { IconCloudDownload, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";

export default function ContactsClient() {
  const { refetch } = api.contact.getContacts.useQuery();
  const importContacts = api.contact.importGoogleContacts.useMutation();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await importContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts`);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={500} size="lg">Google Contacts Sync</Text>
          <Button
            leftSection={syncing ? <Loader size="xs" /> : <IconCloudDownload size={16} />}
            onClick={handleSync}
            disabled={syncing || importContacts.isPending}
            loading={syncing || importContacts.isPending}
          >
            {syncing || importContacts.isPending ? "Syncing..." : "Sync Google Contacts"}
          </Button>
        </Group>
        
        <Text size="sm" c="dimmed">
          Import contacts from your Google account to automatically populate the contacts database.
          Contacts will be automatically associated with sponsors based on their email domains.
        </Text>

        {importContacts.isSuccess && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
            Successfully synced contacts from Google!
          </Alert>
        )}

        {importContacts.error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text fw={500}>Sync error:</Text>
            <Text size="sm">{importContacts.error.message}</Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
} 
"use client";

import { useState } from "react";
import { Button, Paper, Stack, Text, Alert, Group, Loader } from "@mantine/core";
import { IconCloudDownload, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import TelegramAuthStatus from "~/app/_components/TelegramAuthStatus";

export default function ContactsClient() {
  const { refetch } = api.contact.getContacts.useQuery();
  const importContacts = api.contact.importGoogleContacts.useMutation();
  const importNotionContacts = api.contact.importNotionContacts.useMutation();
  const importTelegramContacts = api.contact.importTelegramContacts.useMutation();
  const { data: telegramAuthStatus, refetch: refetchTelegramAuth } = api.telegramAuth.getAuthStatus.useQuery();
  const [syncing, setSyncing] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [syncingTelegram, setSyncingTelegram] = useState(false);

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

  const handleNotionSync = async () => {
    setSyncingNotion(true);
    try {
      const result = await importNotionContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts from Notion`);
    } catch (e) {
      console.error("Notion sync failed:", e);
    } finally {
      setSyncingNotion(false);
    }
  };

  const handleTelegramSync = async () => {
    setSyncingTelegram(true);
    try {
      const result = await importTelegramContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts from Telegram`);
    } catch (e) {
      console.error("Telegram sync failed:", e);
    } finally {
      setSyncingTelegram(false);
    }
  };

  return (
    <>
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

      {/* Notion Contacts Sync Section */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">Notion Contacts Sync</Text>
            <Button
              leftSection={syncingNotion ? <Loader size="xs" /> : <IconCloudDownload size={16} />}
              onClick={handleNotionSync}
              disabled={syncingNotion || importNotionContacts.isPending}
              loading={syncingNotion || importNotionContacts.isPending}
            >
              {syncingNotion || importNotionContacts.isPending ? "Syncing..." : "Sync Notion Contacts"}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Import contacts from your Notion database. You will need to provide a Notion integration token and database ID in the backend configuration.
          </Text>
          {importNotionContacts.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully synced contacts from Notion!
            </Alert>
          )}
          {importNotionContacts.error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              <Text fw={500}>Sync error:</Text>
              <Text size="sm">{importNotionContacts.error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Telegram Contacts Sync Section */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">Telegram Contacts Sync</Text>
            <Button
              leftSection={syncingTelegram ? <Loader size="xs" /> : <IconCloudDownload size={16} />}
              onClick={handleTelegramSync}
              disabled={
                !telegramAuthStatus?.isAuthenticated || 
                syncingTelegram || 
                importTelegramContacts.isPending
              }
              loading={syncingTelegram || importTelegramContacts.isPending}
            >
              {syncingTelegram || importTelegramContacts.isPending ? "Syncing..." : "Sync Telegram Contacts"}
            </Button>
          </Group>
          
          <Text size="sm" c="dimmed">
            Import contacts from your Telegram account using your secure authentication.
          </Text>

          {/* Authentication Status */}
          <TelegramAuthStatus onAuthChanged={() => void refetchTelegramAuth()} />

          {importTelegramContacts.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully synced contacts from Telegram!
            </Alert>
          )}
          {importTelegramContacts.error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              <Text fw={500}>Sync error:</Text>
              <Text size="sm">{importTelegramContacts.error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>
    </>
  );
} 
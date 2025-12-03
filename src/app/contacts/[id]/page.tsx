"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import {
  Stack, Title, Text, Badge, Avatar, Group, Paper, Container,
  Divider, Anchor, Button, Loader, Center, Alert, SimpleGrid, Modal, Select
} from "@mantine/core";
import {
  IconMail, IconPhone, IconBrandTwitter, IconBrandGithub,
  IconBrandLinkedin, IconBrandTelegram, IconArrowLeft, IconAlertCircle,
  IconBuilding, IconWorld, IconUser, IconClock, IconMessage, IconSend, IconDownload, IconRefresh
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function ContactDetailsPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const contactId = params.id as string;
  const [importTelegramModalOpened, setImportTelegramModalOpened] = useState(false);
  const [importGmailModalOpened, setImportGmailModalOpened] = useState(false);
  const [selectedTelegramEventId, setSelectedTelegramEventId] = useState<string>("");
  const [selectedGmailEventId, setSelectedGmailEventId] = useState<string>("");
  const [reconnecting, setReconnecting] = useState(false);

  const { data: contact, isLoading, error } = api.contact.getContact.useQuery(
    { id: contactId },
    { enabled: !!contactId }
  );

  const { data: communications, refetch: refetchCommunications } = api.contact.getContactCommunications.useQuery(
    { contactId, limit: 10 },
    { enabled: !!contactId }
  );

  const { data: events } = api.event.getEvents.useQuery();

  const importTelegramMessages = api.contact.importTelegramMessagesForContact.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Import Complete",
        message: `Successfully imported ${result.imported} Telegram messages`,
        color: "green",
      });
      setImportTelegramModalOpened(false);
      void refetchCommunications();
    },
    onError: (error) => {
      notifications.show({
        title: "Import Failed",
        message: error.message,
        color: "red",
      });
    },
  });

  const disconnectGoogleAccount = api.contact.disconnectGoogleAccount.useMutation();

  const importGmailMessages = api.contact.importGmailMessagesForContact.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Import Complete",
        message: `Successfully imported ${result.imported} Gmail messages`,
        color: "green",
      });
      setImportGmailModalOpened(false);
      void refetchCommunications();
    },
    onError: (error) => {
      notifications.show({
        title: "Import Failed",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleImportTelegram = () => {
    if (!selectedTelegramEventId) {
      notifications.show({
        title: "Event Required",
        message: "Please select an event to associate messages with",
        color: "orange",
      });
      return;
    }

    importTelegramMessages.mutate({
      contactId,
      eventId: selectedTelegramEventId,
      maxMessages: 100,
    });
  };

  const handleImportGmail = () => {
    if (!selectedGmailEventId) {
      notifications.show({
        title: "Event Required",
        message: "Please select an event to associate messages with",
        color: "orange",
      });
      return;
    }

    importGmailMessages.mutate({
      contactId,
      eventId: selectedGmailEventId,
      maxMessages: 100,
    });
  };

  const handleReconnectGoogle = async () => {
    setReconnecting(true);
    try {
      console.log("Disconnecting existing Google account...");
      await disconnectGoogleAccount.mutateAsync();
      console.log("Google account disconnected, redirecting to OAuth...");

      // Small delay to ensure the disconnect is processed
      setTimeout(() => {
        window.location.href = "/api/auth/signin?provider=google";
      }, 500);
    } catch (e) {
      console.error("Failed to disconnect Google account:", e);
      setReconnecting(false);
      notifications.show({
        title: "Reconnect Failed",
        message: "Failed to disconnect Google account. Please try again.",
        color: "red",
      });
    }
  };

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/contacts");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center h="50vh">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading contact details...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error ?? !contact) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Button
            component={Link}
            href="/contacts"
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
          >
            Back to Contacts
          </Button>

          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text fw={500}>Contact Not Found</Text>
            <Text size="sm">
              The contact you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
            </Text>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header with Back Button */}
        <Group justify="space-between">
          <Button
            component={Link}
            href="/contacts"
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
          >
            Back to Contacts
          </Button>
        </Group>

        {/* Contact Header */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Group align="flex-start" gap="xl">
            {/* Avatar */}
            <Avatar size={120} color="blue" radius="md">
              <IconUser size={60} />
            </Avatar>

            {/* Info */}
            <Stack gap="md" style={{ flex: 1 }}>
              <div>
                <Title order={1}>
                  {contact.firstName} {contact.lastName}
                </Title>
                {contact.email && (
                  <Group gap="xs" mt="xs">
                    <IconMail size={18} />
                    <Anchor href={`mailto:${contact.email}`} size="lg">
                      {contact.email}
                    </Anchor>
                  </Group>
                )}
              </div>

              {/* Skills */}
              {contact.skills && contact.skills.length > 0 && (
                <Group gap="xs">
                  {contact.skills.map((skill, index) => (
                    <Badge key={index} variant="light" size="md">
                      {skill}
                    </Badge>
                  ))}
                </Group>
              )}

              {/* Import Messages Buttons */}
              <Stack gap="sm" mt="md">
                {contact.telegram && (
                  <Group gap="xs">
                    <Button
                      leftSection={<IconDownload size={16} />}
                      variant="light"
                      color="blue"
                      onClick={() => setImportTelegramModalOpened(true)}
                      loading={importTelegramMessages.isPending}
                    >
                      Import Telegram Messages
                    </Button>
                    <Text size="sm" c="dimmed">
                      Import chat history with @{contact.telegram}
                    </Text>
                  </Group>
                )}
                {contact.email && !contact.email.endsWith("telegram.placeholder") && (
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Button
                        leftSection={<IconDownload size={16} />}
                        variant="light"
                        color="green"
                        onClick={() => setImportGmailModalOpened(true)}
                        loading={importGmailMessages.isPending}
                      >
                        Import Gmail Messages
                      </Button>
                      <Text size="sm" c="dimmed">
                        Import email history with {contact.email}
                      </Text>
                    </Group>
                    {importGmailMessages.error && (
                      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                        <Text fw={500}>Import Failed:</Text>
                        <Text size="sm" mb="sm">
                          {importGmailMessages.error.message === "GOOGLE_GMAIL_PERMISSIONS_INSUFFICIENT"
                            ? "Gmail access permission is missing. Please reconnect your Google account to grant Gmail access."
                            : importGmailMessages.error.message}
                        </Text>
                        {importGmailMessages.error.message === "GOOGLE_GMAIL_PERMISSIONS_INSUFFICIENT" && (
                          <Button
                            size="xs"
                            variant="outline"
                            leftSection={reconnecting ? <Loader size={14} /> : <IconRefresh size={14} />}
                            onClick={handleReconnectGoogle}
                            disabled={reconnecting || disconnectGoogleAccount.isPending}
                            loading={reconnecting || disconnectGoogleAccount.isPending}
                          >
                            {reconnecting || disconnectGoogleAccount.isPending
                              ? "Reconnecting..."
                              : "Disconnect & Reconnect Google"}
                          </Button>
                        )}
                      </Alert>
                    )}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Group>
        </Paper>

        {/* Main Content Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left Column - Contact Information */}
          <Stack gap="lg">
            {/* Contact Details */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
              <Stack gap="md">
                <Title order={3}>Contact Information</Title>

                {contact.phone && (
                  <Group gap="md">
                    <IconPhone size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="xs" c="dimmed">Phone</Text>
                      <Anchor href={`tel:${contact.phone}`} fw={500}>
                        {contact.phone}
                      </Anchor>
                    </div>
                  </Group>
                )}

                {contact.email && (
                  <Group gap="md">
                    <IconMail size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="xs" c="dimmed">Email</Text>
                      <Anchor href={`mailto:${contact.email}`} fw={500}>
                        {contact.email}
                      </Anchor>
                    </div>
                  </Group>
                )}

                {!contact.phone && !contact.email && (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    No contact information available
                  </Text>
                )}
              </Stack>
            </Paper>

            {/* Social Media */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
              <Stack gap="md">
                <Title order={3}>Social Media</Title>

                {contact.telegram && (
                  <Group gap="md">
                    <IconBrandTelegram size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="xs" c="dimmed">Telegram</Text>
                      <Anchor href={`https://t.me/${contact.telegram}`} target="_blank" fw={500}>
                        @{contact.telegram}
                      </Anchor>
                    </div>
                  </Group>
                )}

                {contact.twitter && (
                  <Group gap="md">
                    <IconBrandTwitter size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="xs" c="dimmed">Twitter</Text>
                      <Anchor href={`https://twitter.com/${contact.twitter}`} target="_blank" fw={500}>
                        @{contact.twitter}
                      </Anchor>
                    </div>
                  </Group>
                )}

                {contact.github && (
                  <Group gap="md">
                    <IconBrandGithub size={20} color="var(--mantine-color-dimmed)" />
                    <div>
                      <Text size="xs" c="dimmed">GitHub</Text>
                      <Anchor href={`https://github.com/${contact.github}`} target="_blank" fw={500}>
                        @{contact.github}
                      </Anchor>
                    </div>
                  </Group>
                )}

                {contact.linkedIn && (
                  <Group gap="md">
                    <IconBrandLinkedin size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="xs" c="dimmed">LinkedIn</Text>
                      <Anchor href={contact.linkedIn} target="_blank" fw={500}>
                        View Profile
                      </Anchor>
                    </div>
                  </Group>
                )}

                {!contact.telegram && !contact.twitter && !contact.github && !contact.linkedIn && (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    No social media profiles linked
                  </Text>
                )}
              </Stack>
            </Paper>
          </Stack>

          {/* Right Column - About & Organization */}
          <Stack gap="lg">
            {/* About Section */}
            {contact.about && (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>About</Title>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{contact.about}</Text>
                </Stack>
              </Paper>
            )}

            {/* Organization */}
            {contact.sponsor && (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>Associated Organization</Title>
                  <Paper p="md" withBorder>
                    <Group gap="md" align="flex-start">
                      {contact.sponsor.logoUrl ? (
                        <Avatar src={contact.sponsor.logoUrl} size="md" radius="sm">
                          {contact.sponsor.name[0]?.toUpperCase()}
                        </Avatar>
                      ) : (
                        <Avatar size="md" color="blue" radius="sm">
                          <IconBuilding size={20} />
                        </Avatar>
                      )}
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Anchor component={Link} href={`/organizations/${contact.sponsor.id}`} fw={500} size="lg">
                          {contact.sponsor.name}
                        </Anchor>
                        {contact.sponsor.websiteUrl && (
                          <Anchor href={contact.sponsor.websiteUrl} target="_blank" size="sm">
                            <Group gap={4}>
                              <IconWorld size={14} />
                              Visit Website
                            </Group>
                          </Anchor>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                </Stack>
              </Paper>
            )}

            {/* Last Interaction */}
            {contact.lastInteractionAt && (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>Last Interaction</Title>
                  <Group gap="md">
                    <IconClock size={20} color="var(--mantine-color-dimmed)" />
                    <div>
                      <Text size="xs" c="dimmed">Last Contact</Text>
                      <Text fw={500}>
                        {new Date(contact.lastInteractionAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      {contact.lastInteractionType && (
                        <Text size="sm" c="dimmed">{contact.lastInteractionType}</Text>
                      )}
                    </div>
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Recent Interactions */}
            {contact.interactions && contact.interactions.length > 0 && (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>
                    <Group gap="sm">
                      <IconMessage size={24} />
                      Recent Interactions ({contact.interactions.length})
                    </Group>
                  </Title>
                  <Stack gap="xs">
                    {contact.interactions.map(interaction => (
                      <Paper key={interaction.id} p="sm" withBorder>
                        <Stack gap={4}>
                          <Group justify="space-between">
                            <Text size="sm" fw={500}>{interaction.type}</Text>
                            <Text size="xs" c="dimmed">
                              {new Date(interaction.createdAt).toLocaleDateString()}
                            </Text>
                          </Group>
                          {interaction.notes && (
                            <Text size="sm" c="dimmed">{interaction.notes}</Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* Communications History */}
            {communications && communications.length > 0 && (
              <Paper shadow="xs" p="md" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={3}>
                    <Group gap="sm">
                      <IconSend size={24} />
                      Communications ({communications.length})
                    </Group>
                  </Title>
                  <Stack gap="xs">
                    {communications.map(comm => (
                      <Paper key={comm.id} p="md" withBorder>
                        <Stack gap={8}>
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm">
                              <Badge size="sm" variant="light" color={comm.channel === 'TELEGRAM' ? 'blue' : 'gray'}>
                                {comm.channel}
                              </Badge>
                              <Badge size="sm" variant="light" color={
                                comm.status === 'SENT' ? 'green' :
                                comm.status === 'FAILED' ? 'red' :
                                'gray'
                              }>
                                {comm.status}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {comm.sentAt
                                ? new Date(comm.sentAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : new Date(comm.createdAt).toLocaleDateString()}
                            </Text>
                          </Group>
                          {comm.subject && (
                            <Text size="sm" fw={500}>{comm.subject}</Text>
                          )}
                          <Text size="sm" c="dimmed" lineClamp={3}>
                            {comm.textContent}
                          </Text>
                          <Group gap="xs">
                            {comm.toTelegram && (
                              <Text size="xs" c="dimmed">
                                To: @{comm.toTelegram}
                              </Text>
                            )}
                            {comm.toEmail && (
                              <Text size="xs" c="dimmed">
                                To: {comm.toEmail}
                              </Text>
                            )}
                          </Group>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </SimpleGrid>

        <Divider />

        {/* Footer Info */}
        <Paper p="md" withBorder bg="gray.0">
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">Contact Information</Text>
            <Text size="xs" c="dimmed">Contact ID</Text>
            <Text size="sm" style={{ fontFamily: 'monospace' }}>{contact.id}</Text>
          </Stack>
        </Paper>
      </Stack>

      {/* Import Telegram Messages Modal */}
      <Modal
        opened={importTelegramModalOpened}
        onClose={() => setImportTelegramModalOpened(false)}
        title="Import Telegram Messages"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Import chat history with <strong>@{contact.telegram}</strong> into the Communication table.
          </Text>

          <Select
            label="Event"
            placeholder="Select an event to associate messages with"
            required
            data={events?.map((event) => ({
              value: event.id,
              label: event.name,
            })) ?? []}
            value={selectedTelegramEventId}
            onChange={(value) => setSelectedTelegramEventId(value ?? "")}
          />

          <Text size="sm" c="dimmed">
            This will import up to 100 recent messages from your Telegram conversation.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setImportTelegramModalOpened(false)}
              disabled={importTelegramMessages.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportTelegram}
              loading={importTelegramMessages.isPending}
              leftSection={<IconDownload size={16} />}
            >
              Import Messages
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Import Gmail Messages Modal */}
      <Modal
        opened={importGmailModalOpened}
        onClose={() => setImportGmailModalOpened(false)}
        title="Import Gmail Messages"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Import email history with <strong>{contact.email}</strong> into the Communication table.
          </Text>

          <Select
            label="Event"
            placeholder="Select an event to associate messages with"
            required
            data={events?.map((event) => ({
              value: event.id,
              label: event.name,
            })) ?? []}
            value={selectedGmailEventId}
            onChange={(value) => setSelectedGmailEventId(value ?? "")}
          />

          <Text size="sm" c="dimmed">
            This will import up to 100 recent emails from or to this contact.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setImportGmailModalOpened(false)}
              disabled={importGmailMessages.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportGmail}
              loading={importGmailMessages.isPending}
              leftSection={<IconDownload size={16} />}
              color="green"
            >
              Import Messages
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { 
  Table, Stack, Title, Text, Badge, Avatar, Group, Paper, Container, 
  Drawer, ActionIcon, Divider, Anchor, CopyButton, Tooltip, Tabs,
  MultiSelect, Textarea, Button, Alert, Select, Loader
} from "@mantine/core";
import { 
  IconEye, IconBrandTwitter, IconBrandGithub, IconBrandLinkedin, 
  IconBrandTelegram, IconPhone, IconMail, IconCopy, IconCheck,
  IconBuilding, IconWorld, IconUser, IconAddressBook, IconMessage,
  IconSend, IconX, IconUsers, IconUsersGroup
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import ContactsClient from "./ContactsClient";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  linkedIn?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  github?: string | null;
  sponsor?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  } | null;
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<string>("contacts");
  
  // Messaging state
  const [selectedRecipients, setSelectedRecipients] = useState<Contact[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedSmartList, setSelectedSmartList] = useState<string | null>(null);
  const [messagingMode, setMessagingMode] = useState<'manual' | 'smartlist'>('manual');
  
  const { data: contacts, isLoading } = api.contact.getContacts.useQuery();
  const { data: telegramAuthStatus } = api.telegramAuth.getAuthStatus.useQuery();
  const { data: smartLists, isLoading: smartListsLoading } = api.telegramAuth.getSmartLists.useQuery();
  const { data: smartListContacts, isLoading: smartListContactsLoading } = api.telegramAuth.getSmartListContacts.useQuery(
    { listId: selectedSmartList! },
    { enabled: !!selectedSmartList }
  );
  const sendBulkMessage = api.telegramAuth.sendBulkMessage.useMutation();
  const sendBulkMessageToList = api.telegramAuth.sendBulkMessageToList.useMutation();

  const openDrawer = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setDrawerOpened(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpened(false);
    setSelectedContact(null);
  }, []);

  // Get contacts with Telegram usernames for messaging (memoized)
  const telegramContacts = useMemo(() => 
    contacts?.filter(contact => contact.telegram) ?? [], 
    [contacts]
  );

  // Contact selector data for MultiSelect (memoized)
  const contactSelectData = useMemo(() => 
    telegramContacts.map(contact => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName} (@${contact.telegram})`,
      contact: contact,
    })), 
    [telegramContacts]
  );

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;
    
    if (messagingMode === 'manual' && !selectedRecipients.length) return;
    if (messagingMode === 'smartlist' && !selectedSmartList) return;
    
    setIsSending(true);
    try {
      let result;
      if (messagingMode === 'smartlist') {
        result = await sendBulkMessageToList.mutateAsync({
          listId: selectedSmartList!,
          message: messageText.trim(),
        });
      } else {
        result = await sendBulkMessage.mutateAsync({
          contactIds: selectedRecipients.map(c => c.id),
          message: messageText.trim(),
        });
      }
      
      // Reset form on success
      setSelectedRecipients([]);
      setSelectedSmartList(null);
      setMessageText("");
      console.log(`Messages sent: ${result.successCount} successful, ${result.failureCount} failed`);
    } catch (error) {
      console.error("Failed to send messages:", error);
    } finally {
      setIsSending(false);
    }
  }, [messageText, messagingMode, selectedRecipients, selectedSmartList, sendBulkMessageToList, sendBulkMessage]);

  const removeRecipient = useCallback((contactId: string) => {
    setSelectedRecipients(prev => prev.filter(c => c.id !== contactId));
  }, []);

  // Helper to get recipient count for current mode (memoized)
  const getRecipientCount = useCallback(() => {
    if (messagingMode === 'smartlist') {
      const selectedList = smartLists?.find(list => list.id === selectedSmartList);
      return selectedList?.contactCount ?? 0;
    }
    return selectedRecipients.length;
  }, [messagingMode, smartLists, selectedSmartList, selectedRecipients.length]);

  // Helper to check if send is enabled (memoized)
  const canSend = useCallback(() => {
    if (!messageText.trim()) return false;
    if (messagingMode === 'manual') return selectedRecipients.length > 0;
    if (messagingMode === 'smartlist') return !!selectedSmartList;
    return false;
  }, [messageText, messagingMode, selectedRecipients.length, selectedSmartList]);

  // Transform contacts into table data format for Mantine Table (memoized)
  const tableData = useMemo(() => contacts ? {
    head: ['Contact', 'Phone & Telegram', 'Email', 'Associated Sponsor', 'ID', 'Actions'],
    body: contacts.map((contact) => [
      // Contact column with avatar and name
      <Group gap="sm" key={`contact-${contact.id}`}>
        <Avatar size="sm" color="blue">
          {contact.firstName?.[0]?.toUpperCase()}{contact.lastName?.[0]?.toUpperCase()}
        </Avatar>
        <Stack gap={0}>
          <Text fw={500} size="sm">
            {contact.firstName} {contact.lastName}
          </Text>
          <Text size="xs" c="dimmed">
            {contact.email}
          </Text>
        </Stack>
      </Group>,
      // Phone & Telegram column
      <Stack gap={2} key={`contact-info-${contact.id}`}>
        {contact.phone && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">📞</Text>
            <Text size="xs" style={{ fontFamily: 'monospace' }}>
              {contact.phone}
            </Text>
          </Group>
        )}
        {contact.telegram && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">📱</Text>
            <Text size="xs" c="blue">
              @{contact.telegram}
            </Text>
          </Group>
        )}
        {!contact.phone && !contact.telegram && (
          <Text size="xs" c="dimmed">-</Text>
        )}
      </Stack>,
      // Email column
      contact.email,
      // Sponsor column
      contact.sponsor ? (
        <Group gap="xs" key={`sponsor-${contact.id}`}>
          <Avatar src={contact.sponsor.logoUrl} size="xs" radius="xl">
            {contact.sponsor.name[0]?.toUpperCase()}
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {contact.sponsor.name}
            </Text>
            {contact.sponsor.websiteUrl && (
              <Text size="xs" c="dimmed">
                {contact.sponsor.websiteUrl.replace(/^https?:\/\//, "")}
              </Text>
            )}
          </Stack>
        </Group>
      ) : (
        <Badge variant="light" color="gray" size="sm" key={`no-sponsor-${contact.id}`}>
          No sponsor
        </Badge>
      ),
      // ID column  
      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }} key={`id-${contact.id}`}>
        {contact.id}
      </Text>,
      // Actions column
      <ActionIcon 
        variant="subtle" 
        color="blue" 
        onClick={() => openDrawer(contact)}
        key={`actions-${contact.id}`}
      >
        <IconEye size={16} />
      </ActionIcon>
    ])
  } : null, [contacts, openDrawer]);

  // Handle authentication on client side
  if (status === "loading") {
    return <div>Loading...</div>;
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
    return <div>Loading contacts...</div>;
  }

  return (
    <>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Title order={2}>Contacts & Communications</Title>
          
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "contacts")} color="blue">
            <Tabs.List>
              <Tabs.Tab 
                value="contacts" 
                leftSection={<IconAddressBook size={16} />}
              >
                Contacts
              </Tabs.Tab>
              <Tabs.Tab 
                value="communications" 
                leftSection={<IconMessage size={16} />}
              >
                Communications
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="contacts" pt="md">
              <Stack gap="lg">
                <Paper shadow="xs" p="md" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Text fw={500} size="lg">
                        All Contacts ({contacts?.length ?? 0})
                      </Text>
                    </Group>
                    
                    {tableData && tableData.body.length > 0 ? (
                      <Table 
                        data={tableData} 
                        striped 
                        highlightOnHover 
                        withTableBorder 
                        withColumnBorders
                      />
                    ) : (
                      <Text ta="center" c="dimmed" py="xl">
                        No contacts found. Try syncing with Google Contacts below.
                      </Text>
                    )}
                  </Stack>
                </Paper>
                
                <ContactsClient />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="communications" pt="md">
              <Stack gap="lg">
                <Paper shadow="xs" p="md" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Text fw={500} size="lg">
                        <IconBrandTelegram size={20} style={{ marginRight: 8 }} />
                        Send Telegram Messages
                      </Text>
                      <Text size="sm" c="dimmed">
                        {telegramContacts.length} contacts with Telegram
                      </Text>
                    </Group>

                    {!telegramAuthStatus?.isAuthenticated ? (
                      <Alert icon={<IconBrandTelegram size={16} />} color="orange" variant="light">
                        <Text fw={500}>Telegram Authentication Required</Text>
                        <Text size="sm">
                          Please set up Telegram authentication in the Contacts tab to send messages.
                        </Text>
                      </Alert>
                    ) : (
                      <Stack gap="md">
                        {/* Messaging Mode Selector */}
                        <Stack gap="sm">
                          <Text fw={500} size="sm">Send to:</Text>
                          <Tabs value={messagingMode} onChange={(value) => {
                            setMessagingMode(value as 'manual' | 'smartlist');
                            // Clear selections when switching modes
                            setSelectedRecipients([]);
                            setSelectedSmartList(null);
                          }}>
                            <Tabs.List>
                              <Tabs.Tab value="manual" leftSection={<IconUsers size={16} />}>
                                Select Contacts
                              </Tabs.Tab>
                              <Tabs.Tab value="smartlist" leftSection={<IconUsersGroup size={16} />}>
                                Smart Lists
                              </Tabs.Tab>
                            </Tabs.List>
                          </Tabs>
                        </Stack>

                        {/* Manual Contact Selection */}
                        {messagingMode === 'manual' && (
                          <Stack gap="sm">
                            <MultiSelect
                              placeholder="Search contacts by name..."
                              data={contactSelectData}
                              value={selectedRecipients.map(c => c.id)}
                              onChange={(values) => {
                                const newRecipients = values.map(value => 
                                  telegramContacts.find(c => c.id === value)!
                                ).filter(Boolean);
                                setSelectedRecipients(newRecipients);
                              }}
                              searchable
                              clearable
                              maxDropdownHeight={200}
                              renderOption={({ option }) => {
                                const data = contactSelectData.find(item => item.value === option.value);
                                if (!data) return null;
                                
                                return (
                                  <Group gap="sm">
                                    <Avatar size="sm" color="blue">
                                      {data.contact.firstName[0]}{data.contact.lastName[0]}
                                    </Avatar>
                                    <Stack gap={0}>
                                      <Text size="sm">
                                        {data.contact.firstName} {data.contact.lastName}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        @{data.contact.telegram}
                                      </Text>
                                    </Stack>
                                  </Group>
                                );
                              }}
                            />
                            
                            {/* Selected Recipients Pills */}
                            {selectedRecipients.length > 0 && (
                              <Group gap="xs">
                                {selectedRecipients.map(contact => (
                                  <Badge
                                    key={contact.id}
                                    variant="light"
                                    color="blue"
                                    rightSection={
                                      <ActionIcon 
                                        size="xs" 
                                        color="blue" 
                                        radius="xl" 
                                        variant="transparent"
                                        onClick={() => removeRecipient(contact.id)}
                                      >
                                        <IconX size={10} />
                                      </ActionIcon>
                                    }
                                  >
                                    {contact.firstName} {contact.lastName}
                                  </Badge>
                                ))}
                              </Group>
                            )}
                          </Stack>
                        )}

                        {/* Smart List Selection */}
                        {messagingMode === 'smartlist' && (
                          <Stack gap="sm">
                            {smartListsLoading ? (
                              <Group gap="sm">
                                <Loader size="sm" />
                                <Text size="sm" c="dimmed">Loading smart lists...</Text>
                              </Group>
                            ) : (
                              <Select
                                placeholder="Choose a contact list..."
                                data={smartLists?.map(list => ({
                                  value: list.id,
                                  label: `${list.name} (${list.contactCount} contacts)`,
                                  description: list.description,
                                })) ?? []}
                                value={selectedSmartList}
                                onChange={setSelectedSmartList}
                                clearable
                                searchable
                                renderOption={({ option }) => {
                                  const list = smartLists?.find(l => l.id === option.value);
                                  if (!list) return null;
                                  
                                  return (
                                    <Stack gap={2}>
                                      <Group justify="space-between">
                                        <Text size="sm" fw={500}>{list.name}</Text>
                                        <Badge size="xs" variant="light" color="blue">
                                          {list.contactCount} contacts
                                        </Badge>
                                      </Group>
                                      <Text size="xs" c="dimmed">{list.description}</Text>
                                    </Stack>
                                  );
                                }}
                              />
                            )}

                            {/* Smart List Preview */}
                            {selectedSmartList && smartListContacts && (
                              <Paper p="xs" withBorder radius="sm" bg="gray.0">
                                <Stack gap="xs">
                                  <Group gap="xs">
                                    <IconUsers size={14} />
                                    <Text size="xs" fw={500}>
                                      Preview: {smartListContacts.length} contacts
                                    </Text>
                                  </Group>
                                  {smartListContactsLoading ? (
                                    <Group gap="xs">
                                      <Loader size="xs" />
                                      <Text size="xs" c="dimmed">Loading contacts...</Text>
                                    </Group>
                                  ) : (
                                    <Text size="xs" c="dimmed">
                                      {smartListContacts.slice(0, 3).map(c => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()).join(', ')}
                                      {smartListContacts.length > 3 && ` and ${smartListContacts.length - 3} more...`}
                                    </Text>
                                  )}
                                </Stack>
                              </Paper>
                            )}
                          </Stack>
                        )}

                        {/* Message Form */}
                        <Stack gap="sm">
                          <Text fw={500} size="sm">Message:</Text>
                          <Textarea
                            placeholder="Type your message here..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            minRows={4}
                            maxRows={8}
                            autosize
                          />
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">
                              {messageText.length}/4096 characters
                            </Text>
                            <Button
                              leftSection={<IconSend size={16} />}
                              onClick={handleSendMessage}
                              disabled={!canSend() || isSending}
                              loading={isSending}
                            >
                              {isSending ? "Sending..." : `Send to ${getRecipientCount()} recipient${getRecipientCount() !== 1 ? 's' : ''}`}
                            </Button>
                          </Group>
                        </Stack>

                        {/* Send Results */}
                        {(sendBulkMessage.isSuccess || sendBulkMessageToList.isSuccess) && (
                          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                            <Text fw={500}>Messages Sent Successfully!</Text>
                            {(sendBulkMessage.data ?? sendBulkMessageToList.data) && (
                              <Text size="sm" mt="xs">
                                Delivered to {(sendBulkMessage.data?.successCount ?? sendBulkMessageToList.data?.successCount)} recipient(s)
                                {((sendBulkMessage.data?.failureCount ?? sendBulkMessageToList.data?.failureCount ?? 0) > 0) && 
                                  `, ${sendBulkMessage.data?.failureCount ?? sendBulkMessageToList.data?.failureCount} failed`}
                              </Text>
                            )}
                          </Alert>
                        )}

                        {(sendBulkMessage.error ?? sendBulkMessageToList.error) && (
                          <Alert icon={<IconX size={16} />} color="red" variant="light">
                            <Text fw={500}>Failed to Send Messages</Text>
                            <Text size="sm">{sendBulkMessage.error?.message ?? sendBulkMessageToList.error?.message}</Text>
                          </Alert>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      {/* Contact Details Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title="Contact Details"
        position="right"
        size="md"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        {selectedContact && (
          <Stack gap="lg">
            {/* Header Section */}
            <Group>
              <Avatar size="lg" color="blue">
                {selectedContact.firstName?.[0]?.toUpperCase()}{selectedContact.lastName?.[0]?.toUpperCase()}
              </Avatar>
              <Stack gap={2}>
                <Text fw={600} size="lg">
                  {selectedContact.firstName} {selectedContact.lastName}
                </Text>
                <Text size="sm" c="dimmed">
                  Contact ID: {selectedContact.id}
                </Text>
              </Stack>
            </Group>

            <Divider />

            {/* Contact Information */}
            <Stack gap="sm">
              <Text fw={500} size="md">
                <IconUser size={16} style={{ marginRight: 8 }} />
                Contact Information
              </Text>
              
              {/* Email */}
              <Group justify="space-between">
                <Group gap="xs">
                  <IconMail size={16} color="gray" />
                  <Text size="sm">{selectedContact.email}</Text>
                </Group>
                <CopyButton value={selectedContact.email}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy email'}>
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>

              {/* Phone */}
              {selectedContact.phone && (
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconPhone size={16} color="gray" />
                    <Text size="sm" style={{ fontFamily: 'monospace' }}>
                      {selectedContact.phone}
                    </Text>
                  </Group>
                  <CopyButton value={selectedContact.phone}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy phone'}>
                        <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              )}
            </Stack>

            {/* Social Media Links */}
            {(selectedContact.twitter ?? selectedContact.github ?? selectedContact.linkedIn ?? selectedContact.telegram) && (
              <>
                <Divider />
                <Stack gap="sm">
                  <Text fw={500} size="md">Social Media</Text>
                  
                  {selectedContact.twitter && (
                    <Group gap="xs">
                      <IconBrandTwitter size={16} color="blue" />
                      <Anchor 
                        href={`https://twitter.com/${selectedContact.twitter}`} 
                        target="_blank" 
                        size="sm"
                      >
                        @{selectedContact.twitter}
                      </Anchor>
                    </Group>
                  )}

                  {selectedContact.github && (
                    <Group gap="xs">
                      <IconBrandGithub size={16} />
                      <Anchor 
                        href={`https://github.com/${selectedContact.github}`} 
                        target="_blank" 
                        size="sm"
                      >
                        @{selectedContact.github}
                      </Anchor>
                    </Group>
                  )}

                  {selectedContact.linkedIn && (
                    <Group gap="xs">
                      <IconBrandLinkedin size={16} color="blue" />
                      <Anchor 
                        href={selectedContact.linkedIn.startsWith('http') ? selectedContact.linkedIn : `https://linkedin.com/in/${selectedContact.linkedIn}`} 
                        target="_blank" 
                        size="sm"
                      >
                        {selectedContact.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '')}
                      </Anchor>
                    </Group>
                  )}

                  {selectedContact.telegram && (
                    <Group gap="xs">
                      <IconBrandTelegram size={16} color="blue" />
                      <Anchor 
                        href={`https://t.me/${selectedContact.telegram}`} 
                        target="_blank" 
                        size="sm"
                      >
                        @{selectedContact.telegram}
                      </Anchor>
                    </Group>
                  )}
                </Stack>
              </>
            )}

            {/* Sponsor Information */}
            {selectedContact.sponsor && (
              <>
                <Divider />
                <Stack gap="sm">
                  <Text fw={500} size="md">
                    <IconBuilding size={16} style={{ marginRight: 8 }} />
                    Associated Sponsor
                  </Text>
                  <Group gap="sm">
                    <Avatar 
                      src={selectedContact.sponsor.logoUrl} 
                      size="md" 
                      radius="sm"
                    >
                      {selectedContact.sponsor.name[0]?.toUpperCase()}
                    </Avatar>
                    <Stack gap={2}>
                      <Text fw={500} size="sm">
                        {selectedContact.sponsor.name}
                      </Text>
                      {selectedContact.sponsor.websiteUrl && (
                        <Group gap="xs">
                          <IconWorld size={14} color="gray" />
                          <Anchor 
                            href={selectedContact.sponsor.websiteUrl} 
                            target="_blank" 
                            size="xs"
                          >
                            {selectedContact.sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                          </Anchor>
                        </Group>
                      )}
                    </Stack>
                  </Group>
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Drawer>
    
  </>
  );
}

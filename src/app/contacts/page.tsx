"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { HydrateClient } from "~/trpc/server";
import { 
  Table, Stack, Title, Text, Badge, Avatar, Group, Paper, Container, 
  Drawer, ActionIcon, Divider, Anchor, Button, CopyButton, Tooltip
} from "@mantine/core";
import { 
  IconEye, IconBrandTwitter, IconBrandGithub, IconBrandLinkedin, 
  IconBrandTelegram, IconPhone, IconMail, IconCopy, IconCheck,
  IconBuilding, IconWorld, IconUser
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
  
  const { data: contacts, isLoading } = api.contact.getContacts.useQuery();

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

  const openDrawer = (contact: Contact) => {
    setSelectedContact(contact);
    setDrawerOpened(true);
  };

  const closeDrawer = () => {
    setDrawerOpened(false);
    setSelectedContact(null);
  };

  // Transform contacts into table data format for Mantine Table
  const tableData = contacts ? {
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
  } : null;

  if (isLoading) {
    return <div>Loading contacts...</div>;
  }

  return (
    <HydrateClient>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Title order={2}>Contacts</Title>
          
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
            {(selectedContact.twitter || selectedContact.github || selectedContact.linkedIn || selectedContact.telegram) && (
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
    </HydrateClient>
  );
}
"use client";

import { Modal, Title, Stack, Card, Group, Avatar, Text, ActionIcon, ScrollArea, Loader, Alert } from "@mantine/core";
import { IconPlus, IconExternalLink } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface AddLeadPanelProps {
  opened: boolean;
  onClose: () => void;
  onAddSponsor: (sponsorId: string) => void;
}

export default function AddLeadPanel({ opened, onClose, onAddSponsor }: AddLeadPanelProps) {
  const { data: sponsors, isLoading, error } = api.sponsor.getSponsors.useQuery();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Add Lead</Title>}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select a sponsor to add as a lead for this event
        </Text>
        
        {isLoading && (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text>Loading sponsors...</Text>
          </Group>
        )}
        
        {error && (
          <Alert color="red" title="Error loading sponsors">
            {error.message}
          </Alert>
        )}
        
        {sponsors && (
          <ScrollArea h={400} type="auto">
            <Stack gap="sm">
              {sponsors.map((sponsor) => (
                <Card key={sponsor.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group>
                      <Avatar src={sponsor.logoUrl} alt={sponsor.name} radius="xl">
                        {sponsor.name[0]?.toUpperCase()}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={500}>{sponsor.name}</Text>
                        {sponsor.websiteUrl && (
                          <Text 
                            size="xs" 
                            c="dimmed" 
                            component="a" 
                            href={sponsor.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <Group gap={4}>
                              {sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                              <IconExternalLink size={12} />
                            </Group>
                          </Text>
                        )}
                        {sponsor.contacts.length > 0 && (
                          <Text size="xs" c="dimmed">
                            {sponsor.contacts.length} contact{sponsor.contacts.length !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                    <ActionIcon
                      variant="filled"
                      color="blue"
                      size="lg"
                      radius="xl"
                      onClick={() => {
                        onAddSponsor(sponsor.id);
                        onClose();
                      }}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}
        
        {sponsors && sponsors.length === 0 && (
          <Text ta="center" c="dimmed" p="xl">
            No sponsors found. Add some sponsors first to use this feature.
          </Text>
        )}
      </Stack>
    </Modal>
  );
} 
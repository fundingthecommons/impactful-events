"use client";
import { Card, Group, Text, Title, Stack, Paper, ScrollArea, Badge, Avatar, SimpleGrid, Progress, TextInput, ActionIcon, Tooltip, Button, Drawer, Modal, Select } from "@mantine/core";
import { useState, useMemo } from "react";
import '@mantine/core/styles.css';
import { IconSearch, IconMail, IconBell, IconExternalLink, IconPlus, IconTrash } from "@tabler/icons-react";
import HeaderBar from "./HeaderBar";
import AddLeadPanel from "./AddLeadPanel";
import { api } from "~/trpc/react";

// Onboarding states (grouped into 4 columns for display)
const columns = [
  {
    title: "Lead",
    states: ["lead", "qualified", "contacted"],
  },
  {
    title: "Contact Identified",
    states: ["contact identified", "initial meeting setup"],
  },
  {
    title: "Proposal",
    states: ["initial proposal sent", "contract sent", "promises confirmed"],
  },
  {
    title: "Contract Signed",
    states: ["Contract signed"],
  },
];



function SponsorCard({ sponsor, onClick }: { sponsor: any; onClick: () => void }) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={onClick}>
      <Group>
        <Avatar src={sponsor.logoUrl} alt={sponsor.name} radius="xl">
          {sponsor.name[0]}
        </Avatar>
        <Stack gap={0}>
          <Group>
            <Text fw={500}>{sponsor.name}</Text>
            <Badge color="blue" size="sm" variant="light">{sponsor.state}</Badge>
          </Group>
          {sponsor.websiteUrl && (
            <Text size="xs" c="dimmed">
              {sponsor.websiteUrl.replace(/^https?:\/\//, "")}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

export default function SponsorKanbanBoard() {
  const [addLeadPanelOpened, setAddLeadPanelOpened] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<any>(null);
  const [sponsorPanelOpened, setSponsorPanelOpened] = useState(false);
  const [addContactModalOpened, setAddContactModalOpened] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  
  // Get tRPC utils for invalidation
  const utils = api.useUtils();
  
  // Fetch event data from database
  const { data: event, isLoading } = api.event.getEvent.useQuery({
    id: "realfi-hackathon-2024"
  });

  // Fetch all contacts
  const { data: allContacts } = api.contact.getContacts.useQuery();

  // Fetch detailed sponsor information when one is selected
  const { data: detailedSponsor } = api.sponsor.getSponsor.useQuery(
    { id: selectedSponsor?.id }, 
    { enabled: !!selectedSponsor?.id }
  );

  // Mutation to add sponsor to event
  const addSponsorMutation = api.event.addSponsorToEvent.useMutation({
    onSuccess: (data) => {
      // Invalidate and refetch the event data to ensure consistency
      utils.event.getEvent.invalidate({ id: "realfi-hackathon-2024" });
      console.log(`✅ Successfully added ${data.sponsor.name} as a lead!`);
      // You could add a toast notification here for better UX
    },
    onError: (error) => {
      // Show error message to user
      console.error('❌ Failed to add sponsor:', error.message);
      // You could add a toast notification here
    },
  });

  // Mutation to assign contact to sponsor
  const assignContactMutation = api.contact.assignContactToSponsor.useMutation({
    onSuccess: () => {
      // Invalidate contact and sponsor data
      utils.contact.getContacts.invalidate();
      utils.sponsor.getSponsor.invalidate({ id: selectedSponsor?.id });
      setAddContactModalOpened(false);
      setSelectedContactId("");
    },
  });

  // Mutation to remove contact from sponsor
  const removeContactMutation = api.contact.removeContactFromSponsor.useMutation({
    onSuccess: () => {
      // Invalidate contact and sponsor data
      utils.contact.getContacts.invalidate();
      utils.sponsor.getSponsor.invalidate({ id: selectedSponsor?.id });
    },
  });

  // Transform database sponsors into component format
  const sponsors = useMemo(() => {
    if (!event?.sponsors) return [];
    
    return event.sponsors.map((eventSponsor) => ({
      id: eventSponsor.sponsor.id,
      name: eventSponsor.sponsor.name,
      websiteUrl: eventSponsor.sponsor.websiteUrl,
      logoUrl: eventSponsor.sponsor.logoUrl,
      state: "lead" // Default state - can be enhanced later to track actual states
    }));
  }, [event]);

  const handleAddSponsor = async (sponsorId: string) => {
    if (!event) return;

    try {
      // Perform the mutation - this will trigger the loading state
      await addSponsorMutation.mutateAsync({
        eventId: event.id,
        sponsorId: sponsorId,
      });
      
      // Close the add lead panel on success
      setAddLeadPanelOpened(false);
      
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      // Keep the modal open so user can try again
      console.error('Error in handleAddSponsor:', error);
    }
  };

  const handleSponsorClick = (sponsor: any) => {
    setSelectedSponsor(sponsor);
    setSponsorPanelOpened(true);
  };

  const handleAssignContact = async () => {
    if (!selectedContactId || !selectedSponsor?.id) return;

    await assignContactMutation.mutateAsync({
      contactId: selectedContactId,
      sponsorId: selectedSponsor.id,
    });
  };

  const handleRemoveContact = async (contactId: string) => {
    await removeContactMutation.mutateAsync({
      contactId,
    });
  };

  // Get available contacts (not assigned to this sponsor)
  const availableContacts = useMemo(() => {
    if (!allContacts || !detailedSponsor) return [];
    
    const sponsorContactIds = detailedSponsor.contacts.map((c: any) => c.id);
    return allContacts.filter((contact: any) => !sponsorContactIds.includes(contact.id));
  }, [allContacts, detailedSponsor]);

  if (isLoading) {
    return (
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Text>Loading event data...</Text>
      </Stack>
    );
  }

  if (!event) {
    return (
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Text>Event not found</Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Title order={4} mb="md">{event.name}</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {columns.map((col) => (
            <Paper key={col.title} p="lg" radius="md" shadow="xs" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>
                    {col.title}{" "}
                    {col.title === "Lead" && (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => setAddLeadPanelOpened(true)}
                      >
                        (Add Lead)
                      </Button>
                    )}
                  </Title>
                  <Badge color="blue" variant="light">
                    {col.states.reduce((acc, state) => acc + sponsors.filter((s) => s.state === state).length, 0)}
                  </Badge>
                </Group>
                <ScrollArea h={500} type="auto" offsetScrollbars>
                  <Stack gap="sm">
                    {col.states.flatMap((state) =>
                      sponsors
                        .filter((s) => s.state === state)
                        .map((sponsor) => <SponsorCard key={sponsor.id} sponsor={sponsor} onClick={() => handleSponsorClick(sponsor)} />)
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
      
      <AddLeadPanel
        opened={addLeadPanelOpened}
        onClose={() => setAddLeadPanelOpened(false)}
        onAddSponsor={handleAddSponsor}
        isAddingLead={addSponsorMutation.isPending}
        existingSponsorIds={sponsors.map(s => s.id)}
      />
      
      <Drawer
        opened={sponsorPanelOpened}
        onClose={() => setSponsorPanelOpened(false)}
        position="right"
        size="33%"
        title={selectedSponsor?.name || "Sponsor Details"}
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        {selectedSponsor && (
          <Stack gap="lg">
            <Group>
              <Avatar size="xl" src={selectedSponsor.logoUrl} alt={selectedSponsor.name} radius="md">
                {selectedSponsor.name[0]}
              </Avatar>
              <Stack gap={0}>
                <Text size="xl" fw={600}>{selectedSponsor.name}</Text>
                <Badge color="blue" size="md" variant="light">{selectedSponsor.state}</Badge>
              </Stack>
            </Group>
            
            {selectedSponsor.websiteUrl && (
              <Group gap="xs">
                <Text fw={500}>Website:</Text>
                <Text 
                  component="a" 
                  href={selectedSponsor.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {selectedSponsor.websiteUrl.replace(/^https?:\/\//, "")}
                  <IconExternalLink size={14} style={{ marginLeft: 4, display: 'inline' }} />
                </Text>
              </Group>
            )}
            
            <Stack gap="xs">
              <Text fw={500}>Status:</Text>
              <Text c="dimmed">{selectedSponsor.state}</Text>
            </Stack>
            
            <Stack gap="xs">
              <Text fw={500}>Sponsor ID:</Text>
              <Text c="dimmed" size="sm">{selectedSponsor.id}</Text>
            </Stack>

            {/* Contacts Section */}
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={500} size="lg">Contacts</Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="light"
                  size="sm"
                  onClick={() => setAddContactModalOpened(true)}
                  disabled={!availableContacts.length}
                >
                  Add Contact
                </Button>
              </Group>
              
              {detailedSponsor?.contacts && detailedSponsor.contacts.length > 0 ? (
                <Stack gap="sm">
                  {detailedSponsor.contacts.map((contact: any) => (
                    <Paper key={contact.id} p="md" withBorder>
                      <Group justify="space-between" align="center">
                        <Stack gap={0}>
                          <Text fw={500}>
                            {contact.firstName} {contact.lastName}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {contact.email}
                          </Text>
                        </Stack>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleRemoveContact(contact.id)}
                          loading={removeContactMutation.isPending}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No contacts assigned to this sponsor
                </Text>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
      
      {/* Add Contact Modal */}
      <Modal
        opened={addContactModalOpened}
        onClose={() => {
          setAddContactModalOpened(false);
          setSelectedContactId("");
        }}
        title="Add Contact to Sponsor"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Select Contact"
            placeholder="Choose a contact to add"
            value={selectedContactId}
            onChange={(value) => setSelectedContactId(value || "")}
            data={availableContacts.map((contact: any) => ({
              value: contact.id,
              label: `${contact.firstName} ${contact.lastName} (${contact.email})`,
            }))}
            searchable
            maxDropdownHeight={200}
          />
          
          <Group justify="end">
            <Button
              variant="outline"
              onClick={() => {
                setAddContactModalOpened(false);
                setSelectedContactId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignContact}
              disabled={!selectedContactId}
              loading={assignContactMutation.isPending}
            >
              Add Contact
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

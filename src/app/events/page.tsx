"use client";
import { Card, Group, Text, Title, Stack, Paper, ScrollArea, Badge, Avatar, SimpleGrid, Progress, TextInput, ActionIcon, Tooltip, Button } from "@mantine/core";
import { useState, useMemo } from "react";
import '@mantine/core/styles.css';
import { IconSearch, IconMail, IconBell } from "@tabler/icons-react";
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



function SponsorCard({ sponsor }: { sponsor: any }) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
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
            <Text size="xs" c="dimmed" component="a" href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer">
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
  
  // Get tRPC utils for invalidation
  const utils = api.useUtils();
  
  // Fetch event data from database
  const { data: event, isLoading } = api.event.getEvent.useQuery({
    id: "realfi-hackathon-2024"
  });

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
                        .map((sponsor) => <SponsorCard key={sponsor.id} sponsor={sponsor} />)
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
    </>
  );
}

"use client";
import { Card, Group, Text, Title, Stack, Paper, ScrollArea, Badge, Avatar, SimpleGrid } from "@mantine/core";
import { useState } from "react";
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

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

// Dummy sponsor data (compatible with Sponsor model)
const initialSponsors = [
  { id: "1", name: "Aave", websiteUrl: "https://aave.com", logoUrl: undefined, state: "lead" },
  { id: "2", name: "ENS", websiteUrl: "https://ens.domains", logoUrl: undefined, state: "qualified" },
  { id: "3", name: "Logos", websiteUrl: "https://logos.co", logoUrl: undefined, state: "contacted" },
  { id: "4", name: "Octant", websiteUrl: "https://octant.app", logoUrl: undefined, state: "contact identified" },
  { id: "5", name: "Gitcoin", websiteUrl: "https://gitcoin.co", logoUrl: undefined, state: "initial meeting setup" },
  { id: "6", name: "Hats", websiteUrl: "https://hats.finance", logoUrl: undefined, state: "initial proposal sent" },
  { id: "7", name: "Stellar", websiteUrl: "https://stellar.org", logoUrl: undefined, state: "contract sent" },
  { id: "8", name: "Masa", websiteUrl: "https://masa.finance", logoUrl: undefined, state: "Contract signed" },
];

function SponsorCard({ sponsor }: { sponsor: any }) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group>
        <Avatar src={sponsor.logoUrl} alt={sponsor.name} radius="xl">
          {sponsor.name[0]}
        </Avatar>
        <Stack gap={0}>
          <Text fw={500}>{sponsor.name}</Text>
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
  const [sponsors] = useState(initialSponsors);

  return (
    <MantineProvider>
      <Stack>
        <Title order={2}>Sponsor Onboarding Board</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
          {columns.map((col) => (
            <Paper key={col.title} p="md" radius="md" shadow="xs" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>{col.title}</Title>
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
    </MantineProvider>
  );
}

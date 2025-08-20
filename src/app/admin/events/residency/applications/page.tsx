import { Container, Title, Text, Stack, Alert, Button, Group } from "@mantine/core";
import { IconInfoCircle, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/server";
import ResidencyApplicationsClient from "./ResidencyApplicationsClient";

export default async function ResidencyApplicationsPage() {
  try {
    // Get all residency-type events
    const allEvents = await api.event.getEvents();
    const residencyEvents = allEvents?.filter(event => 
      event.type.toLowerCase() === 'residency'
    ) ?? [];

    if (residencyEvents.length === 0) {
      return (
        <Container size="lg" py="xl">
          <Stack gap="lg">
            <Group justify="space-between">
              <Title order={2}>Residency Applications</Title>
              <Link href="/admin/events" style={{ textDecoration: 'none' }}>
                <Button variant="outline" leftSection={<IconArrowLeft size={16} />}>
                  Back to Events
                </Button>
              </Link>
            </Group>
            
            <Alert icon={<IconInfoCircle size={16} />} title="No Residency Events" color="blue">
              <Text>
                No residency events found in the system. Create a residency event first to manage applications.
              </Text>
            </Alert>
          </Stack>
        </Container>
      );
    }

    return (
      <Container size="xl" py="xl">
        <ResidencyApplicationsClient residencyEvents={residencyEvents} />
      </Container>
    );
  } catch (error) {
    console.error("Error loading residency applications:", error);
    
    return (
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Title order={2}>Residency Applications</Title>
          <Alert icon={<IconInfoCircle size={16} />} title="Error Loading Applications" color="red">
            <Text>
              Unable to load residency applications. Please try again or contact support.
            </Text>
          </Alert>
        </Stack>
      </Container>
    );
  }
}
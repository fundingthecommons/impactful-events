"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Loader,
  Center,
} from "@mantine/core";
import { api } from "~/trpc/react";

interface ImpactPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ImpactPage({ params }: ImpactPageProps) {
  const [eventId, setEventId] = useState<string>("");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  );

  // Get resident projects
  const { data: residentProjects } = api.application.getResidentProjects.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get accepted residents
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Get all project updates count
  const totalUpdates = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      return sum + (project.updates?.length ?? 0);
    }, 0);
  }, [residentProjects]);

  // Get total likes across all projects (count likes on all updates)
  const totalLikes = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      const projectLikes = project.updates?.reduce((updateSum: number, update) => {
        return updateSum + (update.likes?.length ?? 0);
      }, 0) ?? 0;
      return sum + projectLikes;
    }, 0);
  }, [residentProjects]);

  if (eventLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Residency Impact</Title>

      <Group grow>
        <Paper p="lg" withBorder>
          <Text size="sm" c="dimmed" mb="xs">Residents</Text>
          <Text size="2xl" fw={700}>{residentsData?.visibleResidents ?? 0}</Text>
        </Paper>
        <Paper p="lg" withBorder>
          <Text size="sm" c="dimmed" mb="xs">Projects</Text>
          <Text size="2xl" fw={700}>{residentProjects?.length ?? 0}</Text>
        </Paper>
        <Paper p="lg" withBorder>
          <Text size="sm" c="dimmed" mb="xs">Project Updates</Text>
          <Text size="2xl" fw={700}>{totalUpdates}</Text>
        </Paper>
        <Paper p="lg" withBorder>
          <Text size="sm" c="dimmed" mb="xs">Total Likes</Text>
          <Text size="2xl" fw={700}>{totalLikes}</Text>
        </Paper>
      </Group>
    </Container>
  );
}

import { redirect, notFound } from "next/navigation";
import { Container, Stack, Title, Text, Paper } from "@mantine/core";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

interface AdminSponsorsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AdminSponsorsPage({ params }: AdminSponsorsPageProps) {
  const { eventId } = await params;
  
  const session = await auth();
  
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/sponsors`);
  }
  
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="md">
        <Title order={2}>Sponsors - {event.name}</Title>
        
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Title order={3} c="dimmed">Coming Soon</Title>
            <Text c="dimmed" ta="center">
              Sponsor management functionality will be available in a future update.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
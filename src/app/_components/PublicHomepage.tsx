"use client";

import Link from "next/link";
import { 
  Container, 
  Title, 
  Text, 
  Stack, 
  Button,
} from "@mantine/core";
import { 
  IconCalendarEvent,
} from "@tabler/icons-react";

export default function PublicHomepage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b">
      <Container size="xl" py="xl">
        <Stack gap="xl" align="center">
          {/* Hero Section */}
          <Stack gap="lg" ta="center" maw={800}>
            <Title 
              order={1} 
              size="3.5rem" 
              fw={800} 
              style={{ 
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Funding the Commons
            </Title>
            <Title order={2} size="1.5rem" fw={400} c="dimmed">
              Residency 2025
            </Title>
            <Text size="xl" c="dimmed" maw={600} mx="auto" style={{ lineHeight: 1.6 }}>
              Join our 3-month residency program for builders working on public goods and sustainable funding mechanisms.
            </Text>
          </Stack>

          {/* Single CTA Button */}
          <Link href="/events/funding-commons-residency-2025" style={{ textDecoration: 'none' }}>
            <Button 
              size="xl" 
              radius="xl"
              variant="gradient" 
              gradient={{ from: 'blue', to: 'purple' }}
              leftSection={<IconCalendarEvent size={24} />}
            >
              Apply to Residency 2025
            </Button>
          </Link>
        </Stack>
      </Container>
    </main>
  );
}
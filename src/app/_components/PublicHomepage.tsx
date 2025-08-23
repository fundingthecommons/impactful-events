"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Container, 
  Title, 
  Text, 
  Stack, 
  Button,
  Paper,
  SimpleGrid,
  Group,
  ThemeIcon,
  Card,
} from "@mantine/core";
import { 
  IconCalendarEvent,
  IconUsersGroup,
  IconBuildingBank,
  IconBrain,
  IconHeart,
  IconArrowRight,
} from "@tabler/icons-react";
import AuthModal from "./AuthModal";

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: {
  icon: React.FC<{ size?: number }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card withBorder padding="lg" radius="md" style={{ height: "100%" }}>
      <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
        <ThemeIcon size={60} radius="xl" color={color} variant="light">
          <Icon size={30} />
        </ThemeIcon>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text fw={600} size="lg">{title}</Text>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {description}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function PublicHomepage() {
  const [authModalOpened, setAuthModalOpened] = useState(false);

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
              Event Management Platform
            </Title>
            <Text size="xl" c="dimmed" maw={600} mx="auto" style={{ lineHeight: 1.6 }}>
              Connect with builders, sponsors, mentors, and organizers in the public goods funding ecosystem. 
              Participate in hackathons, residencies, and conferences that advance decentralized impact.
            </Text>
          </Stack>

          {/* CTA Buttons */}
          <Group gap="md">
            <Button 
              size="lg" 
              radius="xl"
              variant="gradient" 
              gradient={{ from: 'blue', to: 'purple' }}
              rightSection={<IconArrowRight size={20} />}
              onClick={() => setAuthModalOpened(true)}
            >
              Get Started
            </Button>
            <Link href="/events" style={{ textDecoration: 'none' }}>
              <Button 
                size="lg" 
                radius="xl"
                variant="light"
                leftSection={<IconCalendarEvent size={20} />}
              >
                Browse Events
              </Button>
            </Link>
          </Group>

          {/* Platform Features */}
          <Stack gap="lg" mt="xl" w="100%">
            <Stack gap="md" ta="center">
              <Title order={2} size="2rem" fw={600}>
                What We Do
              </Title>
              <Text size="lg" c="dimmed" maw={600} mx="auto">
                Our platform brings together all stakeholders in the public goods funding ecosystem
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
              <FeatureCard
                icon={IconUsersGroup}
                title="For Builders"
                description="Apply to residencies, hackathons, and conferences. Get funding, mentorship, and support for your public goods projects."
                color="blue"
              />
              <FeatureCard
                icon={IconBuildingBank}
                title="For Sponsors"
                description="Connect with top builders and projects. Support innovative public goods initiatives and get visibility in the ecosystem."
                color="violet"
              />
              <FeatureCard
                icon={IconBrain}
                title="For Mentors"
                description="Share your expertise with the next generation of impact-driven builders. Guide projects that matter."
                color="teal"
              />
              <FeatureCard
                icon={IconCalendarEvent}
                title="For Organizers"
                description="Create and manage events that bring the community together. Facilitate connections and collaboration."
                color="indigo"
              />
            </SimpleGrid>
          </Stack>

          {/* About Section */}
          <Paper 
            p="xl" 
            radius="lg" 
            withBorder 
            mt="xl"
            style={{ 
              background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-purple-0) 100%)',
              width: '100%'
            }}
          >
            <Stack gap="md" ta="center">
              <Group justify="center" gap="xs">
                <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
                  <IconHeart size={28} />
                </ThemeIcon>
                <Title order={2} c="blue.7">
                  About Our Platform
                </Title>
              </Group>
              <Text size="lg" c="dimmed" maw={700} mx="auto" style={{ lineHeight: 1.6 }}>
                Funding the Commons is the premier event management platform for public goods funding initiatives. 
                We facilitate hackathons, residencies, conferences, and other events that advance the ecosystem of 
                decentralized impact and sustainable funding mechanisms.
              </Text>
              <Text c="dimmed" maw={600} mx="auto">
                Whether you&apos;re building solutions, providing funding, offering mentorship, or organizing events, 
                our platform connects you with the right people and opportunities to maximize your impact.
              </Text>
            </Stack>
          </Paper>

          {/* Sign In/Up */}
          <Paper p="lg" withBorder radius="md" ta="center" mt="lg">
            <Stack gap="md">
              <Text fw={500} size="lg">Ready to get involved?</Text>
              <Text c="dimmed">
                Sign in to access your personalized dashboard and connect with the community
              </Text>
              <Button 
                size="md"
                variant="outline"
                radius="xl"
                onClick={() => setAuthModalOpened(true)}
              >
                Sign In / Create Account
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      {/* Auth Modal */}
      <AuthModal
        opened={authModalOpened}
        onClose={() => setAuthModalOpened(false)}
        callbackUrl="/"
        title="Welcome to Funding the Commons"
        subtitle="Join our community of builders, funders, and impact creators"
      />
    </main>
  );
}
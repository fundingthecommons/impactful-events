import Link from "next/link";
import { Container, Card, Stack, Text, Group, Button } from "@mantine/core";
import { IconCalendarX, IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";

export default function ApplicationClosedMessage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl" align="center">
        {/* Main Closure Card */}
        <Card 
          p="xl" 
          radius="lg" 
          withBorder 
          className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 max-w-2xl w-full"
        >
          <Stack gap="xl" align="center">
            {/* Icon */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-full p-6">
              <IconCalendarX size={48} color="white" />
            </div>

            {/* Heading */}
            <Stack gap="sm" align="center">
              <Text size="xl" fw={700} ta="center" className="text-gray-800">
                Applications are Currently Closed
              </Text>
              <Text size="md" c="dimmed" ta="center">
                FtC RealFi Residency • Buenos Aires 2025
              </Text>
            </Stack>

            {/* Message */}
            <Stack gap="md">
              <Text size="md" ta="center" className="text-gray-700">
                Thank you for your interest in the Funding the Commons RealFi Residency. 
                The application period has ended and we are no longer accepting new applications.
              </Text>
              
              <Card p="md" radius="md" className="bg-blue-50 border border-blue-200">
                <Group gap="sm">
                  <IconInfoCircle size={20} className="text-blue-600" />
                  <Text size="sm" className="text-blue-800">
                    Stay tuned for announcements about future residency programs and opportunities.
                  </Text>
                </Group>
              </Card>
            </Stack>

            {/* Action Buttons */}
            <Group gap="md" mt="md">
              <Button
                component={Link}
                href="/events/funding-commons-residency-2025"
                leftSection={<IconArrowLeft size={16} />}
                variant="filled"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="md"
              >
                Back to Residency Overview
              </Button>
              
              <Button
                component={Link}
                href="/events"
                variant="light"
                color="gray"
                size="md"
              >
                Browse Other Events
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Additional Info */}
        <Card p="lg" radius="md" withBorder className="bg-gradient-to-r from-blue-50 to-purple-50 max-w-2xl w-full">
          <Stack gap="md">
            <Text size="lg" fw={600} className="text-blue-900">
              About the RealFi Residency
            </Text>
            <Text size="sm" className="text-blue-700">
              This 8-week intensive program brings together builders, researchers, and entrepreneurs 
              to develop real-world blockchain applications that solve everyday problems for 
              Argentinians. The residency combines hands-on development, mentorship, and 
              collaboration in Buenos Aires.
            </Text>
            <Group gap="md" mt="sm">
              <Button
                component={Link}
                href="/events/funding-commons-residency-2025/about"
                variant="light"
                color="blue"
                size="sm"
              >
                Learn More
              </Button>
              <Button
                component={Link}
                href="/events/funding-commons-residency-2025/faq"
                variant="light"
                color="purple"
                size="sm"
              >
                View FAQ
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
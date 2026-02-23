import { Stack, Title, Text, Group, Button, Anchor, Card } from "@mantine/core";
import { IconCalendar, IconExternalLink } from "@tabler/icons-react";
import Image from "next/image";

interface EventHeroProps {
  eventName?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function EventHero({ 
  eventName = "Intelligence at the Frontier",
  startDate,
  endDate 
}: EventHeroProps) {
  return (
    <Stack gap="xl" className="max-w-4xl mx-auto">
      {/* Hero Title Section */}
      <Stack gap="md">
        <Title 
          order={1} 
          fw={700}
          style={{ 
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.2,
            letterSpacing: "-0.02em"
          }}
        >
          Welcome to Intelligence at the Frontier
        </Title>
        
        <Group gap="xs" className="items-center">
          <IconCalendar size={18} className="text-gray-500" />
          <Text size="lg" c="dimmed" fw={500}>
            March 14, 2026 – March 15, 2026
          </Text>
        </Group>
      </Stack>

      {/* Event Details Card */}
      <Card 
        withBorder 
        radius="md" 
        p="xl"
        className="border-2"
      >
        <Stack gap="lg">
          {/* Event Info */}
          <Stack gap="xs">
            <Text size="xl" fw={600} c="blue">
              Intelligence @ The Frontier
            </Text>
            <Text size="md" c="dimmed">
              San Francisco | March 14-15, 2026
            </Text>
          </Stack>

          {/* Register Button */}
          <Button
            component="a"
            href="https://luma.com/ftc-sf-2026"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            radius="md"
            rightSection={<IconExternalLink size={18} />}
            className="w-fit"
          >
            REGISTER NOW
          </Button>

          {/* Banner Image */}
          <div className="relative w-full overflow-hidden rounded-md">
            <Image
              src="/images/iatf-banner.jpg"
              alt="Intelligence at the Frontier banner"
              width={1200}
              height={600}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Main Question */}
          <Title 
            order={2} 
            fw={600}
            style={{ 
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              lineHeight: 1.3
            }}
            mt="md"
          >
            How do we design for human flourishing in the age of AI?
          </Title>

          {/* Event Description */}
          <Text size="md" style={{ lineHeight: 1.7 }}>
            A two-day vertical festival to prototype the funding, governance, and 
            coordination systems humanity needs before superintelligence arrives.
          </Text>

          {/* The Event Section */}
          <Stack gap="md" mt="lg">
            <Title order={3} fw={600} size="h3">
              The Event
            </Title>
            
            <Stack gap="md">
              <Text size="md" style={{ lineHeight: 1.7 }}>
                For centuries, intelligence was a biological accident.
              </Text>
              
              <Text size="md" style={{ lineHeight: 1.7 }}>
                Now it's becoming a resource we mine and refine.
              </Text>
              
              <Text size="md" style={{ lineHeight: 1.7 }}>
                Will we treat this new intelligence like oil, or like a garden?
              </Text>
              
              <Text size="md" style={{ lineHeight: 1.7 }}>
                We convene to map and prototype the coordination systems we need today 
                to ensure AI serves human flourishing tomorrow.
              </Text>
              
              <Text size="lg" fw={500} mt="md" style={{ lineHeight: 1.7 }}>
                Six floors. Hundreds of sessions. One living experiment in coordination.
              </Text>
            </Stack>
          </Stack>

          {/* Additional Resources */}
          <Card withBorder radius="sm" p="md" mt="lg" bg="gray.0">
            <Text size="sm" style={{ lineHeight: 1.7 }}>
              In the meantime, check out the{" "}
              <Anchor 
                href="https://www.fundingthecommons.io/ftc-frontiertower" 
                target="_blank"
                rel="noopener noreferrer"
                fw={500}
              >
                Funding the Commons IatF website
              </Anchor>
              , follow{" "}
              <Anchor 
                href="https://x.com/fundingcommons" 
                target="_blank"
                rel="noopener noreferrer"
                fw={500}
              >
                FtC
              </Anchor>
              {" "}and{" "}
              <Anchor 
                href="https://x.com/frontiertower" 
                target="_blank"
                rel="noopener noreferrer"
                fw={500}
              >
                Frontier Tower
              </Anchor>
              {" "}on Twitter/X for updates, and register your ticket on{" "}
              <Anchor 
                href="https://luma.com/ftc-sf-2026" 
                target="_blank"
                rel="noopener noreferrer"
                fw={500}
              >
                Luma
              </Anchor>
              .
            </Text>
          </Card>
        </Stack>
      </Card>
    </Stack>
  );
}

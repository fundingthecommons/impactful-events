"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Box,
  ThemeIcon,
  Badge,
  Divider,
  Anchor,
  List,
  Progress,
  Button,
  Tooltip,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconUsers,
  IconBriefcase,
  IconActivity,
  IconThumbUp,
  IconSparkles,
  IconChartBar,
  IconCalendar,
  IconMapPin,
  IconTrendingUp,
  IconMessage,
  IconWorld,
  IconCode,
  IconDownload,
  IconFileTypePdf,
  IconGitBranch,
  IconClock,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function FundingCommonsResidency2025Report() {
  const handleDownloadPDF = () => {
    window.print();
  };

  // Fetch focus areas distribution
  const { data: focusAreasData, isLoading: loadingFocusAreas } = api.project.getFocusAreasDistribution.useQuery({
    eventId: "funding-commons-residency-2025",
  });

  // Real data from database
  const stats = [
    { value: "33", label: "Residents", subtitle: "Accepted to residency", icon: IconUsers, color: "violet" },
    { value: "42", label: "Projects", subtitle: "Active projects", icon: IconBriefcase, color: "blue" },
    { value: "119", label: "Updates", subtitle: "Project updates shared", icon: IconActivity, color: "teal" },
    { value: "77", label: "Likes", subtitle: "Community engagement", icon: IconThumbUp, color: "pink" },
  ];

  const additionalStats = [
    { value: "18", label: "Projects with Metrics", subtitle: "Tracking impact", icon: IconChartBar, color: "cyan" },
    { value: "92", label: "Total Metrics", subtitle: "Data points tracked", icon: IconTrendingUp, color: "grape" },
    { value: "TBD", label: "Projects Still Active", subtitle: "% with recent GitHub activity", icon: IconGitBranch, color: "green" },
    { value: "TBD", label: "Avg. Weeks Active", subtitle: "GitHub activity duration", icon: IconClock, color: "blue" },
  ];

  const programHighlights = [
    "3-week intensive residency program",
    "Focused on public goods funding and web3 infrastructure",
    "Buenos Aires, Argentina (October 24 - November 14, 2025)",
    "Hands-on project development and mentorship",
  ];

  // Project categories will be populated from API data
  const projectCategories = focusAreasData?.distribution.map(d => ({
    category: d.area,
    count: d.count,
  })) ?? [];

  const sponsors = [
    { name: "Protocol Labs", url: "https://protocol.ai", tier: "Lead Sponsor" },
    { name: "NEAR", url: "https://near.org", tier: "Major Sponsor" },
    { name: "Stellar", url: "https://stellar.org", tier: "Major Sponsor" },
    { name: "Octant", url: "https://octant.app", tier: "Sponsor" },
    { name: "Human Tech", url: "https://human.tech", tier: "Sponsor" },
    { name: "Logos", url: "https://logos.co", tier: "Sponsor" },
    { name: "Drips", url: "https://drips.network", tier: "Sponsor" },
  ];

  const keyOutcomes = [
    "42 projects actively developed during residency",
    "43% of projects (18/42) implemented measurable impact metrics",
    "119 project updates documenting progress and learnings",
    "Strong community engagement with 77 likes across updates",
    "21 asks & offers facilitating resident collaboration",
  ];

  const programStructure = [
    {
      phase: "Week 1: Foundation",
      description: "Onboarding, team formation, and project scoping",
      activities: ["Welcome sessions", "Mentor introductions", "Initial project pitches", "Workshop sessions"],
    },
    {
      phase: "Week 2: Development",
      description: "Intensive building, collaboration, and iteration",
      activities: ["Daily standups", "Technical workshops", "One-on-one mentoring", "Mid-program check-ins"],
    },
    {
      phase: "Week 3: Launch",
      description: "Finalization, presentations, and community showcase",
      activities: ["Project demos", "Impact measurement", "Community presentations", "Next steps planning"],
    },
  ];

  return (
    <Box className="bg-theme-gradient" style={{ minHeight: "100vh" }}>
      <Container size="xl" py={60}>
        {/* Header Section */}
        <Stack gap="xl" mb={60}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
                Impact Report
              </Text>
              <Title order={1} size={56} fw={900} mb="md" style={{ lineHeight: 1.1 }}>
                Funding the Commons
              </Title>
              <Group gap="md" align="center" mb="md">
                <Title order={2} size={32} fw={600} c="dimmed">
                  Residency 2025
                </Title>
                <Badge size="lg" variant="light" color="blue" leftSection={<IconMapPin size={14} />}>
                  Buenos Aires
                </Badge>
                <Badge size="lg" variant="light" color="violet" leftSection={<IconCalendar size={14} />}>
                  Oct 24 - Nov 14
                </Badge>
              </Group>
            </Box>

            {/* PDF Download Button */}
            <Box className="no-print">
              <Tooltip label="Download as PDF" position="left">
                <Button
                  leftSection={<IconFileTypePdf size={20} />}
                  rightSection={<IconDownload size={16} />}
                  variant="filled"
                  color="blue"
                  size="lg"
                  onClick={handleDownloadPDF}
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  Download PDF
                </Button>
              </Tooltip>
            </Box>
          </Group>

          {/* Key Stats Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" className="stats-grid">
            {stats.map((stat, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-${stat.color}-0) 0%, var(--mantine-color-${stat.color}-1) 100%)`,
                  border: `2px solid var(--mantine-color-${stat.color}-2)`,
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <ThemeIcon size={48} radius="md" variant="light" color={stat.color}>
                      <stat.icon size={28} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text size="3xl" fw={900} lh={1} c={stat.color}>
                      {stat.value}
                    </Text>
                    <Text size="sm" fw={600} mt={8}>
                      {stat.label}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {stat.subtitle}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Description */}
          <Paper p="xl" radius="lg" withBorder>
            <Text size="lg" fw={500} style={{ lineHeight: 1.6 }}>
              A three-week intensive residency program bringing together 33 builders, researchers, and funders to
              develop projects advancing public goods funding, web3 infrastructure, and decentralized governance.
              Set in Buenos Aires during October-November 2025, the program fostered collaboration, learning, and
              meaningful impact in the Funding the Commons ecosystem.
            </Text>
          </Paper>
        </Stack>

        {/* Program Highlights */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Highlights
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" className="highlights-grid">
            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="blue">
                  <IconSparkles size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Key Features
                </Title>
              </Group>
              <List spacing="md" size="sm">
                {programHighlights.map((highlight, index) => (
                  <List.Item key={index}>{highlight}</List.Item>
                ))}
              </List>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="teal">
                  <IconChartBar size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Key Outcomes
                </Title>
              </Group>
              <List spacing="md" size="sm">
                {keyOutcomes.map((outcome, index) => (
                  <List.Item key={index}>{outcome}</List.Item>
                ))}
              </List>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Additional Stats */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Metrics
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" className="stats-grid">
            {additionalStats.map((stat, index) => (
              <Paper
                key={index}
                p="lg"
                radius="md"
                withBorder
                style={{
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md" align="center">
                  <ThemeIcon size={56} radius="md" variant="light" color={stat.color}>
                    <stat.icon size={32} />
                  </ThemeIcon>
                  <Box style={{ textAlign: "center" }}>
                    <Text size="2xl" fw={900} c={stat.color}>
                      {stat.value}
                    </Text>
                    <Text size="sm" fw={600} mt={4}>
                      {stat.label}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {stat.subtitle}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Program Structure */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Structure
          </Title>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" className="program-grid">
            {programStructure.map((phase, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-blue-${6 + index}) 0%, var(--mantine-color-violet-${6 + index}) 100%)`,
                  border: "2px solid var(--mantine-color-blue-5)",
                }}
              >
                <Stack gap="md">
                  <Badge size="lg" variant="filled" color="cyan">
                    {phase.phase}
                  </Badge>
                  <Text size="md" fw={600} c="white">
                    {phase.description}
                  </Text>
                  <Divider color="rgba(255,255,255,0.3)" />
                  <List spacing="xs" size="sm" c="white">
                    {phase.activities.map((activity, actIndex) => (
                      <List.Item key={actIndex}>{activity}</List.Item>
                    ))}
                  </List>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Focus Areas */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Focus Areas
          </Title>

          <Paper p="xl" radius="lg" withBorder>
            {loadingFocusAreas ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : projectCategories.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No focus areas data available yet. Run the categorization script to populate this section.
              </Text>
            ) : (
              <>
                <Text size="sm" c="dimmed" mb="xl">
                  Distribution of {focusAreasData?.projectsWithFocusAreas ?? 0} projects across {projectCategories.length} focus areas
                </Text>
                <Stack gap="lg">
                  {projectCategories.map((cat, index) => (
                    <Box key={index}>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={500}>
                          {cat.category}
                        </Text>
                        <Badge variant="light" color="blue">
                          {cat.count} {cat.count === 1 ? 'project' : 'projects'}
                        </Badge>
                      </Group>
                      <Progress
                        value={(cat.count / (focusAreasData?.totalProjects ?? 1)) * 100}
                        size="lg"
                        radius="md"
                        striped
                        animated
                        color="blue"
                        styles={{
                          root: { backgroundColor: "var(--mantine-color-gray-2)" },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        </Stack>

        {/* Impact Metrics Detail */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Impact & Engagement
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" className="highlights-grid">
            <Paper
              p="xl"
              radius="lg"
              style={{
                background: "linear-gradient(135deg, var(--mantine-color-grape-0) 0%, var(--mantine-color-violet-0) 100%)",
                border: "2px solid var(--mantine-color-grape-3)",
              }}
            >
              <Stack gap="md">
                <Group>
                  <ThemeIcon size={48} radius="md" variant="light" color="grape">
                    <IconChartBar size={28} />
                  </ThemeIcon>
                  <Title order={3} size={20} fw={600}>
                    Metrics Tracking
                  </Title>
                </Group>
                <Text size="lg" fw={700} c="grape">
                  43% of projects tracking metrics
                </Text>
                <Text size="sm" c="dimmed">
                  18 out of 42 projects implemented measurable impact metrics to track their progress and outcomes.
                  Teams defined KPIs ranging from user adoption to transaction volume to community growth.
                </Text>
                <Divider />
                <Group gap="xl">
                  <Box>
                    <Text size="xl" fw={900} c="grape">
                      92
                    </Text>
                    <Text size="xs" c="dimmed">
                      Total data points
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xl" fw={900} c="grape">
                      5.1
                    </Text>
                    <Text size="xs" c="dimmed">
                      Avg metrics per project
                    </Text>
                  </Box>
                </Group>
              </Stack>
            </Paper>

            <Paper
              p="xl"
              radius="lg"
              style={{
                background: "linear-gradient(135deg, var(--mantine-color-pink-0) 0%, var(--mantine-color-orange-0) 100%)",
                border: "2px solid var(--mantine-color-pink-3)",
              }}
            >
              <Stack gap="md">
                <Group>
                  <ThemeIcon size={48} radius="md" variant="light" color="pink">
                    <IconMessage size={28} />
                  </ThemeIcon>
                  <Title order={3} size={20} fw={600}>
                    Community Activity
                  </Title>
                </Group>
                <Text size="lg" fw={700} c="pink">
                  Active collaboration & sharing
                </Text>
                <Text size="sm" c="dimmed">
                  Residents actively shared progress through 119 project updates, received community feedback via 77
                  likes, and facilitated collaboration through 21 asks & offers posted on the platform.
                </Text>
                <Divider />
                <Group gap="xl">
                  <Box>
                    <Text size="xl" fw={900} c="pink">
                      2.8
                    </Text>
                    <Text size="xs" c="dimmed">
                      Updates per project
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xl" fw={900} c="pink">
                      476
                    </Text>
                    <Text size="xs" c="dimmed">
                      Program communications
                    </Text>
                  </Box>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Geographic & Demographic Data */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Participant Profile
          </Title>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" className="program-grid">
            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="blue">
                  <IconWorld size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Geographic Reach
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Residents from diverse regions globally
              </Text>
              <Badge size="xl" variant="light" color="blue">
                ? Countries
              </Badge>
              <Text size="xs" c="dimmed" mt="md">
                * Detailed geographic data being compiled
              </Text>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="violet">
                  <IconUsers size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Participant Roles
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Mix of builders, researchers, and funders
              </Text>
              <Stack gap="xs">
                <Badge variant="light" color="violet">
                  Builders: ?%
                </Badge>
                <Badge variant="light" color="blue">
                  Researchers: ?%
                </Badge>
                <Badge variant="light" color="pink">
                  Funders: ?%
                </Badge>
              </Stack>
              <Text size="xs" c="dimmed" mt="md">
                * Role distribution analysis in progress
              </Text>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="teal">
                  <IconCode size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Technical Focus
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Primary technical domains
              </Text>
              <Stack gap="xs">
                <Badge variant="light" color="teal">
                  Web3 & Blockchain
                </Badge>
                <Badge variant="light" color="cyan">
                  Public Goods
                </Badge>
                <Badge variant="light" color="indigo">
                  DeFi & Finance
                </Badge>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Sponsors Section */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Sponsors
          </Title>

          <Paper p="xl" radius="lg" withBorder>
            <Text size="sm" c="dimmed" mb="xl">
              7 sponsors made this residency possible
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" className="program-grid">
              {sponsors.map((sponsor, index) => (
                <Paper key={index} p="lg" radius="md" withBorder className="hover-lift">
                  <Stack gap="sm">
                    <Badge variant="light" color="blue" size="sm">
                      {sponsor.tier}
                    </Badge>
                    <Anchor href={sponsor.url} target="_blank" size="md" fw={600}>
                      {sponsor.name}
                    </Anchor>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Paper>
        </Stack>

        {/* Call to Action */}
        <Paper
          p={60}
          radius="lg"
          mb={60}
          style={{
            background: "linear-gradient(135deg, var(--mantine-color-indigo-6) 0%, var(--mantine-color-violet-6) 100%)",
          }}
        >
          <Stack gap="lg">
            <Title order={2} size={36} fw={700} c="white">
              Explore the Impact
            </Title>
            <Text size="lg" c="white" style={{ lineHeight: 1.6 }}>
              Dive deeper into the projects, metrics, and community activities from the Funding the Commons
              Residency 2025. Visit the interactive impact dashboard to see real-time updates, browse resident
              profiles, and explore the hyperboards showcasing our community.
            </Text>
            <Group gap="xl" mt="md">
              <Anchor
                component={Link}
                href="/events/funding-commons-residency-2025/impact"
                c="white"
                fw={600}
                size="lg"
                style={{ textDecoration: "underline" }}
              >
                View Interactive Dashboard →
              </Anchor>
              <Anchor
                component={Link}
                href="/events/funding-commons-residency-2025/projects"
                c="white"
                fw={600}
                size="lg"
                style={{ textDecoration: "underline" }}
              >
                Browse Projects →
              </Anchor>
            </Group>
          </Stack>
        </Paper>

        {/* Footer Note */}
        <Paper p="lg" radius="md" withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <strong>Note:</strong> This impact report reflects data collected during and immediately after the
            residency program. Some metrics marked with &ldquo;?&rdquo; are still being compiled and will be updated
            as comprehensive analysis continues. For the most current statistics, please visit the{" "}
            <Anchor component={Link} href="/events/funding-commons-residency-2025/impact">
              live impact dashboard
            </Anchor>
            .
          </Text>
        </Paper>

        {/* Custom Styles */}
        <style jsx>{`
          :global(.hover-lift) {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          :global(.hover-lift:hover) {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }

          /* Print Styles for PDF Export */
          @media print {
            :global(.no-print) {
              display: none !important;
            }
            :global(body) {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            :global(.hover-lift) {
              box-shadow: none !important;
              transform: none !important;
            }

            /* Force grid layouts to maintain structure in print */
            :global(.stats-grid) {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 1rem !important;
            }

            :global(.program-grid) {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 1rem !important;
            }

            :global(.highlights-grid) {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1.5rem !important;
            }

            /* Prevent page breaks inside cards */
            :global(.hover-lift),
            :global([class*="Paper"]) {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Optimize page layout */
            :global(h1),
            :global(h2),
            :global(h3) {
              page-break-after: avoid;
              break-after: avoid;
            }
          }
        `}</style>
      </Container>
    </Box>
  );
}

"use client";


import {
  Container,
  Grid,
  Card,
  Avatar,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Title,
  Divider,
  ActionIcon,
  Box,
  Loader,
  Center,
  Alert,
  Paper,
  Tooltip,
  Image,
  SimpleGrid,
} from "@mantine/core";
import {
  IconMapPin,
  IconBriefcase,
  IconClock,
  IconHeart,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
  IconEdit,
  IconExternalLink,
  IconCode,
  IconLanguage,
  IconCalendar,
  IconArrowLeft,
  IconStar,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";

interface ProfileDisplayClientProps {
  userId: string;
}

export function ProfileDisplayClient({ userId }: ProfileDisplayClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: profileData, isLoading, error } = api.profile.getProfile.useQuery({ userId });
  const { data: projectUpdates = [] } = api.project.getUserProjectUpdates.useQuery({ userId });

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error ?? !profileData?.user) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Profile Not Found">
          The requested profile could not be found.
        </Alert>
      </Container>
    );
  }

  const { user, ...profile } = profileData;
  const isOwnProfile = session?.user?.id === userId;

  const getSocialLink = (url: string, type: 'github' | 'linkedin' | 'twitter' | 'website', label: string) => (
    <ActionIcon
      component="a"
      href={url}
      target="_blank"
      variant="light"
      size="lg"
      color="blue"
      title={`Visit ${label}`}
    >
      {type === 'github' && <IconBrandGithub size={20} />}
      {type === 'linkedin' && <IconBrandLinkedin size={20} />}
      {type === 'twitter' && <IconBrandTwitter size={20} />}
      {type === 'website' && <IconWorld size={20} />}
    </ActionIcon>
  );

  return (
    <Container size="lg" py="xl">
      {/* Back button */}
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="xl"
        onClick={() => router.back()}
      >
        Back to Directory
      </Button>

      <Grid gutter="xl">
        {/* Profile Header */}
        <Grid.Col span={12}>
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Group align="flex-start" gap="xl">
              <Avatar
                src={user.image}
                size={120}
                radius="md"
              />
              
              <Box style={{ flex: 1 }}>
                <Group justify="space-between" align="flex-start" mb="md">
                  <div>
                    <Title order={1} mb="xs">
                      {user.name ?? "Unnamed User"}
                    </Title>
                    {profile?.jobTitle && (
                      <Text size="lg" c="dimmed" mb="xs">
                        {profile.jobTitle}
                        {profile.company && ` at ${profile.company}`}
                      </Text>
                    )}
                    {profile?.location && (
                      <Group gap={4} mb="md">
                        <IconMapPin size={16} />
                        <Text size="sm" c="dimmed">
                          {profile.location}
                        </Text>
                      </Group>
                    )}
                  </div>
                  
                  <Group gap="sm">
                    {isOwnProfile && (
                      <Button
                        component={Link}
                        href="/profile/edit"
                        leftSection={<IconEdit size={16} />}
                        variant="light"
                      >
                        Edit Profile
                      </Button>
                    )}
                  </Group>
                </Group>

                {/* Bio */}
                {profile?.bio && (
                  <Text mb="md" size="sm" style={{ lineHeight: 1.6 }}>
                    {profile.bio}
                  </Text>
                )}

                {/* Availability Badges */}
                <Group gap="sm" mb="md">
                  {profile?.availableForMentoring && (
                    <Badge
                      size="md"
                      variant="light"
                      color="green"
                      leftSection={<IconHeart size={14} />}
                    >
                      Available for Mentoring
                    </Badge>
                  )}
                  {profile?.availableForHiring && (
                    <Badge
                      size="md"
                      variant="light"
                      color="blue"
                      leftSection={<IconBriefcase size={14} />}
                    >
                      Open to Opportunities
                    </Badge>
                  )}
                  {profile?.availableForOfficeHours && (
                    <Badge
                      size="md"
                      variant="light"
                      color="orange"
                      leftSection={<IconClock size={14} />}
                    >
                      Office Hours Available
                    </Badge>
                  )}
                </Group>

                {/* Social Links */}
                <Group gap="sm">
                  {profile?.githubUrl && getSocialLink(profile.githubUrl, 'github', 'GitHub')}
                  {profile?.linkedinUrl && getSocialLink(profile.linkedinUrl, 'linkedin', 'LinkedIn')}
                  {profile?.twitterUrl && getSocialLink(profile.twitterUrl, 'twitter', 'Twitter')}
                  {profile?.website && getSocialLink(profile.website, 'website', 'Website')}
                </Group>
              </Box>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Skills & Interests */}
          {(profile?.skills?.length ?? 0) > 0 && (
            <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
              <Group gap="sm" mb="md">
                <IconCode size={20} />
                <Title order={3}>Skills & Expertise</Title>
              </Group>
              <Group gap="xs">
                {profile.skills.map((skill: string) => (
                  <Badge key={skill} size="md" variant="light">
                    {skill}
                  </Badge>
                ))}
              </Group>
            </Card>
          )}

          {(profile?.interests?.length ?? 0) > 0 && (
            <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
              <Title order={3} mb="md">Interests</Title>
              <Group gap="xs">
                {profile.interests.map((interest: string) => (
                  <Badge key={interest} size="md" variant="outline">
                    {interest}
                  </Badge>
                ))}
              </Group>
            </Card>
          )}

          {/* Projects */}
          {profile?.projects && profile.projects.length > 0 && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">Featured Projects</Title>
              <Stack gap="md">
                {profile.projects.map((project) => (
                  <Paper key={project.id} p="sm" withBorder>
                    <Group justify="space-between" align="flex-start" gap="md">
                      {project.imageUrl && (
                        <Image
                          src={project.imageUrl}
                          alt={project.title}
                          w={60}
                          h={60}
                          fit="cover"
                          radius="md"
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" align="center">
                          <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
                            {project.title}
                          </Text>
                          {project.featured && (
                            <Tooltip label="Featured project">
                              <IconStar size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                            </Tooltip>
                          )}
                        </Group>
                        {project.description && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {project.description}
                          </Text>
                        )}
                      </div>
                      <Group gap="xs" style={{ flexShrink: 0 }}>
                        {project.liveUrl && (
                          <Tooltip label="View Live Demo">
                            <ActionIcon
                              variant="light"
                              size="sm"
                              onClick={() => window.open(project.liveUrl!, '_blank')}
                            >
                              <IconExternalLink size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {project.githubUrl && (
                          <Tooltip label="View Source">
                            <ActionIcon
                              variant="light"
                              size="sm"
                              onClick={() => window.open(project.githubUrl!, '_blank')}
                            >
                              <IconBrandGithub size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}

          {/* Project Updates Feed */}
          {projectUpdates.length > 0 && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">Project Updates</Title>
              <Stack gap="md">
                {projectUpdates.map((update) => (
                  <Paper key={update.id} p="md" withBorder>
                    <Stack gap="sm">
                      {/* Update Header */}
                      <Group justify="space-between" align="flex-start">
                        <Group gap="xs" align="center">
                          {update.project.imageUrl && (
                            <Image
                              src={update.project.imageUrl}
                              alt={update.project.title}
                              w={32}
                              h={32}
                              fit="cover"
                              radius="sm"
                              style={{ flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <Text fw={500} size="sm" lineClamp={1}>
                              {update.title}
                            </Text>
                            <Group gap={4}>
                              <Text
                                size="xs"
                                c="blue"
                                component={Link}
                                href={`/events/funding-commons-residency-2025/projects/${update.project.id}`}
                                style={{ textDecoration: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {update.project.title}
                              </Text>
                              {update.weekNumber && (
                                <>
                                  <Text size="xs" c="dimmed">•</Text>
                                  <Badge size="xs" variant="light">
                                    Week {update.weekNumber}
                                  </Badge>
                                </>
                              )}
                            </Group>
                          </div>
                        </Group>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          {getRelativeTime(update.createdAt)}
                        </Text>
                      </Group>

                      {/* Update Content */}
                      <Box>
                        <MarkdownRenderer content={update.content} />
                      </Box>

                      {/* Update Images */}
                      {update.imageUrls.length > 0 && (
                        <SimpleGrid
                          cols={{ base: 1, sm: update.imageUrls.length === 1 ? 1 : 2 }}
                          spacing="xs"
                        >
                          {update.imageUrls.slice(0, 4).map((url, idx) => (
                            <Image
                              key={idx}
                              src={url}
                              alt={`Update image ${idx + 1}`}
                              radius="sm"
                              style={{
                                width: "100%",
                                height: update.imageUrls.length === 1 ? "auto" : "150px",
                                objectFit: "cover",
                                maxHeight: update.imageUrls.length === 1 ? "300px" : "150px"
                              }}
                            />
                          ))}
                        </SimpleGrid>
                      )}

                      {/* Update Tags */}
                      {update.tags.length > 0 && (
                        <Group gap="xs">
                          {update.tags.map((tag, idx) => (
                            <Badge key={idx} size="xs" variant="dot">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      )}

                      {/* Like Count */}
                      {update.likes.length > 0 && (
                        <Group gap={4}>
                          <IconHeart size={14} style={{ color: 'var(--mantine-color-red-6)' }} />
                          <Text size="xs" c="dimmed">
                            {update.likes.length} {update.likes.length === 1 ? 'like' : 'likes'}
                          </Text>
                        </Group>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {/* Additional Info */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Details</Title>
            <Stack gap="md">
              {profile?.yearsOfExperience && (
                <Group gap="sm">
                  <IconCalendar size={16} />
                  <div>
                    <Text size="sm" fw={500}>Experience</Text>
                    <Text size="xs" c="dimmed">
                      {profile.yearsOfExperience} years
                    </Text>
                  </div>
                </Group>
              )}

              {profile?.timezone && (
                <Group gap="sm">
                  <IconClock size={16} />
                  <div>
                    <Text size="sm" fw={500}>Timezone</Text>
                    <Text size="xs" c="dimmed">
                      {profile.timezone}
                    </Text>
                  </div>
                </Group>
              )}

              {(profile?.languages?.length ?? 0) > 0 && (
                <Group gap="sm" align="flex-start">
                  <IconLanguage size={16} />
                  <div>
                    <Text size="sm" fw={500}>Languages</Text>
                    <Text size="xs" c="dimmed">
                      {profile.languages.join(", ")}
                    </Text>
                  </div>
                </Group>
              )}

              {/* Contact Methods */}
              {(profile?.telegramHandle ?? profile?.discordHandle) && (
                <>
                  <Divider />
                  <div>
                    <Text size="sm" fw={500} mb="xs">Contact</Text>
                    <Stack gap="xs">
                      {profile.telegramHandle && (
                        <Text size="xs" c="dimmed">
                          Telegram: @{profile.telegramHandle}
                        </Text>
                      )}
                      {profile.discordHandle && (
                        <Text size="xs" c="dimmed">
                          Discord: {profile.discordHandle}
                        </Text>
                      )}
                    </Stack>
                  </div>
                </>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
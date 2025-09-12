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
  SimpleGrid,
  Paper,
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
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ProfileDisplayClientProps {
  userId: string;
}

export function ProfileDisplayClient({ userId }: ProfileDisplayClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: profileData, isLoading, error } = api.profile.getProfile.useQuery({ userId });

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
              <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="md">
                {profile.projects.map((project) => (
                  <Paper key={project.id} p="md" withBorder radius="md">
                    <Group justify="space-between" align="flex-start" mb="sm">
                      <Title order={4}>{project.title}</Title>
                      <Group gap="xs">
                        {project.githubUrl && (
                          <ActionIcon
                            component="a"
                            href={project.githubUrl}
                            target="_blank"
                            variant="light"
                            size="sm"
                          >
                            <IconBrandGithub size={16} />
                          </ActionIcon>
                        )}
                        {project.liveUrl && (
                          <ActionIcon
                            component="a"
                            href={project.liveUrl}
                            target="_blank"
                            variant="light"
                            size="sm"
                          >
                            <IconExternalLink size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                    
                    {project.description && (
                      <Text size="sm" c="dimmed" mb="sm">
                        {project.description}
                      </Text>
                    )}
                    
                    {project.technologies.length > 0 && (
                      <Group gap={4}>
                        {project.technologies.map((tech: string) => (
                          <Badge key={tech} size="xs" variant="dot">
                            {tech}
                          </Badge>
                        ))}
                      </Group>
                    )}
                  </Paper>
                ))}
              </SimpleGrid>
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
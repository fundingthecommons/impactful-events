"use client";

import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  Container,
  Title,
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Group,
  Stack,
  Grid,
  Switch,
  TagsInput,
  Select,
  Loader,
  Box,
  Card,
  Text,
  Modal,
  Badge,
  Checkbox,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconArrowLeft, IconDownload, IconEye } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectManager } from "~/app/_components/ProjectManager";

const schema = z.object({
  bio: z.string().max(1000).optional(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  skills: z.array(z.string().max(50)).max(20).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  availableForMentoring: z.boolean().optional(),
  availableForHiring: z.boolean().optional(),
  availableForOfficeHours: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  telegramHandle: z.string().max(100).optional(),
  discordHandle: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof schema>;

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

export function ProfileEditClient() {
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: currentProfile, isLoading, refetch: refetchProfile } = api.profile.getMyProfile.useQuery();
  const updateProfile = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Profile Updated",
        message: "Your profile has been updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      if (currentProfile?.user?.id) {
        router.push(`/profiles/${currentProfile.user.id}`);
      }
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update profile",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const form = useForm<ProfileFormData>({
    validate: zodResolver(schema),
    initialValues: {
      bio: "",
      jobTitle: "",
      company: "",
      location: "",
      website: "",
      githubUrl: "",
      linkedinUrl: "",
      twitterUrl: "",
      skills: [],
      interests: [],
      availableForMentoring: false,
      availableForHiring: false,
      availableForOfficeHours: false,
      timezone: "",
      languages: [],
      yearsOfExperience: undefined,
      telegramHandle: "",
      discordHandle: "",
    },
  });

  // Initialize form when profile data loads
  useEffect(() => {
    if (currentProfile && !hasInitialized) {
      form.setValues({
        bio: currentProfile.bio ?? "",
        jobTitle: currentProfile.jobTitle ?? "",
        company: currentProfile.company ?? "",
        location: currentProfile.location ?? "",
        website: currentProfile.website ?? "",
        githubUrl: currentProfile.githubUrl ?? "",
        linkedinUrl: currentProfile.linkedinUrl ?? "",
        twitterUrl: currentProfile.twitterUrl ?? "",
        skills: currentProfile.skills ?? [],
        interests: currentProfile.interests ?? [],
        availableForMentoring: currentProfile.availableForMentoring ?? false,
        availableForHiring: currentProfile.availableForHiring ?? false,
        availableForOfficeHours: currentProfile.availableForOfficeHours ?? false,
        timezone: currentProfile.timezone ?? "",
        languages: currentProfile.languages ?? [],
        yearsOfExperience: currentProfile.yearsOfExperience ?? undefined,
        telegramHandle: currentProfile.telegramHandle ?? "",
        discordHandle: currentProfile.discordHandle ?? "",
      });
      setHasInitialized(true);
    }
  }, [currentProfile, hasInitialized, form]);

  const handleSubmit = (values: ProfileFormData) => {
    // Clean up empty strings and convert to undefined
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ])
    ) as ProfileFormData;

    updateProfile.mutate(cleanedValues);
  };

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Box ta="center">
          <Loader size="lg" />
          <Text mt="md">Loading your profile...</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="xl"
        component={Link}
        href={currentProfile?.user?.id ? `/profiles/${currentProfile.user.id}` : "/profile"}
      >
        Back to My Profile
      </Button>

      <Title order={1} mb="xl">
        Edit Your Profile
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Basic Information */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Basic Information
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Job Title"
                  placeholder="Software Engineer, Product Manager, etc."
                  {...form.getInputProps("jobTitle")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Company"
                  placeholder="Your current company"
                  {...form.getInputProps("company")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Bio"
                  placeholder="Tell others who you are, what you're working on, and what you're looking to connect around."
                  minRows={3}
                  maxRows={5}
                  {...form.getInputProps("bio")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Location"
                  placeholder="City, Country"
                  {...form.getInputProps("location")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Timezone"
                  placeholder="Select your timezone"
                  data={timezoneOptions}
                  searchable
                  clearable
                  {...form.getInputProps("timezone")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Professional Details */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Professional Details
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Years of Experience"
                  placeholder="How many years of professional experience?"
                  min={0}
                  max={50}
                  {...form.getInputProps("yearsOfExperience")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TagsInput
                  label="Languages"
                  placeholder="English, Spanish, French, etc."
                  {...form.getInputProps("languages")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TagsInput
                  label="Skills & Expertise"
                  placeholder="JavaScript, React, Product Strategy, etc."
                  description="Add your key skills and areas of expertise"
                  {...form.getInputProps("skills")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TagsInput
                  label="Interests"
                  placeholder="DeFi, AI/ML, Climate, etc."
                  description="What areas or topics are you interested in?"
                  {...form.getInputProps("interests")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Links & Contact */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Links & Contact
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Website"
                  placeholder="https://your-website.com"
                  {...form.getInputProps("website")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="GitHub"
                  placeholder="https://github.com/username"
                  {...form.getInputProps("githubUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/username"
                  {...form.getInputProps("linkedinUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Twitter/X"
                  placeholder="https://twitter.com/username"
                  {...form.getInputProps("twitterUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Telegram Handle"
                  placeholder="username (without @)"
                  {...form.getInputProps("telegramHandle")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Discord Handle"
                  placeholder="username#1234"
                  {...form.getInputProps("discordHandle")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Availability */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Availability
            </Title>
            <Stack gap="sm">
              <Switch
                label="Available for Mentoring"
                description="I'm open to mentoring others in my areas of expertise"
                {...form.getInputProps("availableForMentoring", { type: "checkbox" })}
              />
              <Switch
                label="Open to Opportunities"
                description="I'm open to hearing about new job opportunities"
                {...form.getInputProps("availableForHiring", { type: "checkbox" })}
              />
              <Switch
                label="Office Hours Available"
                description="I offer regular office hours for community members"
                {...form.getInputProps("availableForOfficeHours", { type: "checkbox" })}
              />
            </Stack>
          </Card>

          {/* Application Import Section */}
          <ApplicationImportSection onImportComplete={() => {
            void refetchProfile();
            // Reload current values into form
            if (currentProfile) {
              form.setValues({
                bio: currentProfile.bio ?? "",
                jobTitle: currentProfile.jobTitle ?? "",
                company: currentProfile.company ?? "",
                location: currentProfile.location ?? "",
                website: currentProfile.website ?? "",
                githubUrl: currentProfile.githubUrl ?? "",
                linkedinUrl: currentProfile.linkedinUrl ?? "",
                twitterUrl: currentProfile.twitterUrl ?? "",
                skills: currentProfile.skills ?? [],
                interests: currentProfile.interests ?? [],
                availableForMentoring: currentProfile.availableForMentoring ?? false,
                availableForHiring: currentProfile.availableForHiring ?? false,
                availableForOfficeHours: currentProfile.availableForOfficeHours ?? false,
                timezone: currentProfile.timezone ?? "",
                languages: currentProfile.languages ?? [],
                yearsOfExperience: currentProfile.yearsOfExperience ?? undefined,
                telegramHandle: currentProfile.telegramHandle ?? "",
                discordHandle: currentProfile.discordHandle ?? "",
              });
            }
          }} />

          {/* Projects Section */}
          {currentProfile && (
            <ProjectManager
              projects={currentProfile.projects ?? []}
              onProjectsChange={() => void refetchProfile()}
            />
          )}

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button
              variant="light"
              component={Link}
              href={currentProfile?.user?.id ? `/profiles/${currentProfile.user.id}` : "/profile"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateProfile.isPending}
              leftSection={<IconCheck size={16} />}
            >
              Save Profile
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}

interface ApplicationImportSectionProps {
  onImportComplete: () => void;
}

function ApplicationImportSection({ onImportComplete }: ApplicationImportSectionProps) {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const { data: applications, isLoading } = api.profile.getUserApplicationsForSync.useQuery();
  const { data: previewData, isLoading: previewLoading } = api.profile.previewApplicationSync.useQuery(
    { applicationId: selectedAppId! },
    { enabled: !!selectedAppId }
  );

  const syncMutation = api.profile.syncFromApplication.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Import Successful",
        message: `Successfully imported ${data.syncedFields.length} fields from your application`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setPreviewModalOpen(false);
      setSelectedAppId(null);
      setSelectedFields([]);
      onImportComplete();
    },
    onError: (error) => {
      notifications.show({
        title: "Import Failed",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handlePreview = (applicationId: string) => {
    setSelectedAppId(applicationId);
    setPreviewModalOpen(true);
  };

  const handleImport = () => {
    if (!selectedAppId || selectedFields.length === 0) return;
    
    syncMutation.mutate({
      applicationId: selectedAppId,
      fieldsToSync: selectedFields,
    });
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldName) 
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const selectAllSyncableFields = () => {
    if (!previewData) return;
    const syncableFields = Object.entries(previewData.syncableData)
      .filter(([, data]) => data.willSync)
      .map(([fieldName]) => fieldName);
    setSelectedFields(syncableFields);
  };

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Loader size="sm" />
        <Text mt="xs">Loading applications...</Text>
      </Card>
    );
  }

  if (!applications?.length) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} size="h3" mb="md">
          Import from Applications
        </Title>
        <Text c="dimmed">
          No applications available for import. Submit an application to an event to import application data.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} size="h3" mb="md">
          Import from Applications
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Import data from any of your submitted applications to automatically fill your profile fields.
          Each application can only be imported once to prevent data conflicts.
        </Text>

        <Stack gap="sm">
          {applications.map((app) => (
            <Box key={app.id} p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8 }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={500}>{app.event?.name}</Text>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "N/A"}
                    </Text>
                    <Badge 
                      size="sm" 
                      color={
                        app.status === "ACCEPTED" ? "green" :
                        app.status === "REJECTED" ? "red" :
                        app.status === "WAITLISTED" ? "orange" :
                        "blue"
                      }
                    >
                      {app.status.replace('_', ' ')}
                    </Badge>
                    {app.profileSyncs.length > 0 && (
                      <Badge size="sm" color="blue" variant="light">
                        Previously Synced
                      </Badge>
                    )}
                  </Group>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconEye size={14} />}
                  onClick={() => handlePreview(app.id)}
                  disabled={app.profileSyncs.length > 0}
                >
                  {app.profileSyncs.length > 0 ? "Already Imported" : "Preview Import"}
                </Button>
              </Group>
            </Box>
          ))}
        </Stack>
      </Card>

      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedAppId(null);
          setSelectedFields([]);
        }}
        title={
          <Group>
            <IconDownload size={20} />
            <Text fw={600}>Preview Application Import</Text>
          </Group>
        }
        size="lg"
      >
        {previewLoading ? (
          <Box ta="center" py="xl">
            <Loader size="lg" />
            <Text mt="md">Loading preview...</Text>
          </Box>
        ) : previewData ? (
          <Stack gap="md">
            <Box>
              <Text fw={500} mb="xs">{previewData.application.eventName}</Text>
              <Text size="sm" c="dimmed">
                Submitted: {previewData.application.submittedAt ? 
                  new Date(previewData.application.submittedAt).toLocaleDateString() : "N/A"}
              </Text>
              {previewData.hasBeenSynced && (
                <Badge color="blue" size="sm" mt="xs">
                  Previously Synced
                </Badge>
              )}
            </Box>

            <Divider />

            <div>
              <Group justify="space-between" mb="sm">
                <Text fw={500}>Available Fields</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={selectAllSyncableFields}
                  disabled={!Object.values(previewData.syncableData).some(d => d.willSync)}
                >
                  Select All Syncable
                </Button>
              </Group>

              <Stack gap="xs">
                {Object.entries(previewData.syncableData).map(([fieldName, data]) => (
                  <Box key={fieldName} p="xs" bg={data.willSync ? "gray.0" : "gray.1"} style={{ borderRadius: 4 }}>
                    <Group align="flex-start" gap="sm">
                      <Checkbox
                        checked={selectedFields.includes(fieldName)}
                        onChange={() => toggleField(fieldName)}
                        disabled={!data.willSync}
                        mt={2}
                      />
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb="xs">
                          <Text fw={500} size="sm">
                            {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                          </Text>
                          {data.willSync ? (
                            <Badge size="xs" color="green">Will Sync</Badge>
                          ) : (
                            <Badge size="xs" color="gray">Won&apos;t Sync</Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" mb="xs">{data.reason}</Text>
                        {data.applicationValue && (
                          <Text size="xs">
                            <strong>From Application:</strong> {Array.isArray(data.applicationValue) 
                              ? data.applicationValue.join(", ") 
                              : data.applicationValue}
                          </Text>
                        )}
                        {data.profileValue && (
                          <Text size="xs" c="dimmed">
                            <strong>Current Profile:</strong> {Array.isArray(data.profileValue) 
                              ? data.profileValue.join(", ") 
                              : String(data.profileValue)}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </div>

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setSelectedFields([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFields.length === 0}
                loading={syncMutation.isPending}
                leftSection={<IconDownload size={16} />}
              >
                Import {selectedFields.length} Field{selectedFields.length !== 1 ? 's' : ''}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  Select,
  Grid,
  Badge,
  Alert,
  Progress,
  Checkbox,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconMicrophone,
  IconUser,
  IconLink,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
  IconVideo,
  IconBuilding,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

const speakerApplicationSchema = z.object({
  // Talk details
  talkTitle: z.string().min(1, "Talk title is required").max(200),
  talkAbstract: z
    .string()
    .min(50, "Please provide at least 50 characters for your abstract")
    .max(2000),
  talkFormat: z.string().min(1, "Please select a talk format"),
  talkDuration: z.string().min(1, "Please select a preferred duration"),
  talkTopic: z.string().min(1, "Please specify the topic or track"),
  // Speaker info
  bio: z.string().min(20, "Please provide at least 20 characters for your bio").max(1000),
  previousSpeakingExperience: z.string().max(2000).optional().or(z.literal("")),
  // Profile fields
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  // Links
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  pastTalkUrl: z.string().url().optional().or(z.literal("")),
});

type SpeakerApplicationData = z.infer<typeof speakerApplicationSchema>;

const talkFormatOptions = [
  { value: "keynote", label: "Keynote" },
  { value: "talk", label: "Talk" },
  { value: "panel", label: "Panel Discussion" },
  { value: "workshop", label: "Workshop" },
  { value: "lightning", label: "Lightning Talk (5-10 min)" },
  { value: "fireside", label: "Fireside Chat" },
];

const talkDurationOptions = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];

interface SpeakerApplicationFormProps {
  eventId: string;
  eventName: string;
  invitationToken?: string;
}

export default function SpeakerApplicationForm({
  eventId,
  eventName,
  invitationToken,
}: SpeakerApplicationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const { data: config } = api.config.getPublicConfig.useQuery();

  // Fetch available venues/floors for this event
  const { data: scheduleFilters } = api.schedule.getEventScheduleFilters.useQuery({ eventId });
  const venues = scheduleFilters?.venues ?? [];

  // If invited, fetch inviter's venues for pre-selection
  const { data: inviterVenues } = api.application.getInviterVenues.useQuery(
    { invitationToken: invitationToken!, eventId },
    { enabled: !!invitationToken },
  );

  // Pre-select inviter's venues when data loads
  useEffect(() => {
    if (inviterVenues && inviterVenues.length > 0 && selectedVenueIds.length === 0) {
      setSelectedVenueIds(inviterVenues.map((v) => v.id));
    }
  }, [inviterVenues]); // eslint-disable-line react-hooks/exhaustive-deps

  const createApplication = api.application.createApplication.useMutation();
  const submitApplication = api.application.submitApplication.useMutation();
  const updateProfile = api.profile.updateProfile.useMutation();

  const form = useForm<SpeakerApplicationData>({
    validate: zodResolver(speakerApplicationSchema),
    initialValues: {
      talkTitle: "",
      talkAbstract: "",
      talkFormat: "",
      talkDuration: "",
      talkTopic: "",
      bio: "",
      previousSpeakingExperience: "",
      jobTitle: "",
      company: "",
      website: "",
      linkedinUrl: "",
      twitterUrl: "",
      pastTalkUrl: "",
    },
  });

  const handleSubmit = async (values: SpeakerApplicationData) => {
    setIsSubmitting(true);

    try {
      // Step 1: Create speaker application record
      const application = await createApplication.mutateAsync({
        eventId,
        applicationType: "SPEAKER",
        language: "en",
        invitationToken,
      });

      // Step 2: Update profile with speaker info
      await updateProfile.mutateAsync({
        bio: values.bio,
        jobTitle: values.jobTitle,
        company: values.company,
        website: values.website,
        linkedinUrl: values.linkedinUrl,
        twitterUrl: values.twitterUrl,
        speakerTalkTitle: values.talkTitle,
        speakerTalkAbstract: values.talkAbstract,
        speakerTalkFormat: values.talkFormat,
        speakerTalkDuration: values.talkDuration,
        speakerTalkTopic: values.talkTopic,
        speakerPreviousExperience: values.previousSpeakingExperience,
        speakerPastTalkUrl: values.pastTalkUrl,
      });

      // Step 3: Submit the application (DRAFT → SUBMITTED) with venue selections
      await submitApplication.mutateAsync({
        applicationId: application.id,
        venueIds: selectedVenueIds.length > 0 ? selectedVenueIds : undefined,
      });

      // All steps succeeded - show success and redirect
      notifications.show({
        title: "Speaker Application Submitted!",
        message:
          "Your speaker application has been submitted successfully. We will review it and get back to you.",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      router.push(`/events/${eventId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "There was an error submitting your speaker application. Please try again.";
      notifications.show({
        title: "Submission Failed",
        message,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      const isValid = getStepValidation(currentStep);
      if (isValid) {
        setCurrentStep((prev) => prev + 1);
      } else {
        form.validate();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getStepValidation = (step: number) => {
    switch (step) {
      case 1:
        return (
          form.values.talkTitle.length > 0 &&
          form.values.talkAbstract.length >= 50 &&
          form.values.talkFormat.length > 0 &&
          form.values.talkDuration.length > 0 &&
          form.values.talkTopic.length > 0
        );
      case 2:
        return form.values.bio.length >= 20;
      case 3:
        return true; // Links are optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconMicrophone
                  size={28}
                  color="var(--mantine-color-teal-6)"
                />
                <div>
                  <Title order={3}>Talk Details</Title>
                  <Text size="sm" c="dimmed">
                    Tell us about what you&apos;d like to present
                  </Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <TextInput
                    label="Talk Title"
                    placeholder="Enter the title of your proposed talk"
                    description="A clear, descriptive title for your presentation"
                    {...form.getInputProps("talkTitle")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Talk Abstract"
                    placeholder="Describe what your talk will cover, key takeaways for the audience, and why this topic matters..."
                    description="Provide a detailed description of your talk (minimum 50 characters)"
                    minRows={5}
                    maxRows={10}
                    {...form.getInputProps("talkAbstract")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Talk Format"
                    placeholder="Select the format"
                    data={talkFormatOptions}
                    {...form.getInputProps("talkFormat")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Preferred Duration"
                    placeholder="Select duration"
                    data={talkDurationOptions}
                    {...form.getInputProps("talkDuration")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <TextInput
                    label="Topic / Track"
                    placeholder="e.g., DeFi, Public Goods, AI, Governance, Infrastructure"
                    description="What topic area or conference track does your talk fit into?"
                    {...form.getInputProps("talkTopic")}
                    required
                  />
                </Grid.Col>

                {venues.length > 0 && (
                  <Grid.Col span={12}>
                    <Stack gap="xs">
                      <Group gap="xs" align="center">
                        <IconBuilding size={16} color="var(--mantine-color-teal-6)" />
                        <Text fw={500} size="sm">
                          Which floor(s) would you like to speak on?
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Select one or more floors where you&apos;d like to present
                      </Text>
                      <Checkbox.Group
                        value={selectedVenueIds}
                        onChange={setSelectedVenueIds}
                      >
                        <Stack gap="xs">
                          {venues.map((venue) => (
                            <Checkbox
                              key={venue.id}
                              value={venue.id}
                              label={venue.name}
                            />
                          ))}
                        </Stack>
                      </Checkbox.Group>
                    </Stack>
                  </Grid.Col>
                )}
              </Grid>
            </Stack>
          </Card>
        );

      case 2:
        return (
          <Stack gap="xl">
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Group gap="md" align="center">
                  <IconUser
                    size={28}
                    color="var(--mantine-color-blue-6)"
                  />
                  <div>
                    <Title order={3}>Speaker Profile</Title>
                    <Text size="sm" c="dimmed">
                      Tell us about yourself
                    </Text>
                  </div>
                </Group>

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Job Title"
                      placeholder="Software Engineer, Researcher, etc."
                      {...form.getInputProps("jobTitle")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Organization"
                      placeholder="Your current organization"
                      {...form.getInputProps("company")}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Speaker Bio"
                      placeholder="Tell the audience about yourself, your background, and your expertise..."
                      description="This bio may be displayed on the conference website (minimum 20 characters)"
                      minRows={4}
                      maxRows={8}
                      {...form.getInputProps("bio")}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Previous Speaking Experience"
                      placeholder="Share any conferences, meetups, podcasts, or other events where you have spoken before..."
                      description="Optional, but helps us understand your experience level"
                      minRows={3}
                      maxRows={6}
                      {...form.getInputProps("previousSpeakingExperience")}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>
          </Stack>
        );

      case 3:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconLink
                  size={28}
                  color="var(--mantine-color-purple-6)"
                />
                <div>
                  <Title order={3}>Links</Title>
                  <Text size="sm" c="dimmed">
                    Share relevant links (all optional)
                  </Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Website"
                    placeholder="https://your-website.com"
                    leftSection={<IconWorld size={16} />}
                    {...form.getInputProps("website")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="LinkedIn"
                    placeholder="https://linkedin.com/in/username"
                    leftSection={<IconBrandLinkedin size={16} />}
                    {...form.getInputProps("linkedinUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Twitter/X"
                    placeholder="https://twitter.com/username"
                    leftSection={<IconBrandTwitter size={16} />}
                    {...form.getInputProps("twitterUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Past Talk Recording"
                    placeholder="https://youtube.com/watch?v=..."
                    description="Link to a previous talk, presentation, or video"
                    leftSection={<IconVideo size={16} />}
                    {...form.getInputProps("pastTalkUrl")}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="md">
            Speaker Application
          </Title>
          <Text size="lg" c="dimmed" mb="md">
            Apply to speak at {eventName}
          </Text>

          {/* Progress Bar */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Step {currentStep} of 3
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round((currentStep / 3) * 100)}% Complete
                </Text>
              </Group>
              <Progress
                value={(currentStep / 3) * 100}
                size="lg"
                radius="xl"
                color="teal"
              />

              <Group justify="space-between">
                <Badge
                  size="sm"
                  variant={currentStep >= 1 ? "filled" : "light"}
                  color="teal"
                >
                  Talk Details
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 2 ? "filled" : "light"}
                  color="teal"
                >
                  Speaker Profile
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 3 ? "filled" : "light"}
                  color="teal"
                >
                  Links
                </Badge>
              </Group>
            </Stack>
          </Card>
        </div>

        {/* Form Content */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderStep()}

          {/* Navigation Buttons */}
          <Group justify="space-between" mt="xl">
            <Button
              variant="light"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button color="teal" onClick={nextStep}>
                Next Step
              </Button>
            ) : (
              <Button
                type="submit"
                color="teal"
                loading={isSubmitting}
                leftSection={<IconCheck size={16} />}
                disabled={!getStepValidation(currentStep)}
              >
                Submit Application
              </Button>
            )}
          </Group>
        </form>

        {/* Help Text */}
        <Alert color="teal" title="Need Help?">
          <Text size="sm">
            If you have any questions about the speaker application, please
            contact the event organizers at{" "}
            <Text component="span" fw={500}>
              {config?.adminEmail ?? ""}
            </Text>
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}

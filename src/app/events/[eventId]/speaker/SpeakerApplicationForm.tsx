"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
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
  MultiSelect,
  Grid,
  Badge,
  Alert,
  Progress,
  Center,
  Loader,
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
  // Session details
  talkTitle: z.string().min(1, "Session name is required").max(200),
  talkAbstract: z
    .string()
    .min(50, "Please provide at least 50 characters for your description")
    .max(2000),
  talkFormat: z.array(z.string()).min(1, "Please select at least one session type"),
  talkDuration: z.string().min(1, "Please select a session length"),
  talkTopic: z.string().min(1, "Please specify the topic or track"),
  entityName: z.string().max(200).optional().or(z.literal("")),
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

export const talkFormatOptions = [
  { value: "Art Installation", label: "Art Installation" },
  { value: "Demonstration", label: "Demonstration" },
  { value: "Workshop", label: "Workshop" },
  { value: "Panel Discussion", label: "Panel Discussion" },
  { value: "Talk / Presentation", label: "Talk / Presentation" },
  { value: "Music Performance", label: "Music Performance" },
  { value: "Other", label: "Other" },
];

export const talkDurationOptions = [
  { value: "multi-hour", label: "multi-hour" },
  { value: "90", label: "1.5 hours" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "30", label: "30 minutes" },
];

export const ftcTopicOptions = [
  { value: "AI Governance and Coordination", label: "AI Governance and Coordination" },
  { value: "Economic Futures: Public Goods in the Age of AI", label: "Economic Futures: Public Goods in the Age of AI" },
  { value: "AI-Assisted Funding and Resource Allocation", label: "AI-Assisted Funding and Resource Allocation" },
  { value: "Open Infrastructure for Collective Intelligence", label: "Open Infrastructure for Collective Intelligence" },
  { value: "Applied Human-AI Collaboration", label: "Applied Human-AI Collaboration" },
  { value: "Other", label: "Other" },
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
  const [invitedByValue, setInvitedByValue] = useState<string | null>(null);
  const [invitedByOtherText, setInvitedByOtherText] = useState("");
  const [hasInitializedVenues, setHasInitializedVenues] = useState(false);
  const [ftcTopicValues, setFtcTopicValues] = useState<string[]>([]);
  const [ftcTopicOtherText, setFtcTopicOtherText] = useState("");
  const { data: config } = api.config.getPublicConfig.useQuery(
    undefined,
    { refetchOnWindowFocus: false },
  );

  // Fetch available venues/floors for this event
  const { data: scheduleFilters, isLoading: isLoadingFilters } =
    api.schedule.getEventScheduleFilters.useQuery(
      { eventId },
      { refetchOnWindowFocus: false },
    );

  // Stabilize useMemo deps with stringified ID keys to prevent cascading re-renders on refetch
  const venueIdKey = scheduleFilters?.venues?.map(v => v.id).join(',') ?? '';
  const fmIdKey = scheduleFilters?.floorManagers?.map(fm => fm.id).join(',') ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const venues = useMemo(() => scheduleFilters?.venues ?? [], [venueIdKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const floorManagers = useMemo(() => scheduleFilters?.floorManagers ?? [], [fmIdKey]);

  // If invited, fetch inviter's venues for pre-selection
  const { data: inviterVenues } = api.application.getInviterVenues.useQuery(
    { invitationToken: invitationToken!, eventId },
    { enabled: !!invitationToken, refetchOnWindowFocus: false },
  );

  // Memoize venue select data to avoid creating new arrays every render
  const venueSelectData = useMemo(
    () =>
      venues.map((venue) => ({
        value: venue.id,
        label: `${venue.name}${inviterVenues?.some((v) => v.id === venue.id) ? " (invited)" : ""}`,
      })),
    [venues, inviterVenues],
  );

  // Memoize session type select data
  const sessionTypeSelectData = useMemo(
    () =>
      (scheduleFilters?.sessionTypes ?? []).length > 0
        ? scheduleFilters!.sessionTypes.map((st) => ({
            value: st.name,
            label: st.name,
          }))
        : talkFormatOptions,
    [scheduleFilters],
  );

  // Build "Who invited you?" dropdown options from floor leads
  const inviterOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];

    for (const fm of floorManagers) {
      const displayName = fm.firstName
        ? `${fm.firstName}${fm.surname ? ` ${fm.surname}` : ""}`
        : fm.name ?? "Unknown";

      const managerVenueNames = venues
        .filter((v) => fm.venueIds.includes(v.id))
        .map((v) => v.name);

      const label =
        managerVenueNames.length > 0
          ? `${displayName} (${managerVenueNames.join(", ")})`
          : displayName;

      options.push({ value: fm.id, label });
    }

    options.push({ value: "other", label: "Other" });
    return options;
  }, [floorManagers, venues]);

  // Check if the selected venue is a "Funding the Commons" floor
  const isFtcVenue = useMemo(() => {
    if (selectedVenueIds.length === 0) return false;
    const selectedVenue = venues.find((v) => v.id === selectedVenueIds[0]);
    return selectedVenue?.name.toLowerCase().includes("funding the commons") ?? false;
  }, [selectedVenueIds, venues]);

  // Pre-select inviter's venues and floor lead once when arriving via invitation
  useEffect(() => {
    if (
      !hasInitializedVenues &&
      inviterVenues &&
      inviterVenues.length > 0 &&
      floorManagers.length > 0
    ) {
      setHasInitializedVenues(true);
      setSelectedVenueIds([inviterVenues[0]!.id]);

      // Auto-select the inviting floor lead
      const inviterManager = floorManagers.find((fm) =>
        inviterVenues.some((v) => fm.venueIds.includes(v.id)),
      );
      if (inviterManager) {
        setInvitedByValue(inviterManager.id);
      }
    }
  }, [hasInitializedVenues, inviterVenues, floorManagers]);

  // Sync FtC multi-select topic values into the form's talkTopic string field
  useEffect(() => {
    if (!isFtcVenue) return;
    const topics = ftcTopicValues.filter((v) => v !== "Other");
    if (ftcTopicValues.includes("Other") && ftcTopicOtherText.trim()) {
      topics.push(`Other: ${ftcTopicOtherText.trim()}`);
    } else if (ftcTopicValues.includes("Other")) {
      topics.push("Other");
    }
    form.setFieldValue("talkTopic", topics.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFtcVenue, ftcTopicValues, ftcTopicOtherText]);

  const createApplication = api.application.createApplication.useMutation();
  const submitApplication = api.application.submitApplication.useMutation();
  const updateProfile = api.profile.updateProfile.useMutation();

  const form = useForm<SpeakerApplicationData>({
    validate: zodResolver(speakerApplicationSchema),
    initialValues: {
      talkTitle: "",
      talkAbstract: "",
      talkFormat: [],
      talkDuration: "",
      talkTopic: "",
      entityName: "",
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
        speakerTalkFormat: values.talkFormat.join(", "),
        speakerTalkDuration: values.talkDuration,
        speakerTalkTopic: values.talkTopic,
        speakerPreviousExperience: values.previousSpeakingExperience,
        speakerPastTalkUrl: values.pastTalkUrl,
        speakerEntityName: values.entityName,
      });

      // Step 3: Submit the application (DRAFT → SUBMITTED) with venue selections
      await submitApplication.mutateAsync({
        applicationId: application.id,
        venueIds: selectedVenueIds.length > 0 ? selectedVenueIds : undefined,
        speakerInvitedByUserId: invitedByValue && invitedByValue !== "other" ? invitedByValue : undefined,
        speakerInvitedByOther: invitedByValue === "other" ? invitedByOtherText : undefined,
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

  const getStepFields = (step: number): (keyof SpeakerApplicationData)[] => {
    switch (step) {
      case 1: return ['talkTitle', 'talkAbstract', 'talkFormat', 'talkDuration', 'talkTopic'];
      case 2: return ['bio'];
      default: return [];
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      const isValid = getStepValidation(currentStep);
      if (isValid) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Only validate current step's fields, not the entire form
        for (const field of getStepFields(currentStep)) {
          form.validateField(field);
        }
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
          form.values.talkTopic.length > 0 &&
          // If FtC venue with "Other" selected, require the fill-in text
          (!isFtcVenue || !ftcTopicValues.includes("Other") || ftcTopicOtherText.trim().length > 0)
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
        if (isLoadingFilters) {
          return (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Center h={200}>
                <Stack align="center" gap="md">
                  <Loader size="md" />
                  <Text c="dimmed" size="sm">Loading form data...</Text>
                </Stack>
              </Center>
            </Card>
          );
        }
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconMicrophone
                  size={28}
                  color="var(--mantine-color-teal-6)"
                />
                <div>
                  <Title order={3}>Session Details</Title>
                  <Text size="sm" c="dimmed">
                    Tell us about your session
                  </Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <TextInput
                    label="Session Name"
                    placeholder="Enter the name of your proposed session"
                    description="This can be changed later, but please put a title broadly describing what your session will be about"
                    {...form.getInputProps("talkTitle")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <TextInput
                    label="Name of Artist, Entity, or Group"
                    placeholder="Enter the name as you want it to appear in scheduling and descriptions"
                    description="If the name of the entity hosting the session is different than your name, please type it below as you want it to appear in scheduling and descriptions."
                    {...form.getInputProps("entityName")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Session Description"
                    placeholder="Describe what your session will cover, key takeaways for the audience, and why this topic matters..."
                    description="This can be changed later, but please provide a brief description of what your session will cover (minimum 50 characters)"
                    minRows={5}
                    maxRows={10}
                    {...form.getInputProps("talkAbstract")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <MultiSelect
                    label="Session Type"
                    placeholder="Select session types"
                    description="Select the type of session you may be interested in"
                    data={sessionTypeSelectData}
                    {...form.getInputProps("talkFormat")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Session Length"
                    placeholder="Select session length"
                    data={talkDurationOptions}
                    {...form.getInputProps("talkDuration")}
                    required
                  />
                </Grid.Col>

                {inviterOptions.length > 1 && (
                  <Grid.Col span={12}>
                    <Select
                      label="Who invited you?"
                      placeholder="Select who invited you"
                      description="If you were invited by a floor lead, please select their name"
                      data={inviterOptions}
                      value={invitedByValue}
                      onChange={(val) => {
                        setInvitedByValue(val);
                        if (val !== "other") {
                          setInvitedByOtherText("");
                          // Auto-select the inviter's venue
                          const fm = floorManagers.find((m) => m.id === val);
                          if (fm && fm.venueIds.length > 0) {
                            setSelectedVenueIds([fm.venueIds[0]!]);
                          }
                        }
                      }}
                      clearable
                      searchable
                    />
                  </Grid.Col>
                )}

                {invitedByValue === "other" && (
                  <Grid.Col span={12}>
                    <TextInput
                      label="Who invited you? (please specify)"
                      placeholder="Enter the name of the person who invited you"
                      value={invitedByOtherText}
                      onChange={(e) => setInvitedByOtherText(e.currentTarget.value)}
                    />
                  </Grid.Col>
                )}

                {venues.length > 0 && (
                  <Grid.Col span={12}>
                    <Select
                      label="Where were you invited to speak?"
                      placeholder="Select a floor"
                      description="Select the floor where you&apos;d like to present"
                      data={venueSelectData}
                      value={selectedVenueIds[0] ?? null}
                      onChange={(val) => {
                        setSelectedVenueIds(val ? [val] : []);
                        // Reset topic fields when venue changes
                        form.setFieldValue("talkTopic", "");
                        setFtcTopicValues([]);
                        setFtcTopicOtherText("");
                      }}
                      clearable
                      leftSection={<IconBuilding size={16} color="var(--mantine-color-teal-6)" />}
                    />
                  </Grid.Col>
                )}

                <Grid.Col span={12}>
                  {isFtcVenue ? (
                    <>
                      <MultiSelect
                        label="Topic / Track"
                        placeholder="Select topics that apply"
                        description="Please select which of the following topics your proposed session fits into"
                        data={ftcTopicOptions}
                        value={ftcTopicValues}
                        onChange={setFtcTopicValues}
                        required
                        error={form.errors.talkTopic}
                      />
                      {ftcTopicValues.includes("Other") && (
                        <TextInput
                          label="Other topic (please specify)"
                          placeholder="Describe your topic"
                          value={ftcTopicOtherText}
                          onChange={(e) => setFtcTopicOtherText(e.currentTarget.value)}
                          mt="sm"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <TextInput
                      label="Topic / Track"
                      placeholder="Please share which topic areas your proposed session fits into"
                      description="If you are presenting on another floor, please share which topic areas your proposed session fits into"
                      {...form.getInputProps("talkTopic")}
                      required
                    />
                  )}
                </Grid.Col>
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
                  Session Details
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
              type="button"
              variant="light"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button type="button" color="teal" onClick={nextStep}>
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

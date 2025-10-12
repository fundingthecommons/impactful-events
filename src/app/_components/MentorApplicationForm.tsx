"use client";

import { useState } from "react";
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
  TagsInput,
  Select,
  Checkbox,
  Radio,
  Grid,
  Badge,
  Alert,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { 
  IconCheck, 
  IconX, 
  IconCalendar, 
  IconMail, 
  IconPhone,
  IconBrandTelegram,
  IconBrandDiscord,
  IconBrandLinkedin,
  IconUsers,
  IconBriefcase,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

const mentorApplicationSchema = z.object({
  skills: z.array(z.string()).min(1, "Please add at least one skill"),
  interests: z.array(z.string()).min(1, "Please add at least one area of experience"),
  yearsOfExperience: z.number().min(0, "Years of experience must be 0 or greater"),
  timezone: z.string().min(1, "Timezone is required"),
  mentorAvailableDates: z.array(z.string()).min(1, "Please select at least one availability period"),
  mentorHoursPerWeek: z.string().min(1, "Please specify your time commitment"),
  mentorPreferredContact: z.string().min(1, "Please select a preferred contact method"),
  phoneNumber: z.string().optional(),
  telegramHandle: z.string().optional(),
  discordHandle: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  mentorshipStyle: z.string().min(1, "Please describe your mentorship approach"),
  previousMentoringExp: z.string().min(1, "Please describe your previous mentoring experience"),
  mentorSpecializations: z.array(z.string()).min(1, "Please add at least one specialization"),
  mentorGoals: z.string().min(1, "Please describe your goals as a mentor"),
});

type MentorApplicationData = z.infer<typeof mentorApplicationSchema>;

const availabilityOptions = [
  { value: "week1", label: "Week 1: Oct 24-31, 2025" },
  { value: "week2", label: "Week 2: Nov 1-7, 2025" },
  { value: "week3", label: "Week 3: Nov 8-14, 2025" },
  { value: "pre-event", label: "Pre-event preparation (Oct 15-23)" },
  { value: "post-event", label: "Post-event follow-up (Nov 15-30)" },
];

const timeCommitmentOptions = [
  { value: "5-10", label: "5-10 hours per week" },
  { value: "10-15", label: "10-15 hours per week" },
  { value: "15-20", label: "15-20 hours per week" },
  { value: "20+", label: "20+ hours per week" },
  { value: "flexible", label: "Flexible based on needs" },
];

const contactMethodOptions = [
  { value: "email", label: "Email" },
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "phone", label: "Phone" },
];

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

interface MentorApplicationFormProps {
  eventId: string;
  eventName: string;
}

export default function MentorApplicationForm({ eventId, eventName }: MentorApplicationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<MentorApplicationData>({
    validate: zodResolver(mentorApplicationSchema),
    initialValues: {
      skills: [],
      interests: [],
      yearsOfExperience: 0,
      timezone: "",
      mentorAvailableDates: [],
      mentorHoursPerWeek: "",
      mentorPreferredContact: "",
      phoneNumber: "",
      telegramHandle: "",
      discordHandle: "",
      linkedinUrl: "",
      mentorshipStyle: "",
      previousMentoringExp: "",
      mentorSpecializations: [],
      mentorGoals: "",
    },
  });

  const updateProfile = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Mentor Application Submitted!",
        message: "Your mentor profile has been updated successfully. You're now ready to mentor!",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      
      // Redirect back to mentor dashboard
      router.push(`/events/${eventId}/apply`);
    },
    onError: (error) => {
      notifications.show({
        title: "Submission Failed",
        message: error.message ?? "There was an error updating your mentor profile. Please try again.",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleSubmit = async (values: MentorApplicationData) => {
    setIsSubmitting(true);
    
    try {
      // Update the user's profile with mentor information
      await updateProfile.mutateAsync({
        skills: values.skills,
        interests: values.interests,
        yearsOfExperience: values.yearsOfExperience,
        timezone: values.timezone,
        availableForMentoring: true, // Set this to true when they complete mentor application
        phoneNumber: values.phoneNumber,
        telegramHandle: values.telegramHandle,
        discordHandle: values.discordHandle,
        linkedinUrl: values.linkedinUrl,
        mentorshipStyle: values.mentorshipStyle,
        previousMentoringExp: values.previousMentoringExp,
        mentorSpecializations: values.mentorSpecializations,
        mentorGoals: values.mentorGoals,
        mentorAvailableDates: values.mentorAvailableDates,
        mentorHoursPerWeek: values.mentorHoursPerWeek,
        mentorPreferredContact: values.mentorPreferredContact,
      });
      
    } catch {
      // Error is handled by the mutation's onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getStepValidation = (step: number) => {
    switch (step) {
      case 1:
        return form.values.skills.length > 0 && 
               form.values.interests.length > 0 && 
               form.values.yearsOfExperience >= 0;
      case 2:
        return form.values.mentorAvailableDates.length > 0 && 
               form.values.mentorHoursPerWeek && 
               form.values.timezone;
      case 3:
        return form.values.mentorPreferredContact;
      case 4:
        return form.values.mentorshipStyle && 
               form.values.previousMentoringExp && 
               form.values.mentorSpecializations.length > 0 && 
               form.values.mentorGoals;
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
                <IconBriefcase size={28} color="var(--mantine-color-blue-6)" />
                <div>
                  <Title order={3}>Skills & Experience</Title>
                  <Text size="sm" c="dimmed">Tell us about your expertise and background</Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <TagsInput
                    label="Skills & Technologies"
                    placeholder="Add your technical skills (e.g., React, Solidity, Python)"
                    description="What technical skills can you mentor others on?"
                    {...form.getInputProps("skills")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <TagsInput
                    label="Experience Areas"
                    placeholder="Add your areas of expertise (e.g., DeFi, Product Strategy, Startups)"
                    description="What domains or industries do you have experience in?"
                    {...form.getInputProps("interests")}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Years of Professional Experience"
                    placeholder="Enter number of years"
                    type="number"
                    min={0}
                    {...form.getInputProps("yearsOfExperience")}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      case 2:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconCalendar size={28} color="var(--mantine-color-green-6)" />
                <div>
                  <Title order={3}>Availability</Title>
                  <Text size="sm" c="dimmed">When are you available to mentor?</Text>
                </div>
              </Group>

              <Stack gap="md">
                <div>
                  <Text size="sm" fw={500} mb="xs">Available Periods</Text>
                  <Text size="xs" c="dimmed" mb="md">Select all periods when you&apos;ll be available to mentor</Text>
                  <Stack gap="xs">
                    {availabilityOptions.map((option) => (
                      <Checkbox
                        key={option.value}
                        label={option.label}
                        checked={form.values.mentorAvailableDates.includes(option.value)}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          const currentDates = form.values.mentorAvailableDates;
                          
                          if (checked) {
                            form.setFieldValue('mentorAvailableDates', [...currentDates, option.value]);
                          } else {
                            form.setFieldValue('mentorAvailableDates', currentDates.filter(d => d !== option.value));
                          }
                        }}
                      />
                    ))}
                  </Stack>
                </div>

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Time Commitment"
                      placeholder="How much time can you dedicate?"
                      data={timeCommitmentOptions}
                      {...form.getInputProps("mentorHoursPerWeek")}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Your Timezone"
                      placeholder="Select your timezone"
                      data={timezoneOptions}
                      searchable
                      {...form.getInputProps("timezone")}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Stack>
          </Card>
        );

      case 3:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconMail size={28} color="var(--mantine-color-purple-6)" />
                <div>
                  <Title order={3}>Contact Preferences</Title>
                  <Text size="sm" c="dimmed">How should mentees contact you?</Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <div>
                    <Text size="sm" fw={500} mb="xs">Preferred Contact Method</Text>
                    <Radio.Group
                      {...form.getInputProps("mentorPreferredContact")}
                    >
                      <Stack gap="xs">
                        {contactMethodOptions.map((option) => (
                          <Radio
                            key={option.value}
                            value={option.value}
                            label={option.label}
                          />
                        ))}
                      </Stack>
                    </Radio.Group>
                  </div>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed" fw={500}>
                    Email: Will use your account email
                  </Text>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    leftSection={<IconPhone size={16} />}
                    {...form.getInputProps("phoneNumber")}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Telegram Username"
                    placeholder="@username"
                    leftSection={<IconBrandTelegram size={16} />}
                    {...form.getInputProps("telegramHandle")}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Discord Handle"
                    placeholder="username#1234"
                    leftSection={<IconBrandDiscord size={16} />}
                    {...form.getInputProps("discordHandle")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <TextInput
                    label="LinkedIn Profile"
                    placeholder="https://linkedin.com/in/yourprofile"
                    leftSection={<IconBrandLinkedin size={16} />}
                    {...form.getInputProps("linkedinUrl")}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      case 4:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconUsers size={28} color="var(--mantine-color-orange-6)" />
                <div>
                  <Title order={3}>Mentorship Details</Title>
                  <Text size="sm" c="dimmed">Tell us about your approach to mentoring</Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <TagsInput
                    label="Specializations"
                    placeholder="Add specific areas you'd like to focus on (e.g., Smart Contract Security, UX Design)"
                    description="What specific topics or skills do you want to mentor on during the residency?"
                    {...form.getInputProps("mentorSpecializations")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Mentorship Style & Approach"
                    placeholder="Describe how you typically approach mentoring, your style, and what mentees can expect..."
                    description="How do you like to mentor? What's your approach to helping others learn and grow?"
                    minRows={4}
                    {...form.getInputProps("mentorshipStyle")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Previous Mentoring Experience"
                    placeholder="Tell us about your experience mentoring others, whether formal or informal..."
                    description="What's your background with mentoring? This can include formal programs, informal guidance, teaching, etc."
                    minRows={3}
                    {...form.getInputProps("previousMentoringExp")}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Goals for this Residency"
                    placeholder="What do you hope to achieve as a mentor during this residency? What excites you about this opportunity?"
                    description="What are your personal goals for participating as a mentor?"
                    minRows={3}
                    {...form.getInputProps("mentorGoals")}
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
          <Title order={1} mb="md">Mentor Application</Title>
          <Text size="lg" c="dimmed" mb="md">
            Complete your mentor profile for {eventName}
          </Text>
          
          {/* Progress Bar */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Step {currentStep} of 4</Text>
                <Text size="sm" c="dimmed">{Math.round((currentStep / 4) * 100)}% Complete</Text>
              </Group>
              <Progress value={(currentStep / 4) * 100} size="lg" radius="xl" />
              
              <Group justify="space-between">
                <Badge size="sm" variant={currentStep >= 1 ? "filled" : "light"}>Skills</Badge>
                <Badge size="sm" variant={currentStep >= 2 ? "filled" : "light"}>Availability</Badge>
                <Badge size="sm" variant={currentStep >= 3 ? "filled" : "light"}>Contact</Badge>
                <Badge size="sm" variant={currentStep >= 4 ? "filled" : "light"}>Details</Badge>
              </Group>
            </Stack>
          </Card>
        </div>

        {/* Form Content */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderStep()}

          {/* Navigation Buttons */}
          <Group justify="space-between">
            <Button
              variant="light"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!getStepValidation(currentStep)}
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="submit"
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
        <Alert color="blue" title="Need Help?">
          <Text size="sm">
            If you have any questions about completing this form, please contact the residency organizers at{" "}
            <Text component="span" fw={500}>hello@fundingthecommons.io</Text>
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}
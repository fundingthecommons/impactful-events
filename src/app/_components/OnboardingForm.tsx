"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Button,
  Checkbox,
  Group,
  FileInput,
  Textarea,
  Alert,
  Progress,
  Divider,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconUpload,
  IconPlane,
  IconShield,
  IconUsers,
  IconStar,
  IconCoin,
  IconInfoCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface OnboardingFormData {
  eTicket: File | null;
  healthInsurance: File | null;
  participateExperiments: boolean;
  mintHypercert: boolean;
  interestedIncubation: boolean;
  dietaryRequirements: string;
  additionalComments: string;
}

interface OnboardingFormProps {
  applicationId: string;
  applicantName: string;
}

export default function OnboardingForm({
  applicationId,
  applicantName,
}: OnboardingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // API hooks
  const { data: onboardingData, isLoading } = api.onboarding.getOnboarding.useQuery({
    applicationId,
  });
  
  const submitOnboarding = api.onboarding.submitOnboarding.useMutation();
  const saveDraft = api.onboarding.saveDraft.useMutation();

  const form = useForm<OnboardingFormData>({
    initialValues: {
      eTicket: null,
      healthInsurance: null,
      participateExperiments: false,
      mintHypercert: false,
      interestedIncubation: false,
      dietaryRequirements: "",
      additionalComments: "",
    },
    validate: {
      eTicket: (value) => (!value ? "Please upload your e-ticket" : null),
      healthInsurance: (value) => (!value ? "Please upload proof of health insurance" : null),
      participateExperiments: (value) => (!value ? "This commitment is required for participation" : null),
      mintHypercert: (value) => (!value ? "This commitment is required for participation" : null),
    },
  });

  // Initialize form with existing data if available
  useEffect(() => {
    if (onboardingData?.onboarding) {
      const existing = onboardingData.onboarding;
      form.setValues({
        eTicket: existing.eTicketUrl ? new File([], existing.eTicketFileName ?? "e-ticket") : null,
        healthInsurance: existing.healthInsuranceUrl ? new File([], existing.healthInsuranceFileName ?? "insurance") : null,
        participateExperiments: existing.participateExperiments,
        mintHypercert: existing.mintHypercert,
        interestedIncubation: existing.interestedIncubation,
        dietaryRequirements: existing.dietaryRequirements ?? "",
        additionalComments: existing.additionalComments ?? "",
      });
      
      if (existing.completed) {
        setIsSubmitted(true);
      }
    }
  }, [onboardingData]);

  const handleSubmit = async (values: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      // For now, we'll simulate file uploads with placeholder URLs
      // In a real implementation, you would upload files to cloud storage first
      const eTicketUrl = values.eTicket ? `https://example.com/uploads/${values.eTicket.name}` : undefined;
      const healthInsuranceUrl = values.healthInsurance ? `https://example.com/uploads/${values.healthInsurance.name}` : undefined;
      
      await submitOnboarding.mutateAsync({
        applicationId,
        eTicketUrl,
        eTicketFileName: values.eTicket?.name,
        healthInsuranceUrl,
        healthInsuranceFileName: values.healthInsurance?.name,
        participateExperiments: values.participateExperiments,
        mintHypercert: values.mintHypercert,
        interestedIncubation: values.interestedIncubation,
        dietaryRequirements: values.dietaryRequirements || undefined,
        additionalComments: values.additionalComments || undefined,
      });
      
      notifications.show({
        title: "Onboarding Complete!",
        message: "Thank you for completing your onboarding. We'll be in touch soon with more details.",
        color: "green",
        icon: <IconCheck />,
      });
      
      setIsSubmitted(true);
    } catch (error) {
      notifications.show({
        title: "Submission Failed",
        message: error instanceof Error ? error.message : "There was an error submitting your onboarding form. Please try again.",
        color: "red",
        icon: <IconX />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion percentage
  const requiredFields = 4; // eTicket, healthInsurance, participateExperiments, mintHypercert
  const completedFields = [
    form.values.eTicket,
    form.values.healthInsurance,
    form.values.participateExperiments,
    form.values.mintHypercert,
  ].filter(Boolean).length;
  
  const completionPercentage = (completedFields / requiredFields) * 100;

  // Loading state
  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading your onboarding information...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  // Completed state
  if (isSubmitted) {
    return (
      <Container size="md" py="xl">
        <Card shadow="sm" padding="xl" radius="md">
          <Stack align="center" gap="lg">
            <IconCheck size={64} color="green" />
            <Title order={2} ta="center">Onboarding Complete!</Title>
            <Text size="lg" ta="center" c="dimmed">
              Thank you for completing your onboarding, {applicantName}. 
              We'll be in touch soon with more details about the residency.
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2}>Welcome to FtC Residency! 🎉</Title>
                <Text size="lg" c="dimmed">
                  Complete your onboarding to secure your spot
                </Text>
              </div>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>Progress</Text>
                <Progress value={completionPercentage} size="sm" radius="xl" />
                <Text size="xs" c="dimmed" ta="center" mt={2}>
                  {completedFields}/{requiredFields} required items
                </Text>
              </Box>
            </Group>
            
            <Alert icon={<IconInfoCircle />} color="blue" variant="light">
              Hi {applicantName}! Please complete the following steps to confirm your participation in the Funding the Commons Residency.
            </Alert>
          </Stack>
        </Card>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {/* Travel Documents */}
            <Card shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group gap="sm">
                  <IconPlane size={24} color="blue" />
                  <Title order={3}>Travel Documents</Title>
                </Group>
                
                <Text c="dimmed">
                  Please upload your travel documents to secure your residency spot.
                </Text>

                <FileInput
                  label="E-Ticket / Flight Confirmation"
                  description="Upload your flight booking confirmation or e-ticket"
                  placeholder="Choose file..."
                  leftSection={<IconUpload size={16} />}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  {...form.getInputProps('eTicket')}
                />

                <FileInput
                  label="Health Insurance Proof"
                  description="World Nomads, SafetyWing, or other international health insurance"
                  placeholder="Choose file..."
                  leftSection={<IconShield size={16} />}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  {...form.getInputProps('healthInsurance')}
                />
              </Stack>
            </Card>

            {/* Residency Commitments */}
            <Card shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group gap="sm">
                  <IconUsers size={24} color="green" />
                  <Title order={3}>Residency Commitments</Title>
                </Group>
                
                <Text c="dimmed">
                  Please confirm your participation in key residency activities.
                </Text>

                <Checkbox
                  label="I will take part in as many experiments in the residency as possible"
                  description="Active participation in collaborative experiments is a core part of the residency experience"
                  required
                  {...form.getInputProps('participateExperiments', { type: 'checkbox' })}
                />

                <Checkbox
                  label="I will mint a Hypercert for my project, and distribute it to residents, mentors etc as part of the experiment"
                  description="Hypercerts are a key tool we're experimenting with for impact certification"
                  required
                  {...form.getInputProps('mintHypercert', { type: 'checkbox' })}
                />

                <Checkbox
                  label="I am interested in incubation for my project"
                  description="Optional: Express interest in potential incubation opportunities (not required)"
                  {...form.getInputProps('interestedIncubation', { type: 'checkbox' })}
                />
              </Stack>
            </Card>

            {/* Additional Information */}
            <Card shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group gap="sm">
                  <IconStar size={24} color="orange" />
                  <Title order={3}>Additional Information</Title>
                </Group>

                <Textarea
                  label="Dietary Requirements or Restrictions"
                  description="Let us know about any dietary needs, allergies, or food preferences"
                  placeholder="e.g., Vegetarian, gluten-free, allergic to nuts..."
                  minRows={2}
                  {...form.getInputProps('dietaryRequirements')}
                />

                <Textarea
                  label="Additional Comments"
                  description="Anything else you'd like us to know? Questions, special requests, etc."
                  placeholder="Optional comments..."
                  minRows={3}
                  {...form.getInputProps('additionalComments')}
                />
              </Stack>
            </Card>

            {/* Submit Button */}
            <Card shadow="sm" padding="lg" radius="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={500}>Ready to submit?</Text>
                  <Text size="sm" c="dimmed">
                    Make sure all required documents are uploaded and commitments are confirmed.
                  </Text>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  disabled={completionPercentage < 100}
                  leftSection={<IconCheck size={18} />}
                >
                  Complete Onboarding
                </Button>
              </Group>
            </Card>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
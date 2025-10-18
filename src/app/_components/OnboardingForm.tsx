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
  Textarea,
  Progress,
  Box,
  Loader,
  Center,
  TextInput,
  Radio,
  Slider,
  Divider,
  SimpleGrid,
  Accordion,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconShield,
  IconStar,
  IconCheck,
  IconX,
  IconUser,
  
  IconLanguage,
  IconBrain,
  IconPresentation,
  IconPalette,
  IconPhoto,
  IconClipboardCheck,
  IconHeart,
  IconEdit,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface OnboardingFormData {
  // Contact & Logistics
  bloodType: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  arrivalDateTime: string; // Use string for datetime-local inputs
  departureDateTime: string; // Use string for datetime-local inputs
  
  
  // Food & Dietary Needs
  dietType: string; // Use string for radio values
  dietTypeOther: string;
  allergiesIntolerances: string;
  
  // English Proficiency
  englishProficiencyLevel: number;
  
  // Knowledge Sharing, Community & Mentorship
  primaryGoals: string;
  skillsToGain: string;
  openToMentoring: string; // Use string for radio values
  mentorsToLearnFrom: string;
  organizationsToConnect: string;
  
  // Technical Workshop
  technicalWorkshopTitle: string;
  technicalWorkshopDescription: string;
  technicalWorkshopDuration: string;
  technicalWorkshopMaterials: string;
  
  // Beyond Work Activities
  beyondWorkInterests: string;
  beyondWorkTitle: string;
  beyondWorkDescription: string;
  beyondWorkDuration: string;
  beyondWorkMaterials: string;
  
  // Commitments & Confirmations
  participateExperiments: boolean;
  mintHypercert: boolean;
  interestedIncubation: boolean;
  interestedEIR: boolean;
  liabilityWaiverConsent: boolean;
  codeOfConductAgreement: boolean;
  communityActivitiesConsent: boolean;
  
  // Additional Information
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

  const form = useForm<OnboardingFormData>({
    initialValues: {
      // Contact & Logistics
      bloodType: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      arrivalDateTime: "",
      departureDateTime: "",
      
      // Food & Dietary Needs
      dietType: "",
      dietTypeOther: "",
      allergiesIntolerances: "",
      
      // English Proficiency
      englishProficiencyLevel: 80,
      
      // Knowledge Sharing, Community & Mentorship
      primaryGoals: "",
      skillsToGain: "",
      openToMentoring: "",
      mentorsToLearnFrom: "",
      organizationsToConnect: "",
      
      // Technical Workshop
      technicalWorkshopTitle: "",
      technicalWorkshopDescription: "",
      technicalWorkshopDuration: "",
      technicalWorkshopMaterials: "",
      
      // Beyond Work Activities
      beyondWorkInterests: "",
      beyondWorkTitle: "",
      beyondWorkDescription: "",
      beyondWorkDuration: "",
      beyondWorkMaterials: "",
      
      // Commitments & Confirmations
      participateExperiments: false,
      mintHypercert: false,
      interestedIncubation: false,
      interestedEIR: false,
      liabilityWaiverConsent: false,
      codeOfConductAgreement: false,
      communityActivitiesConsent: false,
      
      // Additional Information
      additionalComments: "",
    },
    validate: {
      emergencyContactName: (value) => (!value ? "Emergency contact name is required" : null),
      arrivalDateTime: (value) => (!value ? "Arrival date and time is required" : null),
      participateExperiments: (value) => (!value ? "This commitment is required for participation" : null),
      mintHypercert: (value) => (!value ? "This commitment is required for participation" : null),
      liabilityWaiverConsent: (value) => (!value ? "Liability waiver consent is required" : null),
      codeOfConductAgreement: (value) => (!value ? "Code of conduct agreement is required" : null),
      communityActivitiesConsent: (value) => (!value ? "Community activities consent is required" : null),
    },
  });

  // Initialize form with existing data if available
  useEffect(() => {
    if (onboardingData?.onboarding) {
      const existing = onboardingData.onboarding;
      
      // Helper to format dates for datetime-local inputs
      const formatDateTimeLocal = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      };
      
      form.setValues({
        // Contact & Logistics
        bloodType: existing.bloodType ?? "",
        emergencyContactName: existing.emergencyContactName ?? "",
        emergencyContactRelationship: existing.emergencyContactRelationship ?? "",
        emergencyContactPhone: existing.emergencyContactPhone ?? "",
        arrivalDateTime: formatDateTimeLocal(existing.arrivalDateTime),
        departureDateTime: formatDateTimeLocal(existing.departureDateTime),
        
        // Food & Dietary Needs
        dietType: existing.dietType ?? "",
        dietTypeOther: existing.dietTypeOther ?? "",
        allergiesIntolerances: existing.allergiesIntolerances ?? "",
        
        // English Proficiency
        englishProficiencyLevel: existing.englishProficiencyLevel ?? 80,
        
        // Knowledge Sharing, Community & Mentorship
        primaryGoals: existing.primaryGoals ?? "",
        skillsToGain: existing.skillsToGain ?? "",
        openToMentoring: existing.openToMentoring ?? "",
        mentorsToLearnFrom: existing.mentorsToLearnFrom ?? "",
        organizationsToConnect: existing.organizationsToConnect ?? "",
        
        // Technical Workshop
        technicalWorkshopTitle: existing.technicalWorkshopTitle ?? "",
        technicalWorkshopDescription: existing.technicalWorkshopDescription ?? "",
        technicalWorkshopDuration: existing.technicalWorkshopDuration ?? "",
        technicalWorkshopMaterials: existing.technicalWorkshopMaterials ?? "",
        
        // Beyond Work Activities
        beyondWorkInterests: existing.beyondWorkInterests ?? "",
        beyondWorkTitle: existing.beyondWorkTitle ?? "",
        beyondWorkDescription: existing.beyondWorkDescription ?? "",
        beyondWorkDuration: existing.beyondWorkDuration ?? "",
        beyondWorkMaterials: existing.beyondWorkMaterials ?? "",
        
        // Commitments & Confirmations
        participateExperiments: existing.participateExperiments ?? false,
        mintHypercert: existing.mintHypercert ?? false,
        interestedIncubation: existing.interestedIncubation ?? false,
        interestedEIR: (existing as { interestedEIR?: boolean } | null)?.interestedEIR ?? false,
        liabilityWaiverConsent: existing.liabilityWaiverConsent ?? false,
        codeOfConductAgreement: existing.codeOfConductAgreement ?? false,
        communityActivitiesConsent: existing.communityActivitiesConsent ?? false,
        
        // Additional Information
        additionalComments: existing.additionalComments ?? "",
      });
      
      if (existing.completed) {
        setIsSubmitted(true);
      }
    }
  }, [onboardingData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      // For now, we'll simulate file uploads with placeholder URLs
      // In a real implementation, you would upload files to cloud storage first
      
      // Helper to convert string to Date or undefined
      const parseDateTime = (dateStr: string) => {
        if (!dateStr) return undefined;
        return new Date(dateStr);
      };
      
      // Helper to convert empty strings to undefined
      const emptyToUndefined = (str: string) => str || undefined;
      
      await submitOnboarding.mutateAsync({
        applicationId,
        
        // Contact & Logistics
        bloodType: emptyToUndefined(values.bloodType),
        emergencyContactName: values.emergencyContactName,
        emergencyContactRelationship: emptyToUndefined(values.emergencyContactRelationship),
        emergencyContactPhone: emptyToUndefined(values.emergencyContactPhone),
        arrivalDateTime: parseDateTime(values.arrivalDateTime),
        departureDateTime: parseDateTime(values.departureDateTime),
        
        // Food & Dietary Needs
        dietType: emptyToUndefined(values.dietType) as "OMNIVORE" | "VEGETARIAN" | "VEGAN" | "OTHER" | undefined,
        dietTypeOther: emptyToUndefined(values.dietTypeOther),
        allergiesIntolerances: emptyToUndefined(values.allergiesIntolerances),
        
        // English Proficiency
        englishProficiencyLevel: values.englishProficiencyLevel,
        
        // Knowledge Sharing, Community & Mentorship
        primaryGoals: emptyToUndefined(values.primaryGoals),
        skillsToGain: emptyToUndefined(values.skillsToGain),
        openToMentoring: emptyToUndefined(values.openToMentoring) as "YES" | "NO" | "MAYBE" | undefined,
        mentorsToLearnFrom: emptyToUndefined(values.mentorsToLearnFrom),
        organizationsToConnect: emptyToUndefined(values.organizationsToConnect),
        
        // Technical Workshop
        technicalWorkshopTitle: emptyToUndefined(values.technicalWorkshopTitle),
        technicalWorkshopDescription: emptyToUndefined(values.technicalWorkshopDescription),
        technicalWorkshopDuration: emptyToUndefined(values.technicalWorkshopDuration),
        technicalWorkshopMaterials: emptyToUndefined(values.technicalWorkshopMaterials),
        
        // Beyond Work Activities
        beyondWorkInterests: emptyToUndefined(values.beyondWorkInterests),
        beyondWorkTitle: emptyToUndefined(values.beyondWorkTitle),
        beyondWorkDescription: emptyToUndefined(values.beyondWorkDescription),
        beyondWorkDuration: emptyToUndefined(values.beyondWorkDuration),
        beyondWorkMaterials: emptyToUndefined(values.beyondWorkMaterials),
        
        // Commitments & Confirmations
        participateExperiments: values.participateExperiments,
        mintHypercert: values.mintHypercert,
        interestedIncubation: values.interestedIncubation,
        liabilityWaiverConsent: values.liabilityWaiverConsent,
        codeOfConductAgreement: values.codeOfConductAgreement,
        communityActivitiesConsent: values.communityActivitiesConsent,
        
        // Additional Information
        additionalComments: emptyToUndefined(values.additionalComments),
      });
      
      notifications.show({
        title: "¡Onboarding Complete! / ¡Incorporación Completa!",
        message: "Thank you for completing your onboarding. We'll be in touch soon with more details. / Gracias por completar tu incorporación. Nos pondremos en contacto pronto con más detalles.",
        color: "green",
        icon: <IconCheck />,
      });
      
      setIsSubmitted(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "There was an error submitting your onboarding form. Please try again. / Hubo un error al enviar tu formulario. Por favor intenta de nuevo.";
      notifications.show({
        title: "Submission Failed / Error en el Envío",
        message: errorMessage,
        color: "red",
        icon: <IconX />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion percentage for key required fields
  const requiredFields = 9; // Core required fields
  const completedFields = [
    form.values.emergencyContactName,
    form.values.arrivalDateTime,
    form.values.participateExperiments,
    form.values.mintHypercert,
    form.values.liabilityWaiverConsent,
    form.values.codeOfConductAgreement,
    form.values.communityActivitiesConsent,
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
              We&apos;ll be in touch soon with more details about the residency.
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Bilingual Header */}
        <Card shadow="sm" padding="xl" radius="md" style={{ 
          background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-purple-0) 100%)' 
        }}>
          <Stack gap="lg">
            <div>
              <Title order={1} ta="center" c="blue.8" mb="sm">
                Congratulations! / ¡Felicitaciones! 🎉
              </Title>
              <Text size="lg" ta="center" fw={600} c="blue.7" mb="xs">
                You&apos;re in! You&apos;ve been selected for the 2025 Builder Residency.
              </Text>
              <Text size="lg" ta="center" fw={600} c="blue.7" mb="md">
                ¡Lo lograste! Has sido aceptado/a en la Residencia de Desarrolladores 2025.
              </Text>
              
              <Text size="md" ta="center" c="dimmed" style={{ lineHeight: 1.6 }}>
                We can&apos;t wait to welcome you to Buenos Aires for three weeks of collaboration, creativity, and community. 
                This form will help us get to know you better, prepare for your arrival, and make sure your experience is the best it can be.
              </Text>
              <Text size="md" ta="center" c="dimmed" mt="sm" style={{ lineHeight: 1.6 }}>
                Estamos felices de recibirte en Buenos Aires para tres semanas de colaboración, creatividad y comunidad. 
                Este formulario nos ayudará a conocerte mejor, preparar tu llegada y asegurar que tu experiencia sea la mejor posible.
              </Text>
            </div>

            <Divider />
            
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              <div>
                <Text fw={600} c="blue.7">Dates / Fechas:</Text>
                <Text size="sm">October 24 – November 14, 2025</Text>
              </div>
              <div>
                <Text fw={600} c="blue.7">Location / Ubicación:</Text>
                <Text size="sm">Senador Dupont, JC23+9F Tigre, Buenos Aires Province, Argentina</Text>
              </div>
              <div>
                <Text fw={600} c="blue.7">Telegram Group / Grupo Telegram:</Text>
                <Text size="sm">
                  <a href="https://t.me/+L_kFV7eIdQ9mN2Iy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    Join Group / Unirse al Grupo
                  </a>
                </Text>
              </div>
            </SimpleGrid>

            <Divider />
            
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500}>Progress / Progreso</Text>
                <Text size="sm" c="dimmed">
                  {completedFields}/{requiredFields} required items completed / elementos requeridos completados
                </Text>
              </div>
              <Box w={200}>
                <Progress value={completionPercentage} size="lg" radius="xl" color="blue" />
                <Text size="xs" c="dimmed" ta="center" mt={4}>
                  {Math.round(completionPercentage)}%
                </Text>
              </Box>
            </Group>
          </Stack>
        </Card>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Accordion variant="filled" radius="md" defaultValue="contact">
            {/* Contact & Logistics */}
            <Accordion.Item value="contact">
              <Accordion.Control icon={<IconUser size={20} />}>
                <Title order={3}>Contact & Logistics / Contacto y Logística</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Essential information for your arrival and stay. / Información esencial para tu llegada y estadía.
                  </Text>


                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Blood Type / Tipo de Sangre"
                      description="Optional, for medical emergencies / Opcional, para emergencias médicas"
                      placeholder="e.g., O+, A-, AB+"
                      {...form.getInputProps('bloodType')}
                    />

                    <TextInput
                      label="Emergency Contact Name / Nombre de Contacto de Emergencia"
                      description="Someone we can contact in case of emergency / Alguien a quien podamos contactar en caso de emergencia"
                      placeholder="e.g., Jane Doe"
                      required
                      {...form.getInputProps('emergencyContactName')}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Emergency Contact Relationship / Relación del Contacto de Emergencia"
                      description="Relationship to you / Relación contigo"
                      placeholder="e.g., Parent, Spouse, Friend"
                      {...form.getInputProps('emergencyContactRelationship')}
                    />

                    <TextInput
                      label="Emergency Contact Phone / Teléfono de Contacto de Emergencia"
                      description="Include country code / Incluir código de país"
                      placeholder="e.g., +1-555-123-4567"
                      {...form.getInputProps('emergencyContactPhone')}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Arrival Date & Time / Fecha y Hora de Llegada"
                      description="When will you arrive in Buenos Aires? / ¿Cuándo llegarás a Buenos Aires?"
                      placeholder="e.g., Oct 24, 2025 at 3:00 PM"
                      type="datetime-local"
                      required
                      {...form.getInputProps('arrivalDateTime')}
                    />

                    <TextInput
                      label="Departure Date & Time / Fecha y Hora de Partida"
                      description="When will you depart? / ¿Cuándo partirás?"
                      placeholder="e.g., Nov 14, 2025 at 10:00 AM"
                      type="datetime-local"
                      {...form.getInputProps('departureDateTime')}
                    />
                  </SimpleGrid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>


            {/* Food & Dietary Needs */}
            <Accordion.Item value="food">
              <Accordion.Control icon={<IconHeart size={20} />}>
                <Title order={3}>Food & Dietary Needs / Alimentación y Necesidades Dietéticas</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Help us accommodate your dietary preferences and needs. / Ayúdanos a acomodar tus preferencias y necesidades dietéticas.
                  </Text>

                  <Radio.Group
                    label="Diet Type / Tipo de Dieta"
                    description="What best describes your diet? / ¿Qué describe mejor tu dieta?"
                    {...form.getInputProps('dietType')}
                  >
                    <Stack mt="xs" gap="xs">
                      <Radio value="OMNIVORE" label="Omnivore / Omnívoro" />
                      <Radio value="VEGETARIAN" label="Vegetarian / Vegetariano" />
                      <Radio value="VEGAN" label="Vegan / Vegano" />
                      <Radio value="OTHER" label="Other / Otro" />
                    </Stack>
                  </Radio.Group>

                  {form.values.dietType === "OTHER" && (
                    <TextInput
                      label="Please specify / Por favor especifica"
                      placeholder="e.g., Pescatarian, Keto, etc."
                      {...form.getInputProps('dietTypeOther')}
                    />
                  )}

                  <Textarea
                    label="Allergies & Intolerances / Alergias e Intolerancias"
                    description="List any food allergies or intolerances / Lista cualquier alergia o intolerancia alimentaria"
                    placeholder="e.g., Nuts, shellfish, lactose intolerant... / ej., Nueces, mariscos, intolerante a la lactosa..."
                    minRows={2}
                    {...form.getInputProps('allergiesIntolerances')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* English Proficiency */}
            <Accordion.Item value="english">
              <Accordion.Control icon={<IconLanguage size={20} />}>
                <Title order={3}>English Proficiency / Competencia en Inglés</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Help us understand your English comfort level for workshops and collaboration. / Ayúdanos a entender tu nivel de comodidad con el inglés para talleres y colaboración.
                  </Text>

                  <div>
                    <Text fw={500} mb="xs">
                      English Proficiency Level / Nivel de Competencia en Inglés: {form.values.englishProficiencyLevel}%
                    </Text>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: 'Beginner / Principiante' },
                        { value: 50, label: 'Intermediate / Intermedio' },
                        { value: 100, label: 'Fluent / Fluido' }
                      ]}
                      {...form.getInputProps('englishProficiencyLevel')}
                    />
                    <Text size="sm" c="dimmed" mt="xs">
                      Be honest - we want to support you! / Sé honesto/a - ¡queremos apoyarte!
                    </Text>
                  </div>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Knowledge Sharing, Community & Mentorship */}
            <Accordion.Item value="community">
              <Accordion.Control icon={<IconBrain size={20} />}>
                <Title order={3}>Knowledge Sharing & Community / Intercambio de Conocimiento y Comunidad</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Tell us about your goals and how you&apos;d like to contribute to the community. / Cuéntanos sobre tus objetivos y cómo te gustaría contribuir a la comunidad.
                  </Text>

                  <Textarea
                    label="Primary Goals / Objetivos Principales"
                    description="What are your main goals for the residency? / ¿Cuáles son tus objetivos principales para la residencia?"
                    placeholder="e.g., Build connections, advance my project, learn new skills... / ej., Crear conexiones, avanzar mi proyecto, aprender nuevas habilidades..."
                    minRows={3}
                    {...form.getInputProps('primaryGoals')}
                  />

                  <Textarea
                    label="Skills to Gain / Habilidades a Adquirir"
                    description="What specific skills do you hope to develop? / ¿Qué habilidades específicas esperas desarrollar?"
                    placeholder="e.g., Solidity programming, governance design, fundraising... / ej., Programación en Solidity, diseño de gobernanza, recaudación de fondos..."
                    minRows={2}
                    {...form.getInputProps('skillsToGain')}
                  />

                  <Radio.Group
                    label="Open to Mentoring Others? / ¿Dispuesto/a a Mentorear a Otros?"
                    description="Would you be interested in mentoring other residents? / ¿Te interesaría mentorear a otros residentes?"
                    {...form.getInputProps('openToMentoring')}
                  >
                    <Group mt="xs">
                      <Radio value="YES" label="Yes, I&apos;d love to! / ¡Sí, me encantaría!" />
                      <Radio value="MAYBE" label="Maybe / Tal vez" />
                      <Radio value="NO" label="No, I prefer to focus on learning / No, prefiero enfocarme en aprender" />
                    </Group>
                  </Radio.Group>

                  <Textarea
                    label="Mentors to Learn From / Mentores de Quienes Aprender"
                    description="Are there specific people or types of experts you&apos;d like to connect with? / ¿Hay personas específicas o tipos de expertos con quienes te gustaría conectar?"
                    placeholder="e.g., Smart contract auditors, DAO founders, impact measurement experts... / ej., Auditores de contratos inteligentes, fundadores de DAO, expertos en medición de impacto..."
                    minRows={2}
                    {...form.getInputProps('mentorsToLearnFrom')}
                  />

                  <Textarea
                    label="Organizations to Connect With / Organizaciones para Conectar"
                    description="Any specific organizations or communities you&apos;d like to connect with? / ¿Alguna organización o comunidad específica con la que te gustaría conectar?"
                    placeholder="e.g., Gitcoin, Protocol Labs, local blockchain communities... / ej., Gitcoin, Protocol Labs, comunidades locales de blockchain..."
                    minRows={2}
                    {...form.getInputProps('organizationsToConnect')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Technical Workshop */}
            <Accordion.Item value="workshop">
              <Accordion.Control icon={<IconPresentation size={20} />}>
                <Title order={3}>Technical Workshop / Taller Técnico</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Share your expertise! Propose a technical or non-technical workshop you could run. / ¡Comparte tu experiencia! Propón un taller técnico que podrías dirigir.
                  </Text>

                  <TextInput
                    label="Workshop Title / Título del Taller"
                    description="What would you call your workshop? / ¿Cómo llamarías a tu taller?"
                    placeholder="e.g., Introduction to Zero-Knowledge Proofs / ej., Introducción a las Pruebas de Conocimiento Cero"
                    {...form.getInputProps('technicalWorkshopTitle')}
                  />

                  <Textarea
                    label="Workshop Description / Descripción del Taller"
                    description="What would you teach and why is it valuable? / ¿Qué enseñarías y por qué es valioso?"
                    placeholder="Describe the content, learning objectives, and audience... / Describe el contenido, objetivos de aprendizaje y audiencia..."
                    minRows={4}
                    {...form.getInputProps('technicalWorkshopDescription')}
                  />

                  <TextInput
                    label="Duration / Duración"
                    description="How long would your workshop be? / ¿Cuánto duraría tu taller?"
                    placeholder="e.g., 2 hours, Half day, 3 sessions of 1 hour each"
                    {...form.getInputProps('technicalWorkshopDuration')}
                  />

                  <Textarea
                    label="Materials Needed / Materiales Necesarios"
                    description="What equipment or setup would you need? / ¿Qué equipo o configuración necesitarías?"
                    placeholder="e.g., Projector, laptops with specific software, whiteboards... / ej., Proyector, laptops con software específico, pizarras..."
                    minRows={2}
                    {...form.getInputProps('technicalWorkshopMaterials')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Beyond Work Activities */}
            <Accordion.Item value="beyond">
              <Accordion.Control icon={<IconPalette size={20} />}>
                <Title order={3}>Beyond Work Activities / Actividades Más Allá del Trabajo</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Balance is important! What non-work activity would you like to share or organize? / ¡El equilibrio es importante! ¿Qué actividad no relacionada con el trabajo te gustaría compartir u organizar?
                  </Text>

                  <Textarea
                    label="Interests / Intereses"
                    description="What do you enjoy doing outside of work? / ¿Qué disfrutas hacer fuera del trabajo?"
                    placeholder="e.g., Photography, cooking, music, sports, art... / ej., Fotografía, cocina, música, deportes, arte..."
                    minRows={2}
                    {...form.getInputProps('beyondWorkInterests')}
                  />

                  <TextInput
                    label="Activity Title / Título de la Actividad"
                    description="What activity could you lead or organize? / ¿Qué actividad podrías liderar u organizar?"
                    placeholder="e.g., Morning Yoga Session, Photography Walk, Cooking Class... / ej., Sesión de Yoga Matutina, Caminata Fotográfica, Clase de Cocina..."
                    {...form.getInputProps('beyondWorkTitle')}
                  />

                  <Textarea
                    label="Activity Description / Descripción de la Actividad"
                    description="Describe what participants would do and enjoy / Describe qué harían y disfrutarían los participantes"
                    placeholder="What would make this fun and engaging for the group? / ¿Qué haría esto divertido y atractivo para el grupo?"
                    minRows={3}
                    {...form.getInputProps('beyondWorkDescription')}
                  />

                  <TextInput
                    label="Duration / Duración"
                    description="How long would this activity take? / ¿Cuánto tiempo tomaría esta actividad?"
                    placeholder="e.g., 1 hour, Evening session, Weekend morning"
                    {...form.getInputProps('beyondWorkDuration')}
                  />

                  <Textarea
                    label="Materials Needed / Materiales Necesarios"
                    description="What would you need to make this happen? / ¿Qué necesitarías para que esto suceda?"
                    placeholder="e.g., Yoga mats, camera equipment, kitchen access, music speakers... / ej., Colchonetas de yoga, equipo de cámara, acceso a cocina, altavoces..."
                    minRows={2}
                    {...form.getInputProps('beyondWorkMaterials')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Profile Setup */}
            <Accordion.Item value="profile">
              <Accordion.Control icon={<IconPhoto size={20} />}>
                <Title order={3}>Profile Setup / Configuración de Perfil</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Complete your profile to connect with other residents and showcase your work. / Completa tu perfil para conectar con otros residentes y mostrar tu trabajo.
                  </Text>

                  <Card withBorder p="lg" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconUser size={20} color="blue" />
                        <Text fw={600} c="blue.7">Profile Management / Gestión de Perfil</Text>
                      </Group>
                      
                      <Text size="sm" c="dimmed">
                        Please update your profile information including your bio, headshot, and project details through the platform profile system.
                      </Text>
                      <Text size="sm" c="dimmed">
                        Por favor actualiza tu información de perfil incluyendo tu biografía, foto de perfil y detalles de proyectos a través del sistema de perfiles de la plataforma.
                      </Text>

                      <Group gap="md">
                        <Button
                          component="a"
                          href="https://platform.fundingthecommons.io/profiles/me"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          color="blue"
                          leftSection={<IconUser size={16} />}
                        >
                          View My Profile / Ver Mi Perfil
                        </Button>
                        <Button
                          component="a"
                          href="https://platform.fundingthecommons.io/profile/edit"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="filled"
                          color="blue"
                          leftSection={<IconEdit size={16} />}
                        >
                          Edit Profile / Editar Perfil
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Final Confirmations */}
            <Accordion.Item value="confirmations">
              <Accordion.Control icon={<IconClipboardCheck size={20} />}>
                <Title order={3}>Final Confirmations / Confirmaciones Finales</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Please read and confirm your agreement with our policies. / Por favor lee y confirma tu acuerdo con nuestras políticas.
                  </Text>

                  {/* Residency Commitments */}
                  <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconHeart size={20} color="blue" />
                        <Text fw={600} c="blue.7">Residency Commitments / Compromisos de la Residencia</Text>
                      </Group>

                      <Checkbox
                        label="I commit to full participation in the residency, and will try to make it as productive and successful for myself and other participants as I can / Me comprometo a participar plenamente en la residencia y trataré de hacerla lo más productiva y exitosa posible para mí y otros participantes"
                        description="Active participation in collaborative experiments is a core part of the residency experience / La participación activa en experimentos colaborativos es una parte central de la experiencia de residencia"
                        required
                        {...form.getInputProps('participateExperiments', { type: 'checkbox' })}
                      />

                      <Checkbox
                        label="I commit to documenting my work and any projects I work on before, during and after the residency in order to help document and evaluate the impact of the residency and my contribution / Me comprometo a documentar mi trabajo y cualquier proyecto en el que trabaje antes, durante y después de la residencia para ayudar a documentar y evaluar el impacto de la residencia y mi contribución"
                        description="This includes setting milestones, minting hypercerts, making attestations etc. / Esto incluye establecer hitos, crear hypercerts, hacer atestaciones, etc."
                        required
                        {...form.getInputProps('mintHypercert', { type: 'checkbox' })}
                      />

                      <Checkbox
                        label="I am interested in incubation for my project / Estoy interesado/a en incubación para mi proyecto"
                        description="Optional: Express interest in potential incubation opportunities / Opcional: Expresa interés en oportunidades potenciales de incubación"
                        {...form.getInputProps('interestedIncubation', { type: 'checkbox' })}
                      />

                      <Checkbox
                        label={
                          <Text>
                            I&apos;m interested in the{" "}
                            <Text 
                              component="a" 
                              href="https://platform.fundingthecommons.io/events/entrepreneur-in-residency" 
                              target="_blank" 
                              c="blue" 
                              td="underline"
                            >
                              Entrepreneur in Residency (EIR) program
                            </Text>
                            {" "} / Estoy interesado/a en el programa de Emprendedor en Residencia (EIR)
                          </Text>
                        }
                        description="Optional: Express interest in the EIR program at Commons Lab / Opcional: Expresa interés en el programa EIR en Commons Lab"
                        {...form.getInputProps('interestedEIR', { type: 'checkbox' })}
                      />
                    </Stack>
                  </Card>

                  {/* Legal & Safety */}
                  <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-orange-0)' }}>
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconShield size={20} color="orange" />
                        <Text fw={600} c="orange.7">Legal & Safety / Legal y Seguridad</Text>
                      </Group>

                      <Checkbox
                        label="I consent to the liability waiver and understand the risks / Consiento la exención de responsabilidad y entiendo los riesgos"
                        description="I understand that I participate at my own risk and release FtC from liability / Entiendo que participo bajo mi propio riesgo y libero a FtC de responsabilidad"
                        required
                        {...form.getInputProps('liabilityWaiverConsent', { type: 'checkbox' })}
                      />

                      <Checkbox
                        label="I agree to follow the Code of Conduct / Acepto seguir el Código de Conducta"
                        description="I commit to maintaining a respectful, inclusive, and safe environment / Me comprometo a mantener un ambiente respetuoso, inclusivo y seguro"
                        required
                        {...form.getInputProps('codeOfConductAgreement', { type: 'checkbox' })}
                      />

                      <Checkbox
                        label="I consent to participation in community activities and documentation / Consiento la participación en actividades comunitarias y documentación"
                        description="This may include photos, videos, and other content for community building / Esto puede incluir fotos, videos y otro contenido para la construcción de comunidad"
                        required
                        {...form.getInputProps('communityActivitiesConsent', { type: 'checkbox' })}
                      />
                    </Stack>
                  </Card>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Additional Information */}
            <Accordion.Item value="additional">
              <Accordion.Control icon={<IconStar size={20} />}>
                <Title order={3}>Additional Information / Información Adicional</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Anything else you&apos;d like us to know? / ¿Algo más que te gustaría que sepamos?
                  </Text>

                  <Textarea
                    label="Additional Comments / Comentarios Adicionales"
                    description="Questions, special requests, accessibility needs, or anything else... / Preguntas, solicitudes especiales, necesidades de accesibilidad, o cualquier otra cosa..."
                    placeholder="Optional comments... / Comentarios opcionales..."
                    minRows={4}
                    {...form.getInputProps('additionalComments')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {/* Submit Button */}
          <Card shadow="sm" padding="lg" radius="md" mt="xl">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500}>Ready to submit? / ¿Listo para enviar?</Text>
                <Text size="sm" c="dimmed">
                  Make sure all required items are completed. / Asegúrate de que todos los elementos requeridos estén completados.
                </Text>
              </div>
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                disabled={completionPercentage < 100}
                leftSection={<IconCheck size={18} />}
              >
                Complete Onboarding / Completar Incorporación
              </Button>
            </Group>
          </Card>
        </form>
      </Stack>
    </Container>
  );
}
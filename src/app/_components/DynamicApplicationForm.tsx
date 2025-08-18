"use client";

import { useState, useEffect } from "react";
import { 
  Stack, 
  Text, 
  TextInput, 
  Textarea,
  Select,
  MultiSelect,
  NumberInput,
  Checkbox,
  Button,
  Group,
  Alert,
  Loader,
  Paper,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { 
  IconDeviceFloppy, 
  IconSend, 
  IconAlertCircle,
  IconCheck 
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

type Question = {
  id: string;
  questionKey: string;
  questionEn: string;
  questionEs: string;
  questionType: "TEXT" | "TEXTAREA" | "EMAIL" | "PHONE" | "URL" | "SELECT" | "MULTISELECT" | "CHECKBOX" | "NUMBER";
  required: boolean;
  options: string[];
  order: number;
};

type ExistingApplication = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED";
  language: string;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
    };
  }>;
};

interface DynamicApplicationFormProps {
  eventId: string;
  existingApplication?: ExistingApplication;
  language: "en" | "es";
  onSubmitted?: () => void;
  onUpdated?: () => void;
}

export default function DynamicApplicationForm({
  eventId,
  existingApplication,
  language,
  onSubmitted,
  onUpdated,
}: DynamicApplicationFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(existingApplication?.id ?? null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Fetch questions for the event
  const { data: questions, isLoading: questionsLoading } = api.application.getEventQuestions.useQuery({
    eventId,
  });

  // API mutations
  const createApplication = api.application.createApplication.useMutation();
  const updateResponse = api.application.updateResponse.useMutation();
  const submitApplication = api.application.submitApplication.useMutation();

  // Simple state management instead of Mantine form
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  // Initialize form values when questions load
  useEffect(() => {
    if (questions && questions.length > 0) {
      const initialValues: Record<string, unknown> = {};

      questions.forEach((question) => {
        // Set initial value from existing response or empty
        const existingResponse = existingApplication?.responses.find(
          r => r.question.questionKey === question.questionKey
        );
        
        let initialValue: unknown = "";
        if (existingResponse) {
          if (question.questionType === "MULTISELECT") {
            try {
              initialValue = JSON.parse(existingResponse.answer) as unknown[];
            } catch {
              initialValue = [];
            }
          } else if (question.questionType === "CHECKBOX") {
            initialValue = existingResponse.answer === "true";
          } else if (question.questionType === "NUMBER") {
            initialValue = parseFloat(existingResponse.answer) || 0;
          } else {
            initialValue = existingResponse.answer;
          }
        } else {
          if (question.questionType === "MULTISELECT") {
            initialValue = [];
          } else if (question.questionType === "CHECKBOX") {
            initialValue = false;
          } else if (question.questionType === "NUMBER") {
            initialValue = 0;
          } else {
            initialValue = "";
          }
        }

        initialValues[question.questionKey] = initialValue;
      });

      setFormValues(initialValues);
    }
  }, [questions, existingApplication]);

  // Auto-save functionality
  const autoSave = async (questionKey: string, value: unknown) => {
    if (!applicationId || !questions) return;

    const question = questions.find(q => q.questionKey === questionKey);
    if (!question) return;

    setIsSaving(true);
    
    try {
      let answerValue: string;
      if (question.questionType === "MULTISELECT") {
        answerValue = JSON.stringify(value);
      } else if (question.questionType === "CHECKBOX") {
        answerValue = String(value);
      } else {
        answerValue = String(value);
      }

      await updateResponse.mutateAsync({
        applicationId,
        questionId: question.id,
        answer: answerValue,
      });

      setLastSaved(new Date());
      onUpdated?.();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save your response",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form field changes
  const handleFieldChange = async (questionKey: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [questionKey]: value }));
    
    // Clear validation error for this field if it now has a value
    if (validationErrors[questionKey]) {
      const hasValue = value && (
        (typeof value === "string" && value.trim()) ||
        (Array.isArray(value) && value.length > 0) ||
        (typeof value === "boolean" && value) ||
        (typeof value === "number")
      );
      
      if (hasValue) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[questionKey];
          return newErrors;
        });
      }
    }
    
    // Create application if it doesn't exist yet
    if (!applicationId) {
      try {
        await ensureApplication();
      } catch (error) {
        console.error('Failed to create application:', error);
      }
    }
    
    // Auto-save after a short delay
    setTimeout(() => {
      void autoSave(questionKey, value);
    }, 1000);
  };

  // Create application if it doesn't exist
  const ensureApplication = async () => {
    if (applicationId) return applicationId;

    try {
      const application = await createApplication.mutateAsync({
        eventId,
        language,
      });
      setApplicationId(application.id);
      return application.id;
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create application",
        color: "red",
        icon: <IconAlertCircle />,
      });
      throw error;
    }
  };

  // Validate form fields
  const validateForm = () => {
    if (!questions) return false;
    
    const errors: Record<string, string> = {};
    const requiredQuestions = questions.filter(q => q.required);
    
    for (const question of requiredQuestions) {
      const value = formValues[question.questionKey];
      const questionText = language === "es" ? question.questionEs : question.questionEn;
      
      if (question.questionType === "MULTISELECT") {
        if (!Array.isArray(value) || value.length === 0) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      } else if (question.questionType === "CHECKBOX") {
        if (!value) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      } else {
        if (!value || (typeof value === "string" && !value.trim())) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitAttempted(true);
    
    // Always ensure application exists first
    let appId: string;
    try {
      appId = await ensureApplication();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create application",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }
    
    if (!validateForm()) {
      notifications.show({
        title: "Please Complete Required Fields",
        message: "All fields marked in red must be completed before submitting",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    try {
      await submitApplication.mutateAsync({
        applicationId: appId,
      });

      notifications.show({
        title: "Success!",
        message: "Your application has been submitted successfully",
        color: "green",
        icon: <IconCheck />,
      });

      onSubmitted?.();
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to submit application",
        color: "red",
        icon: <IconAlertCircle />,
      });
    }
  };

  // Render individual question
  const renderQuestion = (question: Question) => {
    const questionText = language === "es" ? question.questionEs : question.questionEn;
    const currentValue = formValues[question.questionKey] ?? "";
    const hasError = submitAttempted && validationErrors[question.questionKey];
    const errorMessage = validationErrors[question.questionKey];

    switch (question.questionType) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "URL":
        return (
          <TextInput
            key={question.id}
            label={questionText}
            required={question.required}
            type={question.questionType === "EMAIL" ? "email" : 
                  question.questionType === "URL" ? "url" : 
                  question.questionType === "PHONE" ? "tel" : "text"}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.value)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            key={question.id}
            label={questionText}
            required={question.required}
            rows={4}
            autosize
            minRows={3}
            maxRows={10}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.value)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );

      case "SELECT":
        return (
          <Select
            key={question.id}
            data={question.options}
            searchable
            clearable={!question.required}
            label={questionText}
            required={question.required}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(value) => void handleFieldChange(question.questionKey, value ?? "")}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );

      case "MULTISELECT":
        return (
          <MultiSelect
            key={question.id}
            data={question.options}
            searchable
            clearable={!question.required}
            label={questionText}
            required={question.required}
            value={Array.isArray(currentValue) ? currentValue : []}
            onChange={(value) => void handleFieldChange(question.questionKey, value)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );

      case "NUMBER":
        return (
          <NumberInput
            key={question.id}
            min={0}
            max={10}
            label={questionText}
            required={question.required}
            value={typeof currentValue === "number" ? currentValue : ""}
            onChange={(value) => void handleFieldChange(question.questionKey, value || 0)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );

      case "CHECKBOX":
        return (
          <div key={question.id}>
            <Checkbox
              label={questionText}
              checked={Boolean(currentValue)}
              onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.checked)}
              error={hasError ? errorMessage : undefined}
            />
            {hasError && (
              <Text size="sm" c="red" mt="xs">
                {errorMessage}
              </Text>
            )}
          </div>
        );

      default:
        return (
          <TextInput
            key={question.id}
            label={questionText}
            required={question.required}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.value)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        );
    }
  };

  if (questionsLoading) {
    return (
      <Paper p="xl">
        <Stack align="center" gap="md">
          <Loader />
          <Text c="dimmed">Loading application form...</Text>
        </Stack>
      </Paper>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Alert color="yellow" icon={<IconAlertCircle />}>
        No application questions are available for this event.
      </Alert>
    );
  }

  const canEdit = !existingApplication || existingApplication.status === "DRAFT";
  const isSubmitted = existingApplication && existingApplication.status !== "DRAFT";

  return (
    <div>
      <Stack gap="lg">
        {/* Auto-save indicator */}
        {canEdit && applicationId && (
          <Group justify="space-between">
            <Group gap="xs">
              {isSaving ? (
                <>
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">Saving...</Text>
                </>
              ) : lastSaved ? (
                <>
                  <IconDeviceFloppy size={16} />
                  <Text size="sm" c="dimmed">
                    Last saved at {lastSaved.toLocaleTimeString()}
                  </Text>
                </>
              ) : null}
            </Group>
          </Group>
        )}

        {/* Application form questions */}
        <Stack gap="md">
          {questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <div key={question.id}>
                {canEdit ? renderQuestion(question) : (
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      {language === "es" ? question.questionEs : question.questionEn}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {existingApplication?.responses.find(
                        r => r.question.questionKey === question.questionKey
                      )?.answer ?? "No response"}
                    </Text>
                  </Stack>
                )}
                {index < questions.length - 1 && <Divider />}
              </div>
            ))}
        </Stack>

        {/* Form actions */}
        {canEdit && (
          <Group justify="flex-end" mt="xl">
            <Button
              onClick={handleSubmit}
              size="lg"
              leftSection={<IconSend size={16} />}
              loading={submitApplication.isPending}
            >
              {language === "es" ? "Enviar Aplicación" : "Submit Application"}
            </Button>
          </Group>
        )}

        {isSubmitted && (
          <Alert color="blue" icon={<IconCheck />}>
            {language === "es" 
              ? "Tu aplicación ha sido enviada y está siendo revisada."
              : "Your application has been submitted and is under review."
            }
          </Alert>
        )}
      </Stack>
    </div>
  );
}
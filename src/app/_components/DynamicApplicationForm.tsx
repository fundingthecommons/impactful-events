"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import ApplicationProgressIndicator from "./ApplicationProgressIndicator";
import ApplicationCompletionStatus from "./ApplicationCompletionStatus";

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
  userEmail?: string;
  onSubmitted?: () => void;
  onUpdated?: () => void;
}

export default function DynamicApplicationForm({
  eventId,
  existingApplication,
  language,
  userEmail,
  onSubmitted,
  onUpdated,
}: DynamicApplicationFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(existingApplication?.id ?? null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [wasRecentlyReverted, setWasRecentlyReverted] = useState(false);
  const [isSubmittingOrSubmitted, setIsSubmittingOrSubmitted] = useState(
    Boolean(existingApplication?.status && existingApplication.status !== "DRAFT")
  );
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const prevCompletionPercentage = useRef<number>(-1); // -1 means uninitialized

  // Fetch questions for the event
  const { data: questions, isLoading: questionsLoading } = api.application.getEventQuestions.useQuery({
    eventId,
  });

  // Fetch application completion status
  const { data: completionStatus, refetch: refetchCompletion } = api.application.getApplicationCompletion.useQuery(
    { applicationId: applicationId! },
    { enabled: !!applicationId }
  );

  // Fetch fresh application data to ensure status is current
  const { data: freshApplicationData, refetch: refetchApplication } = api.application.getApplication.useQuery(
    { eventId },
    { enabled: !!applicationId }
  );

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
          // Auto-fill email field with user's email
          if (question.questionKey === "email" && userEmail) {
            initialValue = userEmail;
          } else if (question.questionType === "MULTISELECT") {
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
  }, [questions, existingApplication, userEmail]);

  // Check if this is the first time viewing this application in this session
  const isFirstTimeInSession = !sessionStorage.getItem(`app-${eventId}-viewed`);

  // Mark that this application has been viewed in this session
  useEffect(() => {
    if (existingApplication && !isFirstTimeInSession) {
      sessionStorage.setItem(`app-${eventId}-viewed`, 'true');
    }
  }, [existingApplication, eventId, isFirstTimeInSession]);

  // Use fresh completionStatus data instead of stale existingApplication prop
  const currentStatus = completionStatus?.status ?? freshApplicationData?.status ?? existingApplication?.status ?? "DRAFT";
  
  // Status validation safeguard
  const validStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"];
  const safeCurrentStatus = validStatuses.includes(currentStatus) ? currentStatus : "DRAFT";
  
  const canEdit = safeCurrentStatus === "DRAFT" || safeCurrentStatus === "SUBMITTED";
  const isSubmitted = Boolean(safeCurrentStatus !== "DRAFT") || isSubmittingOrSubmitted;

  // Track status changes to detect reversion from SUBMITTED to DRAFT
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevStatusRef.current === "SUBMITTED" && safeCurrentStatus === "DRAFT") {
      setWasRecentlyReverted(true);
      // Reset local submission state to allow completion components to show again
      setIsSubmittingOrSubmitted(false);
      console.log('📝 Status reverted from SUBMITTED to DRAFT - application needs re-submission, UI re-enabled');
      
      // Clear the reversion flag after a few seconds
      setTimeout(() => {
        setWasRecentlyReverted(false);
      }, 10000);
    }
    prevStatusRef.current = safeCurrentStatus;
  }, [safeCurrentStatus]);

  // Show completion notification only when application actually transitions to 100% complete
  useEffect(() => {
    if (completionStatus && applicationId) {
      const currentPercentage = completionStatus.completionPercentage;
      const previousPercentage = prevCompletionPercentage.current;
      
      // Only show notification when completion percentage goes from <100% to 100%
      // (not on initial page load with already-complete applications)
      if (previousPercentage >= 0 && previousPercentage < 100 && currentPercentage === 100) {
        notifications.show({
          title: "Application Complete! 🎉",
          message: `All ${completionStatus.totalFields} required fields have been filled. Your application is ready to submit!`,
          color: "green",
          icon: <IconCheck />,
          autoClose: 5000,
        });
        console.log(`🎉 Application ${applicationId} completed - transition from ${previousPercentage}% to 100%`);
      }
      
      // Update the previous percentage for next comparison
      if (currentPercentage >= 0) {
        prevCompletionPercentage.current = currentPercentage;
      }
    }
  }, [completionStatus, applicationId]);

  // Auto-save functionality
  const autoSave = useCallback(async (questionKey: string, value: unknown) => {
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
      
      // Refetch both completion status and fresh application data
      void refetchCompletion();
      void refetchApplication();
      
      // Check if status might have been reverted and show notification
      if (safeCurrentStatus === "SUBMITTED") {
        // Small delay to let the refetch complete, then check if status changed
        setTimeout(() => {
          void refetchCompletion().then((result) => {
            if (result.data?.status === "DRAFT" && safeCurrentStatus === "SUBMITTED") {
              notifications.show({
                title: "Application Status Updated",
                message: "Your application has been moved back to draft status. Please review and re-submit when ready.",
                color: "blue",
                icon: <IconAlertCircle />,
              });
            }
          });
        }, 1000);
      }
    } catch (error: unknown) {
      console.error('Error saving response:', error);
      
      // Show user-friendly error message
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : "Failed to save your response";
        
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  }, [applicationId, questions, updateResponse, onUpdated, refetchCompletion, refetchApplication, safeCurrentStatus]);

  // Debounced auto-save function
  const debouncedAutoSave = useCallback((questionKey: string, value: unknown) => {
    // Clear any existing timeout for this field
    const existingTimeout = saveTimeoutRefs.current.get(questionKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout
    const newTimeout = setTimeout(() => {
      void autoSave(questionKey, value);
      saveTimeoutRefs.current.delete(questionKey);
    }, 1500); // Increased debounce delay to reduce race conditions
    
    saveTimeoutRefs.current.set(questionKey, newTimeout);
  }, [autoSave]);

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
    
    // Use debounced auto-save to prevent race conditions
    debouncedAutoSave(questionKey, value);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = saveTimeoutRefs.current;
    return () => {
      // Clear all pending timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // Consistency check - warn if different data sources disagree
  useEffect(() => {
    if (completionStatus?.status && freshApplicationData?.status && completionStatus.status !== freshApplicationData.status) {
      console.warn('⚠️ Status inconsistency detected:', {
        completionStatus: completionStatus.status,
        freshApplicationData: freshApplicationData.status,
        existingApplication: existingApplication?.status
      });
    }
  }, [completionStatus?.status, freshApplicationData?.status, existingApplication?.status]);

  // Debug logging for status tracking
  useEffect(() => {
    if (applicationId) {
      console.log('🐛 Application Status Debug:', {
        applicationId,
        existingApplicationStatus: existingApplication?.status,
        completionStatusFromAPI: completionStatus?.status,
        freshApplicationStatus: freshApplicationData?.status,
        currentStatusUsed: safeCurrentStatus,
        isSubmittedCalculation: isSubmitted,
        canEditCalculation: canEdit,
        completionStatusIsComplete: completionStatus?.isComplete,
        dataSource: completionStatus?.status ? 'API' : freshApplicationData?.status ? 'freshAPI' : 'props',
        timestamp: new Date().toISOString()
      });
    }
  }, [applicationId, existingApplication?.status, completionStatus?.status, freshApplicationData?.status, safeCurrentStatus, isSubmitted, canEdit, completionStatus?.isComplete]);

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
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to create application",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }
    
    // Refresh both completion status and application data to get latest state
    try {
      await refetchCompletion();
      await refetchApplication();
    } catch (error) {
      console.error('Error refreshing application status:', error);
    }
    
    if (!validateForm()) {
      // Find first missing required field for scroll-to-error
      const requiredQuestions = questions?.filter(q => q.required) ?? [];
      const firstMissingQuestion = requiredQuestions.find(question => {
        const value = formValues[question.questionKey];
        if (question.questionType === "MULTISELECT") {
          return !Array.isArray(value) || value.length === 0;
        } else if (question.questionType === "CHECKBOX") {
          return !value;
        } else {
          return !value || (typeof value === "string" && !value.trim());
        }
      });

      // Scroll to first missing field
      if (firstMissingQuestion) {
        const element = document.getElementById(`field-${firstMissingQuestion.questionKey}`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          // Focus the input after scroll
          setTimeout(() => {
            const input = element.querySelector('input, select, textarea');
            if (input) {
              (input as HTMLElement).focus();
            }
          }, 500);
        }
      }

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

      // Immediately update local state to hide completion components
      setIsSubmittingOrSubmitted(true);

      // Force refresh of application status data
      await Promise.all([
        refetchCompletion(),
        refetchApplication()
      ]);

      notifications.show({
        title: "Success!",
        message: "Your application has been submitted successfully",
        color: "green",
        icon: <IconCheck />,
      });

      onSubmitted?.();
    } catch (error: unknown) {
      console.error('Submit error:', error);
      
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : "Failed to submit application";
      
      // Check if it's the "already submitted" error and refresh the page
      if (errorMessage.includes("already been submitted")) {
        notifications.show({
          title: "Application Already Submitted",
          message: "This application has already been submitted. Refreshing the page...",
          color: "yellow",
          icon: <IconAlertCircle />,
        });
        
        // Refresh the page to show the correct state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        notifications.show({
          title: "Error",
          message: errorMessage,
          color: "red",
          icon: <IconAlertCircle />,
        });
      }
    }
  };

  // Comprehensive list of countries for nationality dropdown
  const countries = [
    "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria",
    "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic", "Denmark", 
    "Dominican Republic", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France", "Germany",
    "Ghana", "Greece", "Guatemala", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya", "South Korea",
    "Kuwait", "Latvia", "Lebanon", "Lithuania", "Luxembourg", "Malaysia", "Mexico", "Morocco",
    "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland",
    "Portugal", "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia",
    "South Africa", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Thailand", "Turkey", "Ukraine",
    "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Venezuela", "Vietnam",
    "Other"
  ];

  // Render individual question
  const renderQuestion = (question: Question) => {
    const questionText = language === "es" ? question.questionEs : question.questionEn;
    const currentValue = formValues[question.questionKey] ?? "";
    const hasError = submitAttempted && validationErrors[question.questionKey];
    const errorMessage = validationErrors[question.questionKey];

    // Handle nationality field specially
    if (question.questionKey === "nationality" || questionText.toLowerCase().includes("nationality")) {
      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <Select
            data={countries}
            searchable
            clearable={!question.required}
            label={questionText}
            required={question.required}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(value) => void handleFieldChange(question.questionKey, value ?? "")}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        </div>
      );
    }

    // Handle "specify other" fields (make them non-required)
    if (questionText.toLowerCase().includes("specify") || questionText.toLowerCase().includes("other")) {
      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <TextInput
            label={questionText}
            required={false} // Override to make non-required
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.value)}
            error={hasError ? errorMessage : undefined}
            styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
          />
        </div>
      );
    }

    switch (question.questionType) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "URL":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <TextInput
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
          </div>
        );

      case "TEXTAREA":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <Textarea
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
          </div>
        );

      case "SELECT":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <Select
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
          </div>
        );

      case "MULTISELECT":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <MultiSelect
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
          </div>
        );

      case "NUMBER":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <NumberInput
              min={0}
              max={10}
              label={questionText}
              required={question.required}
              value={typeof currentValue === "number" ? currentValue : ""}
              onChange={(value) => void handleFieldChange(question.questionKey, value || 0)}
              error={hasError ? errorMessage : undefined}
              styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
            />
          </div>
        );

      case "CHECKBOX":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
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
          <div key={question.id} id={`field-${question.questionKey}`}>
            <TextInput
              label={questionText}
              required={question.required}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(event) => void handleFieldChange(question.questionKey, event.currentTarget.value)}
              error={hasError ? errorMessage : undefined}
              styles={hasError ? { input: { borderColor: "var(--mantine-color-red-6)" } } : undefined}
            />
          </div>
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

  return (
    <div>
      <Stack gap="lg">
        {/* Progress Indicator */}
        {canEdit && applicationId && completionStatus && (
          <ApplicationProgressIndicator
            completedFields={completionStatus.completedFields}
            totalFields={completionStatus.totalFields}
            completionPercentage={completionStatus.completionPercentage}
          />
        )}

        {/* Completion Status */}
        {canEdit && applicationId && completionStatus && (
          <ApplicationCompletionStatus
            isComplete={completionStatus.isComplete ?? false}
            isSubmitted={isSubmitted}
            missingFields={completionStatus.missingFields}
            onSubmit={handleSubmit}
            wasReverted={wasRecentlyReverted}
            shouldShowMissingFields={
              Boolean(submitAttempted) || // Show if they tried to submit
              Boolean(
                existingApplication && 
                completionStatus.completedFields > 1 && 
                !isFirstTimeInSession
              ) || // Show if returning to in-progress application (not first time in session)
              Boolean(wasRecentlyReverted) // Show if application was reverted from submitted
            }
          />
        )}

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
        {canEdit && !isSubmitted && completionStatus && (
          <Stack gap="sm" mt="xl">
            {(!completionStatus.isComplete || safeCurrentStatus !== "DRAFT" || isSubmittingOrSubmitted) && (
              <Text size="sm" c="dimmed" ta="right">
                {(safeCurrentStatus !== "DRAFT" || isSubmittingOrSubmitted)
                  ? "Application has already been submitted"
                  : "Complete all required fields to submit"}
              </Text>
            )}
            <Group justify="flex-end">
              <Button
                onClick={handleSubmit}
                size="lg"
                leftSection={<IconSend size={16} />}
                loading={submitApplication.isPending}
                disabled={safeCurrentStatus !== "DRAFT" || isSubmittingOrSubmitted}
              >
                {language === "es" ? "Enviar Aplicación" : "Submit Application"}
              </Button>
            </Group>
          </Stack>
        )}

        {isSubmitted && (
          <Alert color="blue" icon={<IconCheck />}>
            {language === "es" 
              ? `Tu aplicación está en estado: ${safeCurrentStatus.replace("_", " ")}`
              : `Your application status: ${safeCurrentStatus.replace("_", " ")}`
            }
            {safeCurrentStatus === "SUBMITTED" && (
              <Text size="sm" mt="xs">
                {language === "es" 
                  ? "Tu aplicación ha sido enviada y está pendiente de revisión."
                  : "Your application has been submitted and is pending review."
                }
              </Text>
            )}
          </Alert>
        )}
      </Stack>
    </div>
  );
}
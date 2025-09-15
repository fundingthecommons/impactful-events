"use client";

import React from "react";
import { 
  Container, 
  Text, 
  Paper, 
  Loader, 
  Alert,
  Button,
  Group,
  Stack
} from "@mantine/core";
import { IconAlertCircle, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import ApplicationEvaluationForm from "~/app/_components/ApplicationEvaluationForm";

interface EvaluationPageClientProps {
  evaluationId: string;
}

type EvaluationData = {
  id: string;
  applicationId: string;
  stage: 'SCREENING' | 'DETAILED_REVIEW' | 'VIDEO_REVIEW' | 'CONSENSUS' | 'FINAL_DECISION';
  status: string;
};

export default function EvaluationPageClient({ evaluationId }: EvaluationPageClientProps) {
  const router = useRouter();

  // Fetch evaluation details by ID
  const evaluationQuery = api.evaluation.getEvaluationById.useQuery({
    evaluationId: evaluationId,
  });

  const handleEvaluationComplete = () => {
    // Navigate back to queue or show success message
    router.push("/admin/queue");
  };

  if (evaluationQuery.isLoading) {
    return (
      <Container size="xl" py="md">
        <Paper p="xl" className="text-center">
          <Loader size="md" />
          <Text mt="md">Loading evaluation...</Text>
        </Paper>
      </Container>
    );
  }

  if (evaluationQuery.error) {
    return (
      <Container size="xl" py="md">
        <Alert 
          icon={<IconAlertCircle size="1rem" />} 
          title="Error Loading Evaluation" 
          color="red"
        >
          <Stack gap="md">
            <Text>{String(evaluationQuery.error.message ?? 'An error occurred')}</Text>
            <Group>
              <Button 
                variant="outline" 
                leftSection={<IconArrowLeft size="1rem" />}
                onClick={() => router.push("/admin/queue")}
              >
                Back to Queue
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  const evaluationData = evaluationQuery.data as EvaluationData | undefined;

  if (!evaluationData) {
    return (
      <Container size="xl" py="md">
        <Alert 
          icon={<IconAlertCircle size="1rem" />} 
          title="Evaluation Not Found" 
          color="yellow"
        >
          <Stack gap="md">
            <Text>The evaluation you&rsquo;re looking for doesn&rsquo;t exist or you don&rsquo;t have permission to view it.</Text>
            <Group>
              <Button 
                variant="outline" 
                leftSection={<IconArrowLeft size="1rem" />}
                onClick={() => router.push("/admin/queue")}
              >
                Back to Queue
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header with back button */}
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<IconArrowLeft size="1rem" />}
            onClick={() => router.push("/admin/queue")}
          >
            Back to Queue
          </Button>
        </Group>

        {/* Main evaluation form */}
        <ApplicationEvaluationForm
          applicationId={evaluationData.applicationId}
          stage={evaluationData.stage}
          onEvaluationComplete={handleEvaluationComplete}
        />
      </Stack>
    </Container>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  Textarea,
  NumberInput,
  Select,
  Divider,
  Alert,
  Progress,
  ActionIcon,
  Box,
  Paper,
  Grid,
  Anchor,
} from "@mantine/core";
import TelegramMessageButton from "./TelegramMessageButton";
import {
  IconStarFilled,
  IconStar,
  IconVideo,
  IconNotes,
  IconClock,
  IconCheck,
  IconUsers,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import type { 
  EvaluationCriteria, 
  EvaluationScore,
  Application,
  User 
} from "@prisma/client";

interface ApplicationWithDetails extends Application {
  user: Pick<User, 'name' | 'email'> | null;
  responses: Array<{
    answer: string;
    question: {
      questionKey: string;
      questionEn: string;
      order: number;
    };
  }>;
}

interface EvaluationFormProps {
  applicationId: string;
  stage: 'SCREENING' | 'DETAILED_REVIEW' | 'VIDEO_REVIEW' | 'CONSENSUS' | 'FINAL_DECISION';
  onEvaluationComplete?: () => void;
}

// Utility function to extract YouTube video ID from various YouTube URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    // YouTube Shorts: youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    // Standard YouTube: youtube.com/watch?v=VIDEO_ID
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    // Short URL: youtu.be/VIDEO_ID
    /youtu\.be\/([^&\n?#]+)/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\n?#]+)/,
    // Legacy URL: youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/,
    // Watch URL with additional parameters: youtube.com/watch?.*v=VIDEO_ID
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Component to render YouTube embed or regular link
function VideoLinkRenderer({ url, questionText }: { url: string; questionText: string }) {
  const videoId = extractYouTubeVideoId(url);
  
  if (videoId) {
    return (
      <Stack gap="md">
        <Text>
          <Anchor href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </Anchor>
        </Text>
        <Box
          style={{
            position: 'relative',
            width: '100%',
            height: 0,
            paddingBottom: '56.25%', // 16:9 aspect ratio
            overflow: 'hidden',
            borderRadius: '8px',
            border: '1px solid var(--mantine-color-gray-3)'
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={questionText}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
      </Stack>
    );
  }
  
  // For non-YouTube links, show as regular link
  return (
    <Text>
      <Anchor href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </Anchor>
    </Text>
  );
}

interface CriteriaScoreProps {
  criteria: EvaluationCriteria;
  score?: EvaluationScore;
  onScoreChange: (criteriaId: string, score: number, reasoning?: string) => void;
  readonly?: boolean;
  application?: ApplicationWithDetails;
}

function CriteriaScore({ criteria, score, onScoreChange, readonly = false, application }: CriteriaScoreProps) {
  const [currentScore, setCurrentScore] = useState(score?.score ?? 0);
  const [reasoning, setReasoning] = useState(score?.reasoning ?? "");
  const [showReasoning, setShowReasoning] = useState(false);

  const handleScoreChange = (newScore: number) => {
    setCurrentScore(newScore);
    onScoreChange(criteria.id, newScore, reasoning);
  };

  const handleReasoningChange = (newReasoning: string) => {
    setReasoning(newReasoning);
    onScoreChange(criteria.id, currentScore, newReasoning);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "green";
    if (score >= 6) return "yellow";
    if (score >= 4) return "orange";
    return "red";
  };

  return (
    <Card withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <Badge
                color={criteria.category === 'TECHNICAL' ? 'blue' : 
                       criteria.category === 'PROJECT' ? 'green' : 
                       criteria.category === 'COMMUNITY_FIT' ? 'purple' : 
                       criteria.category === 'VIDEO' ? 'orange' : 'gray'}
                size="sm"
              >
                {criteria.category.replace('_', ' ')}
              </Badge>
              <Text size="sm" c="dimmed">
                Weight: {(criteria.weight * 100).toFixed(1)}%
              </Text>
            </Group>
            
            <Title order={5} mb="xs">{criteria.name}</Title>
            <Text size="sm" c="dimmed" mb="md">
              {criteria.description}
            </Text>
          </Box>
          
          <Box ta="center">
            <Text size="xl" fw={700} c={getScoreColor(currentScore)}>
              {currentScore.toFixed(1)}
            </Text>
            <Text size="xs" c="dimmed">
              /{criteria.maxScore}
            </Text>
          </Box>
        </Group>

        {/* Star Rating */}
        <Group gap="xs" justify="center">
          {Array.from({ length: criteria.maxScore }, (_, i) => i + 1).map((star) => (
            <ActionIcon
              key={star}
              variant={currentScore >= star ? "filled" : "outline"}
              color={getScoreColor(currentScore)}
              size="sm"
              disabled={readonly}
              onClick={() => !readonly && handleScoreChange(star)}
            >
              {currentScore >= star ? <IconStarFilled size={16} /> : <IconStar size={16} />}
            </ActionIcon>
          ))}
        </Group>

        {/* Number Input for precise scoring */}
        <NumberInput
          label="Score"
          min={criteria.minScore}
          max={criteria.maxScore}
          step={0.1}
          decimalScale={1}
          value={currentScore}
          onChange={(value) => !readonly && handleScoreChange(Number(value) || 0)}
          disabled={readonly}
          size="sm"
        />

        {/* Reasoning toggle and textarea */}
        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconNotes size={14} />}
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? 'Hide' : 'Add'} Reasoning
          </Button>
          
          {/* Telegram message button */}
          {application && (
            <TelegramMessageButton
              application={application}
              customMessage={`Hi! I'm reviewing your application for the Funding the Commons residency and have a question about your ${criteria.name.toLowerCase()}. Could you please tell me more about your skills and experience in this area?`}
              size={16}
              variant="subtle"
              color="blue"
            />
          )}
        </Group>

        {showReasoning && (
          <Textarea
            placeholder={`Explain your ${criteria.name.toLowerCase()} score...`}
            value={reasoning}
            onChange={(e) => !readonly && handleReasoningChange(e.target.value)}
            disabled={readonly}
            autosize
            minRows={2}
            maxRows={4}
          />
        )}
      </Stack>
    </Card>
  );
}

export default function ApplicationEvaluationForm({
  applicationId,
  stage,
  onEvaluationComplete,
}: EvaluationFormProps) {
  // ✅ ALL hooks at the top - no exceptions
  const [overallComments, setOverallComments] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(3);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [startTime] = useState(Date.now());

  // tRPC queries
  const { data: criteria } = api.evaluation.getCriteria.useQuery();
  const { data: evaluation, refetch: refetchEvaluation } = api.evaluation.getEvaluation.useQuery({
    applicationId,
    stage,
  });

  // Mutations
  const upsertScoreMutation = api.evaluation.upsertScore.useMutation();
  const updateEvaluationMutation = api.evaluation.updateEvaluation.useMutation();

  // ✅ Unconditional useEffect - conditional logic inside is fine
  useEffect(() => {
    // Initialize form with existing evaluation data
    if (evaluation) {
      setOverallComments(evaluation.overallComments ?? "");
      setRecommendation(evaluation.recommendation ?? "");
      setConfidence(evaluation.confidence ?? 3);
      setTimeSpent(evaluation.timeSpentMinutes ?? 0);
    }
  }, [evaluation]);

  const handleScoreChange = async (criteriaId: string, score: number, reasoning?: string) => {
    if (!evaluation) return;

    try {
      await upsertScoreMutation.mutateAsync({
        evaluationId: evaluation.id,
        criteriaId,
        score,
        reasoning,
      });
      
      // Refetch evaluation data to update the progress counter
      await refetchEvaluation();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save score",
        color: "red",
      });
    }
  };

  const handleSaveEvaluation = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!evaluation) return;

    const currentTimeSpent = Math.round((Date.now() - startTime) / 60000) + timeSpent;

    try {
      await updateEvaluationMutation.mutateAsync({
        evaluationId: evaluation.id,
        status,
        overallComments,
        recommendation: recommendation as 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'NEEDS_MORE_INFO' | undefined,
        confidence,
        timeSpentMinutes: currentTimeSpent,
      });

      await refetchEvaluation();

      notifications.show({
        title: "Success",
        message: `Evaluation ${status === 'COMPLETED' ? 'completed' : 'saved'}`,
        color: "green",
      });

      if (status === 'COMPLETED' && onEvaluationComplete) {
        onEvaluationComplete();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save evaluation",
        color: "red",
      });
    }
  };

  // ✅ Early returns only AFTER all hooks are declared
  if (!criteria) {
    return <Text>Loading evaluation criteria...</Text>;
  }

  if (!evaluation) {
    return (
      <Stack align="center" gap="md" p="xl">
        <Text>No evaluation found for this application and stage.</Text>
        <Text size="sm" c="dimmed">
          An evaluation needs to be assigned by an admin before it can be completed.
        </Text>
      </Stack>
    );
  }

  const application = evaluation.application as ApplicationWithDetails;
  const isCompleted = evaluation.status === 'COMPLETED';
  
  // Calculate progress
  const completedScores = evaluation.scores?.length ?? 0;
  const totalCriteria = criteria.length;
  const progress = totalCriteria > 0 ? (completedScores / totalCriteria) * 100 : 0;

  // Group criteria by category
  const criteriaByCategory = criteria.reduce((acc, criteria) => {
    acc[criteria.category] ??= [];
    acc[criteria.category]!.push(criteria);
    return acc;
  }, {} as Record<string, EvaluationCriteria[]>);

  return (
    <Stack gap="lg">
      {/* Header with progress */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>
              {stage.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Evaluation
            </Title>
            <Text c="dimmed">
              {application.user?.name} ({application.user?.email})
            </Text>
          </div>
          
          <Group>
            <Badge 
              color={evaluation.status === 'COMPLETED' ? 'green' : 
                     evaluation.status === 'IN_PROGRESS' ? 'blue' : 'gray'}
            >
              {evaluation.status.replace('_', ' ')}
            </Badge>
            {evaluation.overallScore && (
              <Badge color="yellow" size="lg">
                {evaluation.overallScore.toFixed(1)}/10
              </Badge>
            )}
          </Group>
        </Group>

        <Progress value={progress} mb="sm" />
        <Text size="sm" c="dimmed">
          {completedScores}/{totalCriteria} criteria evaluated ({progress.toFixed(0)}% complete)
        </Text>
      </Paper>

      <Grid gutter="lg">
        {/* Left Column - Application Details */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md" h="100%">
            <Group>
              <IconUsers size={20} />
              <Title order={4}>Application Details</Title>
            </Group>
            <Box style={{ flex: 1, overflowY: 'auto', maxHeight: '70vh' }}>
              <Stack gap="md">
                {application.responses
                  ?.sort((a, b) => a.question.order - b.question.order)
                  .map((response) => (
                    <Card key={response.question.questionKey} withBorder p="md">
                      <Title order={6} mb="xs">
                        {response.question.questionEn}
                      </Title>
                      {response.answer ? (
                        // Check if this is a video link question and the answer looks like a URL
                        (response.question.questionKey === 'intro_video_link' || 
                         response.question.questionEn.toLowerCase().includes('video')) &&
                        (response.answer.startsWith('http://') || response.answer.startsWith('https://')) ? (
                          <VideoLinkRenderer 
                            url={response.answer} 
                            questionText={response.question.questionEn}
                          />
                        ) : (
                          <Text>{response.answer}</Text>
                        )
                      ) : (
                        <Text c="dimmed" fs="italic">No answer provided</Text>
                      )}
                    </Card>
                  ))}
              </Stack>
            </Box>
          </Stack>
        </Grid.Col>

        {/* Right Column - Evaluation */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper bg="gray.0" p="md" radius="md" h="100%">
            <Stack gap="lg" h="100%">
              <Group>
                <IconStarFilled size={20} />
                <Title order={4}>Evaluation ({completedScores}/{totalCriteria})</Title>
              </Group>
              
              <Box style={{ flex: 1, overflowY: 'auto', maxHeight: '70vh' }}>
                <Stack gap="lg">
                  {Object.entries(criteriaByCategory).map(([category, categoryItems]) => (
                    <div key={category}>
                      <Title order={5} mb="md" c="blue">
                        {category.replace('_', ' ')} Criteria
                      </Title>
                      <Stack gap="md">
                        {categoryItems.map((criteria) => {
                          const existingScore = evaluation.scores?.find(
                            (s) => s.criteriaId === criteria.id
                          );
                          return (
                            <CriteriaScore
                              key={criteria.id}
                              criteria={criteria}
                              score={existingScore}
                              onScoreChange={handleScoreChange}
                              readonly={isCompleted}
                              application={application}
                            />
                          );
                        })}
                      </Stack>
                    </div>
                  ))}

                  <Divider />

                  {/* Overall Assessment */}
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Overall Assessment</Title>
                    <Stack gap="md">
                      <Textarea
                        label="Overall Comments"
                        placeholder="Provide your overall assessment of this application..."
                        value={overallComments}
                        onChange={(e) => setOverallComments(e.target.value)}
                        disabled={isCompleted}
                        autosize
                        minRows={3}
                        maxRows={6}
                      />

                      <Group grow>
                        <Select
                          label="Recommendation"
                          placeholder="Select recommendation"
                          value={recommendation}
                          onChange={(value) => setRecommendation(value ?? "")}
                          disabled={isCompleted}
                          data={[
                            { value: 'ACCEPT', label: 'Accept' },
                            { value: 'REJECT', label: 'Reject' },
                            { value: 'WAITLIST', label: 'Waitlist' },
                            { value: 'NEEDS_MORE_INFO', label: 'Needs More Info' },
                          ]}
                        />

                        <NumberInput
                          label="Confidence Level"
                          description="How confident are you in this assessment? (1-5)"
                          min={1}
                          max={5}
                          value={confidence}
                          onChange={(value) => setConfidence(Number(value) || 3)}
                          disabled={isCompleted}
                        />
                      </Group>
                    </Stack>
                  </Card>

                  {/* Action buttons */}
                  {!isCompleted && (
                    <Group justify="flex-end">
                      <Button
                        variant="outline"
                        leftSection={<IconClock size={16} />}
                        onClick={() => handleSaveEvaluation('IN_PROGRESS')}
                        loading={updateEvaluationMutation.isPending}
                      >
                        Save Progress
                      </Button>
                      <Button
                        leftSection={<IconCheck size={16} />}
                        onClick={() => handleSaveEvaluation('COMPLETED')}
                        loading={updateEvaluationMutation.isPending}
                        disabled={progress < 100 || !recommendation}
                      >
                        Complete Evaluation
                      </Button>
                    </Group>
                  )}

                  {isCompleted && (
                    <Alert 
                      icon={<IconCheck size={16} />} 
                      color="green"
                      title="Evaluation Completed"
                    >
                      This evaluation was completed on {evaluation.completedAt ? new Date(evaluation.completedAt).toLocaleDateString() : 'Unknown date'}.
                      Time spent: {evaluation.timeSpentMinutes ?? 0} minutes.
                    </Alert>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Video Review Section - Full Width when applicable */}
        {stage === 'VIDEO_REVIEW' && (
          <Grid.Col span={12}>
            <Card withBorder p="md">
              <Group mb="md">
                <IconVideo size={20} />
                <Title order={4}>Video Review</Title>
              </Group>
              <Text c="dimmed" mb="md">
                Review the applicant&apos;s 1-minute introduction video and assess their communication skills,
                passion, and presentation quality.
              </Text>
              
              {/* Video URL from application */}
              {(() => {
                const videoResponse = application.responses?.find(
                  r => r.question.questionKey === 'intro_video_link'
                );
                return videoResponse?.answer ? (
                  <Box mb="md">
                    <VideoLinkRenderer 
                      url={videoResponse.answer} 
                      questionText="Introduction Video"
                    />
                  </Box>
                ) : (
                  <Alert color="yellow" mb="md">
                    No video link provided by applicant
                  </Alert>
                );
              })()}

              <Textarea
                label="Video Review Notes"
                placeholder="Add timestamped notes, observations about communication style, authenticity, etc..."
                value={evaluation.videoTimestamp ?? ""}
                onChange={(_e) => {
                  // This would integrate with video timestamp functionality
                }}
                disabled={isCompleted}
                autosize
                minRows={4}
              />
            </Card>
          </Grid.Col>
        )}
      </Grid>
    </Stack>
  );
}
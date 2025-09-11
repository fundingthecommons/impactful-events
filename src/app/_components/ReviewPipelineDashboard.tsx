"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  Grid,
  ActionIcon,
  Modal,
  Select,
  Tabs,
  Alert,
  Paper,
  Box,
  ScrollArea,
  Menu,
  UnstyledButton,
  Center,
} from "@mantine/core";
import {
  IconUsers,
  IconEye,
  IconVideo,
  IconMessageCircle,
  IconCheck,
  IconArrowRight,
  IconPlus,
  IconSettings,
  IconStar,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import ApplicationEvaluationForm from "./ApplicationEvaluationForm";
import type { User } from "@prisma/client";

interface PipelineApplication {
  id: string;
  user: Pick<User, 'name' | 'email'> | null;
  evaluations: Array<{
    stage: string;
    status: string;
    overallScore?: number | null;
    recommendation?: string | null;
    reviewer: { name: string | null };
  }>;
}

interface PipelineStageProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  applications: PipelineApplication[];
  stage: 'SCREENING' | 'DETAILED_REVIEW' | 'VIDEO_REVIEW' | 'CONSENSUS' | 'FINAL_DECISION';
  onApplicationClick: (applicationId: string, stage: string) => void;
  onAssignReviewer?: (applicationId: string) => void;
}

function PipelineStage({
  title,
  icon,
  color,
  count,
  applications,
  stage,
  onApplicationClick,
  onAssignReviewer,
}: PipelineStageProps) {
  const getStatusColor = (evaluations: PipelineApplication['evaluations']) => {
    const stageEvaluations = evaluations.filter(e => e.stage === stage);
    if (stageEvaluations.length === 0) return "gray";
    
    const completed = stageEvaluations.filter(e => e.status === 'COMPLETED').length;
    const total = stageEvaluations.length;
    
    if (completed === total) return "green";
    if (completed > 0) return "yellow";
    return "red";
  };

  const getRecommendationBadge = (evaluations: PipelineApplication['evaluations']) => {
    const recommendations = evaluations
      .filter(e => e.stage === stage && e.recommendation)
      .map(e => e.recommendation);
    
    if (recommendations.length === 0) return null;
    
    const accepts = recommendations.filter(r => r === 'ACCEPT').length;
    const rejects = recommendations.filter(r => r === 'REJECT').length;
    const waitlists = recommendations.filter(r => r === 'WAITLIST').length;
    
    if (accepts > rejects + waitlists) return <Badge color="green" size="xs">Lean Accept</Badge>;
    if (rejects > accepts + waitlists) return <Badge color="red" size="xs">Lean Reject</Badge>;
    if (waitlists > accepts + rejects) return <Badge color="yellow" size="xs">Lean Waitlist</Badge>;
    return <Badge color="gray" size="xs">Mixed</Badge>;
  };

  return (
    <Card withBorder p="md" h="600px" style={{ display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          {icon}
          <div>
            <Text fw={600}>{title}</Text>
            <Badge color={color} variant="light" size="sm">
              {count} applications
            </Badge>
          </div>
        </Group>
        
        {onAssignReviewer && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="light" color={color}>
                <IconPlus size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Assign Reviewer</Menu.Label>
              {applications.length > 0 ? (
                applications.map((app) => (
                  <Menu.Item
                    key={app.id}
                    onClick={() => onAssignReviewer(app.id)}
                  >
                    {app.user?.name ?? 'Unknown'} ({app.user?.email})
                  </Menu.Item>
                ))
              ) : (
                <Menu.Item disabled>No applications in this stage</Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <ScrollArea style={{ flex: 1 }} type="auto">
        <Stack gap="xs">
          {applications.map((app) => (
            <UnstyledButton
              key={app.id}
              onClick={() => onApplicationClick(app.id, stage)}
              style={{ width: '100%' }}
            >
              <Paper
                p="sm"
                withBorder
                style={{
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" truncate>
                      {app.user?.name ?? 'Unknown'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {app.user?.email}
                    </Text>
                    
                    {/* Evaluation progress */}
                    {app.evaluations && app.evaluations.length > 0 && (
                      <Group mt="xs" gap="xs">
                        <Badge
                          color={getStatusColor(app.evaluations)}
                          size="xs"
                          variant="light"
                        >
                          {app.evaluations.filter(e => e.stage === stage && e.status === 'COMPLETED').length}/
                          {app.evaluations.filter(e => e.stage === stage).length} Complete
                        </Badge>
                        {getRecommendationBadge(app.evaluations)}
                      </Group>
                    )}

                    {/* Overall score if available */}
                    {app.evaluations?.some(e => e.overallScore) && (
                      <Group mt="xs" gap="xs">
                        <IconStar size={12} />
                        <Text size="xs" fw={600}>
                          {(app.evaluations
                            .filter(e => e.overallScore)
                            .reduce((sum, e) => sum + (e.overallScore ?? 0), 0) / 
                            app.evaluations.filter(e => e.overallScore).length
                          ).toFixed(1)}
                        </Text>
                      </Group>
                    )}
                  </Box>
                  
                  <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />
                </Group>
              </Paper>
            </UnstyledButton>
          ))}

          {applications.length === 0 && (
            <Center py="xl">
              <Text c="dimmed" ta="center">
                No applications in this stage
              </Text>
            </Center>
          )}
        </Stack>
      </ScrollArea>
    </Card>
  );
}

interface AssignReviewerModalProps {
  opened: boolean;
  onClose: () => void;
  applicationId: string;
  stage: string;
}

function AssignReviewerModal({ opened, onClose, applicationId, stage }: AssignReviewerModalProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [priority, setPriority] = useState<string>("0");

  const { data: users, error } = api.user.getAdmins.useQuery();
  const createAssignmentMutation = api.evaluation.createAssignment.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Reviewer assigned successfully",
        color: "green",
      });
      onClose();
    },
    onError: () => {
      notifications.show({
        title: "Error", 
        message: "Failed to assign reviewer",
        color: "red",
      });
    }
  });

  const handleAssign = async () => {
    if (!selectedReviewer) return;

    await createAssignmentMutation.mutateAsync({
      applicationId,
      reviewerId: selectedReviewer,
      stage: stage as 'SCREENING' | 'DETAILED_REVIEW' | 'VIDEO_REVIEW' | 'CONSENSUS' | 'FINAL_DECISION',
      priority: parseInt(priority),
      notes: `Assigned for ${stage.replace('_', ' ').toLowerCase()} review`,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Assign Reviewer">
      <Stack gap="md">
        <Select
          label="Reviewer"
          placeholder={error ? "Error loading reviewers" : "Select a reviewer"}
          value={selectedReviewer}
          onChange={(value) => setSelectedReviewer(value ?? "")}
          data={users?.map(user => ({
            value: user.id,
            label: `${user.name} (${user.email})`,
          })) ?? []}
          disabled={!!error}
        />

        <Select
          label="Priority"
          value={priority}
          onChange={(value) => setPriority(value ?? "0")}
          data={[
            { value: "0", label: "Normal" },
            { value: "1", label: "High" },
            { value: "2", label: "Urgent" },
          ]}
        />

        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            loading={createAssignmentMutation.isPending}
            disabled={!selectedReviewer}
          >
            Assign Reviewer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function ReviewPipelineDashboard() {
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('SCREENING');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignApplicationId, setAssignApplicationId] = useState<string>("");
  const [assignStage, setAssignStage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  // Fetch pipeline data
  const { data: pipeline, refetch: refetchPipeline } = api.evaluation.getReviewPipeline.useQuery();

  const handleApplicationClick = (applicationId: string, stage: string) => {
    setSelectedApplication(applicationId);
    setSelectedStage(stage);
  };

  const handleAssignReviewer = (applicationId: string, stage: string) => {
    setAssignApplicationId(applicationId);
    setAssignStage(stage);
    setAssignModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    void refetchPipeline();
    setSelectedApplication(null);
  };

  if (!pipeline) {
    return <Text>Loading pipeline...</Text>;
  }

  const stages = [
    {
      key: 'screening',
      title: 'Initial Screening',
      icon: <IconUsers size={20} />,
      color: 'blue',
      applications: pipeline.screening,
      stage: 'SCREENING' as const,
      description: 'Basic qualification check and initial assessment'
    },
    {
      key: 'detailedReview',
      title: 'Detailed Review',
      icon: <IconEye size={20} />,
      color: 'green', 
      applications: pipeline.detailedReview,
      stage: 'DETAILED_REVIEW' as const,
      description: 'In-depth evaluation of technical and project criteria'
    },
    {
      key: 'videoReview',
      title: 'Video Review',
      icon: <IconVideo size={20} />,
      color: 'orange',
      applications: pipeline.videoReview,
      stage: 'VIDEO_REVIEW' as const,
      description: 'Assessment of communication skills and presentation'
    },
    {
      key: 'consensus',
      title: 'Consensus',
      icon: <IconMessageCircle size={20} />,
      color: 'purple',
      applications: pipeline.consensus,
      stage: 'CONSENSUS' as const,
      description: 'Team discussion and consensus building'
    },
    {
      key: 'finalDecision',
      title: 'Final Decision',
      icon: <IconCheck size={20} />,
      color: 'teal',
      applications: pipeline.finalDecision,
      stage: 'FINAL_DECISION' as const,
      description: 'Final acceptance/rejection decisions'
    },
  ];

  const totalApplications = Object.values(pipeline).flat().length;

  return (
    <>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Review Pipeline</Title>
              <Text c="dimmed">
                Manage application reviews through each stage of the evaluation process
              </Text>
            </div>
            <Group>
              <Badge size="lg" variant="light">
                {totalApplications} Applications
              </Badge>
              <Button leftSection={<IconSettings size={16} />} variant="outline" size="sm">
                Settings
              </Button>
            </Group>
          </Group>
        </Paper>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "pipeline")}>
          <Tabs.List>
            <Tabs.Tab value="pipeline">Pipeline Overview</Tabs.Tab>
            <Tabs.Tab value="assignments">Reviewer Assignments</Tabs.Tab>
            <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pipeline" pt="lg">
            {/* Pipeline stages */}
            <Grid>
              {stages.map((stage) => (
                <Grid.Col key={stage.key} span={{ base: 12, sm: 6, lg: 4, xl: 2.4 }}>
                  <PipelineStage
                    title={stage.title}
                    icon={stage.icon}
                    color={stage.color}
                    count={stage.applications.length}
                    applications={stage.applications}
                    stage={stage.stage}
                    onApplicationClick={handleApplicationClick}
                    onAssignReviewer={(appId) => handleAssignReviewer(appId, stage.stage)}
                  />
                </Grid.Col>
              ))}
            </Grid>

            {/* Stage descriptions */}
            <Paper p="md" withBorder mt="xl">
              <Title order={4} mb="md">Review Process</Title>
              <Grid>
                {stages.map((stage, index) => (
                  <Grid.Col key={stage.key} span={{ base: 12, md: 6, lg: 2.4 }}>
                    <Group align="flex-start" gap="sm">
                      <Badge color={stage.color} variant="light" size="lg">
                        {index + 1}
                      </Badge>
                      <div>
                        <Text fw={600} size="sm">{stage.title}</Text>
                        <Text size="xs" c="dimmed">{stage.description}</Text>
                      </div>
                    </Group>
                  </Grid.Col>
                ))}
              </Grid>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="assignments" pt="lg">
            <Alert icon={<IconAlertTriangle size={16} />} title="Feature Coming Soon">
              Reviewer assignment management interface is being developed.
            </Alert>
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="lg">
            <Alert icon={<IconAlertTriangle size={16} />} title="Feature Coming Soon">
              Analytics dashboard with evaluation metrics and insights is being developed.
            </Alert>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Evaluation Modal */}
      <Modal
        opened={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        title="Application Evaluation"
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{
          body: { padding: 0 },
          content: { height: '90vh' },
        }}
      >
        {selectedApplication && (
          <Box p="md">
            <ApplicationEvaluationForm
              applicationId={selectedApplication}
              stage={selectedStage as 'SCREENING' | 'DETAILED_REVIEW' | 'VIDEO_REVIEW' | 'CONSENSUS' | 'FINAL_DECISION'}
              onEvaluationComplete={handleEvaluationComplete}
            />
          </Box>
        )}
      </Modal>

      {/* Assign Reviewer Modal */}
      <AssignReviewerModal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        applicationId={assignApplicationId}
        stage={assignStage}
      />
    </>
  );
}
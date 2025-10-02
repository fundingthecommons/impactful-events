"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Container, 
  Title, 
  Text, 
  Card,
  Group, 
  Stack, 
  Button,
  Badge,
  Table,
  Checkbox,
  TextInput,
  ActionIcon,
  Drawer,
  Paper,
  Loader,
  Menu,
  Tabs,
  ScrollArea,
  Box,
  Anchor,
  Tooltip,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { 
  IconArrowLeft,
  IconDownload,
  IconEye,
  IconCheck,
  IconX,
  IconClock,
  IconSearch,
  IconDots,
  IconUsers,
  IconEdit,
  IconChecklist,
  IconAlertTriangle,
  IconMail,
  IconSend,
  IconTrash,
  IconAlertCircle,
  IconUserPlus,
  IconChartBar,
  IconStar,
  IconChevronUp,
  IconChevronDown,
  IconClipboardList,
  IconAnalyze,
  IconQuestionMark,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import EditableApplicationForm from "~/app/_components/EditableApplicationForm";
import EmailPreviewModal from "~/app/_components/EmailPreviewModal";
import ReviewPipelineDashboard from "~/app/_components/ReviewPipelineDashboard";
import TelegramMessageButton from "~/app/_components/TelegramMessageButton";
import ApplicationCompletionProgress from "~/app/_components/ApplicationCompletionProgress";
import CurationSpecDashboard from "~/app/_components/CurationSpecDashboard";
import SponsoredApplicationModal from "~/app/_components/SponsoredApplicationModal";
import { type ExtendedDemographicStats, type ApplicationForDemographics, calculateExtendedDemographicStats, isLatamCountry } from "~/utils/demographics";

type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
};

type EmailType = {
  id: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  toEmail: string;
  type: string;
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  missingFields?: string[];
  createdAt: Date;
  sentAt?: Date | null;
};
type ApplicationWithUser = {
  id: string;
  email: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED";
  submittedAt: Date | null;
  createdAt: Date;
  affiliation: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    adminNotes: string | null;
    adminLabels: string[];
    adminUpdatedAt: Date | null;
    profile?: {
      id: string;
      bio: string | null;
      jobTitle: string | null;
      company: string | null;
      location: string | null;
      website: string | null;
      githubUrl: string | null;
      linkedinUrl: string | null;
      twitterUrl: string | null;
      skills: string[];
      interests: string[];
      availableForMentoring: boolean;
      availableForHiring: boolean;
      availableForOfficeHours: boolean;
      timezone: string | null;
      languages: string[];
      yearsOfExperience: number | null;
      telegramHandle: string | null;
      discordHandle: string | null;
    } | null;
  } | null;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
      questionEn: string;
      questionEs: string;
    };
  }>;
  reviewerAssignments: Array<{
    id: string;
    stage: string;
    assignedAt: Date;
    reviewer: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
};

interface AdminApplicationsClientProps {
  event: Event;
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    case "CANCELLED":
      return "gray";
    default:
      return "gray";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ACCEPTED":
      return IconCheck;
    case "REJECTED":
      return IconX;
    case "CANCELLED":
      return IconX;
    default:
      return IconClock;
  }
}

export default function AdminApplicationsClient({ event }: AdminApplicationsClientProps) {
  // Message for Under Review applicants
  const UNDER_REVIEW_MESSAGE = "Thank you for your application to the Funding the Commons residency. I am sorry for the delay in processing your application. We are in the process of processing hundreds of applicants of extremely high quality, like you. The good news is that you're on the short list for the last few places, and we will be able to give you a conclusive answer in the next days. Hopefully by the end of this week. Thank you again for your patience. If you are no longer available or interested, please indicate that as soon as possible. Thanks for your patience. We'll talk soon.";

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideRejected, setHideRejected] = useState<boolean>(true);
  const [hideReviewingAccepted, setHideReviewingAccepted] = useState<boolean>(false);
  const [hideIncomplete, setHideIncomplete] = useState<boolean>(false);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [viewingApplication, setViewingApplication] = useState<ApplicationWithUser | null>(null);
  const [editingApplication, setEditingApplication] = useState<ApplicationWithUser | null>(null);
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] = useDisclosure(false);
  const [editDrawerOpened, { open: openEditDrawer, close: closeEditDrawer }] = useDisclosure(false);
  const [actionsTab, setActionsTab] = useState<string>("next");
  const [emailPreviewOpened, { open: openEmailPreview, close: closeEmailPreview }] = useDisclosure(false);
  const [previewingEmail, setPreviewingEmail] = useState<EmailType | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [sponsoredModalOpened, { open: openSponsoredModal, close: closeSponsoredModal }] = useDisclosure(false);
  
  // Consensus table sorting state
  const [consensusSortField, setConsensusSortField] = useState<'score' | 'name' | null>('score');
  const [consensusSortDirection, setConsensusSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Consensus reviewer filter state
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null);
  
  // Consensus region filter state
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string | null>(null);
  
  // Consensus attributes filter state
  const [selectedAttributeFilter, setSelectedAttributeFilter] = useState<string | null>(null);
  
  // Track missing info check results per application with timestamps
  const [missingInfoResults, setMissingInfoResults] = useState<Map<string, { 
    isComplete: boolean; 
    missingFields: string[];
    checkedAt: Date;
  }>>(new Map());

  // Clear missing info results only when changing tabs (preserve across application switches)
  useEffect(() => {
    // Clear results when switching tabs to free memory
    setMissingInfoResults(new Map());
  }, [activeTab]);

  // Fetch emails for the currently viewing application
  const { data: applicationEmails } = api.email.getApplicationEmails.useQuery(
    { applicationId: viewingApplication?.id ?? "" },
    { enabled: !!viewingApplication?.id && viewDrawerOpened }
  );

  // Fetch all event emails to show reminder status in main table
  const { data: eventEmails } = api.email.getEventEmails.useQuery({
    eventId: event.id,
    status: "SENT"
  });

  // Determine status filter based on active tab
  const getStatusForTab = (tab: string) => {
    switch (tab) {
      case "incomplete":
        return undefined; // Fetch all applications and filter client-side for DRAFT + SUBMITTED
      case "under_review":
        return "UNDER_REVIEW" as const;
      case "accepted":
        return "ACCEPTED" as const;
      case "waitlisted":
        return "WAITLISTED" as const;
      case "rejected":
        return "REJECTED" as const;
      case "all":
      default:
        return undefined;
    }
  };

  // Fetch applications based on active tab
  const { data: applications, isLoading } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: getStatusForTab(activeTab),
  });

  // Fetch counts for tab badges
  const { data: allApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
  });
  const { data: underReviewApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "UNDER_REVIEW",
  });
  const { data: acceptedApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "ACCEPTED",
  });
  const { data: rejectedApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "REJECTED",
  });
  const { data: waitlistedApplications } = api.application.getEventApplications.useQuery({
    eventId: event.id,
    status: "WAITLISTED",
  });

  // Fetch consensus applications (applications with evaluations and scores)
  const { data: consensusApplications, isLoading: isConsensusLoading } = api.application.getConsensusApplications.useQuery({
    eventId: event.id,
  });

  // Fetch event questions for progress calculation
  const { data: eventQuestions } = api.application.getEventQuestions.useQuery({
    eventId: event.id,
  });

  // Get tRPC utils for invalidation
  const utils = api.useUtils();

  // API mutations
  const updateStatus = api.application.updateApplicationStatus.useMutation();
  const bulkUpdateStatus = api.application.bulkUpdateApplicationStatus.useMutation();
  const bulkAssignReviewer = api.evaluation.bulkCreateAssignments.useMutation();
  const checkMissingInfoMutation = api.email.checkMissingInfo.useMutation();
  const createMissingInfoEmail = api.email.createMissingInfoEmail.useMutation();
  const sendEmail = api.email.sendEmail.useMutation();
  const deleteEmail = api.email.deleteEmail.useMutation();
  const { data: emailSafety } = api.email.getEmailSafety.useQuery();
  const { data: reviewers } = api.user.getAdmins.useQuery();

  // Get demographic statistics when stats panel is visible and on accepted tab
  const { data: demographicStats, isLoading: isStatsLoading } = api.application.getApplicationStats.useQuery(
    { eventId: event.id, status: "ACCEPTED" },
    { enabled: showStats && activeTab === "accepted" }
  );

  // Calculate extended curation balance for accepted applications
  const acceptedCurationStats = useMemo((): ExtendedDemographicStats | null => {
    if (!acceptedApplications || acceptedApplications.length === 0) return null;
    
    // Convert accepted applications to ApplicationForDemographics format
    const demographicApplications: ApplicationForDemographics[] = acceptedApplications.map(app => ({
      id: app.id,
      responses: app.responses,
      demographics: undefined // Not pre-calculated, will be parsed from responses
    }));
    
    return calculateExtendedDemographicStats(demographicApplications);
  }, [acceptedApplications]);

  // Handle consensus table sorting
  const handleConsensusSort = (field: 'score' | 'name') => {
    if (consensusSortField === field) {
      // Toggle direction if same field
      setConsensusSortDirection(consensusSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setConsensusSortField(field);
      setConsensusSortDirection(field === 'score' ? 'desc' : 'asc'); // Score defaults to desc, name to asc
    }
  };

  // Extract unique reviewers from UNDER_REVIEW consensus applications only
  const availableReviewers = useMemo(() => {
    if (!consensusApplications) return [];
    
    const reviewerMap = new Map<string, { id: string; name: string | null; email: string }>();
    
    // Only process UNDER_REVIEW applications
    consensusApplications
      .filter(app => app.status === 'UNDER_REVIEW')
      .forEach(app => {
        app.evaluations.forEach(evaluation => {
          if (evaluation.reviewer) {
            reviewerMap.set(evaluation.reviewer.id, {
              id: evaluation.reviewer.id,
              name: evaluation.reviewer.name,
              email: evaluation.reviewer.email ?? 'No email',
            });
          }
        });
      });
    
    return Array.from(reviewerMap.values()).sort((a, b) => {
      const nameA = a.name ?? a.email;
      const nameB = b.name ?? b.email;
      return nameA.localeCompare(nameB);
    });
  }, [consensusApplications]);

  // Filter and sort consensus applications
  const filteredAndSortedConsensusApplications = useMemo(() => {
    if (!consensusApplications) return consensusApplications;

    // First, filter by UNDER_REVIEW status only
    let filtered = consensusApplications.filter(app => app.status === 'UNDER_REVIEW');
    
    // Then filter by selected reviewer if any
    if (selectedReviewerId) {
      filtered = filtered.filter(app =>
        app.evaluations.some(evaluation => evaluation.reviewer.id === selectedReviewerId)
      );
    }

    // Filter by region if selected
    if (selectedRegionFilter) {
      filtered = filtered.filter(app => {
        const nationalityResponse = app.responses?.find(r => 
          r.question.questionKey === 'nationality' || 
          r.question.questionKey === 'country'
        );
        
        if (!nationalityResponse?.answer) return false;
        
        const isLatam = isLatamCountry(nationalityResponse.answer);
        
        // Map regions to filter logic
        switch (selectedRegionFilter) {
          case 'Latin America':
            return isLatam;
          case 'North America':
          case 'Europe':
          case 'Asia':
          case 'Africa':
          case 'Oceania':
          case 'Other':
            return !isLatam; // For now, non-LATAM for all other regions
          default:
            return true;
        }
      });
    }

    // Filter by attributes if selected
    if (selectedAttributeFilter) {
      filtered = filtered.filter(app => 
        app.user?.adminLabels?.includes(selectedAttributeFilter)
      );
    }

    // Then sort if a sort field is selected
    if (!consensusSortField) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (consensusSortField === 'score') {
        comparison = a.averageScore - b.averageScore;
      } else if (consensusSortField === 'name') {
        const nameA = a.user?.name ?? a.email;
        const nameB = b.user?.name ?? b.email;
        comparison = nameA.localeCompare(nameB);
      }
      
      return consensusSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [consensusApplications, consensusSortField, consensusSortDirection, selectedReviewerId, selectedRegionFilter, selectedAttributeFilter]);

  // Helper function to find latest MISSING_INFO email for an application
  const getLatestMissingInfoEmail = (applicationId: string) => {
    return eventEmails?.filter(email => 
      email.applicationId === applicationId && 
      email.type === "MISSING_INFO" && 
      email.status === "SENT"
    ).sort((a, b) => new Date(b.sentAt ?? 0).getTime() - new Date(a.sentAt ?? 0).getTime())[0];
  };

  // Helper function to get comprehensive check status for an application
  const getCheckStatus = (applicationId: string) => {
    const checkResult = missingInfoResults.get(applicationId);
    const lastEmail = getLatestMissingInfoEmail(applicationId);
    
    return {
      checked: !!checkResult,
      isComplete: checkResult?.isComplete ?? false,
      missingFieldsCount: checkResult?.missingFields.length ?? 0,
      checkedAt: checkResult?.checkedAt,
      lastEmailDate: lastEmail?.sentAt,
      hasEmailSent: !!lastEmail,
      lastEmail
    };
  };

  // Calculate application completions for all applications
  const applicationCompletions = useMemo(() => {
    const completionsMap = new Map<string, { completionPercentage: number; completedFields: number; totalFields: number }>();
    
    if (!applications || !eventQuestions) return completionsMap;
    
    // Helper to calculate completion using the existing hook logic for each application
    for (const application of applications) {
      try {
        // Simple completion calculation - count filled responses vs required questions
        const requiredQuestions = eventQuestions.filter(q => q.required);
        const responseMap = new Map(
          application.responses?.map(r => [r.questionId, r]) ?? []
        );
        
        let completedCount = 0;
        for (const question of requiredQuestions) {
          const response = responseMap.get(question.id);
          if (response?.answer && response.answer.trim() !== "") {
            completedCount++;
          }
        }
        
        const totalFields = requiredQuestions.length;
        const completionPercentage = totalFields > 0 ? Math.round((completedCount / totalFields) * 100) : 100;
        
        completionsMap.set(application.id, {
          completionPercentage,
          completedFields: completedCount,
          totalFields,
        });
      } catch {
        // Fallback for any errors
        completionsMap.set(application.id, {
          completionPercentage: 0,
          completedFields: 0,
          totalFields: 0,
        });
      }
    }
    
    return completionsMap;
  }, [applications, eventQuestions]);

  // Filter applications based on search, hide rejected setting, hide reviewing/accepted setting, and incomplete tab logic
  const filteredApplications = applications?.filter(app => {
    // Search filter
    const matchesSearch = !searchQuery || 
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Hide rejected and cancelled filter (only applies when on "all" tab)
    const shouldHideRejected = hideRejected && activeTab === "all" && (app.status === "REJECTED" || app.status === "CANCELLED");
    
    // Hide reviewing and accepted filter (only applies when on "all" tab)
    const shouldHideReviewingAccepted = hideReviewingAccepted && activeTab === "all" && 
      (app.status === "UNDER_REVIEW" || app.status === "ACCEPTED");
    
    // Hide incomplete applications filter (only applies when on "all" tab)
    const shouldHideIncomplete = hideIncomplete && activeTab === "all" && 
      (app.status === "DRAFT" || app.status === "SUBMITTED") &&
      !missingInfoResults.get(app.id)?.isComplete;
    
    // For incomplete tab, only show applications that are DRAFT or SUBMITTED and have missing info
    if (activeTab === "incomplete") {
      // Only show DRAFT or SUBMITTED applications
      const isIncompleteStatus = app.status === "DRAFT" || app.status === "SUBMITTED";
      if (!isIncompleteStatus) return false;
      
      const checkResult = missingInfoResults.get(app.id);
      // Only show if we've checked and found missing info, OR if we haven't checked yet (potential incomplete)
      const hasMissingInfo = !checkResult?.isComplete;
      return matchesSearch && !shouldHideRejected && !shouldHideReviewingAccepted && !shouldHideIncomplete && hasMissingInfo;
    }
    
    return matchesSearch && !shouldHideRejected && !shouldHideReviewingAccepted && !shouldHideIncomplete;
  }) ?? [];

  // Calculate incomplete applications count (DRAFT or SUBMITTED apps with missing info or unchecked)
  const incompleteCount = allApplications?.filter(app => {
    // Only count DRAFT or SUBMITTED applications as potentially incomplete
    const isIncompleteStatus = app.status === "DRAFT" || app.status === "SUBMITTED";
    if (!isIncompleteStatus) return false;
    
    const checkResult = missingInfoResults.get(app.id);
    return !checkResult?.isComplete;
  }).length ?? 0;


  // Handle individual application selection
  const toggleApplicationSelection = (applicationId: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(applicationId)) {
      newSelection.delete(applicationId);
    } else {
      newSelection.add(applicationId);
    }
    setSelectedApplications(newSelection);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)));
    }
  };

  // Handle individual status change
  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        applicationId,
        status: newStatus as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED",
      });
      
      notifications.show({
        title: "Success",
        message: "Application status updated successfully",
        color: "green",
        icon: <IconCheck />,
      });
      
      // Invalidate all application queries to refresh all tabs immediately
      await utils.application.getEventApplications.invalidate({ eventId: event.id });
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to update application status",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Handle bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedApplications.size === 0) return;

    try {
      await bulkUpdateStatus.mutateAsync({
        applicationIds: Array.from(selectedApplications),
        status: newStatus as "DRAFT" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED",
      });
      
      notifications.show({
        title: "Success",
        message: `Updated ${selectedApplications.size} application(s) successfully`,
        color: "green",
        icon: <IconCheck />,
      });
      
      setSelectedApplications(new Set());
      // Invalidate all application queries to refresh all tabs immediately
      await utils.application.getEventApplications.invalidate({ eventId: event.id });
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to update applications",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Handle bulk reviewer assignment
  const handleBulkAssignReviewer = async (reviewerId: string) => {
    if (selectedApplications.size === 0) return;

    try {
      const result = await bulkAssignReviewer.mutateAsync({
        applicationIds: Array.from(selectedApplications),
        reviewerId,
        stage: 'SCREENING',
        priority: 0,
        notes: `Bulk assigned for screening review`,
      });
      
      notifications.show({
        title: "Success",
        message: `Assigned ${result.created} application(s) successfully${result.skipped > 0 ? ` (${result.skipped} already assigned)` : ''}`,
        color: "green",
        icon: <IconCheck />,
      });
      
      setSelectedApplications(new Set());
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to assign reviewer",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // View application details
  const viewApplication = (application: ApplicationWithUser) => {
    setViewingApplication(application);
    openViewDrawer();
  };

  // Edit application
  const editApplication = (application: ApplicationWithUser) => {
    console.log('🔍 AdminApplicationsClient: Edit application clicked', {
      applicationId: application.id,
      userEmail: application.email,
      status: application.status,
      responseCount: application.responses.length
    });
    
    setEditingApplication(application);
    console.log('🔍 AdminApplicationsClient: Opening edit drawer');
    openEditDrawer();
    console.log('✅ AdminApplicationsClient: Edit drawer opened');
  };

  // Check application for missing information
  const handleCheckApplication = async (applicationId: string) => {
    try {
      const result = await checkMissingInfoMutation.mutateAsync({
        applicationId,
      });
      
      // Store the result for this application with timestamp
      setMissingInfoResults(prev => new Map(prev).set(applicationId, {
        isComplete: result.isComplete,
        missingFields: result.missingFields.map((f: { questionKey: string }) => f.questionKey),
        checkedAt: new Date()
      }));
      
      if (result.isComplete) {
        notifications.show({
          title: "Application Complete",
          message: "✅ No missing information found - application is complete!",
          color: "green",
          icon: <IconChecklist />,
        });
      } else {
        notifications.show({
          title: "Missing Information Found",
          message: `❌ ${result.missingFields.length} required field(s) missing: ${result.missingFields.map((f: { questionKey: string }) => f.questionKey).join(", ")}`,
          color: "yellow",
          icon: <IconAlertTriangle />,
        });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to check application",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Create email draft for missing information
  const handleCreateEmailDraft = async (applicationId: string) => {
    try {
      await createMissingInfoEmail.mutateAsync({
        applicationId,
      });
      
      notifications.show({
        title: "Email Draft Created",
        message: "Missing information email draft has been created and can be reviewed in the application details.",
        color: "blue",
        icon: <IconMail />,
      });
      
      // Refresh emails if viewing this application
      if (viewingApplication?.id === applicationId) {
        await utils.email.getApplicationEmails.invalidate({ applicationId });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to create email draft",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Preview email before sending
  const handlePreviewEmail = (email: EmailType) => {
    setPreviewingEmail(email);
    openEmailPreview();
  };

  // Send a draft email (now with safety confirmation)
  const handleSendEmail = async (emailId: string, confirmed = false) => {
    try {
      const result = await sendEmail.mutateAsync({ 
        emailId, 
        bypassSafety: confirmed 
      });
      
      if (result.success) {
        notifications.show({
          title: "Email Sent",
          message: "Email has been sent successfully",
          color: "green",
          icon: <IconCheck />,
        });
        closeEmailPreview();
      } else {
        notifications.show({
          title: "Email Failed",
          message: result.error ?? "Failed to send email",
          color: "red",
          icon: <IconX />,
        });
      }
      
      // Refresh emails
      if (viewingApplication?.id) {
        await utils.email.getApplicationEmails.invalidate({ applicationId: viewingApplication.id });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to send email",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Delete a draft email
  const handleDeleteEmail = async (emailId: string) => {
    try {
      await deleteEmail.mutateAsync({ emailId });
      
      notifications.show({
        title: "Email Deleted",
        message: "Draft email has been deleted",
        color: "blue",
        icon: <IconCheck />,
      });
      
      // Refresh emails
      if (viewingApplication?.id) {
        await utils.email.getApplicationEmails.invalidate({ applicationId: viewingApplication.id });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: (error as { message?: string }).message ?? "Failed to delete email",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Handle sponsored application creation success
  const handleSponsoredApplicationSuccess = async () => {
    notifications.show({
      title: "Sponsored Application Created",
      message: "Sponsored application has been created with ACCEPTED status",
      color: "green",
      icon: <IconCheck />,
    });
    
    // Refresh applications data to show the new sponsored application
    await utils.application.getEventApplications.invalidate({ eventId: event.id });
  };

  // Helper function to safely escape CSV values
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Helper function to format array values for CSV
  const formatArrayForCsv = (array: string[] | null | undefined): string => {
    if (!array || array.length === 0) return "";
    return escapeCsvValue(array.join("; "));
  };

  // Helper function to get response value by question key
  const getResponseValue = (responses: ApplicationWithUser['responses'], questionKey: string): string => {
    const response = responses.find(r => r.question.questionKey === questionKey);
    return response?.answer ?? "";
  };

  // Enhanced CSV export with comprehensive data
  const exportApplications = () => {
    if (!applications || applications.length === 0) return;

    const csvData = applications.map(app => {
      const profile = app.user?.profile;
      const responses = app.responses ?? [];
      
      // Get common application responses
      const fullName = getResponseValue(responses, "full_name") ?? app.user?.name ?? "";
      const nationality = getResponseValue(responses, "nationality") || getResponseValue(responses, "country");
      const gender = getResponseValue(responses, "gender");
      const age = getResponseValue(responses, "age");
      const technicalSkills = getResponseValue(responses, "technical_skills") || getResponseValue(responses, "skills");
      const projectDescription = getResponseValue(responses, "project_description");
      const motivation = getResponseValue(responses, "motivation") || getResponseValue(responses, "why_apply");
      const experience = getResponseValue(responses, "experience") || getResponseValue(responses, "background");
      const education = getResponseValue(responses, "education");
      const portfolio = getResponseValue(responses, "portfolio") || getResponseValue(responses, "portfolio_url");
      
      // Format reviewer information
      const reviewers = app.reviewerAssignments?.map(r => r.reviewer.name ?? r.reviewer.email ?? "Unknown").join("; ") ?? "";
      
      return {
        // Basic Information
        applicationId: app.id,
        email: app.email,
        name: escapeCsvValue(fullName),
        status: app.status,
        affiliation: escapeCsvValue(app.affiliation),
        createdAt: new Date(app.createdAt).toISOString(),
        
        // Profile Information
        jobTitle: escapeCsvValue(profile?.jobTitle),
        company: escapeCsvValue(profile?.company),
        location: escapeCsvValue(profile?.location),
        timezone: escapeCsvValue(profile?.timezone),
        yearsOfExperience: profile?.yearsOfExperience?.toString() ?? "",
        bio: escapeCsvValue(profile?.bio),
        
        // Contact Information
        website: escapeCsvValue(profile?.website),
        githubUrl: escapeCsvValue(profile?.githubUrl),
        linkedinUrl: escapeCsvValue(profile?.linkedinUrl),
        twitterUrl: escapeCsvValue(profile?.twitterUrl),
        telegramHandle: escapeCsvValue(profile?.telegramHandle),
        discordHandle: escapeCsvValue(profile?.discordHandle),
        
        // Skills and Interests
        profileSkills: formatArrayForCsv(profile?.skills),
        profileInterests: formatArrayForCsv(profile?.interests),
        languages: formatArrayForCsv(profile?.languages),
        
        // Availability Flags
        availableForMentoring: profile?.availableForMentoring ? "Yes" : "No",
        availableForHiring: profile?.availableForHiring ? "Yes" : "No",
        availableForOfficeHours: profile?.availableForOfficeHours ? "Yes" : "No",
        
        // Application Response Data
        nationality: escapeCsvValue(nationality),
        gender: escapeCsvValue(gender),
        age: escapeCsvValue(age),
        applicationTechnicalSkills: escapeCsvValue(technicalSkills),
        projectDescription: escapeCsvValue(projectDescription),
        motivation: escapeCsvValue(motivation),
        experience: escapeCsvValue(experience),
        education: escapeCsvValue(education),
        portfolioUrl: escapeCsvValue(portfolio),
        
        // Review Information
        reviewers: escapeCsvValue(reviewers),
        reviewerCount: app.reviewerAssignments?.length.toString() ?? "0",
      };
    });

    // Define headers for all fields
    const headers = [
      "Application ID", "Email", "Name", "Status", "Affiliation", "Created At",
      "Job Title", "Company", "Location", "Timezone", "Years of Experience", "Bio",
      "Website", "GitHub URL", "LinkedIn URL", "Twitter URL", "Telegram Handle", "Discord Handle",
      "Profile Skills", "Profile Interests", "Languages",
      "Available for Mentoring", "Available for Hiring", "Available for Office Hours",
      "Nationality", "Gender", "Age", "Application Technical Skills", "Project Description", 
      "Motivation", "Experience", "Education", "Portfolio URL",
      "Reviewers", "Reviewer Count"
    ];

    // Create CSV content with proper escaping
    const csvContent = [
      headers.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_applications_enhanced.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Specialized CSV export functions
  const exportDemographicData = () => {
    if (!applications || applications.length === 0) return;

    const csvData = applications.map(app => {
      const responses = app.responses ?? [];
      const nationality = getResponseValue(responses, "nationality") || getResponseValue(responses, "country");
      const gender = getResponseValue(responses, "gender");
      const age = getResponseValue(responses, "age");
      const location = app.user?.profile?.location;
      
      return {
        applicationId: app.id,
        email: app.email,
        name: escapeCsvValue(app.user?.name ?? getResponseValue(responses, "full_name")),
        status: app.status,
        nationality: escapeCsvValue(nationality),
        gender: escapeCsvValue(gender),
        age: escapeCsvValue(age),
        location: escapeCsvValue(location),
        affiliation: escapeCsvValue(app.affiliation),
      };
    });

    const headers = ["Application ID", "Email", "Name", "Status", "Nationality", "Gender", "Age", "Location", "Affiliation"];
    const csvContent = [
      headers.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_demographic_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportContactData = () => {
    if (!applications || applications.length === 0) return;

    const csvData = applications.map(app => {
      const profile = app.user?.profile;
      const responses = app.responses ?? [];
      
      return {
        applicationId: app.id,
        email: app.email,
        name: escapeCsvValue(app.user?.name ?? getResponseValue(responses, "full_name")),
        status: app.status,
        affiliation: escapeCsvValue(app.affiliation),
        company: escapeCsvValue(profile?.company),
        jobTitle: escapeCsvValue(profile?.jobTitle),
        location: escapeCsvValue(profile?.location),
        githubUrl: escapeCsvValue(profile?.githubUrl),
        linkedinUrl: escapeCsvValue(profile?.linkedinUrl),
        twitterUrl: escapeCsvValue(profile?.twitterUrl),
        telegramHandle: escapeCsvValue(profile?.telegramHandle),
        discordHandle: escapeCsvValue(profile?.discordHandle),
        website: escapeCsvValue(profile?.website),
        availableForMentoring: profile?.availableForMentoring ? "Yes" : "No",
        availableForHiring: profile?.availableForHiring ? "Yes" : "No",
      };
    });

    const headers = [
      "Application ID", "Email", "Name", "Status", "Affiliation", "Company", "Job Title", "Location",
      "GitHub URL", "LinkedIn URL", "Twitter URL", "Telegram Handle", "Discord Handle", "Website",
      "Available for Mentoring", "Available for Hiring"
    ];
    
    const csvContent = [
      headers.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_contact_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportTechnicalData = () => {
    if (!applications || applications.length === 0) return;

    const csvData = applications.map(app => {
      const profile = app.user?.profile;
      const responses = app.responses ?? [];
      const technicalSkills = getResponseValue(responses, "technical_skills") || getResponseValue(responses, "skills");
      const projectDescription = getResponseValue(responses, "project_description");
      const experience = getResponseValue(responses, "experience") || getResponseValue(responses, "background");
      const portfolio = getResponseValue(responses, "portfolio") || getResponseValue(responses, "portfolio_url");
      
      return {
        applicationId: app.id,
        email: app.email,
        name: escapeCsvValue(app.user?.name ?? getResponseValue(responses, "full_name")),
        status: app.status,
        affiliation: escapeCsvValue(app.affiliation),
        yearsOfExperience: profile?.yearsOfExperience?.toString() ?? "",
        profileSkills: formatArrayForCsv(profile?.skills),
        applicationTechnicalSkills: escapeCsvValue(technicalSkills),
        projectDescription: escapeCsvValue(projectDescription),
        experience: escapeCsvValue(experience),
        portfolioUrl: escapeCsvValue(portfolio),
        githubUrl: escapeCsvValue(profile?.githubUrl),
        languages: formatArrayForCsv(profile?.languages),
      };
    });

    const headers = [
      "Application ID", "Email", "Name", "Status", "Affiliation", "Years of Experience", "Profile Skills",
      "Application Technical Skills", "Project Description", "Experience", "Portfolio URL",
      "GitHub URL", "Languages"
    ];
    
    const csvContent = [
      headers.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_technical_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Comprehensive Q&A export with all questions and responses
  const exportCompleteQAData = () => {
    if (!applications || applications.length === 0 || !eventQuestions) return;

    // Sort questions by order for consistent column layout
    const sortedQuestions = [...eventQuestions].sort((a, b) => a.order - b.order);
    
    const csvData = applications.map(app => {
      const profile = app.user?.profile;
      const responseMap = new Map(app.responses.map(r => [r.question.id, r.answer]));
      const reviewers = app.reviewerAssignments?.map(r => r.reviewer.name ?? r.reviewer.email ?? "Unknown").join("; ") ?? "";
      
      // Build the row data object dynamically
      const rowData: Record<string, string> = {
        // Core application data
        applicationId: app.id,
        email: app.email,
        status: app.status,
        submittedAt: app.submittedAt ? new Date(app.submittedAt).toISOString() : "",
        createdAt: new Date(app.createdAt).toISOString(),
        language: app.language ?? "en",
        
        // Profile summary data (if available)
        profileJobTitle: escapeCsvValue(profile?.jobTitle),
        profileCompany: escapeCsvValue(profile?.company),
        profileLocation: escapeCsvValue(profile?.location),
        profileYearsExperience: profile?.yearsOfExperience?.toString() ?? "",
        profileGithub: escapeCsvValue(profile?.githubUrl),
        profileLinkedIn: escapeCsvValue(profile?.linkedinUrl),
        
        // Review data
        reviewers: escapeCsvValue(reviewers),
        reviewerCount: app.reviewerAssignments?.length.toString() ?? "0",
      };

      // Add all question responses dynamically
      sortedQuestions.forEach(question => {
        const answer = responseMap.get(question.id) ?? "";
        const columnKey = `Q${question.order}_${question.questionKey}`;
        rowData[columnKey] = escapeCsvValue(answer);
      });

      return rowData;
    });

    // Build dynamic headers
    const staticHeaders = [
      "Application ID", "Email", "Status", "Submitted At", "Created At", "Language",
      "Profile Job Title", "Profile Company", "Profile Location", "Profile Years Experience", 
      "Profile GitHub", "Profile LinkedIn", "Reviewers", "Reviewer Count"
    ];

    // Add dynamic question headers with full question text
    const questionHeaders = sortedQuestions.map(question => {
      const questionText = question.questionEn || question.questionKey;
      const truncatedText = questionText.length > 50 ? questionText.substring(0, 47) + "..." : questionText;
      const requiredIndicator = question.required ? "*" : "";
      return `Q${question.order}: ${truncatedText}${requiredIndicator}`;
    });

    const allHeaders = [...staticHeaders, ...questionHeaders];

    // Create CSV content
    const csvContent = [
      allHeaders.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => allHeaders.map(header => {
        // Map display headers back to data keys
        if (header.startsWith("Q") && header.includes(":")) {
          const questionOrder = parseInt(header.split(":")[0]?.substring(1) ?? "0");
          const question = sortedQuestions.find(q => q.order === questionOrder);
          if (question) {
            const columnKey = `Q${question.order}_${question.questionKey}`;
            return row[columnKey] ?? "";
          }
        }
        // Handle static headers
        const staticHeaderMap: Record<string, string> = {
          "Application ID": "applicationId",
          "Email": "email",
          "Status": "status",
          "Submitted At": "submittedAt",
          "Created At": "createdAt",
          "Language": "language",
          "Profile Job Title": "profileJobTitle",
          "Profile Company": "profileCompany",
          "Profile Location": "profileLocation",
          "Profile Years Experience": "profileYearsExperience",
          "Profile GitHub": "profileGithub",
          "Profile LinkedIn": "profileLinkedIn",
          "Reviewers": "reviewers",
          "Reviewer Count": "reviewerCount",
        };
        
        const dataKey = staticHeaderMap[header];
        return dataKey ? (row[dataKey] ?? "") : "";
      }).join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_complete_qa_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Question Analysis export for form insights
  const exportQuestionAnalysis = () => {
    if (!applications || applications.length === 0 || !eventQuestions) return;

    const sortedQuestions = [...eventQuestions].sort((a, b) => a.order - b.order);
    const totalApplications = applications.length;
    
    const questionAnalysisData = sortedQuestions.map(question => {
      // Count how many applications answered this question
      const answeredCount = applications.filter(app => 
        app.responses.some(r => r.question.id === question.id && r.answer.trim() !== "")
      ).length;
      
      const responseRate = totalApplications > 0 ? ((answeredCount / totalApplications) * 100).toFixed(1) : "0";
      
      // Get sample responses (first 3 non-empty ones)
      const sampleResponses = applications
        .map(app => app.responses.find(r => r.question.id === question.id)?.answer)
        .filter(answer => answer && answer.trim() !== "")
        .slice(0, 3)
        .join(" | ");

      return {
        questionOrder: question.order.toString(),
        questionKey: question.questionKey,
        questionEnglish: escapeCsvValue(question.questionEn),
        questionSpanish: escapeCsvValue(question.questionEs),
        questionType: question.questionType,
        required: question.required ? "Yes" : "No",
        totalApplicants: totalApplications.toString(),
        responsesReceived: answeredCount.toString(),
        responseRate: `${responseRate}%`,
        sampleResponses: escapeCsvValue(sampleResponses),
      };
    });

    const headers = [
      "Question Order", "Question Key", "Question (English)", "Question (Spanish)", 
      "Question Type", "Required", "Total Applicants", "Responses Received", 
      "Response Rate", "Sample Responses"
    ];

    const csvContent = [
      headers.map(header => escapeCsvValue(header)).join(","),
      ...questionAnalysisData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_question_analysis.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Accepted Builders comprehensive export with all data
  const exportAcceptedBuilders = () => {
    if (!applications || applications.length === 0 || !eventQuestions) return;

    // Filter only accepted applications
    const acceptedApplications = applications.filter(app => app.status === "ACCEPTED");
    
    if (acceptedApplications.length === 0) {
      notifications.show({
        title: "No Accepted Applications",
        message: "There are no accepted applications to export",
        color: "orange",
      });
      return;
    }

    // Sort questions by order for consistent column layout
    const sortedQuestions = [...eventQuestions].sort((a, b) => a.order - b.order);
    
    const csvData = acceptedApplications.map(app => {
      const profile = app.user?.profile;
      const user = app.user;
      const responseMap = new Map(app.responses.map(r => [r.question.id, r.answer]));
      const reviewers = app.reviewerAssignments?.map(r => r.reviewer.name ?? r.reviewer.email ?? "Unknown").join("; ") ?? "";
      
      // Build the row data object dynamically with ALL available data
      const rowData: Record<string, string> = {
        // Core application data
        applicationId: app.id,
        email: app.email,
        status: app.status,
        affiliation: escapeCsvValue(app.affiliation),
        submittedAt: app.submittedAt ? new Date(app.submittedAt).toISOString() : "",
        createdAt: new Date(app.createdAt).toISOString(),
        language: app.language ?? "en",
        
        // User basic info
        userName: escapeCsvValue(user?.name),
        userEmail: escapeCsvValue(user?.email),
        
        // Admin fields
        adminNotes: escapeCsvValue(user?.adminNotes),
        adminLabels: formatArrayForCsv(user?.adminLabels),
        adminUpdatedAt: user?.adminUpdatedAt ? new Date(user.adminUpdatedAt).toISOString() : "",
        
        // Comprehensive profile data
        profileBio: escapeCsvValue(profile?.bio),
        profileJobTitle: escapeCsvValue(profile?.jobTitle),
        profileCompany: escapeCsvValue(profile?.company),
        profileLocation: escapeCsvValue(profile?.location),
        profileTimezone: escapeCsvValue(profile?.timezone),
        profileYearsExperience: profile?.yearsOfExperience?.toString() ?? "",
        profileWebsite: escapeCsvValue(profile?.website),
        
        // Contact & Social URLs
        profileGithub: escapeCsvValue(profile?.githubUrl),
        profileLinkedIn: escapeCsvValue(profile?.linkedinUrl),
        profileTwitter: escapeCsvValue(profile?.twitterUrl),
        profileTelegram: escapeCsvValue(profile?.telegramHandle),
        profileDiscord: escapeCsvValue(profile?.discordHandle),
        
        // Skills & Interests
        profileSkills: formatArrayForCsv(profile?.skills),
        profileInterests: formatArrayForCsv(profile?.interests),
        profileLanguages: formatArrayForCsv(profile?.languages),
        
        // Availability flags
        availableForMentoring: profile?.availableForMentoring ? "Yes" : "No",
        availableForHiring: profile?.availableForHiring ? "Yes" : "No",
        availableForOfficeHours: profile?.availableForOfficeHours ? "Yes" : "No",
        
        // Review data
        reviewers: escapeCsvValue(reviewers),
        reviewerCount: app.reviewerAssignments?.length.toString() ?? "0",
      };

      // Add all question responses dynamically
      sortedQuestions.forEach(question => {
        const answer = responseMap.get(question.id) ?? "";
        const columnKey = `Q${question.order}_${question.questionKey}`;
        rowData[columnKey] = escapeCsvValue(answer);
      });

      return rowData;
    });

    // Build comprehensive headers for accepted builders
    const staticHeaders = [
      "Application ID", "Email", "Status", "Affiliation", "Submitted At", "Created At", "Language",
      "User Name", "User Email",
      "Admin Notes", "Admin Labels", "Admin Updated At",
      "Profile Bio", "Profile Job Title", "Profile Company", "Profile Location", "Profile Timezone", "Profile Years Experience",
      "Profile Website", "Profile GitHub", "Profile LinkedIn", "Profile Twitter", "Profile Telegram", "Profile Discord",
      "Profile Skills", "Profile Interests", "Profile Languages",
      "Available for Mentoring", "Available for Hiring", "Available for Office Hours",
      "Reviewers", "Reviewer Count"
    ];

    // Add dynamic question headers with full question text
    const questionHeaders = sortedQuestions.map(question => {
      const questionText = question.questionEn || question.questionKey;
      const truncatedText = questionText.length > 50 ? questionText.substring(0, 47) + "..." : questionText;
      const requiredIndicator = question.required ? "*" : "";
      return `Q${question.order}: ${truncatedText}${requiredIndicator}`;
    });

    const allHeaders = [...staticHeaders, ...questionHeaders];

    // Create CSV content with comprehensive data mapping
    const csvContent = [
      allHeaders.map(header => escapeCsvValue(header)).join(","),
      ...csvData.map(row => allHeaders.map(header => {
        // Map display headers back to data keys
        if (header.startsWith("Q") && header.includes(":")) {
          const questionOrder = parseInt(header.split(":")[0]?.substring(1) ?? "0");
          const question = sortedQuestions.find(q => q.order === questionOrder);
          if (question) {
            const columnKey = `Q${question.order}_${question.questionKey}`;
            return row[columnKey] ?? "";
          }
        }
        // Handle static headers with comprehensive mapping
        const staticHeaderMap: Record<string, string> = {
          "Application ID": "applicationId",
          "Email": "email",
          "Status": "status",
          "Affiliation": "affiliation",
          "Submitted At": "submittedAt",
          "Created At": "createdAt",
          "Language": "language",
          "User Name": "userName",
          "User Email": "userEmail",
          "Admin Notes": "adminNotes",
          "Admin Labels": "adminLabels",
          "Admin Updated At": "adminUpdatedAt",
          "Profile Bio": "profileBio",
          "Profile Job Title": "profileJobTitle",
          "Profile Company": "profileCompany",
          "Profile Location": "profileLocation",
          "Profile Timezone": "profileTimezone",
          "Profile Years Experience": "profileYearsExperience",
          "Profile Website": "profileWebsite",
          "Profile GitHub": "profileGithub",
          "Profile LinkedIn": "profileLinkedIn",
          "Profile Twitter": "profileTwitter",
          "Profile Telegram": "profileTelegram",
          "Profile Discord": "profileDiscord",
          "Profile Skills": "profileSkills",
          "Profile Interests": "profileInterests",
          "Profile Languages": "profileLanguages",
          "Available for Mentoring": "availableForMentoring",
          "Available for Hiring": "availableForHiring",
          "Available for Office Hours": "availableForOfficeHours",
          "Reviewers": "reviewers",
          "Reviewer Count": "reviewerCount",
        };
        
        const dataKey = staticHeaderMap[header];
        return dataKey ? (row[dataKey] ?? "") : "";
      }).join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, "_")}_accepted_builders_complete.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success notification
    notifications.show({
      title: "Export Complete",
      message: `Exported ${acceptedApplications.length} accepted builder(s) with complete data`,
      color: "green",
      icon: <IconCheck />,
    });
  };

  const statusOptions = [
    { value: "DRAFT", label: "Incomplete" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
    { value: "WAITLISTED", label: "Waitlisted" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const applicationStats = allApplications ? {
    total: allApplications.length,
    submitted: allApplications.filter(app => app.status === "SUBMITTED").length,
    underReview: allApplications.filter(app => app.status === "UNDER_REVIEW").length,
    accepted: allApplications.filter(app => app.status === "ACCEPTED").length,
    rejected: allApplications.filter(app => app.status === "REJECTED").length,
    waitlisted: allApplications.filter(app => app.status === "WAITLISTED").length,
  } : null;

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Loader size="lg" />
          <Text c="dimmed">Loading applications...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Stack gap="xs">
            <Link href="/admin/events" style={{ textDecoration: 'none' }}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                Back to Events
              </Button>
            </Link>
            <Title order={1}>
              Applications for {event.name}
            </Title>
            <Text c="dimmed">
              Manage and review applications for this event
            </Text>
          </Stack>
        </Group>

        {/* Stats Cards */}
        {applicationStats && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-around">
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="blue">
                  {applicationStats.total}
                </Text>
                <Text size="sm" c="dimmed">Total Applications</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="orange">
                  {applicationStats.submitted}
                </Text>
                <Text size="sm" c="dimmed">Submitted</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="yellow">
                  {applicationStats.underReview}
                </Text>
                <Text size="sm" c="dimmed">Under Review</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="green">
                  {applicationStats.accepted}
                </Text>
                <Text size="sm" c="dimmed">Accepted</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <Text size="xl" fw={700} c="red">
                  {applicationStats.rejected}
                </Text>
                <Text size="sm" c="dimmed">Rejected</Text>
              </Stack>
            </Group>
          </Card>
        )}
        {/* Tabs for Application Status */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "all")}>
          <Tabs.List grow>
            <Tabs.Tab value="all">
              All Applications
              {allApplications && (
                <Badge size="sm" variant="light" ml="xs">
                  {allApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="incomplete">
              Incomplete
              {incompleteCount > 0 && (
                <Badge size="sm" variant="light" color="orange" ml="xs">
                  {incompleteCount}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="under_review">
              Under Review
              {underReviewApplications && (
                <Badge size="sm" variant="light" color="yellow" ml="xs">
                  {underReviewApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="pipeline">
              🌟 Review Pipeline
            </Tabs.Tab>
            <Tabs.Tab value="consensus">
              Consensus
              {consensusApplications && (
                <Badge size="sm" variant="light" color="blue" ml="xs">
                  {consensusApplications.filter(app => app.status === 'UNDER_REVIEW').length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="accepted">
              Accepted
              {acceptedApplications && (
                <Badge size="sm" variant="light" color="green" ml="xs">
                  {acceptedApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="waitlisted">
              Waitlisted
              {waitlistedApplications && (
                <Badge size="sm" variant="light" color="yellow" ml="xs">
                  {waitlistedApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="rejected">
              Rejected
              {rejectedApplications && (
                <Badge size="sm" variant="light" color="red" ml="xs">
                  {rejectedApplications.length}
                </Badge>
              )}
            </Tabs.Tab>
            
          </Tabs.List>

          {activeTab !== "pipeline" && activeTab !== "consensus" && <Tabs.Panel value={activeTab} mt="md">
            {/* Filters and Actions */}
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" wrap="wrap" gap="md">
                <Group gap="md">
                  <TextInput
                    placeholder="Search by name or email..."
                    leftSection={<IconSearch size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    style={{ minWidth: 200 }}
                  />
                  {activeTab === "all" && (
                    <>
                      <Checkbox
                        label="Hide rejected and cancelled"
                        checked={hideRejected}
                        onChange={(e) => setHideRejected(e.currentTarget.checked)}
                      />
                      <Checkbox
                        label="Hide reviewing and accepted"
                        checked={hideReviewingAccepted}
                        onChange={(e) => setHideReviewingAccepted(e.currentTarget.checked)}
                      />
                      <Checkbox
                        label="Hide incomplete applications"
                        checked={hideIncomplete}
                        onChange={(e) => setHideIncomplete(e.currentTarget.checked)}
                      />
                    </>
                  )}
                </Group>
                
                <Group gap="md">
                  {selectedApplications.size > 0 && (
                    <>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <Button 
                            variant="outline"
                            loading={bulkUpdateStatus.isPending}
                          >
                            Bulk Actions ({selectedApplications.size})
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {statusOptions.map((option) => (
                            <Menu.Item
                              key={option.value}
                              onClick={() => handleBulkStatusChange(option.value)}
                            >
                              Set to {option.label}
                            </Menu.Item>
                          ))}
                        </Menu.Dropdown>
                      </Menu>

                      <Menu position="bottom-end">
                        <Menu.Target>
                          <Button 
                            variant="outline"
                            leftSection={<IconUserPlus size={16} />}
                            loading={bulkAssignReviewer.isPending}
                          >
                            Assign Reviewer ({selectedApplications.size})
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {reviewers?.map((reviewer) => (
                            <Menu.Item
                              key={reviewer.id}
                              onClick={() => handleBulkAssignReviewer(reviewer.id)}
                            >
                              {reviewer.name ?? 'Unknown'} ({reviewer.email})
                            </Menu.Item>
                          ))}
                          {(!reviewers || reviewers.length === 0) && (
                            <Menu.Item disabled>
                              No reviewers available
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </>
                  )}
                  
                  {activeTab === "accepted" && (
                    <>
                      <Button
                        variant="outline"
                        leftSection={<IconChartBar size={16} />}
                        onClick={() => setShowStats(!showStats)}
                        loading={showStats && isStatsLoading}
                      >
                        {showStats ? "Hide Stats" : "Show Stats"}
                      </Button>
                      
                      <Button
                        variant="filled"
                        color="green"
                        leftSection={<IconUserPlus size={16} />}
                        onClick={openSponsoredModal}
                      >
                        Create Sponsored Application
                      </Button>
                    </>
                  )}
                  
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Button
                        variant="outline"
                        leftSection={<IconDownload size={16} />}
                        disabled={!applications || applications.length === 0}
                      >
                        Export CSV
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCheck size={16} />}
                        onClick={exportAcceptedBuilders}
                        disabled={!eventQuestions || eventQuestions.length === 0}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Accepted Builders Export</Text>
                          <Text size="xs" c="dimmed">Only accepted - ALL data including admin notes & questions</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconQuestionMark size={16} />}
                        onClick={exportCompleteQAData}
                        disabled={!eventQuestions || eventQuestions.length === 0}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Complete Q&A Export</Text>
                          <Text size="xs" c="dimmed">All questions & responses + profile data</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconAnalyze size={16} />}
                        onClick={exportQuestionAnalysis}
                        disabled={!eventQuestions || eventQuestions.length === 0}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Question Analysis</Text>
                          <Text size="xs" c="dimmed">Response rates & form insights</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconDownload size={16} />}
                        onClick={exportApplications}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Complete Export (Legacy)</Text>
                          <Text size="xs" c="dimmed">All data (35+ fields)</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconChartBar size={16} />}
                        onClick={exportDemographicData}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Demographic Data</Text>
                          <Text size="xs" c="dimmed">Nationality, gender, age, location</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconMail size={16} />}
                        onClick={exportContactData}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Contact Information</Text>
                          <Text size="xs" c="dimmed">Social profiles, availability flags</Text>
                        </Stack>
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconStar size={16} />}
                        onClick={exportTechnicalData}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>Technical Data</Text>
                          <Text size="xs" c="dimmed">Skills, experience, projects</Text>
                        </Stack>
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Card>

            {/* Stats Panel - Only show on accepted tab when stats are visible */}
            {showStats && activeTab === "accepted" && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text size="lg" fw={600}>Demographic Statistics</Text>
                    {isStatsLoading && <Loader size="sm" />}
                  </Group>
                  
                  {demographicStats && (
                    <Group grow align="flex-start">
                      {/* Gender Distribution */}
                      <Paper p="md" withBorder radius="md" bg="blue.0">
                        <Stack gap="sm">
                          <Text size="md" fw={500} c="blue.7">Gender Distribution</Text>
                          <Text size="xs" c="dimmed">Based on {demographicStats.total} accepted applications</Text>
                          
                          <Stack gap="xs">
                            {demographicStats.gender.female > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Female</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.gender.female}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.gender.percentages.female}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.gender.male > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Male</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.gender.male}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.gender.percentages.male}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.gender.other > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Other/Non-binary</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.gender.other}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.gender.percentages.other}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.gender.prefer_not_to_say > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Prefer not to say</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.gender.prefer_not_to_say}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.gender.percentages.prefer_not_to_say}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.gender.unspecified > 0 && (
                              <Group justify="space-between">
                                <Text size="sm" c="dimmed">Not specified</Text>
                                <Group gap="xs">
                                  <Text size="sm" c="dimmed">{demographicStats.gender.unspecified}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.gender.percentages.unspecified}%)</Text>
                                </Group>
                              </Group>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>

                      {/* Regional Distribution */}
                      <Paper p="md" withBorder radius="md" bg="green.0">
                        <Stack gap="sm">
                          <Text size="md" fw={500} c="green.7">Regional Distribution</Text>
                          <Text size="xs" c="dimmed">Based on nationality responses</Text>
                          
                          <Stack gap="xs">
                            {demographicStats.region.latam > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Latin America</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.region.latam}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.region.percentages.latam}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.region.non_latam > 0 && (
                              <Group justify="space-between">
                                <Text size="sm">Other Regions</Text>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>{demographicStats.region.non_latam}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.region.percentages.non_latam}%)</Text>
                                </Group>
                              </Group>
                            )}
                            
                            {demographicStats.region.unspecified > 0 && (
                              <Group justify="space-between">
                                <Text size="sm" c="dimmed">Not specified</Text>
                                <Group gap="xs">
                                  <Text size="sm" c="dimmed">{demographicStats.region.unspecified}</Text>
                                  <Text size="sm" c="dimmed">({demographicStats.region.percentages.unspecified}%)</Text>
                                </Group>
                              </Group>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    </Group>
                  )}
                  
                  {demographicStats?.total === 0 && (
                    <Paper p="xl" radius="md" ta="center" bg="gray.0">
                      <Text c="dimmed" size="md">No accepted applications found</Text>
                      <Text c="dimmed" size="sm">Statistics will appear here once applications are accepted</Text>
                    </Paper>
                  )}
                </Stack>
              </Card>
            )}

            {/* Curation Balance Dashboard - Only show on accepted tab when stats are visible */}
            {showStats && activeTab === "accepted" && acceptedCurationStats && (
              <CurationSpecDashboard 
                demographicStats={acceptedCurationStats}
                isLoading={isStatsLoading}
              />
            )}

            {/* Applications Table */}
            <Paper shadow="sm" radius="md" withBorder>
              {filteredApplications.length === 0 ? (
                <Stack align="center" p="xl" gap="md">
                  <IconUsers size={48} stroke={1} color="var(--mantine-color-gray-5)" />
                  <Text c="dimmed">No applications found</Text>
                </Stack>
              ) : (
                <Table.ScrollContainer minWidth={900}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Checkbox
                            checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                            indeterminate={selectedApplications.size > 0 && selectedApplications.size < filteredApplications.length}
                            onChange={toggleSelectAll}
                          />
                        </Table.Th>
                        <Table.Th>Applicant</Table.Th>
                        <Table.Th>Progress</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Affiliation</Table.Th>
                        <Table.Th>Region</Table.Th>
                        <Table.Th>Attributes</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredApplications.map((application) => {
                        const StatusIcon = getStatusIcon(application.status);
                        
                        // Get completion data from the pre-calculated map
                        const completion = applicationCompletions.get(application.id) ?? { 
                          completionPercentage: 0, 
                          completedFields: 0, 
                          totalFields: 0 
                        };
                        
                        return (
                          <Table.Tr key={application.id}>
                            <Table.Td>
                              <Checkbox
                                checked={selectedApplications.has(application.id)}
                                onChange={() => toggleApplicationSelection(application.id)}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text fw={500}>
                                  {application.user?.name ?? "No name provided"}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {application.email}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <ApplicationCompletionProgress
                                completionPercentage={completion.completionPercentage}
                                completedFields={completion.completedFields}
                                totalFields={completion.totalFields}
                                size="sm"
                                showTooltip={true}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getStatusColor(application.status)}
                                variant="light"
                                leftSection={<StatusIcon size={12} />}
                                title={`Debug: Status is "${application.status}"`}
                              >
                                {application.status.replace("_", " ")}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {application.affiliation ?? "Not specified"}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {/* Show LATAM badge for all tabs */}
                              <Group gap="xs">
                                {(() => {
                                  const nationalityResponse = application.responses?.find(r => 
                                    r.question.questionKey === 'nationality' || 
                                    r.question.questionKey === 'country'
                                  );
                                  
                                  if (!nationalityResponse?.answer) {
                                    return <Text size="xs" c="dimmed">Not specified</Text>;
                                  }
                                  
                                  const isLatam = isLatamCountry(nationalityResponse.answer);
                                  
                                  return (
                                    <Tooltip label={`${isLatam ? 'Latin America' : 'Global (Non-LATAM)'}`}>
                                      <Badge 
                                        color={isLatam ? 'blue' : 'teal'} 
                                        size="sm" 
                                        variant="filled"
                                      >
                                        {isLatam ? 'LATAM' : 'Global'}
                                      </Badge>
                                    </Tooltip>
                                  );
                                })()}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              {/* Show admin labels */}
                              <Group gap="xs">
                                {application.user?.adminLabels && application.user.adminLabels.length > 0 ? (
                                  application.user.adminLabels.map((label) => (
                                    <Badge
                                      key={label}
                                      variant="light"
                                      size="sm"
                                      color={
                                        label === "AI / ML expert" ? "violet" :
                                        label === "Designer" ? "green" :
                                        label === "Developer" ? "blue" :
                                        label === "Entrepreneur" ? "purple" :
                                        label === "Lawyer" ? "red" :
                                        label === "Non-Technical" ? "yellow" :
                                        label === "Project manager" ? "cyan" :
                                        label === "REFI" ? "lime" :
                                        label === "Regen" ? "grape" :
                                        label === "Researcher" ? "orange" :
                                        label === "Scientist" ? "indigo" :
                                        label === "Woman" ? "pink" :
                                        label === "Writer" ? "teal" :
                                        label === "ZK" ? "dark" :
                                        "gray"
                                      }
                                    >
                                      {label}
                                    </Badge>
                                  ))
                                ) : (
                                  <Text size="xs" c="dimmed">No labels</Text>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="subtle"
                                  onClick={() => viewApplication(application)}
                                >
                                  <IconEye size={16} />
                                </ActionIcon>

                                <ActionIcon
                                  variant="subtle"
                                  onClick={() => editApplication(application)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>

                                {/* Telegram icon - show on Incomplete and Under Review tabs */}
                                {(activeTab === "incomplete" || activeTab === "under_review") && (
                                  <TelegramMessageButton
                                    application={application}
                                    customMessage={activeTab === "under_review" ? UNDER_REVIEW_MESSAGE : undefined}
                                    size={16}
                                    variant="subtle"
                                    color="blue"
                                  />
                                )}

                                {(application.status === "UNDER_REVIEW" || application.status === "SUBMITTED" || application.status === "ACCEPTED") && (() => {
                                  const checkStatus = getCheckStatus(application.id);
                                  
                                  // Determine icon, color, and tooltip based on status
                                  let icon = IconChecklist;
                                  let color = "orange";
                                  let tooltip = "Check for missing information";
                                  
                                  if (checkStatus.checked) {
                                    if (checkStatus.isComplete) {
                                      icon = IconCheck;
                                      color = "green";
                                      tooltip = `Complete - checked ${checkStatus.checkedAt?.toLocaleDateString()}${checkStatus.hasEmailSent ? ` • Last reminder: ${checkStatus.lastEmailDate ? new Date(checkStatus.lastEmailDate).toLocaleDateString() : 'Unknown'}` : ''}`;
                                    } else {
                                      icon = IconAlertTriangle;
                                      color = "red";
                                      tooltip = `${checkStatus.missingFieldsCount} missing fields - checked ${checkStatus.checkedAt?.toLocaleDateString()}${checkStatus.hasEmailSent ? ` • Last reminder: ${checkStatus.lastEmailDate ? new Date(checkStatus.lastEmailDate).toLocaleDateString() : 'Unknown'}` : ''}`;
                                    }
                                  } else if (checkStatus.hasEmailSent) {
                                    icon = IconMail;
                                    color = "blue";
                                    tooltip = `Reminder sent ${checkStatus.lastEmailDate ? new Date(checkStatus.lastEmailDate).toLocaleDateString() : 'Unknown'} - click to re-check`;
                                  }
                                  
                                  return (
                                    <ActionIcon
                                      variant="subtle"
                                      color={color}
                                      onClick={() => void handleCheckApplication(application.id)}
                                      loading={checkMissingInfoMutation.isPending}
                                      title={tooltip}
                                      data-status={application.status}
                                    >
                                      {React.createElement(icon, { size: 16 })}
                                    </ActionIcon>
                                  );
                                })()}
                                
                                <Menu position="bottom-end">
                                  <Menu.Target>
                                    <ActionIcon variant="subtle">
                                      <IconDots size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    {statusOptions.map((option) => (
                                      <Menu.Item
                                        key={option.value}
                                        onClick={() => void handleStatusChange(application.id, option.value)}
                                        disabled={application.status === option.value || updateStatus.isPending}
                                      >
                                        Set to {option.label}
                                      </Menu.Item>
                                    ))}
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Tabs.Panel>}

          <Tabs.Panel value="pipeline" mt="md">
            <ReviewPipelineDashboard />
          </Tabs.Panel>

          <Tabs.Panel value="consensus" mt="md">
            {/* Consensus Filter Controls */}
            <Card shadow="sm" padding="md" radius="md" withBorder mb="md">
              <Group justify="space-between" wrap="wrap" gap="md">
                <Group gap="md">
                  <Select
                    placeholder="Filter by reviewer"
                    data={[
                      { value: '', label: 'All reviewers' },
                      ...availableReviewers.map(reviewer => ({
                        value: reviewer.id,
                        label: reviewer.name ?? reviewer.email
                      }))
                    ]}
                    value={selectedReviewerId ?? ''}
                    onChange={(value) => setSelectedReviewerId(value ?? null)}
                    clearable
                    searchable
                    style={{ minWidth: 200 }}
                  />
                  <Select
                    placeholder="Filter by region"
                    data={[
                      { value: '', label: 'All regions' },
                      { value: 'North America', label: 'North America' },
                      { value: 'Europe', label: 'Europe' },
                      { value: 'Latin America', label: 'Latin America' },
                      { value: 'Asia', label: 'Asia' },
                      { value: 'Africa', label: 'Africa' },
                      { value: 'Oceania', label: 'Oceania' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    value={selectedRegionFilter ?? ''}
                    onChange={(value) => setSelectedRegionFilter(value ?? null)}
                    clearable
                    searchable
                    style={{ minWidth: 150 }}
                  />
                  <Select
                    placeholder="Filter by attributes"
                    data={[
                      { value: '', label: 'All attributes' },
                      { value: 'AI / ML expert', label: 'AI / ML expert' },
                      { value: 'Designer', label: 'Designer' },
                      { value: 'Developer', label: 'Developer' },
                      { value: 'Entrepreneur', label: 'Entrepreneur' },
                      { value: 'Lawyer', label: 'Lawyer' },
                      { value: 'Non-Technical', label: 'Non-Technical' },
                      { value: 'Project manager', label: 'Project manager' },
                      { value: 'REFI', label: 'REFI' },
                      { value: 'Regen', label: 'Regen' },
                      { value: 'Researcher', label: 'Researcher' },
                      { value: 'Scientist', label: 'Scientist' },
                      { value: 'Woman', label: 'Woman' },
                      { value: 'Writer', label: 'Writer' },
                      { value: 'ZK', label: 'ZK' }
                    ]}
                    value={selectedAttributeFilter ?? ''}
                    onChange={(value) => setSelectedAttributeFilter(value ?? null)}
                    clearable
                    searchable
                    style={{ minWidth: 150 }}
                  />
                  <Text size="sm" c="dimmed">
                    {filteredAndSortedConsensusApplications?.length ?? 0} applications under review
                    {selectedReviewerId && availableReviewers.length > 0 ? 
                      ` reviewed by ${availableReviewers.find(r => r.id === selectedReviewerId)?.name ?? 'selected reviewer'}` : 
                      ' with evaluations'
                    }
                  </Text>
                </Group>
                
                <Group gap="md">
                  {(Boolean(selectedReviewerId) || Boolean(selectedRegionFilter) || Boolean(selectedAttributeFilter)) && (
                    <Button
                      variant="subtle"
                      onClick={() => {
                        setSelectedReviewerId(null);
                        setSelectedRegionFilter(null);
                        setSelectedAttributeFilter(null);
                      }}
                      size="sm"
                    >
                      Clear all filters
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
            
            {/* Consensus Applications Table */}
            <Paper shadow="sm" radius="md" withBorder>
              {isConsensusLoading ? (
                <Stack align="center" p="xl" gap="md">
                  <Loader size="lg" />
                  <Text c="dimmed">Loading consensus data...</Text>
                </Stack>
              ) : !consensusApplications || consensusApplications.length === 0 ? (
                <Stack align="center" p="xl" gap="md">
                  <IconStar size={48} stroke={1} color="var(--mantine-color-gray-5)" />
                  <Text c="dimmed">No applications with evaluations found</Text>
                  <Text size="sm" c="dimmed">Applications will appear here once they have been reviewed and scored.</Text>
                </Stack>
              ) : (
                <Table.ScrollContainer minWidth={900}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleConsensusSort('name')}
                        >
                          <Group gap="xs" justify="space-between">
                            <Text>Applicant</Text>
                            {consensusSortField === 'name' && (
                              consensusSortDirection === 'asc' ? 
                                <IconChevronUp size={14} /> : 
                                <IconChevronDown size={14} />
                            )}
                          </Group>
                        </Table.Th>
                        <Table.Th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleConsensusSort('score')}
                        >
                          <Group gap="xs" justify="space-between">
                            <Text>Average Score</Text>
                            {consensusSortField === 'score' && (
                              consensusSortDirection === 'asc' ? 
                                <IconChevronUp size={14} /> : 
                                <IconChevronDown size={14} />
                            )}
                          </Group>
                        </Table.Th>
                        <Table.Th>Reviews</Table.Th>
                        <Table.Th>Recommendations</Table.Th>
                        <Table.Th>Region</Table.Th>
                        <Table.Th>Attributes</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredAndSortedConsensusApplications?.map((application) => (
                        <Table.Tr key={application.id}>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text fw={500}>
                                {application.user?.name ?? "No name provided"}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {application.email}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              {/* Average Score */}
                              <Group gap="xs" align="center">
                                <IconStar size={16} color="var(--mantine-color-blue-6)" />
                                <Text fw={600} c="blue" size="md">
                                  {application.averageScore.toFixed(1)} avg
                                </Text>
                              </Group>
                              
                              {/* Individual Reviewer Scores */}
                              <Group gap="xs" wrap="wrap">
                                {application.evaluations
                                  .filter(evaluation => evaluation.overallScore !== null)
                                  .map((evaluation, index) => (
                                    <Tooltip
                                      key={index}
                                      label={`${evaluation.reviewer.name ?? evaluation.reviewer.email ?? 'Unknown Reviewer'}: ${evaluation.overallScore?.toFixed(1)}`}
                                      position="top"
                                      withArrow
                                    >
                                      <Badge
                                        size="sm"
                                        variant="light"
                                        color="blue"
                                        style={{ cursor: 'help' }}
                                      >
                                        {evaluation.overallScore?.toFixed(1)}
                                      </Badge>
                                    </Tooltip>
                                  ))
                                }
                                {application.evaluations.filter(evaluation => evaluation.overallScore !== null).length === 0 && (
                                  <Text size="xs" c="dimmed">No scores</Text>
                                )}
                              </Group>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {application.evaluationCount} review{application.evaluationCount !== 1 ? 's' : ''}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              {application.evaluations
                                .filter(evaluation => evaluation.recommendation)
                                .map((evaluation, index) => (
                                  <Badge
                                    key={index}
                                    size="xs"
                                    color={
                                      evaluation.recommendation === 'ACCEPT' ? 'green' :
                                      evaluation.recommendation === 'REJECT' ? 'red' : 
                                      evaluation.recommendation === 'WAITLIST' ? 'yellow' : 'gray'
                                    }
                                    variant="filled"
                                  >
                                    {evaluation.recommendation}
                                  </Badge>
                                ))
                              }
                              {application.evaluations.filter(evaluation => evaluation.recommendation).length === 0 && (
                                <Text size="xs" c="dimmed">No recommendations</Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            {/* Show LATAM badge for consensus tab */}
                            <Group gap="xs">
                              {(() => {
                                const nationalityResponse = application.responses?.find(r => 
                                  r.question.questionKey === 'nationality' || 
                                  r.question.questionKey === 'country'
                                );
                                
                                if (!nationalityResponse?.answer) {
                                  return <Text size="xs" c="dimmed">Not specified</Text>;
                                }
                                
                                const isLatam = isLatamCountry(nationalityResponse.answer);
                                
                                return (
                                  <Tooltip label={`${isLatam ? 'Latin America' : 'Global (Non-LATAM)'}`}>
                                    <Badge 
                                      color={isLatam ? 'blue' : 'teal'} 
                                      size="sm" 
                                      variant="filled"
                                    >
                                      {isLatam ? 'LATAM' : 'Global'}
                                    </Badge>
                                  </Tooltip>
                                );
                              })()}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {/* Show admin labels */}
                            <Group gap="xs">
                              {application.user?.adminLabels && application.user.adminLabels.length > 0 ? (
                                application.user.adminLabels.map((label) => (
                                  <Badge
                                    key={label}
                                    variant="light"
                                    size="sm"
                                    color={
                                      label === "AI / ML expert" ? "violet" :
                                      label === "Designer" ? "green" :
                                      label === "Developer" ? "blue" :
                                      label === "Entrepreneur" ? "purple" :
                                      label === "Lawyer" ? "red" :
                                      label === "Non-Technical" ? "yellow" :
                                      label === "Project manager" ? "cyan" :
                                      label === "REFI" ? "lime" :
                                      label === "Regen" ? "grape" :
                                      label === "Researcher" ? "orange" :
                                      label === "Scientist" ? "indigo" :
                                      label === "Woman" ? "pink" :
                                      label === "Writer" ? "teal" :
                                      label === "ZK" ? "dark" :
                                      "gray"
                                    }
                                  >
                                    {label}
                                  </Badge>
                                ))
                              ) : (
                                <Text size="xs" c="dimmed">No labels</Text>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon
                                variant="subtle"
                                onClick={() => viewApplication(application)}
                                title="View application details"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                onClick={() => editApplication(application)}
                                title="Edit application"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              {/* Link to evaluation details - use first evaluation ID if available */}
                              {application.evaluations.length > 0 && (
                                <ActionIcon
                                  variant="subtle"
                                  component={Link}
                                  href={`/admin/evaluations/${application.evaluations[0]?.id}`}
                                  title="View evaluation details"
                                >
                                  <IconClipboardList size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Application Detail Drawer */}
      <Drawer
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
        position="right"
        size="lg"
        title="Application Details"
        padding="xl"
      >
        <ScrollArea h="100%" offsetScrollbars>
          {viewingApplication && (
            <Stack gap="xl">
              {/* Applicant Header */}
              <Paper p="lg" withBorder radius="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text size="xl" fw={600} mb="xs">
                        {viewingApplication.user?.name ?? "No name provided"}
                      </Text>
                      <Anchor href={`mailto:${viewingApplication.email}`} size="md" c="blue">
                        {viewingApplication.email}
                      </Anchor>
                    </Box>
                    <Badge size="lg" color={getStatusColor(viewingApplication.status)} variant="light">
                      {viewingApplication.status.replace("_", " ")}
                    </Badge>
                  </Group>
                  
                  <Group gap="xl" mt="md">
                    <Box>
                      <Text size="sm" c="dimmed" fw={500}>Submitted</Text>
                      <Text size="sm">
                        {viewingApplication.submittedAt
                          ? new Date(viewingApplication.submittedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long", 
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Draft (not submitted)"
                        }
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed" fw={500}>Created</Text>
                      <Text size="sm">
                        {new Date(viewingApplication.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </Box>
                  </Group>
                </Stack>
              </Paper>

              {/* Actions Tabs */}
              <Tabs value={actionsTab} onChange={(value) => setActionsTab(value ?? "next")}>
                <Tabs.List>
                  <Tabs.Tab value="next">
                    Next Actions
                  </Tabs.Tab>
                  <Tabs.Tab value="previous">
                    Previous Actions
                    {applicationEmails && applicationEmails.filter(e => e.status === "SENT").length > 0 && (
                      <Badge size="sm" variant="light" color="blue" ml="xs">
                        {applicationEmails.filter(e => e.status === "SENT").length}
                      </Badge>
                    )}
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="next" mt="md">
                  <Stack gap="lg">
                    {/* Show appropriate next action based on status */}
                    <Paper p="lg" withBorder radius="md">
                      {(viewingApplication.status === "UNDER_REVIEW" || viewingApplication.status === "SUBMITTED") ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconChecklist size={20} color="orange" />
                            <Text fw={600} color="orange.7">
                              {viewingApplication.status === "SUBMITTED" ? "Review Submitted Application" : "Review Application"}
                            </Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            Review the application for completeness and missing information. If fields are missing, 
                            you can create and send an email to request additional information from the applicant.
                          </Text>
                          <Group gap="sm">
                            <Button
                              size="sm"
                              variant="filled"
                              color="orange"
                              leftSection={<IconChecklist size={16} />}
                              onClick={() => void handleCheckApplication(viewingApplication.id)}
                              loading={checkMissingInfoMutation.isPending}
                            >
                              Check for Missing Information
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              color="blue"
                              leftSection={<IconMail size={16} />}
                              onClick={() => void handleCreateEmailDraft(viewingApplication.id)}
                              loading={createMissingInfoEmail.isPending}
                              disabled={(() => {
                                const checkStatus = getCheckStatus(viewingApplication.id);
                                return !checkStatus.checked || checkStatus.isComplete;
                              })()}
                              title={(() => {
                                const checkStatus = getCheckStatus(viewingApplication.id);
                                if (!checkStatus.checked) {
                                  return "Click 'Check for Missing Information' first";
                                }
                                if (checkStatus.isComplete) {
                                  return "Application is complete - no email draft needed";
                                }
                                return `Create email draft for ${checkStatus.missingFieldsCount} missing fields`;
                              })()}
                            >
                              Create Email Draft
                            </Button>
                          </Group>
                        </Stack>
                      ) : viewingApplication.status === "ACCEPTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconCheck size={20} color="green" />
                            <Text fw={600} color="green.7">Post-Acceptance Requirements</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            Check if accepted applicant has completed all required post-acceptance information 
                            (travel details, emergency contacts, onboarding documents, etc.).
                          </Text>
                          <Group gap="sm">
                            <Button
                              size="sm"
                              variant="filled"
                              color="green"
                              leftSection={<IconChecklist size={16} />}
                              onClick={() => void handleCheckApplication(viewingApplication.id)}
                              loading={checkMissingInfoMutation.isPending}
                            >
                              Check for Missing Information
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              color="blue"
                              leftSection={<IconMail size={16} />}
                              onClick={() => void handleCreateEmailDraft(viewingApplication.id)}
                              loading={createMissingInfoEmail.isPending}
                              disabled={(() => {
                                const checkStatus = getCheckStatus(viewingApplication.id);
                                return !checkStatus.checked || checkStatus.isComplete;
                              })()}
                              title={(() => {
                                const checkStatus = getCheckStatus(viewingApplication.id);
                                if (!checkStatus.checked) {
                                  return "Click 'Check for Missing Information' first";
                                }
                                if (checkStatus.isComplete) {
                                  return "Application is complete - no email draft needed";
                                }
                                return `Create email draft for ${checkStatus.missingFieldsCount} missing fields`;
                              })()}
                            >
                              Create Email Draft
                            </Button>
                          </Group>
                        </Stack>
                      ) : viewingApplication.status === "REJECTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconX size={20} color="red" />
                            <Text fw={600} color="red.7">Application Rejected</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This application has been rejected. Consider sending a rejection email with feedback if appropriate.
                          </Text>
                        </Stack>
                      ) : viewingApplication.status === "WAITLISTED" ? (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconClock size={20} color="yellow" />
                            <Text fw={600} color="yellow.7">Application Waitlisted</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This applicant is on the waitlist. Monitor for available spots and notify when status changes.
                          </Text>
                        </Stack>
                      ) : (
                        <Stack gap="md">
                          <Group gap="xs" align="center">
                            <IconClock size={20} color="blue" />
                            <Text fw={600} color="blue.7">Application Submitted</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            This application has been submitted and is ready for review. Change status to &quot;Under Review&quot; to begin evaluation.
                          </Text>
                        </Stack>
                      )}
                    </Paper>

                    {/* Draft Emails - Show as pending next actions */}
                    {applicationEmails && applicationEmails.filter(email => email.status === "DRAFT").length > 0 && (
                      <Stack gap="md">
                        <Text size="md" fw={600} c="orange.7">Pending Email Actions</Text>
                        {applicationEmails.filter(email => email.status === "DRAFT").map((email) => (
                          <Paper key={email.id} p="lg" withBorder radius="md" bg="orange.0">
                            <Stack gap="md">
                              <Group justify="space-between" align="flex-start">
                                <Box flex={1}>
                                  <Group gap="xs" mb="xs">
                                    <Badge color="blue" variant="light">
                                      DRAFT
                                    </Badge>
                                    <Badge variant="outline" color="gray">
                                      {email.type.replace("_", " ")}
                                    </Badge>
                                  </Group>
                                  <Text fw={600} size="md" mb="xs">
                                    {email.subject}
                                  </Text>
                                  <Text size="sm" c="dimmed" mb="sm">
                                    To: {email.toEmail} • Created: {new Date(email.createdAt).toLocaleDateString()}
                                  </Text>
                                  {email.type === "MISSING_INFO" && email.missingFields && email.missingFields.length > 0 && (
                                    <Paper p="md" bg="orange.1" radius="sm" mb="md">
                                      <Group gap="xs" mb="xs">
                                        <IconAlertCircle size={16} color="orange" />
                                        <Text size="sm" fw={500} c="orange.7">Missing Fields:</Text>
                                      </Group>
                                      <Text size="sm" c="orange.7">
                                        {email.missingFields.map(field => field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())).join(", ")}
                                      </Text>
                                    </Paper>
                                  )}
                                </Box>
                                
                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    variant="filled"
                                    color="blue"
                                    leftSection={<IconSend size={14} />}
                                    onClick={() => handlePreviewEmail(email)}
                                  >
                                    Preview & Send
                                  </Button>
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    onClick={() => void handleDeleteEmail(email.id)}
                                    loading={deleteEmail.isPending}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Group>
                              </Group>
                              
                              {/* Email Preview */}
                              <Paper p="md" bg="white" radius="sm" withBorder>
                                <Text size="xs" c="dimmed" mb="xs">Email Preview:</Text>
                                <div 
                                  style={{ 
                                    fontSize: "12px", 
                                    maxHeight: "200px", 
                                    overflow: "auto",
                                    lineHeight: 1.4 
                                  }}
                                  dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                                />
                              </Paper>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="previous" mt="md">
                  <Stack gap="lg">
                    {/* Status Change History - Could be added later with audit log */}
                    <Paper p="lg" withBorder radius="md">
                      <Stack gap="md">
                        <Group gap="xs" align="center">
                          <IconClock size={20} color="blue" />
                          <Text fw={600} color="blue.7">Application Timeline</Text>
                        </Group>
                        <Stack gap="sm">
                          <Group gap="sm">
                            <Text size="sm" fw={500}>Created:</Text>
                            <Text size="sm" c="dimmed">
                              {new Date(viewingApplication.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </Group>
                          {viewingApplication.submittedAt && (
                            <Group gap="sm">
                              <Text size="sm" fw={500}>Submitted:</Text>
                              <Text size="sm" c="dimmed">
                                {new Date(viewingApplication.submittedAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </Group>
                          )}
                          <Group gap="sm">
                            <Text size="sm" fw={500}>Current Status:</Text>
                            <Badge color={getStatusColor(viewingApplication.status)} variant="light">
                              {viewingApplication.status.replace("_", " ")}
                            </Badge>
                          </Group>
                        </Stack>
                      </Stack>
                    </Paper>

                    {/* Sent Emails History */}
                    {applicationEmails && applicationEmails.filter(email => email.status === "SENT").length > 0 ? (
                      <Stack gap="md">
                        <Text size="md" fw={600} c="green.7">Sent Communications</Text>
                        {applicationEmails.filter(email => email.status === "SENT").map((email) => (
                          <Paper key={email.id} p="lg" withBorder radius="md" bg="green.0">
                            <Stack gap="md">
                              <Group justify="space-between" align="flex-start">
                                <Box flex={1}>
                                  <Group gap="xs" mb="xs">
                                    <Badge color="green" variant="light">
                                      SENT
                                    </Badge>
                                    <Badge variant="outline" color="gray">
                                      {email.type.replace("_", " ")}
                                    </Badge>
                                  </Group>
                                  <Text fw={600} size="md" mb="xs">
                                    {email.subject}
                                  </Text>
                                  <Text size="sm" c="dimmed" mb="sm">
                                    To: {email.toEmail} • Sent: {email.sentAt ? new Date(email.sentAt).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }) : "Unknown"}
                                  </Text>
                                  {email.type === "MISSING_INFO" && email.missingFields && email.missingFields.length > 0 && (
                                    <Paper p="md" bg="orange.1" radius="sm" mb="md">
                                      <Group gap="xs" mb="xs">
                                        <IconAlertCircle size={16} color="orange" />
                                        <Text size="sm" fw={500} c="orange.7">Missing Fields Requested:</Text>
                                      </Group>
                                      <Text size="sm" c="orange.7">
                                        {email.missingFields.map(field => field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())).join(", ")}
                                      </Text>
                                    </Paper>
                                  )}
                                </Box>
                              </Group>
                              
                              {/* Email Preview */}
                              <Paper p="md" bg="white" radius="sm" withBorder>
                                <Text size="xs" c="dimmed" mb="xs">Email Content:</Text>
                                <div 
                                  style={{ 
                                    fontSize: "12px", 
                                    maxHeight: "200px", 
                                    overflow: "auto",
                                    lineHeight: 1.4 
                                  }}
                                  dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                                />
                              </Paper>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    ) : (
                      <Paper p="xl" withBorder radius="md" ta="center">
                        <IconMail size={48} stroke={1} color="var(--mantine-color-gray-5)" />
                        <Text c="dimmed" size="md" mt="xs">No previous actions recorded</Text>
                        <Text c="dimmed" size="sm" mt="xs">
                          Status changes and sent emails will appear here
                        </Text>
                      </Paper>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          )}
        </ScrollArea>
      </Drawer>

      {/* Application Edit Drawer */}
      <Drawer
        opened={editDrawerOpened}
        onClose={closeEditDrawer}
        position="right"
        size="xl"
        title="Edit Application"
        padding="xl"
      >
        <ScrollArea h="100%" offsetScrollbars>
          {editingApplication && (
            <Stack gap="xl">
              {/* Applicant Header */}
              <Paper p="lg" withBorder radius="md">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xl" fw={600} mb="xs">
                      {editingApplication.user?.name ?? "No name provided"}
                    </Text>
                    <Anchor href={`mailto:${editingApplication.email}`} size="md" c="blue">
                      {editingApplication.email}
                    </Anchor>
                  </Box>
                  <Badge size="lg" color={getStatusColor(editingApplication.status)} variant="light">
                    {editingApplication.status.replace("_", " ")}
                  </Badge>
                </Group>
              </Paper>
              
              {/* Editable form */}
              <EditableApplicationForm 
                application={editingApplication}
                eventId={event.id}
                onSaved={() => {
                  void utils.application.getEventApplications.invalidate({ eventId: event.id });
                  closeEditDrawer();
                }}
              />
            </Stack>
          )}
        </ScrollArea>
      </Drawer>

      {/* Email Preview Modal */}
      {previewingEmail && emailSafety && (
        <EmailPreviewModal
          opened={emailPreviewOpened}
          onClose={closeEmailPreview}
          email={{...previewingEmail, textContent: previewingEmail.textContent ?? undefined}}
          emailSafety={emailSafety}
          onSend={handleSendEmail}
          sending={sendEmail.isPending}
        />
      )}

      {/* Sponsored Application Modal */}
      <SponsoredApplicationModal
        opened={sponsoredModalOpened}
        onClose={closeSponsoredModal}
        eventId={event.id}
        onSuccess={handleSponsoredApplicationSuccess}
      />
    </Container>
  );
}
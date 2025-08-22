import React from 'react';
import {
  Section,
  Text,
  Button,
  Row,
  Column,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationSubmittedProps {
  applicantName: string;
  eventName: string;
  applicationUrl: string;
  submittedAt: string;
  nextSteps?: string[];
  reviewTimeline?: string;
}

export const ApplicationSubmittedTemplate: React.FC<ApplicationSubmittedProps> = ({
  applicantName,
  eventName,
  applicationUrl,
  submittedAt,
  nextSteps,
  reviewTimeline,
}) => {
  const previewText = `Application submitted for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={checkmark}>✅</Text>
        <Text style={heading}>Application Submitted!</Text>
        
        <Text style={paragraph}>
          Hi {applicantName},
        </Text>

        <Text style={paragraph}>
          Thank you! Your application for <strong>{eventName}</strong> has been successfully submitted 
          and is now under review.
        </Text>

        <Section style={confirmationBox}>
          <Text style={confirmationHeading}>Submission Details</Text>
          
          <Row style={detailRow}>
            <Column style={detailLabel}>Application ID:</Column>
            <Column style={detailValue}>#{applicationUrl.split('/').pop()}</Column>
          </Row>
          
          <Row style={detailRow}>
            <Column style={detailLabel}>Submitted:</Column>
            <Column style={detailValue}>{submittedAt}</Column>
          </Row>
          
          <Row style={detailRow}>
            <Column style={detailLabel}>Status:</Column>
            <Column style={detailValue}>Under Review</Column>
          </Row>
        </Section>

        <Text style={subheading}>What Happens Next?</Text>

        {nextSteps && nextSteps.length > 0 ? (
          <>
            <Text style={paragraph}>Our review process:</Text>
            <ol style={list}>
              {nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </>
        ) : (
          <ol style={list}>
            <li>Your application will be reviewed by our selection committee</li>
            <li>We may reach out if we need any additional information</li>
            <li>Final decisions will be communicated via email</li>
            <li>Accepted participants will receive onboarding information</li>
          </ol>
        )}

        {reviewTimeline && (
          <Section style={timelineBox}>
            <Text style={timelineText}>
              📅 <strong>Expected Response:</strong> {reviewTimeline}
            </Text>
          </Section>
        )}

        <Text style={paragraph}>
          You can check your application status at any time by visiting your dashboard:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={applicationUrl}>
            View Application Status
          </Button>
        </Section>

        <Text style={paragraph}>
          If you have any questions about your application or the selection process, please contact us at{' '}
          <a href="mailto:residency@fundingthecommons.io" style={link}>
            residency@fundingthecommons.io
          </a>
        </Text>

        <Text style={paragraph}>
          Thank you for your interest in {eventName}. We look forward to reviewing your application!
        </Text>

        <Text style={signature}>
          Best regards,<br />
          The {eventName} Team
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: '0 32px',
};

const checkmark = {
  fontSize: '48px',
  textAlign: 'center' as const,
  margin: '32px 0 16px',
};

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const subheading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '32px 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '16px 0',
};

const confirmationBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #86efac',
};

const confirmationHeading = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#14532d',
  margin: '0 0 16px',
};

const detailRow = {
  marginBottom: '12px',
};

const detailLabel = {
  fontSize: '14px',
  color: '#64748b',
  width: '140px',
  verticalAlign: 'top' as const,
};

const detailValue = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '500',
};

const timelineBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #bfdbfe',
};

const timelineText = {
  fontSize: '15px',
  color: '#1e40af',
  margin: '0',
  textAlign: 'center' as const,
};

const list = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '16px 0',
  paddingLeft: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '32px 0 16px',
};

export default ApplicationSubmittedTemplate;
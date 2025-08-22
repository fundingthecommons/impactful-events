import React from 'react';
import {
  Section,
  Text,
  Button,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationRejectedProps {
  applicantName: string;
  eventName: string;
  futureOpportunitiesUrl?: string;
  feedbackAvailable?: boolean;
}

export const ApplicationRejectedTemplate: React.FC<ApplicationRejectedProps> = ({
  applicantName,
  eventName,
  futureOpportunitiesUrl,
  feedbackAvailable = false,
}) => {
  const previewText = `Update on your ${eventName} application`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Dear {applicantName},</Text>
        
        <Text style={paragraph}>
          Thank you for your interest in the {eventName} and for taking the time to submit your application.
        </Text>

        <Text style={paragraph}>
          After careful consideration of all applications, we regret to inform you that we are unable to offer you 
          a spot in this cohort. The selection process was highly competitive, with many qualified candidates, 
          and we had to make difficult decisions based on our limited capacity.
        </Text>

        <Text style={paragraph}>
          Please know that this decision does not reflect on your abilities or potential. We received an overwhelming 
          number of high-quality applications, and the selection came down to finding the right fit for this 
          particular program&apos;s focus areas and team dynamics.
        </Text>

        {feedbackAvailable && (
          <Text style={paragraph}>
            If you would like feedback on your application to help with future opportunities, please feel free to 
            reach out to us at{' '}
            <a href="mailto:residency@fundingthecommons.io" style={link}>
              residency@fundingthecommons.io
            </a>
          </Text>
        )}

        <Section style={encouragementBox}>
          <Text style={encouragementHeading}>Stay Connected</Text>
          <Text style={encouragementText}>
            We encourage you to:
          </Text>
          <ul style={list}>
            <li>Apply for future programs and residencies</li>
            <li>Join our community events and workshops</li>
            <li>Subscribe to our newsletter for upcoming opportunities</li>
            <li>Connect with us on social media for ecosystem updates</li>
          </ul>
        </Section>

        {futureOpportunitiesUrl && (
          <Section style={buttonContainer}>
            <Button style={button} href={futureOpportunitiesUrl}>
              View Upcoming Opportunities
            </Button>
          </Section>
        )}

        <Text style={paragraph}>
          We genuinely appreciate your interest in contributing to the Funding the Commons ecosystem and hope 
          you&apos;ll continue to be part of our community in other ways.
        </Text>

        <Text style={paragraph}>
          Thank you again for your application, and we wish you all the best in your future endeavors.
        </Text>

        <Text style={signature}>
          Warm regards,<br />
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

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '32px 0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '16px 0',
};

const encouragementBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
};

const encouragementHeading = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#334155',
  margin: '0 0 12px',
};

const encouragementText = {
  fontSize: '15px',
  color: '#475569',
  margin: '0 0 12px',
};

const list = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#475569',
  margin: '8px 0',
  paddingLeft: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#64748b',
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

export default ApplicationRejectedTemplate;
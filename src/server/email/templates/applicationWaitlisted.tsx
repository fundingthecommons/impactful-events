import React from 'react';
import {
  Section,
  Text,
  Button,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationWaitlistedProps {
  applicantName: string;
  eventName: string;
  waitlistPosition?: number;
  notificationDate?: string;
  dashboardUrl?: string;
}

export const ApplicationWaitlistedTemplate: React.FC<ApplicationWaitlistedProps> = ({
  applicantName,
  eventName,
  waitlistPosition,
  notificationDate,
  dashboardUrl,
}) => {
  const previewText = `You're on the waitlist for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Hi {applicantName},</Text>
        
        <Text style={paragraph}>
          Thank you for your application to the {eventName}. Your submission impressed us, and while we 
          couldn&apos;t immediately offer you a spot due to limited capacity, we&apos;re pleased to inform you that 
          you&apos;ve been placed on our <strong>waitlist</strong>.
        </Text>

        {waitlistPosition && (
          <Section style={positionBox}>
            <Text style={positionText}>
              Your waitlist position: <strong>#{waitlistPosition}</strong>
            </Text>
          </Section>
        )}

        <Text style={subheading}>What This Means</Text>

        <Text style={paragraph}>
          Being on the waitlist means:
        </Text>
        
        <ul style={list}>
          <li>Your application was strong and met our criteria</li>
          <li>If a spot becomes available, we&apos;ll offer it to waitlisted candidates in order</li>
          <li>You&apos;ll be notified immediately if your status changes</li>
          <li>No further action is required from you at this time</li>
        </ul>

        {notificationDate && (
          <Text style={paragraph}>
            We expect to finalize our participant list by <strong>{notificationDate}</strong>. If a spot 
            becomes available for you before then, we&apos;ll contact you immediately with next steps.
          </Text>
        )}

        <Section style={infoBox}>
          <Text style={infoHeading}>💡 Tip</Text>
          <Text style={infoText}>
            Spots often become available as accepted participants finalize their plans. We typically see 
            movement on the waitlist in the weeks leading up to the program start date.
          </Text>
        </Section>

        {dashboardUrl && (
          <>
            <Text style={paragraph}>
              You can check your application status at any time:
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View Application Status
              </Button>
            </Section>
          </>
        )}

        <Text style={paragraph}>
          We understand waiting can be challenging when making plans. If your circumstances change and you 
          need to withdraw from the waitlist, please let us know at{' '}
          <a href="mailto:residency@fundingthecommons.io" style={link}>
            residency@fundingthecommons.io
          </a>
        </Text>

        <Text style={paragraph}>
          Thank you for your patience and continued interest in the program. We&apos;ll be in touch as soon 
          as we have any updates.
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

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '32px 0 24px',
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

const positionBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fcd34d',
  textAlign: 'center' as const,
};

const positionText = {
  fontSize: '18px',
  color: '#92400e',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #bfdbfe',
};

const infoHeading = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e40af',
  margin: '0 0 8px',
};

const infoText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1e40af',
  margin: '0',
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
  margin: '24px 0',
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

export default ApplicationWaitlistedTemplate;
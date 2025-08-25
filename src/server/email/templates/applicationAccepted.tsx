import React from 'react';
import {
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationAcceptedProps {
  applicantName: string;
  eventName: string;
  programDates: string;
  location: string;
  _stipend?: string;
  _nextStepsUrl: string;
  confirmationDeadline?: string;
}

export const ApplicationAcceptedTemplate: React.FC<ApplicationAcceptedProps> = ({
  applicantName,
  eventName,
  programDates,
  location,
  _stipend,
  _nextStepsUrl,
  confirmationDeadline,
}) => {
  const previewText = `🎉 Congratulations! You've been accepted to ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={congratsEmoji}>🎉</Text>
        <Text style={heading}>Congratulations, {applicantName}!</Text>
        
        <Text style={paragraph}>
          We&apos;re thrilled to inform you that you&apos;ve been <strong>accepted</strong> to the {eventName}!
        </Text>

        <Text style={paragraph}>
          After careful review of your application, we believe you&apos;ll be a valuable addition to our cohort 
          and look forward to working with you.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsHeading}>Program Details</Text>
          
          <Row style={detailRow}>
            <Column style={detailLabel}>📅 Dates:</Column>
            <Column style={detailValue}>{programDates}</Column>
          </Row>
          
          <Row style={detailRow}>
            <Column style={detailLabel}>📍 Location:</Column>
            <Column style={detailValue}>{location}</Column>
          </Row>
          
          {/* {stipend && (
            <Row style={detailRow}>
              <Column style={detailLabel}>💰 Stipend:</Column>
              <Column style={detailValue}>{stipend}</Column>
            </Row>
          )} */}
        </Section>

        <Text style={subheading}>Next Steps</Text>
        
        <Text style={paragraph}>
          To secure your spot, please:
        </Text>
        
        <ol style={list}>
          <li>Book your travel</li>
          <li>Reply to this email with proof of travel</li>
          <li>Join the telegram group {process.env.RESIDENCY_TELEGRAM_URL}</li>
        </ol>

        {confirmationDeadline && (
          <Text style={warning}>
            ⏰ Please confirm your attendance with proof of travel by <strong>{confirmationDeadline}</strong> or your spot may be offered to someone on the waitlist.
          </Text>
        )}

        <Text style={paragraph}>
          If you have any questions or concerns, please don&apos;t hesitate to reach out to us at{' '}
          <a href={`mailto:${process.env.RESIDENCY_CONTACT_EMAIL}`} style={link}>
            {process.env.RESIDENCY_CONTACT_EMAIL}
          </a>
        </Text>

        <Text style={paragraph}>
          We can&apos;t wait to see what you&apos;ll build!
        </Text>

        <Text style={signature}>
          Best regards,<br />
          James and the The {eventName} Team
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: '0 32px',
};

const congratsEmoji = {
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

const detailsBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #bfdbfe',
};

const detailsHeading = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e40af',
  margin: '0 0 16px',
};

const detailRow = {
  marginBottom: '12px',
};

const detailLabel = {
  fontSize: '14px',
  color: '#64748b',
  width: '120px',
  verticalAlign: 'top' as const,
};

const detailValue = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '500',
};

const list = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '16px 0',
  paddingLeft: '20px',
};

const warning = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '6px',
  padding: '12px 16px',
  fontSize: '14px',
  color: '#92400e',
  margin: '24px 0',
};

// const buttonContainer = {
//   textAlign: 'center' as const,
//   margin: '32px 0',
// };

// const button = {
//   backgroundColor: '#2563eb',
//   borderRadius: '8px',
//   color: '#fff',
//   fontSize: '16px',
//   fontWeight: 'bold',
//   textDecoration: 'none',
//   textAlign: 'center' as const,
//   display: 'inline-block',
//   padding: '12px 32px',
// };

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

export default ApplicationAcceptedTemplate;
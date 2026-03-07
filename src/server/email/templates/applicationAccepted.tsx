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
  applicantFirstName?: string;
  eventName: string;
  programDates: string;
  location: string;
  dashboardUrl: string;
  speakerProfileUrl?: string;
  faqUrl?: string;
  contactEmail: string;
  registrationUrl?: string;
  speakerCouponCode?: string;
}

export const ApplicationAcceptedTemplate: React.FC<ApplicationAcceptedProps> = ({
  applicantFirstName,
  applicantName,
  eventName,
  programDates,
  location,
  contactEmail,
  registrationUrl,
  speakerCouponCode,
}) => {
  const firstName = applicantFirstName ?? applicantName;
  const previewText = `🎉 You're confirmed as a speaker at ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={paragraph}>
          Hi {firstName},
        </Text>

        <Text style={paragraph}>
          We&apos;re excited to share that you&apos;ve been selected to speak at{' '}
          <strong>{eventName}</strong>.
        </Text>

        <Text style={paragraph}>
          We&apos;re grateful for the perspective you&apos;re bringing and are looking forward to
          featuring you in the program as we gather builders, researchers, funders, and policymakers
          shaping the future of AI and coordination.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsHeading}>Event Details</Text>

          <Row style={detailRow}>
            <Column style={detailLabel}>📅 Dates:</Column>
            <Column style={detailValue}>{programDates}</Column>
          </Row>

          <Row style={detailRow}>
            <Column style={detailLabel}>📍 Location:</Column>
            <Column style={detailValue}>{location}</Column>
          </Row>

          {registrationUrl && (
            <Row style={detailRow}>
              <Column style={detailLabel}>🔗 Register:</Column>
              <Column style={detailValue}>
                <a href={registrationUrl} style={link}>{registrationUrl}</a>
              </Column>
            </Row>
          )}
        </Section>

        {speakerCouponCode && (
          <Section style={couponBox}>
            <Text style={couponHeading}>Your Speaker Registration Code</Text>
            <Text style={couponCode}>{speakerCouponCode}</Text>
            <Text style={couponNote}>
              Use this code when registering for complimentary access (2 uses).
            </Text>
          </Section>
        )}

        <Text style={paragraph}>
          Please reply to confirm your participation, and we&apos;ll follow up with additional
          details on format, logistics, and promotion.
        </Text>

        <Text style={paragraph}>
          If you have any questions in the meantime, feel free to reach out to{' '}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>.
        </Text>

        <Text style={paragraph}>
          We&apos;re looking forward to building this with you.
        </Text>

        <Text style={signature}>
          Warmly,<br />
          Funding the Commons
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: '0 32px',
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

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const couponBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 32px',
  border: '1px solid #86efac',
  textAlign: 'center' as const,
};

const couponHeading = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#15803d',
  margin: '0 0 12px',
};

const couponCode = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#166534',
  letterSpacing: '2px',
  fontFamily: 'monospace, Courier New',
  margin: '0 0 8px',
};

const couponNote = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
};

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '32px 0 16px',
};

export default ApplicationAcceptedTemplate;

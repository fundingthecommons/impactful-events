import React from 'react';
import {
  Section,
  Text,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationRejectedProps {
  applicantName: string;
  eventName: string;
  contactEmail: string;
}

export const ApplicationRejectedTemplate: React.FC<ApplicationRejectedProps> = ({
  applicantName,
  eventName,
  contactEmail,
}) => {
  const previewText = `Thank you for your application to ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Dear {applicantName},</Text>

        <Text style={paragraph}>
          Thank you for applying to {eventName}. We received many strong applications and had to make some difficult decisions due to limited capacity.
        </Text>

        <Text style={paragraph}>
          Unfortunately, we are unable to offer you a spot at this time. This does not reflect on the quality of your work — the selection process was highly competitive.
        </Text>

        <Text style={paragraph}>
          We encourage you to stay connected with our community and apply to future events. If you have any questions, please don&apos;t hesitate to reach out to us at{' '}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>
        </Text>

        <Text style={paragraph}>
          We hope to see you at future events and wish you all the best with your work.
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

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '16px 0',
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

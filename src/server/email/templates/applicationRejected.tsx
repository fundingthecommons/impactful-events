import React from 'react';
import {
  Section,
  Text,
} from '@react-email/components';
import { BaseTemplate } from './base';

export interface ApplicationRejectedProps {
  applicantName: string;
  eventName: string;
  conferenceUrl: string;
  conferenceDate: string;
  discountCode: string;
  newsletterUrl: string;
}

export const ApplicationRejectedTemplate: React.FC<ApplicationRejectedProps> = ({
  applicantName,
  eventName: _eventName,
  conferenceUrl,
  conferenceDate,
  discountCode,
  newsletterUrl,
}) => {
  const previewText = `Thank you for your application to the Funding the Commons Residency`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Dear {applicantName},</Text>
        
        <Text style={paragraph}>
          Thank you so much for applying to the Funding the Commons Buenos Aires Residency. We were deeply impressed by the thought, care, and vision reflected across the applications we received. This year&apos;s selection process was especially challenging—we had to make some very tough choices due to the limited number of spots available.
        </Text>

        <Text style={paragraph}>
          Although we&apos;re not able to offer you a place in this cohort, we want you to know how much we value the work you&apos;re doing. You&apos;re very much part of the broader community we&apos;re building, and we&apos;d love to stay in touch and keep finding ways to connect.
        </Text>

        <Section style={conferenceOfferBox}>
          <Text style={conferenceHeading}>A Gift for You</Text>
          <Text style={paragraph}>
            As a small thank you, we&apos;d like to offer you a complimentary ticket to our conference in Buenos Aires on {conferenceDate}. If you&apos;ll be there, we&apos;d be delighted to see you in person. Just register with the same email you used for your residency application and enter the code <strong style={codeStyle}>{discountCode}</strong> here: <a href={conferenceUrl} style={link}>{conferenceUrl}</a>.
          </Text>
        </Section>

        <Text style={paragraph}>
          We&apos;ll also be sharing more opportunities, programs, and events in the months ahead. In the meantime, RealFi Hack is on—you can sign up <a href="https://realfi-hack.devspot.app/" style={link}>here</a> and shape solutions for the real world with bounties of $60k+. If you&apos;d like to stay updated, you can join our newsletter here: <a href={newsletterUrl} style={link}>{newsletterUrl}</a>.
        </Text>

        <Text style={paragraph}>
          We hope you&apos;ll continue to engage with the community, whether that&apos;s through future residencies, upcoming programs, or simply staying in conversation with us.
        </Text>

        <Text style={signature}>
          With gratitude,<br />
          The Funding the Commons Residency Team
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

const conferenceOfferBox = {
  backgroundColor: '#fef7ed',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #fed7aa',
};

const conferenceHeading = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#ea580c',
  margin: '0 0 12px',
};

const codeStyle = {
  backgroundColor: '#1f2937',
  color: '#f9fafb',
  padding: '2px 6px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '14px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'none',
};

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#404040',
  margin: '32px 0 16px',
};

export default ApplicationRejectedTemplate;
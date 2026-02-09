export type EventType = 'residency' | 'hackathon' | 'conference';

export interface EventContent {
  name: string;
  shortDescription: string;
  applicationClosedMessage: {
    title: string;
    description: string;
    infoMessage: string;
  };
  branding: {
    colors: {
      primary: string;
      secondary: string;
      gradient: string;
    };
    icon: string;
  };
}
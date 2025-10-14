import { type EventType, type EventContent } from "~/types/event";
import { 
  IconHome,
  IconTrophy,
  IconMicrophone,
  type Icon
} from "@tabler/icons-react";

export const EVENT_CONTENT_MAP: Record<EventType, EventContent> = {
  residency: {
    name: "FtC RealFi Residency",
    shortDescription: "Buenos Aires 2025",
    applicationClosedMessage: {
      title: "Applications are Currently Closed",
      description: "Thank you for your interest in the Funding the Commons RealFi Residency. The application period has ended and we are no longer accepting new applications.",
      infoMessage: "Stay tuned for announcements about future residency programs and opportunities."
    },
    branding: {
      colors: {
        primary: "blue",
        secondary: "purple", 
        gradient: "from-blue-600 to-purple-600"
      },
      icon: "home"
    }
  },
  hackathon: {
    name: "FtC RealFi Hackathon",
    shortDescription: "Buenos Aires 2025",
    applicationClosedMessage: {
      title: "Hackathon Applications are Currently Closed",
      description: "Thank you for your interest in the Funding the Commons RealFi Hackathon. The registration period has ended and we are no longer accepting new participants.",
      infoMessage: "Follow us for updates on hackathon results and future events."
    },
    branding: {
      colors: {
        primary: "orange",
        secondary: "red",
        gradient: "from-orange-600 to-red-600"
      },
      icon: "trophy"
    }
  }
};

export function getEventContent(eventType: EventType): EventContent {
  return EVENT_CONTENT_MAP[eventType];
}

export function getEventIcon(eventType: EventType): Icon {
  switch (eventType) {
    case "residency":
      return IconHome;
    case "hackathon": 
      return IconTrophy;
    default:
      return IconMicrophone; // fallback
  }
}

export function getEventGradient(eventType: EventType): string {
  const content = getEventContent(eventType);
  return content.branding.colors.gradient;
}
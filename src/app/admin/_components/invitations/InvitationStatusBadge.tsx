import { Badge } from "@mantine/core";
import {
  getInvitationStatusColor,
  getInvitationStatusIcon,
} from "./invitation-utils";

interface InvitationStatusBadgeProps {
  status: string;
}

export default function InvitationStatusBadge({
  status,
}: InvitationStatusBadgeProps) {
  return (
    <Badge
      color={getInvitationStatusColor(status)}
      variant="light"
      size="sm"
      leftSection={getInvitationStatusIcon(status)}
    >
      {status.toLowerCase()}
    </Badge>
  );
}

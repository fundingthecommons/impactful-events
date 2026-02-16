import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function InvitationsPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Invitations</h1>
      <p className="docs-page-subtitle">
        Receive and accept invitations to events and special roles.
      </p>

      <h2 id="how-invitations-work" className="docs-heading-h2">
        How Invitations Work
      </h2>
      <p className="docs-text">
        Event organisers can invite people to participate in events directly,
        without requiring them to go through the standard application process.
        Invitations are sent by email and include a link to accept.
      </p>

      <h2 id="types-of-invitations" className="docs-heading-h2">
        Types of Invitations
      </h2>
      <p className="docs-text">
        You might receive an invitation for different purposes:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Event participation</strong> &ndash; An invitation to attend a
          specific event as a participant.
        </li>
        <li>
          <strong>Role assignment</strong> &ndash; An invitation to take on a
          specific role, such as a speaker or staff member.
        </li>
        <li>
          <strong>Venue ownership</strong> &ndash; An invitation to manage a
          floor or venue as a{" "}
          <Link href="/docs/features/floor-management" className="docs-link">
            floor lead
          </Link>
          .
        </li>
      </ul>

      <h2 id="accepting-an-invitation" className="docs-heading-h2">
        Accepting an Invitation
      </h2>
      <p className="docs-text">
        When you receive an invitation email, click the link inside it. If you
        already have an account, you will be taken directly to the event. If you
        are new to the platform, you will be guided through creating an account
        first, after which your invitation will be applied automatically.
      </p>

      <h2 id="invitation-status" className="docs-heading-h2">
        Invitation Status
      </h2>
      <p className="docs-text">
        Organisers can track which invitations have been sent, accepted, or are
        still pending. If your invitation has expired or you have trouble
        accepting it, contact the event organiser for a new one.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        Learn about applying to events the standard way in the{" "}
        <Link href="/docs/features/applications" className="docs-link">
          Applications guide
        </Link>
        .
      </p>
    </>
  );
}

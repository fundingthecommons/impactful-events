import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function FloorOwnersPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Managing Floor Owners</h1>
      <p className="docs-page-subtitle">
        A guide for organisers on assigning venue partners and delegating
        schedule management.
      </p>

      <h2 id="what-are-floor-owners" className="docs-heading-h2">
        What Are Floor Owners?
      </h2>
      <p className="docs-text">
        Floor owners are people or organisations responsible for managing a
        specific venue or floor within your event. By assigning floor owners, you
        delegate the day-to-day management of that space &ndash; they can create
        sessions, update venue details, and keep their schedule current without
        needing full admin access.
      </p>

      <h2 id="assigning-floor-owners" className="docs-heading-h2">
        Assigning Floor Owners
      </h2>
      <p className="docs-text">
        Navigate to your event in the admin panel and open the
        &ldquo;Floor Owners&rdquo; tab. From here, you have two options:
      </p>

      <h3 id="assign-existing-user" className="docs-heading-h3">
        Assign an Existing User
      </h3>
      <p className="docs-text">
        If the person already has an account on the platform, search for them by
        name or email, select the venue you want them to manage, and click
        assign. They will see the &ldquo;Manage Schedule&rdquo; tab the next
        time they visit the event.
      </p>

      <h3 id="invite-by-email" className="docs-heading-h3">
        Invite by Email
      </h3>
      <p className="docs-text">
        If the person does not yet have an account, enter their email address
        and select the venue. The platform will send them an invitation. When
        they accept and create their account, they will automatically be linked
        to the venue.
      </p>

      <h2 id="viewing-assignments" className="docs-heading-h2">
        Viewing Current Assignments
      </h2>
      <p className="docs-text">
        The Floor Owners tab shows all current assignments grouped by venue. For
        each venue, you can see who is assigned, when they were added, and remove
        them if needed.
      </p>

      <h2 id="enabling-schedule-management" className="docs-heading-h2">
        Enabling Schedule Management
      </h2>
      <p className="docs-text">
        For floor owners to see the &ldquo;Manage Schedule&rdquo; tab, the
        schedule management feature flag must be enabled for your event. You can
        toggle this from the event settings page in the admin panel.
      </p>

      <div className="docs-callout">
        <p className="docs-callout-text">
          <strong>Note:</strong> The Floor Owners admin tab is always visible
          regardless of the feature flag. This lets you set up assignments before
          enabling the feature for floor owners.
        </p>
      </div>

      <h2 id="what-floor-owners-can-do" className="docs-heading-h2">
        What Floor Owners Can Do
      </h2>
      <p className="docs-text">
        Once assigned, floor owners can:
      </p>
      <ul className="docs-list">
        <li>Create, edit, and delete sessions on their assigned venue</li>
        <li>Update venue details (name, description, capacity)</li>
        <li>Toggle sessions between published and draft status</li>
        <li>View other sessions on their floor</li>
      </ul>

      <h2 id="what-floor-owners-cannot-do" className="docs-heading-h2">
        What Floor Owners Cannot Do
      </h2>
      <p className="docs-text">
        Floor owners have focused permissions. They cannot:
      </p>
      <ul className="docs-list">
        <li>Create or delete venues</li>
        <li>Assign other floor owners</li>
        <li>Modify sessions on other venues</li>
        <li>Access event admin settings</li>
      </ul>

      <h2 id="removing-a-floor-owner" className="docs-heading-h2">
        Removing a Floor Owner
      </h2>
      <p className="docs-text">
        To remove a floor owner, go to the Floor Owners tab, find the
        assignment, and click the remove button. The person will lose access to
        the &ldquo;Manage Schedule&rdquo; tab for that venue, but their account
        and any sessions they created will remain.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        For the floor owner&apos;s perspective, see the{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          Floor Management guide
        </Link>
        . For a broader look at organiser tools, visit the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel overview
        </Link>
        .
      </p>
    </>
  );
}

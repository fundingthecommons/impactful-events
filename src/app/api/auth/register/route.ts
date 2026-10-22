import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { acceptPendingInvitations } from "~/server/auth/acceptInvitations";
import { hashPassword, validatePassword } from "~/utils/password";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  invitationToken: z.string().optional(),
});

// SECURITY: whether the DB already holds proof that this account controls its
// email. Only User.emailVerified counts: the NextAuth signIn callback stamps it
// on every verified sign-in (a clicked magic link, Google with email_verified,
// Discord with verified) and takes ownership of a pre-registered credentials
// row at that moment. An OAuth Account row alone is NOT proof — Discord (and
// in rare cases Google) can carry an unverified address — and a credentials
// registration leaves no proof at all.
function hasVerifiedEmail(user: { emailVerified: Date | null }): boolean {
  return user.emailVerified !== null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 },
      );
    }

    const { name, email: rawEmail, password, invitationToken } = result.data;
    const email = rawEmail.toLowerCase().trim();

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    // If invitation token is provided, validate it
    let invitation = null;
    if (invitationToken) {
      invitation = await db.invitation.findUnique({
        where: { token: invitationToken },
        include: {
          event: true,
          role: true,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Invalid invitation token" },
          { status: 400 },
        );
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json(
          { error: "Invitation has already been processed" },
          { status: 400 },
        );
      }

      if (invitation.expiresAt < new Date()) {
        // Mark invitation as expired
        await db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 },
        );
      }

      if (invitation.email.toLowerCase() !== email) {
        return NextResponse.json(
          { error: "Email does not match invitation" },
          { status: 400 },
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If there's an invitation and user already exists, assign the role
      if (invitation) {
        try {
          // SECURITY: this branch runs with NO session and NO password check —
          // anyone holding the token can trigger it for the invitee's address.
          // It used to write GLOBAL_ADMIN/GLOBAL_STAFF straight onto the row,
          // so an attacker who had pre-registered the invitee's address via
          // credentials (unverified) was promoted as soon as the invitation
          // existed. All grants now go through acceptPendingInvitations, which
          // owns the rule: EVENT_ROLE / VENUE_OWNER are applied; a global role
          // is applied only when the DB proves the account controls the email
          // (OAuth-linked, or emailVerified set by a magic-link sign-in) and is
          // otherwise left PENDING for a verified sign-in to complete. The
          // response is uniform so this endpoint does not reveal whether the
          // grant happened.
          const emailVerified = hasVerifiedEmail(existingUser);
          await acceptPendingInvitations(email, existingUser.id, {
            emailVerified,
          });

          const isEventInvitation =
            invitation.type === "EVENT_ROLE" ||
            invitation.type === "VENUE_OWNER";
          const roleName =
            invitation.type === "VENUE_OWNER"
              ? "Floor Lead"
              : (invitation.role?.name ?? invitation.globalRole);
          const message = isEventInvitation
            ? `User already exists with this email, but invitation to ${invitation.event?.name} as ${roleName} has been accepted. Please sign in.`
            : `User already exists with this email. Sign in with Google, Discord, or an emailed sign-in link to complete your global ${invitation.globalRole} invitation.`;

          return NextResponse.json(
            {
              error: message,
              userExists: true,
              invitation: {
                type: invitation.type,
                eventName: invitation.event?.name,
                roleName,
              },
            },
            { status: 409 },
          );
        } catch (error) {
          console.error("Failed to assign role to existing user:", error);
        }
      }

      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 },
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // If there was an invitation, assign the role and mark invitation as accepted
    if (invitation) {
      try {
        // SECURITY: a credentials registration verifies nothing about the
        // email, so this goes through acceptPendingInvitations with
        // emailVerified:false — EVENT_ROLE / VENUE_OWNER are applied, while a
        // GLOBAL_ADMIN/GLOBAL_STAFF invitation stays PENDING and completes on
        // the user's first Google / Discord / magic-link sign-in (NextAuth
        // signIn callback). Previously this branch wrote the global role onto
        // the brand-new, unverified account directly.
        await acceptPendingInvitations(email, user.id, {
          emailVerified: false,
        });

        const isEventInvitation =
          invitation.type === "EVENT_ROLE" ||
          invitation.type === "VENUE_OWNER";
        const roleName =
          invitation.type === "VENUE_OWNER"
            ? "Floor Lead"
            : (invitation.role?.name ?? invitation.globalRole);
        const responseMessage = isEventInvitation
          ? `User registered successfully with invitation to ${invitation.event?.name} as ${roleName}`
          : `User registered successfully. Sign in with Google, Discord, or an emailed sign-in link to complete your global ${invitation.globalRole} invitation.`;

        return NextResponse.json(
          {
            message: responseMessage,
            // `user.role` is the DB default: no global role is granted here.
            user,
            invitation: {
              type: invitation.type,
              eventName: invitation.event?.name,
              roleName,
            },
          },
          { status: 201 },
        );
      } catch (error) {
        console.error("Failed to assign role from invitation:", error);
        // User was created but role assignment failed - still return success
        // The user can be manually assigned the role later
      }
    }

    return NextResponse.json(
      { message: "User registered successfully", user },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

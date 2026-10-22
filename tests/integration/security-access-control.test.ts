/**
 * Security access-control integration tests (security PR, 2026-10-21).
 *
 * The same gates and personas as tests/unit/access-control.test.ts, run
 * against a real PostgreSQL database (the test container started by
 * tests/helpers/globalSetup.ts) with real Prisma queries and fixtures.
 *
 * Personas: anonymous (no session), impostor (a self-registered member who
 * owns nothing), owner, staff / admin (DB role matches the session role) and
 * a "demoted admin" whose session still says admin but whose DB row is a
 * plain user — the DB re-check in adminOrStaffProcedure must refuse it.
 *
 * The October fixes add the magic-link signIn callback, the register route,
 * the telegramAuth / praise / onboarding routers, the fuzzyMatchSpeakers gate,
 * the metric eventId rule and the live-event floor-lead rule. validateApiKey
 * is pure and covered by the unit suite only.
 */

import { describe, it, expect, afterAll } from "vitest";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import type { NextRequest } from "next/server";
import { createTestCaller, disconnectTestDb, getTestDb } from "../helpers/trpc";
import {
  createTestUser,
  createTestEvent,
  createTestVenue,
  createTestApplication,
  cleanupTestData,
} from "../helpers/fixtures";
import { POST as registerPost } from "~/app/api/auth/register/route";
import { PRIVATE_PROFILE_FIELDS } from "~/server/api/utils/profilePrivacy";
import { acceptPendingInvitations } from "~/server/auth/acceptInvitations";
import { authConfig } from "~/server/auth/config";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

// ── Helpers ─────────────────────────────────────────────────────────────

const PRIVATE_VALUES = {
  phoneNumber: "+1 555 0100",
  telegramHandle: "@owner-handle",
  telegramChatId: "987654321",
  discordHandle: "owner#0001",
  speakerCoHostInfo: "cohost@example.test",
  priorExperience: "copied from the application form",
  mentorPreferredContact: "telegram dm",
} as const;

const inAWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const token = () => faker.string.alphanumeric(8).toLowerCase();

async function expectCode(
  promise: Promise<unknown>,
  code: TRPCError["code"],
  messageIncludes?: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe(code);
    if (messageIncludes !== undefined) {
      expect((error as TRPCError).message).toContain(messageIncludes);
    }
    return;
  }
  expect.unreachable(`expected the call to be rejected with ${code}`);
}

function expectPrivateFieldsNull(profile: unknown) {
  const row = profile as Record<string, unknown>;
  for (const field of PRIVATE_PROFILE_FIELDS) {
    expect(row[field], field).toBeNull();
  }
}

function expectPrivateFieldsKept(profile: unknown) {
  const row = profile as Record<string, unknown>;
  for (const field of PRIVATE_PROFILE_FIELDS) {
    expect(row[field], field).toBe(PRIVATE_VALUES[field]);
  }
}

function expectNoPrivateValues(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const [field, secret] of Object.entries(PRIVATE_VALUES)) {
    expect(serialized, field).not.toContain(secret);
  }
}

function hasKey(value: unknown, key: string): boolean {
  return !!value && typeof value === "object" && key in value;
}

/** A UserProfile row carrying every private field, so a leak is visible. */
async function createProfile(
  userId: string,
  overrides: { isPublic?: boolean; jobTitle?: string } = {},
) {
  const db = getTestDb();
  return db.userProfile.create({
    data: {
      userId,
      bio: "Public bio",
      jobTitle: overrides.jobTitle ?? "Engineer",
      company: "ACME",
      location: "Lisbon",
      githubUrl: "https://github.com/owner",
      isPublic: overrides.isPublic ?? true,
      ...PRIVATE_VALUES,
    },
  });
}

async function createProject(profileId: string, title: string) {
  const db = getTestDb();
  return db.userProject.create({
    data: {
      profileId,
      title,
      description: "A project",
      featured: true,
      technologies: [],
      focusAreas: [],
    },
  });
}

async function ensureRole(name: string) {
  const db = getTestDb();
  return db.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

// ── evaluation.ts ───────────────────────────────────────────────────────

describe("Security: evaluation router", () => {
  it("getEvaluation / getAvailableApplications / selfAssignToApplication are admin/staff only", async () => {
    const db = getTestDb();
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const applicant = await createTestUser({ role: "user" }, db);
    const event = await createTestEvent({}, db);
    const application = await createTestApplication(
      {
        userId: applicant.id,
        eventId: event.id,
        email: applicant.email ?? "applicant@test.com",
        status: "SUBMITTED",
        applicationType: "RESIDENT",
      },
      db,
    );

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });

    await expectCode(
      anonymous.evaluation.getEvaluation({
        applicationId: application.id,
        stage: "SCREENING",
      }),
      "UNAUTHORIZED",
    );
    await expectCode(
      impostor.evaluation.getEvaluation({
        applicationId: application.id,
        stage: "SCREENING",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.evaluation.getAvailableApplications({ eventId: event.id }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.evaluation.selfAssignToApplication({
        applicationId: application.id,
      }),
      "FORBIDDEN",
    );
    expect(
      await db.reviewerAssignment.count({
        where: { reviewerId: impostorUser.id },
      }),
    ).toBe(0);

    const queue = await staff.evaluation.getAvailableApplications({
      eventId: event.id,
    });
    expect(queue.map((a) => a.id)).toContain(application.id);

    const assigned = await staff.evaluation.selfAssignToApplication({
      applicationId: application.id,
    });
    expect(assigned.assignment.reviewerId).toBe(staffUser.id);

    const evaluation = await staff.evaluation.getEvaluation({
      applicationId: application.id,
      stage: "SCREENING",
    });
    expect(evaluation?.reviewerId).toBe(staffUser.id);
  });
});

// ── invitation.ts + acceptPendingInvitations ────────────────────────────

describe("Security: invitation acceptance", () => {
  it("invitation.accept ignores client-supplied identity — an impostor cannot accept the victim's invitation", async () => {
    const db = getTestDb();
    const adminUser = await createTestUser({ role: "admin" }, db);
    const victimEmail = `victim-${token()}@test.com`;
    const victim = await createTestUser(
      { role: "user", email: victimEmail },
      db,
    );
    const impostorUser = await createTestUser({ role: "user" }, db);
    const event = await createTestEvent({}, db);
    const mentorRole = await ensureRole("mentor");
    const invitation = await db.invitation.create({
      data: {
        email: victimEmail,
        type: "EVENT_ROLE",
        eventId: event.id,
        roleId: mentorRole.id,
        invitedBy: adminUser.id,
        expiresAt: inAWeek(),
      },
    });

    await expectCode(
      createTestCaller(null).invitation.accept({
        email: victimEmail,
        userId: victim.id,
      }),
      "UNAUTHORIZED",
    );

    const asImpostor = await createTestCaller("user", {
      id: impostorUser.id,
    }).invitation.accept({ email: victimEmail, userId: victim.id });
    expect(asImpostor.accepted).toBe(0);
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("PENDING");
    expect(await db.userRole.count({ where: { eventId: event.id } })).toBe(0);

    const asVictim = await createTestCaller("user", {
      id: victim.id,
    }).invitation.accept();
    expect(asVictim.accepted).toBe(1);
    expect(
      await db.userRole.count({
        where: { userId: victim.id, eventId: event.id, roleId: mentorRole.id },
      }),
    ).toBe(1);
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("ACCEPTED");
  });

  it("acceptPendingInvitations refuses a GLOBAL_ADMIN grant on an unverified email and applies it on a verified one", async () => {
    const db = getTestDb();
    const adminUser = await createTestUser({ role: "admin" }, db);
    const inviteeEmail = `invited-admin-${token()}@test.com`;
    const invitee = await createTestUser(
      { role: "user", email: inviteeEmail },
      db,
    );
    const invitation = await db.invitation.create({
      data: {
        email: inviteeEmail,
        type: "GLOBAL_ADMIN",
        globalRole: "admin",
        invitedBy: adminUser.id,
        expiresAt: inAWeek(),
      },
    });

    const unverified = await acceptPendingInvitations(
      inviteeEmail,
      invitee.id,
      {
        emailVerified: false,
      },
    );
    expect(unverified.accepted).toBe(0);
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("user");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("PENDING");

    const verified = await acceptPendingInvitations(inviteeEmail, invitee.id, {
      emailVerified: true,
    });
    expect(verified.accepted).toBe(1);
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("admin");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("ACCEPTED");
  });
});

// ── NextAuth signIn callback + POST /api/auth/register ─────────────────

describe("Security: NextAuth signIn callback (magic link)", () => {
  type SignInParams = Parameters<typeof authConfig.callbacks.signIn>[0];

  it("a magic-link sign-in REQUEST does not grant a pending GLOBAL_ADMIN invitation; the CLICK does", async () => {
    const db = getTestDb();
    const adminUser = await createTestUser({ role: "admin" }, db);
    const inviteeEmail = `invited-by-link-${token()}@test.com`;
    const invitee = await createTestUser(
      { role: "user", email: inviteeEmail },
      db,
    );
    const invitation = await db.invitation.create({
      data: {
        email: inviteeEmail,
        type: "GLOBAL_ADMIN",
        globalRole: "admin",
        invitedBy: adminUser.id,
        expiresAt: inAWeek(),
      },
    });
    const magicLink: SignInParams["account"] = {
      provider: "postmark",
      type: "email",
      providerAccountId: inviteeEmail,
    };
    const signInAs = (email?: SignInParams["email"]) =>
      authConfig.callbacks.signIn({
        user: { id: invitee.id, email: inviteeEmail },
        account: magicLink,
        email,
      });

    // Request time: Auth.js runs signIn before anyone has clicked a link, so
    // typing the invitee's address into the form must not promote the
    // (possibly attacker-registered) account behind it.
    expect(await signInAs({ verificationRequest: true })).toBe(true);
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("user");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("PENDING");

    // Click time: the second call carries no `email` param.
    expect(await signInAs()).toBe(true);
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("admin");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("ACCEPTED");
  });
});

describe("Security: POST /api/auth/register", () => {
  function registerRequest(body: Record<string, unknown>) {
    return { json: async () => body } as unknown as NextRequest;
  }

  it("the existing-user branch does not promote an unverified account; a verified one is promoted with the same response", async () => {
    const db = getTestDb();
    const adminUser = await createTestUser({ role: "admin" }, db);
    const inviteeEmail = `preregistered-${token()}@test.com`;
    const invitee = await createTestUser(
      { role: "user", email: inviteeEmail },
      db,
    );
    // The attacker pre-registered the invitee's address via credentials.
    await db.user.update({
      where: { id: invitee.id },
      data: { password: "$2a$12$integration-test-fake-password-hash" },
    });
    const invitation = await db.invitation.create({
      data: {
        email: inviteeEmail,
        type: "GLOBAL_ADMIN",
        globalRole: "admin",
        invitedBy: adminUser.id,
        expiresAt: inAWeek(),
      },
    });
    const body = {
      name: "Mallory",
      email: inviteeEmail,
      password: "Str0ng!Passw0rd",
      invitationToken: invitation.token,
    };

    const unverified = await registerPost(registerRequest(body));
    expect(unverified.status).toBe(409);
    const unverifiedBody = (await unverified.json()) as {
      error?: string;
      userExists?: boolean;
    };
    expect(unverifiedBody.userExists).toBe(true);
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("user");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("PENDING");

    // Once the DB proves control of the address (a clicked magic link stamps
    // emailVerified), the same request completes the grant — with the same
    // response, so the endpoint is not a grant oracle.
    await db.user.update({
      where: { id: invitee.id },
      data: { emailVerified: new Date() },
    });
    const verified = await registerPost(registerRequest(body));
    expect(verified.status).toBe(409);
    expect(((await verified.json()) as { error?: string }).error).toBe(
      unverifiedBody.error,
    );
    expect(
      (await db.user.findUnique({ where: { id: invitee.id } }))?.role,
    ).toBe("admin");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("ACCEPTED");
  });

  it("the new-user branch creates a plain user and leaves a GLOBAL_STAFF invitation PENDING", async () => {
    const db = getTestDb();
    const adminUser = await createTestUser({ role: "admin" }, db);
    const newcomerEmail = `newcomer-${token()}@test.com`;
    const invitation = await db.invitation.create({
      data: {
        email: newcomerEmail,
        type: "GLOBAL_STAFF",
        globalRole: "staff",
        invitedBy: adminUser.id,
        expiresAt: inAWeek(),
      },
    });

    const response = await registerPost(
      registerRequest({
        name: "Newcomer",
        email: newcomerEmail,
        password: "Str0ng!Passw0rd",
        invitationToken: invitation.token,
      }),
    );
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      user?: { role?: string | null };
      invitation?: { type?: string };
    };
    expect(payload.user?.role).toBe("user");
    expect(payload.invitation?.type).toBe("GLOBAL_STAFF");
    expect(
      (await db.user.findUnique({ where: { email: newcomerEmail } }))?.role,
    ).toBe("user");
    expect(
      (await db.invitation.findUnique({ where: { id: invitation.id } }))
        ?.status,
    ).toBe("PENDING");
  });
});

// ── contact.ts ──────────────────────────────────────────────────────────

describe("Security: contact router", () => {
  it("createContact / updateContact / mergeContacts / matchEventApplicants are admin/staff only", async () => {
    const db = getTestDb();
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });
    const contactInput = { firstName: "Ada", lastName: `Lovelace-${token()}` };

    await expectCode(
      createTestCaller(null).contact.createContact(contactInput),
      "UNAUTHORIZED",
    );
    await expectCode(impostor.contact.createContact(contactInput), "FORBIDDEN");
    await expectCode(
      impostor.contact.updateContact({ id: "any", ...contactInput }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.contact.mergeContacts({ contactIds: ["a", "b"] }),
      "FORBIDDEN",
    );
    await expectCode(impostor.contact.matchEventApplicants(), "FORBIDDEN");
    expect(
      await db.contact.count({ where: { lastName: contactInput.lastName } }),
    ).toBe(0);

    const created = await staff.contact.createContact(contactInput);
    expect(created.lastName).toBe(contactInput.lastName);
    const updated = await staff.contact.updateContact({
      id: created.id,
      firstName: "Augusta",
      lastName: contactInput.lastName,
    });
    expect(updated.firstName).toBe("Augusta");
  });

  it("the seven CRM importers are admin/staff only", async () => {
    const db = getTestDb();
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const forContact = { contactId: "any" };

    await expectCode(
      createTestCaller(null).contact.importGoogleContacts(),
      "UNAUTHORIZED",
    );
    await expectCode(
      createTestCaller("admin", {
        id: demotedUser.id,
      }).contact.importGoogleContacts(),
      "FORBIDDEN",
    );
    await expectCode(impostor.contact.importGoogleContacts(), "FORBIDDEN");
    await expectCode(
      impostor.contact.importGoogleContactsFromEmails(),
      "FORBIDDEN",
    );
    await expectCode(impostor.contact.importGmailMessages({}), "FORBIDDEN");
    await expectCode(impostor.contact.importNotionContacts(), "FORBIDDEN");
    await expectCode(impostor.contact.importTelegramContacts(), "FORBIDDEN");
    await expectCode(
      impostor.contact.importTelegramMessagesForContact(forContact),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.contact.importGmailMessagesForContact(forContact),
      "FORBIDDEN",
    );
  });
});

// ── telegramAuth.ts ─────────────────────────────────────────────────────

describe("Security: telegramAuth router", () => {
  it("smart lists and bulk messaging are admin/staff only", async () => {
    const db = getTestDb();
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const adminUser = await createTestUser({ role: "admin" }, db);
    await db.userProfile.create({
      data: { userId: adminUser.id, telegramHandle: "@admin-handle" },
    });

    const impostor = createTestCaller("user", { id: impostorUser.id });
    const demoted = createTestCaller("admin", { id: demotedUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });
    const bulkInput = { contactIds: ["any"], message: "Hello" };
    const listInput = { listId: "admins", message: "Hello admins" };

    await expectCode(
      createTestCaller(null).telegramAuth.getSmartLists(),
      "UNAUTHORIZED",
    );
    for (const caller of [impostor, demoted]) {
      await expectCode(caller.telegramAuth.getSmartLists(), "FORBIDDEN");
      await expectCode(
        caller.telegramAuth.getSmartListContacts({ listId: "admins" }),
        "FORBIDDEN",
      );
      await expectCode(caller.telegramAuth.sendBulkMessage(bulkInput), "FORBIDDEN");
      await expectCode(
        caller.telegramAuth.sendBulkMessageToList(listInput),
        "FORBIDDEN",
      );
    }

    const lists = await staff.telegramAuth.getSmartLists();
    expect(lists.map((list) => list.id)).toContain("admins");
    const roster = await staff.telegramAuth.getSmartListContacts({
      listId: "admins",
    });
    expect(roster.find((c) => c.id === adminUser.id)?.email).toBe(
      adminUser.email,
    );
    // Staff pass the gate; without a Telegram session nothing is sent.
    await expectCode(
      staff.telegramAuth.sendBulkMessage(bulkInput),
      "UNAUTHORIZED",
      "No active Telegram authentication",
    );
    await expectCode(
      staff.telegramAuth.sendBulkMessageToList(listInput),
      "UNAUTHORIZED",
      "No active Telegram authentication",
    );
  });
});

// ── praise.ts / onboarding.ts ───────────────────────────────────────────

describe("Security: praise router", () => {
  it("getLeaderboard / getAllTransactions return no email to members; getEventPraise stays gated", async () => {
    const db = getTestDb();
    const sender = await createTestUser({ role: "user" }, db);
    const recipient = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const event = await createTestEvent({}, db);
    await db.praise.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        recipientName: "@recipient",
        message: "Thanks for the review",
        eventId: event.id,
      },
    });

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    await expectCode(anonymous.praise.getLeaderboard({}), "UNAUTHORIZED");
    await expectCode(anonymous.praise.getAllTransactions({}), "UNAUTHORIZED");

    const leaderboard = await impostor.praise.getLeaderboard({
      eventId: event.id,
    });
    const entry = leaderboard.find((e) => e.user?.id === recipient.id);
    expect(entry?.praiseCount).toBe(1);
    expect(hasKey(entry?.user, "email")).toBe(false);

    const transactions = await impostor.praise.getAllTransactions({
      limit: 100,
    });
    const row = transactions.find((t) => t.senderId === sender.id);
    expect(row).toBeDefined();
    expect(hasKey(row?.sender, "email")).toBe(false);
    expect(hasKey(row?.recipient, "email")).toBe(false);
    const serialized = JSON.stringify([leaderboard, transactions]);
    expect(serialized).not.toContain(sender.email ?? "@@never@@");
    expect(serialized).not.toContain(recipient.email ?? "@@never@@");

    await expectCode(
      impostor.praise.getEventPraise({ eventId: event.id }),
      "FORBIDDEN",
    );
  });
});

describe("Security: onboarding.getOnboardingStatus", () => {
  it("is admin/staff only", async () => {
    const db = getTestDb();
    const applicant = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const event = await createTestEvent({}, db);
    const application = await createTestApplication(
      {
        userId: applicant.id,
        eventId: event.id,
        status: "ACCEPTED",
        applicationType: "RESIDENT",
      },
      db,
    );
    await db.applicationOnboarding.create({
      data: {
        applicationId: application.id,
        completed: true,
        submittedAt: new Date(),
        eTicketUrl: "https://files.example.test/ticket.pdf",
      },
    });
    const input = { applicationIds: [application.id] };

    await expectCode(
      createTestCaller(null).onboarding.getOnboardingStatus(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      createTestCaller("user", {
        id: impostorUser.id,
      }).onboarding.getOnboardingStatus(input),
      "FORBIDDEN",
    );
    await expectCode(
      createTestCaller("admin", {
        id: demotedUser.id,
      }).onboarding.getOnboardingStatus(input),
      "FORBIDDEN",
    );

    const asStaff = await createTestCaller("staff", {
      id: staffUser.id,
    }).onboarding.getOnboardingStatus(input);
    expect(asStaff[application.id]?.completed).toBe(true);
    expect(asStaff[application.id]?.hasETicket).toBe(true);
  });
});

// ── profile.ts ──────────────────────────────────────────────────────────

describe("Security: profile router", () => {
  it("getProfile strips private fields for anonymous and impostor, keeps them for owner and staff", async () => {
    const db = getTestDb();
    const ownerUser = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    await createProfile(ownerUser.id);

    expectPrivateFieldsNull(
      await createTestCaller(null).profile.getProfile({ userId: ownerUser.id }),
    );
    expectPrivateFieldsNull(
      await createTestCaller("user", {
        id: impostorUser.id,
      }).profile.getProfile({ userId: ownerUser.id }),
    );
    expectPrivateFieldsKept(
      await createTestCaller("user", { id: ownerUser.id }).profile.getProfile({
        userId: ownerUser.id,
      }),
    );
    expectPrivateFieldsKept(
      await createTestCaller("staff", { id: staffUser.id }).profile.getProfile({
        userId: ownerUser.id,
      }),
    );
  });

  it("getProfile on a hidden profile is FORBIDDEN for anonymous and impostor, allowed for the owner", async () => {
    const db = getTestDb();
    const ownerUser = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    await createProfile(ownerUser.id, { isPublic: false });

    await expectCode(
      createTestCaller(null).profile.getProfile({ userId: ownerUser.id }),
      "FORBIDDEN",
    );
    await expectCode(
      createTestCaller("user", { id: impostorUser.id }).profile.getProfile({
        userId: ownerUser.id,
      }),
      "FORBIDDEN",
    );
    const own = await createTestCaller("user", {
      id: ownerUser.id,
    }).profile.getProfile({ userId: ownerUser.id });
    expect(own.isPublic).toBe(false);
    expectPrivateFieldsKept(own);

    // Aligned with searchProfiles / getAllMembers, which already list hidden
    // profiles for admin/staff: the member admin view links here.
    const staffUser = await createTestUser({ role: "staff" }, db);
    const asStaff = await createTestCaller("staff", {
      id: staffUser.id,
    }).profile.getProfile({ userId: ownerUser.id });
    expect(asStaff.isPublic).toBe(false);
    expectPrivateFieldsKept(asStaff);
  });

  it("searchProfiles / getAllMembers / getAllFeaturedProjects hide isPublic=false profiles from non-privileged callers and strip private fields", async () => {
    const db = getTestDb();
    const tag = token();
    const visibleUser = await createTestUser(
      { role: "user", name: `${tag} Visible Member` },
      db,
    );
    const hiddenUser = await createTestUser(
      { role: "user", name: `${tag} Hidden Member` },
      db,
    );
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const visibleProfile = await createProfile(visibleUser.id);
    const hiddenProfile = await createProfile(hiddenUser.id, {
      isPublic: false,
    });
    const visibleProject = await createProject(
      visibleProfile.id,
      `${tag} visible project`,
    );
    const hiddenProject = await createProject(
      hiddenProfile.id,
      `${tag} hidden project`,
    );

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const hiddenOwner = createTestCaller("user", { id: hiddenUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });

    // searchProfiles (matches user.name)
    for (const caller of [anonymous, impostor]) {
      const { profiles } = await caller.profile.searchProfiles({ search: tag });
      const ids = profiles.map((p) => p.userId);
      expect(ids).toContain(visibleUser.id);
      expect(ids).not.toContain(hiddenUser.id);
      expectPrivateFieldsNull(
        profiles.find((p) => p.userId === visibleUser.id),
      );
    }
    expect(
      (await hiddenOwner.profile.searchProfiles({ search: tag })).profiles.map(
        (p) => p.userId,
      ),
    ).toContain(hiddenUser.id);
    const staffSearch = await staff.profile.searchProfiles({ search: tag });
    expect(staffSearch.profiles.map((p) => p.userId)).toContain(hiddenUser.id);
    expectPrivateFieldsKept(
      staffSearch.profiles.find((p) => p.userId === visibleUser.id),
    );

    // getAllMembers (matches name)
    const impostorMembers = await impostor.profile.getAllMembers({
      search: tag,
    });
    const impostorIds = impostorMembers.members.map((m) => m.id);
    expect(impostorIds).toContain(visibleUser.id);
    expect(impostorIds).not.toContain(hiddenUser.id);
    const visibleAsImpostor = impostorMembers.members.find(
      (m) => m.id === visibleUser.id,
    );
    expect(visibleAsImpostor?.email).toBeNull();
    expect(hasKey(visibleAsImpostor, "password")).toBe(false);
    expectPrivateFieldsNull(visibleAsImpostor?.profile);

    expect(
      (await hiddenOwner.profile.getAllMembers({ search: tag })).members.map(
        (m) => m.id,
      ),
    ).toContain(hiddenUser.id);
    const staffMembers = await staff.profile.getAllMembers({ search: tag });
    expect(staffMembers.members.map((m) => m.id)).toContain(hiddenUser.id);
    const visibleAsStaff = staffMembers.members.find(
      (m) => m.id === visibleUser.id,
    );
    expect(visibleAsStaff?.email).toBe(visibleUser.email);
    expect(hasKey(visibleAsStaff, "password")).toBe(false);
    expectPrivateFieldsKept(visibleAsStaff?.profile);

    // getAllFeaturedProjects (matches title)
    for (const caller of [anonymous, impostor]) {
      const { projects } = await caller.profile.getAllFeaturedProjects({
        search: tag,
      });
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(visibleProject.id);
      expect(ids).not.toContain(hiddenProject.id);
      expectPrivateFieldsNull(
        projects.find((p) => p.id === visibleProject.id)?.profile,
      );
    }
    expect(
      (
        await hiddenOwner.profile.getAllFeaturedProjects({ search: tag })
      ).projects.map((p) => p.id),
    ).toContain(hiddenProject.id);
    const staffProjects = await staff.profile.getAllFeaturedProjects({
      search: tag,
    });
    expect(staffProjects.projects.map((p) => p.id)).toContain(hiddenProject.id);
    expectPrivateFieldsKept(
      staffProjects.projects.find((p) => p.id === visibleProject.id)?.profile,
    );
  });
});

// ── project.ts ──────────────────────────────────────────────────────────

describe("Security: project.getProjectDetails", () => {
  it("never leaks the owner's private fields and honours isPublic=false with a redacted author card", async () => {
    const db = getTestDb();
    const ownerUser = await createTestUser({ role: "user" }, db);
    const hiddenUser = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const ownerProfile = await createProfile(ownerUser.id);
    const hiddenProfile = await createProfile(hiddenUser.id, {
      isPublic: false,
      jobTitle: "Hidden Engineer",
    });
    const publicProject = await createProject(
      ownerProfile.id,
      "Public project",
    );
    const hiddenProject = await createProject(
      hiddenProfile.id,
      "Hidden project",
    );

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const hiddenOwner = createTestCaller("user", { id: hiddenUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });

    for (const caller of [anonymous, impostor, staff]) {
      const result = await caller.project.getProjectDetails({
        projectId: publicProject.id,
      });
      expectNoPrivateValues(result);
      expect(result.author.profile.jobTitle).toBe("Engineer");
    }

    for (const caller of [anonymous, impostor]) {
      const result = await caller.project.getProjectDetails({
        projectId: hiddenProject.id,
      });
      expect(result.title).toBe("Hidden project");
      for (const value of Object.values(result.author.profile)) {
        expect(value).toBeNull();
      }
    }
    for (const caller of [hiddenOwner, staff]) {
      const result = await caller.project.getProjectDetails({
        projectId: hiddenProject.id,
      });
      expect(result.author.profile.jobTitle).toBe("Hidden Engineer");
    }
  });
});

// ── kudos.ts / role.ts ──────────────────────────────────────────────────

describe("Security: kudos and role routers", () => {
  it("kudos.getLeaderboard returns no email to anonymous callers", async () => {
    const db = getTestDb();
    await createTestUser({ role: "user" }, db);
    const result = await createTestCaller(null).kudos.getLeaderboard({
      limit: 5,
    });
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(hasKey(entry.user, "email")).toBe(false);
    }
    expect(JSON.stringify(result)).not.toMatch(/"email"/);
  });

  it("role.getGlobalRoles is admin/staff only and refuses a demoted admin token", async () => {
    const db = getTestDb();
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);

    await expectCode(
      createTestCaller(null).role.getGlobalRoles(),
      "UNAUTHORIZED",
    );
    await expectCode(
      createTestCaller("user", { id: impostorUser.id }).role.getGlobalRoles(),
      "FORBIDDEN",
    );
    // Session claims admin; the DB row says user.
    await expectCode(
      createTestCaller("admin", { id: demotedUser.id }).role.getGlobalRoles(),
      "FORBIDDEN",
    );
    await expect(
      createTestCaller("staff", { id: staffUser.id }).role.getGlobalRoles(),
    ).resolves.toBeInstanceOf(Array);
  });
});

// ── askOffer.ts / forum.ts ──────────────────────────────────────────────

describe("Security: asks/offers and forum public reads", () => {
  it("return no poster email to anonymous callers or to members", async () => {
    const db = getTestDb();
    const poster = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const event = await createTestEvent({}, db);
    const askOffer = await db.askOffer.create({
      data: {
        userId: poster.id,
        eventId: event.id,
        type: "ASK",
        title: "Looking for a mentor",
        description: "Help wanted",
        tags: [],
      },
    });
    const thread = await db.forumThread.create({
      data: {
        userId: poster.id,
        title: "Hello",
        content: "World",
        tags: [],
      },
    });

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });

    const byId = await anonymous.askOffer.getById({ id: askOffer.id });
    expect(hasKey(byId.user, "email")).toBe(false);

    const board = await anonymous.askOffer.getEventAsksOffers({
      eventId: event.id,
    });
    expect(board.map((a) => a.id)).toContain(askOffer.id);
    for (const item of board) expect(hasKey(item.user, "email")).toBe(false);

    const feed = await impostor.askOffer.getAllAsksOffers({});
    for (const item of feed) expect(hasKey(item.user, "email")).toBe(false);

    const threadById = await anonymous.forum.getThreadById({ id: thread.id });
    expect(hasKey(threadById.user, "email")).toBe(false);
    expect(JSON.stringify([byId, board, feed, threadById])).not.toContain(
      poster.email ?? "@@never@@",
    );
  });
});

// ── sponsor.ts ──────────────────────────────────────────────────────────

describe("Security: sponsor router", () => {
  it("residency procedures require the sponsor role on that event (or staff); CRM writes are staff-only", async () => {
    const db = getTestDb();
    const tag = token();
    const sponsorRole = await ensureRole("sponsor");
    const eventA = await createTestEvent({}, db);
    const eventB = await createTestEvent({}, db);
    const sponsorA = await db.sponsor.create({
      data: { name: `Sponsor A ${tag}` },
    });
    const sponsorB = await db.sponsor.create({
      data: { name: `Sponsor B ${tag}` },
    });
    const eventSponsorA = await db.eventSponsor.create({
      data: { eventId: eventA.id, sponsorId: sponsorA.id },
    });
    const eventSponsorB = await db.eventSponsor.create({
      data: { eventId: eventB.id, sponsorId: sponsorB.id },
    });
    const repUser = await createTestUser({ role: "user" }, db);
    await db.userRole.create({
      data: { userId: repUser.id, eventId: eventA.id, roleId: sponsorRole.id },
    });
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);

    const impostor = createTestCaller("user", { id: impostorUser.id });
    const rep = createTestCaller("user", { id: repUser.id });
    const demoted = createTestCaller("admin", { id: demotedUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });
    const visitInput = {
      visitType: "KICKOFF" as const,
      preferredDates: [eventA.startDate],
      numAttendees: 2,
      purpose: "Kickoff visit",
    };

    // Impostor: nothing.
    await expectCode(
      impostor.sponsor.getSponsorResidencyData({
        eventSponsorId: eventSponsorA.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.sponsor.createVisitRequest({
        ...visitInput,
        eventSponsorId: eventSponsorA.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.sponsor.createDefaultDeliverables({
        eventSponsorId: eventSponsorA.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.sponsor.createSponsor({ name: `Squatted ${tag}` }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.sponsor.createDeliverable({
        eventSponsorId: eventSponsorA.id,
        category: "TECHNICAL",
        title: "Workshop",
        description: "A workshop",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      demoted.sponsor.createSponsor({ name: `Squatted ${tag}` }),
      "FORBIDDEN",
    );
    expect(
      await db.sponsorDeliverable.count({
        where: { eventSponsorId: eventSponsorA.id },
      }),
    ).toBe(0);

    // Sponsor rep: their own event only.
    const own = await rep.sponsor.getSponsorResidencyData({
      eventSponsorId: eventSponsorA.id,
    });
    expect(own?.id).toBe(eventSponsorA.id);
    await expectCode(
      rep.sponsor.getSponsorResidencyData({ eventSponsorId: eventSponsorB.id }),
      "FORBIDDEN",
    );

    const seeded = await rep.sponsor.createDefaultDeliverables({
      eventSponsorId: eventSponsorA.id,
    });
    expect(seeded).toHaveLength(5);
    expect(
      await rep.sponsor.createDefaultDeliverables({
        eventSponsorId: eventSponsorA.id,
      }),
    ).toEqual([]);
    expect(
      await db.sponsorDeliverable.count({
        where: { eventSponsorId: eventSponsorA.id },
      }),
    ).toBe(5);

    const visit = await rep.sponsor.createVisitRequest({
      ...visitInput,
      eventSponsorId: eventSponsorA.id,
    });
    expect(visit.eventSponsorId).toBe(eventSponsorA.id);
    await expectCode(
      rep.sponsor.createVisitRequest({
        ...visitInput,
        eventSponsorId: eventSponsorB.id,
      }),
      "FORBIDDEN",
    );

    const deliverable = seeded[0];
    expect(deliverable).toBeDefined();
    const flipped = await rep.sponsor.updateDeliverableStatus({
      deliverableId: deliverable?.id ?? "",
      status: "IN_PROGRESS",
    });
    expect(flipped.status).toBe("IN_PROGRESS");
    await expectCode(
      impostor.sponsor.updateDeliverableStatus({
        deliverableId: deliverable?.id ?? "",
        status: "COMPLETED",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      rep.sponsor.updateVisitRequestStatus({
        visitRequestId: visit.id,
        status: "APPROVED",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      rep.sponsor.createDeliverable({
        eventSponsorId: eventSponsorA.id,
        category: "TECHNICAL",
        title: "Workshop",
        description: "A workshop",
      }),
      "FORBIDDEN",
    );

    // Staff: everything, on any event.
    expect(
      (
        await staff.sponsor.getSponsorResidencyData({
          eventSponsorId: eventSponsorB.id,
        })
      )?.id,
    ).toBe(eventSponsorB.id);
    const created = await staff.sponsor.createSponsor({
      name: `Staff-made sponsor ${tag}`,
    });
    expect(created.name).toBe(`Staff-made sponsor ${tag}`);
    const approved = await staff.sponsor.updateVisitRequestStatus({
      visitRequestId: visit.id,
      status: "APPROVED",
    });
    expect(approved.status).toBe("APPROVED");
    const extra = await staff.sponsor.createDeliverable({
      eventSponsorId: eventSponsorB.id,
      category: "SUPPORT",
      title: "Templates",
      description: "Starter templates",
    });
    expect(extra.eventSponsorId).toBe(eventSponsorB.id);

    // Public hyperboard: pinned shape, no contacts.
    const board = await createTestCaller(null).sponsor.getSponsorsForHyperboard(
      {
        eventId: eventA.id,
      },
    );
    expect(board.map((s) => s.id)).toContain(sponsorA.id);
    expect(JSON.stringify(board)).not.toContain("contacts");
  });
});

// ── metric.ts ───────────────────────────────────────────────────────────

describe("Security: metric router", () => {
  it("writes are gated by project ownership / edit rights / staff; public reads carry no creator email", async () => {
    const db = getTestDb();
    const tag = token();
    const ownerUser = await createTestUser({ role: "user" }, db);
    const editorUser = await createTestUser({ role: "user" }, db);
    const viewerUser = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const demotedUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const ownerProfile = await createProfile(ownerUser.id);
    const project = await createProject(ownerProfile.id, `Project ${tag}`);
    await db.projectCollaborator.create({
      data: { projectId: project.id, userId: editorUser.id, canEdit: true },
    });
    await db.projectCollaborator.create({
      data: { projectId: project.id, userId: viewerUser.id, canEdit: false },
    });
    const metric = await db.metric.create({
      data: {
        name: `Metric ${tag}`,
        slug: `metric-${tag}`,
        metricType: ["CUSTOM"],
        collectionMethod: "MANUAL",
        createdBy: staffUser.id,
      },
    });

    const anonymous = createTestCaller(null);
    const impostor = createTestCaller("user", { id: impostorUser.id });
    const owner = createTestCaller("user", { id: ownerUser.id });
    const editor = createTestCaller("user", { id: editorUser.id });
    const viewer = createTestCaller("user", { id: viewerUser.id });
    const demoted = createTestCaller("admin", { id: demotedUser.id });
    const staff = createTestCaller("staff", { id: staffUser.id });

    const measurement = {
      metricId: metric.id,
      value: 42,
      unitOfMetric: "count",
      measurementDate: new Date(),
      timePeriod: "DURING" as const,
    };
    const createInput = {
      name: `Custom ${tag}`,
      metricType: ["CUSTOM" as const],
      collectionMethod: "SELF_REPORTING" as const,
    };

    // Impostor (no project) and a demoted admin token: nothing.
    await expectCode(impostor.metric.create(createInput), "FORBIDDEN");
    await expectCode(
      impostor.metric.addToProject({
        metricId: metric.id,
        projectId: project.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.metric.removeFromProject({
        metricId: metric.id,
        projectId: project.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.metric.recordMeasurement({
        ...measurement,
        projectId: project.id,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.metric.recordMeasurement(measurement),
      "FORBIDDEN",
    );
    await expectCode(
      impostor.metric.update({ id: metric.id, name: "Renamed" }),
      "FORBIDDEN",
    );
    await expectCode(impostor.metric.delete({ id: metric.id }), "FORBIDDEN");
    await expectCode(
      impostor.metric.suggestMetrics({ projectId: project.id }),
      "FORBIDDEN",
    );
    await expectCode(
      demoted.metric.update({ id: metric.id, name: "Renamed" }),
      "FORBIDDEN",
    );
    await expectCode(
      demoted.metric.addToProject({
        metricId: metric.id,
        projectId: project.id,
      }),
      "FORBIDDEN",
    );
    // A collaborator without canEdit is not an editor.
    await expectCode(
      viewer.metric.addToProject({
        metricId: metric.id,
        projectId: project.id,
      }),
      "FORBIDDEN",
    );
    expect(
      await db.projectMetric.count({ where: { projectId: project.id } }),
    ).toBe(0);
    expect(
      await db.metricMeasurement.count({ where: { metricId: metric.id } }),
    ).toBe(0);

    // Owner / canEdit collaborator.
    const custom = await owner.metric.create(createInput);
    expect(custom.createdBy).toBe(ownerUser.id);
    const link = await owner.metric.addToProject({
      metricId: metric.id,
      projectId: project.id,
    });
    expect(link.projectId).toBe(project.id);
    const recorded = await owner.metric.recordMeasurement({
      ...measurement,
      projectId: project.id,
    });
    expect(recorded.measuredBy).toBe(ownerUser.id);
    expect(
      await editor.metric.removeFromProject({
        metricId: metric.id,
        projectId: project.id,
      }),
    ).toEqual({ success: true });

    // Anonymous reads: no creator email.
    const listed = await anonymous.metric.list({ search: tag });
    expect(listed.metrics.map((m) => m.id)).toContain(metric.id);
    for (const row of listed.metrics) {
      expect(hasKey(row.creator, "email")).toBe(false);
    }
    const byId = await anonymous.metric.getById({ id: metric.id });
    expect(hasKey(byId.creator, "email")).toBe(false);
    expect(JSON.stringify([listed, byId])).not.toContain(
      staffUser.email ?? "@@never@@",
    );

    // Staff: unscoped measurement, update, delete.
    const unscoped = await staff.metric.recordMeasurement(measurement);
    expect(unscoped.measuredBy).toBe(staffUser.id);
    const renamed = await staff.metric.update({
      id: metric.id,
      name: `Renamed ${tag}`,
    });
    expect(renamed.name).toBe(`Renamed ${tag}`);
    await staff.metric.delete({ id: metric.id });
    expect(
      (await db.metric.findUnique({ where: { id: metric.id } }))?.isActive,
    ).toBe(false);
  });

  it("recordMeasurement: an eventId tag is staff-only, even for the project's owner", async () => {
    const db = getTestDb();
    const tag = token();
    const ownerUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const event = await createTestEvent({}, db);
    const ownerProfile = await createProfile(ownerUser.id);
    const project = await createProject(ownerProfile.id, `Project ${tag}`);
    const metric = await db.metric.create({
      data: {
        name: `Metric ${tag}`,
        slug: `metric-${tag}`,
        metricType: ["CUSTOM"],
        collectionMethod: "MANUAL",
        createdBy: staffUser.id,
      },
    });
    const measurement = {
      metricId: metric.id,
      value: 7,
      unitOfMetric: "count",
      measurementDate: new Date(),
      timePeriod: "DURING" as const,
    };

    await expectCode(
      createTestCaller("user", { id: ownerUser.id }).metric.recordMeasurement({
        ...measurement,
        projectId: project.id,
        eventId: event.id,
      }),
      "FORBIDDEN",
    );
    expect(
      await db.metricMeasurement.count({ where: { metricId: metric.id } }),
    ).toBe(0);

    const tagged = await createTestCaller("staff", {
      id: staffUser.id,
    }).metric.recordMeasurement({ ...measurement, eventId: event.id });
    expect(tagged.eventId).toBe(event.id);
  });
});

// ── schedule.ts ─────────────────────────────────────────────────────────

describe("Security: schedule public agenda", () => {
  it("nulls speaker emails except for staff and that event's floor leads", async () => {
    const db = getTestDb();
    const event = await createTestEvent({}, db);
    const otherEvent = await createTestEvent({}, db);
    const floorLead = await createTestUser({ role: "user" }, db);
    const otherLead = await createTestUser({ role: "user" }, db);
    const speaker = await createTestUser(
      { role: "user", name: "Sam Speaker" },
      db,
    );
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    await createTestVenue(
      { eventId: event.id, name: "Main Hall", ownerUserId: floorLead.id },
      db,
    );
    await createTestVenue(
      { eventId: otherEvent.id, name: "Other Hall", ownerUserId: otherLead.id },
      db,
    );
    const session = await db.scheduleSession.create({
      data: {
        eventId: event.id,
        title: "Opening talk",
        startTime: new Date(event.startDate.getTime() + 60 * 60 * 1000),
        endTime: new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000),
        speakers: [],
        isPublished: true,
      },
    });
    await db.sessionSpeaker.create({
      data: { sessionId: session.id, userId: speaker.id },
    });

    const speakerEmail = async (
      caller: ReturnType<typeof createTestCaller>,
    ) => {
      const { sessions } = await caller.schedule.getEventSchedule({
        eventId: event.id,
      });
      const row = sessions.find((s) => s.id === session.id);
      expect(row).toBeDefined();
      const user = row?.sessionSpeakers[0]?.user;
      expect(user?.name).toBe("Sam Speaker");
      expect(hasKey(user, "email")).toBe(true);
      return user?.email;
    };

    expect(await speakerEmail(createTestCaller(null))).toBeNull();
    expect(
      await speakerEmail(createTestCaller("user", { id: impostorUser.id })),
    ).toBeNull();
    expect(
      await speakerEmail(createTestCaller("user", { id: otherLead.id })),
    ).toBeNull();
    expect(
      await speakerEmail(createTestCaller("user", { id: floorLead.id })),
    ).toBe(speaker.email);
    expect(
      await speakerEmail(createTestCaller("staff", { id: staffUser.id })),
    ).toBe(speaker.email);

    const asAnonymous = await createTestCaller(null).schedule.getSession({
      sessionId: session.id,
    });
    expect(asAnonymous.sessionSpeakers[0]?.user.email).toBeNull();
    const asStaff = await createTestCaller("staff", {
      id: staffUser.id,
    }).schedule.getSession({ sessionId: session.id });
    expect(asStaff.sessionSpeakers[0]?.user.email).toBe(speaker.email);
  });

  it("fuzzyMatchSpeakers is reachable only by admin/staff or a floor lead of that event", async () => {
    const db = getTestDb();
    const tag = token();
    const event = await createTestEvent({}, db);
    const otherEvent = await createTestEvent({}, db);
    const floorLead = await createTestUser({ role: "user" }, db);
    const otherLead = await createTestUser({ role: "user" }, db);
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const applicantEmail = `applicant-${tag}@test.com`;
    const applicant = await createTestUser(
      { role: "user", email: applicantEmail },
      db,
    );
    await db.user.update({
      where: { id: applicant.id },
      data: { firstName: `Sam${tag}`, surname: "Speaker" },
    });
    await createTestApplication(
      {
        userId: applicant.id,
        eventId: event.id,
        email: applicantEmail,
        status: "SUBMITTED",
        applicationType: "SPEAKER",
      },
      db,
    );
    await createTestVenue(
      { eventId: event.id, name: "Main Hall", ownerUserId: floorLead.id },
      db,
    );
    await createTestVenue(
      { eventId: otherEvent.id, name: "Other Hall", ownerUserId: otherLead.id },
      db,
    );
    const name = `Sam${tag} Speaker`;
    const input = {
      eventId: event.id,
      names: [name],
      emails: { [name]: applicantEmail },
    };

    await expectCode(
      createTestCaller(null).schedule.fuzzyMatchSpeakers(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      createTestCaller("user", {
        id: impostorUser.id,
      }).schedule.fuzzyMatchSpeakers(input),
      "FORBIDDEN",
    );
    await expectCode(
      createTestCaller("user", {
        id: otherLead.id,
      }).schedule.fuzzyMatchSpeakers(input),
      "FORBIDDEN",
    );

    const asFloorLead = await createTestCaller("user", {
      id: floorLead.id,
    }).schedule.fuzzyMatchSpeakers(input);
    expect(asFloorLead[name]?.[0]).toMatchObject({
      userId: applicant.id,
      email: applicantEmail,
      confidence: "exact",
    });
    const asStaff = await createTestCaller("staff", {
      id: staffUser.id,
    }).schedule.fuzzyMatchSpeakers(input);
    expect(asStaff[name]?.[0]?.userId).toBe(applicant.id);
  });
});

// ── event.ts ────────────────────────────────────────────────────────────

describe("Security: event router sponsor contacts", () => {
  it("getEvent / getEvents empty sponsor.contacts for anonymous and members, keep them for admin/staff", async () => {
    const db = getTestDb();
    const tag = token();
    const event = await createTestEvent({}, db);
    const sponsor = await db.sponsor.create({
      data: { name: `Sponsor ${tag}` },
    });
    const contactEmail = `crm-${tag}@test.com`;
    await db.contact.create({
      data: {
        firstName: "Casey",
        lastName: "Contact",
        email: contactEmail,
        phone: "+1 555 0199",
        sponsorId: sponsor.id,
      },
    });
    await db.eventSponsor.create({
      data: { eventId: event.id, sponsorId: sponsor.id },
    });
    const impostorUser = await createTestUser({ role: "user" }, db);
    const adminUser = await createTestUser({ role: "admin" }, db);

    for (const caller of [
      createTestCaller(null),
      createTestCaller("user", { id: impostorUser.id }),
    ]) {
      const result = await caller.event.getEvent({ id: event.id });
      expect(result?.sponsors[0]?.sponsor.contacts).toEqual([]);
      expect(JSON.stringify(result)).not.toContain(contactEmail);

      const list = await caller.event.getEvents();
      const row = list.find((e) => e.id === event.id);
      expect(row?.sponsors[0]?.sponsor.contacts).toEqual([]);
    }

    const admin = createTestCaller("admin", { id: adminUser.id });
    const asAdmin = await admin.event.getEvent({ id: event.id });
    expect(asAdmin?.sponsors[0]?.sponsor.contacts[0]?.email).toBe(contactEmail);
    const adminList = await admin.event.getEvents();
    expect(
      adminList.find((e) => e.id === event.id)?.sponsors[0]?.sponsor.contacts,
    ).toHaveLength(1);
  });
});

// ── application.ts ──────────────────────────────────────────────────────

describe("Security: application.getResidentProjects", () => {
  it("returns no email, password hash or admin fields to anonymous callers", async () => {
    const db = getTestDb();
    const event = await createTestEvent({}, db);
    const resident = await createTestUser({ role: "user" }, db);
    const fakeHash = "$2a$10$unit-test-fake-password-hash";
    await db.user.update({
      where: { id: resident.id },
      data: { password: fakeHash, adminNotes: "internal admin note" },
    });
    const profile = await createProfile(resident.id);
    const project = await createProject(profile.id, "Resident project");
    await createTestApplication(
      {
        userId: resident.id,
        eventId: event.id,
        email: resident.email ?? "resident@test.com",
        status: "ACCEPTED",
        applicationType: "RESIDENT",
      },
      db,
    );

    const result = await createTestCaller(null).application.getResidentProjects(
      {
        eventId: event.id,
      },
    );
    const row = result.find((p) => p.id === project.id);
    expect(row).toBeDefined();
    expect(hasKey(row?.profile.user, "email")).toBe(false);
    expect(hasKey(row?.profile.user, "password")).toBe(false);
    expect(hasKey(row?.profile.user, "adminNotes")).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(fakeHash);
    expect(serialized).not.toContain("internal admin note");
    expect(serialized).not.toContain(resident.email ?? "@@never@@");
  });
});

// ── user.ts ─────────────────────────────────────────────────────────────

describe("Security: user.searchUsers", () => {
  it("members search by name only and never receive emails; staff and floor leads keep email search", async () => {
    const db = getTestDb();
    const tag = token();
    const victimEmail = `victim-${tag}@test.com`;
    const victim = await createTestUser(
      { role: "user", email: victimEmail },
      db,
    );
    await db.user.update({
      where: { id: victim.id },
      data: { firstName: `Victoria${tag}`, surname: "Target" },
    });
    const impostorUser = await createTestUser({ role: "user" }, db);
    const staffUser = await createTestUser({ role: "staff" }, db);
    const floorLead = await createTestUser({ role: "user" }, db);
    const event = await createTestEvent({}, db);
    await createTestVenue(
      { eventId: event.id, name: "Lead Hall", ownerUserId: floorLead.id },
      db,
    );

    await expectCode(
      createTestCaller(null).user.searchUsers({ query: tag }),
      "UNAUTHORIZED",
    );

    const impostor = createTestCaller("user", { id: impostorUser.id });
    expect(await impostor.user.searchUsers({ query: victimEmail })).toEqual([]);
    const byName = await impostor.user.searchUsers({ query: `Victoria${tag}` });
    expect(byName.map((u) => u.id)).toContain(victim.id);
    for (const user of byName) {
      expect(hasKey(user, "email")).toBe(true);
      expect(user.email).toBeNull();
    }

    const asStaff = await createTestCaller("staff", {
      id: staffUser.id,
    }).user.searchUsers({ query: victimEmail });
    expect(asStaff.find((u) => u.id === victim.id)?.email).toBe(victimEmail);

    const asFloorLead = await createTestCaller("user", {
      id: floorLead.id,
    }).user.searchUsers({ query: victimEmail });
    expect(asFloorLead.find((u) => u.id === victim.id)?.email).toBe(
      victimEmail,
    );

    // A floor lead of an event that has already ended is just a member here.
    const pastLead = await createTestUser({ role: "user" }, db);
    const pastEvent = await createTestEvent(
      {
        startDate: new Date("2020-01-01T00:00:00Z"),
        endDate: new Date("2020-01-03T00:00:00Z"),
      },
      db,
    );
    await createTestVenue(
      { eventId: pastEvent.id, name: "Past Hall", ownerUserId: pastLead.id },
      db,
    );
    const asPastLead = createTestCaller("user", { id: pastLead.id });
    expect(await asPastLead.user.searchUsers({ query: victimEmail })).toEqual(
      [],
    );
    expect(
      (await asPastLead.user.searchUsers({ query: `Victoria${tag}` })).find(
        (u) => u.id === victim.id,
      )?.email,
    ).toBeNull();
  });
});

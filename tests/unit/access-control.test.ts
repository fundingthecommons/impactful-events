/**
 * Access-control unit tests for the security PR (2026-10-21).
 *
 * Runs with NO database. Every router is exercised through a real tRPC caller
 * built with createCallerFactory and the real procedure builders from
 * src/server/api/trpc.ts, so the protectedProcedure / adminOrStaffProcedure
 * middleware (including its DB role re-check) runs for real against a mocked,
 * Prisma-shaped ctx.db made of vi.fn() stubs.
 *
 * The principle under test (from the August audit): a session is NOT a trust
 * boundary — anyone can self-register — so every gate must hold for a
 * logged-in non-owner exactly as it does for an anonymous caller.
 *
 * Viewer personas:
 *   anonymous — session null
 *   impostor  — self-registered ordinary member, id "impostor", role "user"
 *   owner     — the user who owns the profile / project under test
 *   staff / admin — privileged; the DB role matches the JWT role
 *   demoted   — JWT says "admin", DB says "user" (a stale token after a demotion)
 *
 * The October fixes add coverage for the magic-link signIn callback, the
 * register route, validateApiKey, the telegramAuth / praise / onboarding
 * routers, the fuzzyMatchSpeakers gate, the metric eventId rule and a static
 * guard over every email-selecting protectedProcedure.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

// ── Hoisted state + module mocks (run before any import below) ───────────

const { dbHolder } = vi.hoisted(() => {
  // trpc.ts reads NODE_ENV once, at import time, to decide whether the timing
  // middleware adds 100–500ms of fake latency to every procedure call. That is
  // pure waste here, so the module graph is loaded as "production" and the
  // value is restored to "test" in beforeAll before any test runs. Nothing
  // else in the graph reads NODE_ENV at import time (db/auth/Sentry are
  // mocked below; env validation is skipped by tests/helpers/unitSetup.ts).
  (process.env as Record<string, string>).NODE_ENV = "production";
  return { dbHolder: { current: null as unknown as Record<string, unknown> } };
});

// ~/server/db would try to construct a PrismaClient from env.DATABASE_URL at
// import time. acceptPendingInvitations imports `db` from it directly, so the
// mock delegates to whichever mock db the current test installed.
vi.mock("~/server/db", () => ({
  db: new Proxy(
    {},
    { get: (_target, prop) => dbHolder.current[prop as string] },
  ),
}));
vi.mock("~/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  startSpan: vi.fn(
    (
      _opts: Record<string, unknown>,
      fn: (span: Record<string, unknown>) => unknown,
    ) => fn({ setAttribute: vi.fn() }),
  ),
  setUser: vi.fn(),
  withScope: vi.fn((fn: (scope: Record<string, unknown>) => unknown) =>
    fn({ setExtra: vi.fn(), setTag: vi.fn() }),
  ),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  },
}));
// Heavy third-party SDKs imported by contact.ts / event.ts / the AI services;
// none is reached by the gates under test.
vi.mock("postmark", () => ({ ServerClient: vi.fn() }));
vi.mock("openai", () => ({ default: vi.fn() }));
vi.mock("googleapis", () => ({ google: {} }));
vi.mock("@notionhq/client", () => ({ Client: vi.fn() }));
vi.mock("telegram", () => ({
  TelegramClient: vi.fn(),
  sessions: { StringSession: vi.fn() },
  Api: {},
}));
vi.mock("~/server/email/emailService", () => ({
  getEmailService: vi.fn(),
  EmailService: vi.fn(),
}));
vi.mock("~/server/services/aiEvaluation", () => ({
  getAIEvaluationService: vi.fn(),
}));
vi.mock("~/server/services/aiMetricSuggestion", () => ({
  getAIMetricSuggestionService: () => ({
    suggestMetrics: vi.fn().mockResolvedValue({ suggestions: [] }),
  }),
}));
// tests/helpers/unitSetup.ts already stubs next/server with bare vi.fn()s;
// the webhook tests need NextResponse.json to hand back the status code.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
    redirect: vi.fn(),
  },
  NextRequest: vi.fn(),
}));
// validateApiKey.ts reads env.MASTRA_API_KEY / env.TRANSCRIPTION_API_KEY from
// ~/env, which under SKIP_ENV_VALIDATION is a plain snapshot of process.env
// taken at import time. Serving it live lets vi.stubEnv drive those tests the
// same way the webhook tests drive TELEGRAM_WEBHOOK_SECRET.
vi.mock("~/env", () => ({
  env: new Proxy({}, { get: (_target, prop) => process.env[prop as string] }),
}));
// bcrypt at 12 rounds costs ~300ms per hash; the register route's new-user
// branch only needs *a* hash to store. validatePassword stays real.
vi.mock("~/utils/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/utils/password")>()),
  hashPassword: vi.fn(async () => "$2a$12$unit-test-fake-password-hash"),
}));

import { POST as registerPost } from "~/app/api/auth/register/route";
import { POST as webhookPost } from "~/app/api/telegram/webhook/route";
import { applicationRouter } from "~/server/api/routers/application";
import { askOfferRouter } from "~/server/api/routers/askOffer";
import { contactRouter } from "~/server/api/routers/contact";
import { evaluationRouter } from "~/server/api/routers/evaluation";
import { eventRouter } from "~/server/api/routers/event";
import { forumRouter } from "~/server/api/routers/forum";
import { invitationRouter } from "~/server/api/routers/invitation";
import { kudosRouter } from "~/server/api/routers/kudos";
import { metricRouter } from "~/server/api/routers/metric";
import { onboardingRouter } from "~/server/api/routers/onboarding";
import { praiseRouter } from "~/server/api/routers/praise";
import { profileRouter } from "~/server/api/routers/profile";
import { projectRouter } from "~/server/api/routers/project";
import { roleRouter } from "~/server/api/routers/role";
import { scheduleRouter } from "~/server/api/routers/schedule";
import { sponsorRouter } from "~/server/api/routers/sponsor";
import { telegramAuthRouter } from "~/server/api/routers/telegramAuth";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { PRIVATE_PROFILE_FIELDS } from "~/server/api/utils/profilePrivacy";
import { acceptPendingInvitations } from "~/server/auth/acceptInvitations";
import { authConfig } from "~/server/auth/config";
import {
  validateMastraApiKey,
  validateTranscriptionApiKey,
} from "~/utils/validateApiKey";

// ── Mock Prisma client ──────────────────────────────────────────────────

interface ModelStub {
  findMany: Mock;
  findUnique: Mock;
  findFirst: Mock;
  count: Mock;
  groupBy: Mock;
  create: Mock;
  createMany: Mock;
  update: Mock;
  updateMany: Mock;
  upsert: Mock;
  delete: Mock;
  deleteMany: Mock;
}

// A mapped type over named keys (not an index signature) so that, under
// noUncheckedIndexedAccess, `db.user` is a ModelStub rather than
// `ModelStub | undefined`. The Proxy below serves ANY model name at runtime;
// this list is only the set the tests reach into directly.
type ModelName =
  | "account"
  | "application"
  | "applicationEvaluation"
  | "applicationOnboarding"
  | "askOffer"
  | "contact"
  | "event"
  | "eventSponsor"
  | "forumThread"
  | "globalRole"
  | "invitation"
  | "metric"
  | "metricMeasurement"
  | "praise"
  | "projectMetric"
  | "reviewerAssignment"
  | "role"
  | "scheduleSession"
  | "sponsor"
  | "sponsorDeliverable"
  | "sponsorVisitRequest"
  | "telegramAuth"
  | "user"
  | "userProfile"
  | "userProject"
  | "userRole"
  | "venueOwner";

type MockDb = { [K in ModelName]: ModelStub } & { $queryRaw: Mock };

let seq = 0;

function modelStub(): ModelStub {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
    create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: `created_${++seq}`,
      ...args.data,
    })),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn(
      async (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => ({ ...args.where, ...args.data }),
    ),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn(async (args: { create: Record<string, unknown> }) => ({
      id: `upserted_${++seq}`,
      ...args.create,
    })),
    delete: vi.fn(async (args: { where: Record<string, unknown> }) => ({
      ...args.where,
    })),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
}

/** Lazily creates a stub per Prisma model on first access; `$transaction` runs the callback against the same db. */
function createMockDb(): MockDb {
  const models = new Map<string, ModelStub>();
  // telegramAuth.getSmartLists counts its cohorts with tagged-template raw SQL.
  const queryRaw = vi.fn().mockResolvedValue([{ count: 0 }]);
  const db: MockDb = new Proxy({} as MockDb, {
    get(_target, prop) {
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop === "$queryRaw") return queryRaw;
      if (prop === "$transaction") {
        return (arg: unknown) =>
          typeof arg === "function"
            ? (arg as (tx: MockDb) => unknown)(db)
            : Promise.all(arg as Promise<unknown>[]);
      }
      let stub = models.get(prop);
      if (!stub) {
        stub = modelStub();
        models.set(prop, stub);
      }
      return stub;
    },
  });
  return db;
}

// ── Personas ────────────────────────────────────────────────────────────

const OWNER = "owner";
const COLLAB = "collaborator";
const IMPOSTOR = "impostor";
const STAFF = "staff-1";
const ADMIN = "admin-1";
const DEMOTED = "demoted-admin";
const SPONSOR_REP = "sponsor-rep-a";
const FLOOR_LEAD = "floor-lead-a";

const EVENT_A = "event_a";
const EVENT_B = "event_b";

interface UserRow {
  id: string;
  email: string;
  emailVerified: Date | null;
  role: string;
  name: string;
  firstName: string;
  surname: string;
  image: null;
}

function userRow(id: string, role: string): UserRow {
  return {
    id,
    email: `${id}@example.test`,
    emailVerified: null,
    role,
    name: `User ${id}`,
    firstName: "User",
    surname: id,
    image: null,
  };
}

/** The users table as the DB sees it (DB role, not JWT role). */
const USERS: Record<string, UserRow> = {
  [OWNER]: userRow(OWNER, "user"),
  [COLLAB]: userRow(COLLAB, "user"),
  [IMPOSTOR]: userRow(IMPOSTOR, "user"),
  [STAFF]: userRow(STAFF, "staff"),
  [ADMIN]: userRow(ADMIN, "admin"),
  [DEMOTED]: userRow(DEMOTED, "user"),
  [SPONSOR_REP]: userRow(SPONSOR_REP, "user"),
  [FLOOR_LEAD]: userRow(FLOOR_LEAD, "user"),
};

function session(id: string, role: string): Session {
  return {
    user: {
      id,
      role,
      name: `User ${id}`,
      email: `${id}@example.test`,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

const anonymous = null;
const impostor = session(IMPOSTOR, "user");
const owner = session(OWNER, "user");
const collaborator = session(COLLAB, "user");
const staff = session(STAFF, "staff");
const admin = session(ADMIN, "admin");
const demotedAdmin = session(DEMOTED, "admin");
const sponsorRepA = session(SPONSOR_REP, "user");
const floorLeadA = session(FLOOR_LEAD, "user");

// ── Caller + helpers ────────────────────────────────────────────────────

const testRouter = createTRPCRouter({
  application: applicationRouter,
  askOffer: askOfferRouter,
  contact: contactRouter,
  evaluation: evaluationRouter,
  event: eventRouter,
  forum: forumRouter,
  invitation: invitationRouter,
  kudos: kudosRouter,
  metric: metricRouter,
  onboarding: onboardingRouter,
  praise: praiseRouter,
  profile: profileRouter,
  project: projectRouter,
  role: roleRouter,
  schedule: scheduleRouter,
  sponsor: sponsorRouter,
  telegramAuth: telegramAuthRouter,
  user: userRouter,
});
const createCaller = createCallerFactory(testRouter);

let db: MockDb;

function callerAs(viewer: Session | null) {
  return createCaller({
    db: db as unknown as PrismaClient,
    session: viewer,
    headers: new Headers(),
  });
}

function seedUsers(target: MockDb) {
  target.user.findUnique.mockImplementation(
    async (args: { where: { id?: string; email?: string } }) => {
      if (args.where.id) return USERS[args.where.id] ?? null;
      if (args.where.email) {
        return (
          Object.values(USERS).find((u) => u.email === args.where.email) ?? null
        );
      }
      return null;
    },
  );
}

/** Grants `userId` the per-event `sponsor` UserRole on `eventId` (what assertSponsorAccessForEvent looks up). */
function grantSponsorRole(target: MockDb, userId: string, eventId: string) {
  target.userRole.findFirst.mockImplementation(
    async (args: {
      where: { userId?: string; eventId?: string; role?: { name?: string } };
    }) =>
      args.where.userId === userId &&
      args.where.eventId === eventId &&
      args.where.role?.name === "sponsor"
        ? { id: "user_role_sponsor" }
        : null,
  );
}

/**
 * Makes `userId` a venue owner (floor lead) of `eventId`. The event ends at
 * `eventEndsAt` (default: next week) for the callers that filter on it
 * (user.searchUsers only honours a floor lead of an event that has not ended).
 */
function grantFloorLead(
  target: MockDb,
  userId: string,
  eventId: string,
  eventEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
) {
  target.venueOwner.findFirst.mockImplementation(
    async (args: {
      where: {
        userId?: string;
        eventId?: string;
        event?: { endDate?: { gte?: Date } };
      };
    }) => {
      const notEndedSince = args.where.event?.endDate?.gte;
      if (notEndedSince && eventEndsAt < notEndedSince) return null;
      return args.where.userId === userId &&
        (args.where.eventId === undefined || args.where.eventId === eventId)
        ? { id: "venue_owner_1", userId, eventId, venueId: "venue_1" }
        : null;
    },
  );
}

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

function firstArg(stub: Mock, call = 0): Record<string, unknown> {
  const args = stub.mock.calls[call];
  expect(args, `expected call #${call} on the stub`).toBeDefined();
  return (args?.[0] ?? {}) as Record<string, unknown>;
}

function pick(value: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

function first<T>(items: readonly T[]): T {
  const item = items[0];
  expect(item, "expected at least one item").toBeDefined();
  return item as T;
}

function hasKey(value: unknown, key: string): boolean {
  return !!value && typeof value === "object" && key in value;
}

// ── Fixtures ────────────────────────────────────────────────────────────

const PRIVATE_VALUES = {
  phoneNumber: "+1 555 0100",
  telegramHandle: "@owner-handle",
  telegramChatId: "987654321",
  discordHandle: "owner#0001",
  speakerCoHostInfo: "cohost@example.test",
  priorExperience: "copied from the application form",
  mentorPreferredContact: "telegram dm",
} as const;

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile_owner",
    userId: OWNER,
    bio: "Public bio",
    jobTitle: "Engineer",
    company: "ACME",
    location: "Lisbon",
    website: null,
    githubUrl: "https://github.com/owner",
    linkedinUrl: null,
    twitterUrl: null,
    blueskyUrl: null,
    avatarUrl: null,
    skills: [],
    interests: [],
    languages: [],
    isPublic: true,
    availableForMentoring: false,
    availableForHiring: false,
    availableForOfficeHours: false,
    timezone: null,
    yearsOfExperience: null,
    ...PRIVATE_VALUES,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function expectPrivateFieldsNull(profile: unknown) {
  for (const field of PRIVATE_PROFILE_FIELDS) {
    expect(pick(profile, field), field).toBeNull();
  }
}

function expectPrivateFieldsKept(profile: unknown) {
  for (const field of PRIVATE_PROFILE_FIELDS) {
    expect(pick(profile, field), field).toBe(PRIVATE_VALUES[field]);
  }
}

function expectNoPrivateValues(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const [field, secret] of Object.entries(PRIVATE_VALUES)) {
    expect(serialized, field).not.toContain(secret);
  }
}

const ownerUser = { id: OWNER, name: "User owner", image: null };

/** A pending GLOBAL_ADMIN invitation addressed to the impostor's email. */
const globalAdminInvitation = {
  id: "inv_admin",
  type: "GLOBAL_ADMIN",
  email: `${IMPOSTOR}@example.test`,
  eventId: null,
  roleId: null,
  globalRole: "admin",
  venueId: null,
  invitedBy: ADMIN,
  event: null,
  role: null,
};

function projectDetailsRow(
  opts: { ownerIsPublic?: boolean; collabIsPublic?: boolean } = {},
) {
  return {
    id: "project_1",
    title: "Project One",
    description: "A project",
    githubUrl: null,
    liveUrl: null,
    imageUrl: null,
    bannerUrl: null,
    technologies: [],
    focusAreas: [],
    featured: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    repositories: [],
    profile: {
      ...profileRow({ isPublic: opts.ownerIsPublic ?? true }),
      user: ownerUser,
    },
    collaborators: [
      {
        id: "collab_row_1",
        role: "member",
        canEdit: true,
        addedAt: new Date("2026-01-02T00:00:00Z"),
        user: {
          id: COLLAB,
          name: "User collaborator",
          image: null,
          profile: {
            jobTitle: "Designer",
            company: "Studio",
            location: "Berlin",
            bio: "Collaborator bio",
            isPublic: opts.collabIsPublic ?? true,
          },
        },
      },
    ],
    likes: [],
  };
}

const EVENT_SPONSOR_A = "event_sponsor_a";
const EVENT_SPONSOR_B = "event_sponsor_b";
const DELIVERABLE_A = "deliverable_a";

function seedSponsorRows(target: MockDb) {
  target.eventSponsor.findUnique.mockImplementation(
    async (args: { where: { id?: string } }) => {
      if (args.where.id === EVENT_SPONSOR_A) {
        return {
          id: EVENT_SPONSOR_A,
          eventId: EVENT_A,
          sponsorId: "sponsor_a",
          qualified: true,
          sponsor: { id: "sponsor_a", name: "Sponsor A" },
          event: { id: EVENT_A, name: "Event A" },
          visitRequests: [{ id: "visit_1", notes: "staff-only notes" }],
          deliverables: [],
        };
      }
      if (args.where.id === EVENT_SPONSOR_B) {
        return {
          id: EVENT_SPONSOR_B,
          eventId: EVENT_B,
          sponsorId: "sponsor_b",
          qualified: false,
          sponsor: { id: "sponsor_b", name: "Sponsor B" },
          event: { id: EVENT_B, name: "Event B" },
          visitRequests: [],
          deliverables: [],
        };
      }
      return null;
    },
  );
  target.sponsorDeliverable.findUnique.mockImplementation(
    async (args: { where: { id?: string } }) =>
      args.where.id === DELIVERABLE_A
        ? { id: DELIVERABLE_A, eventSponsor: { eventId: EVENT_A } }
        : null,
  );
}

const PROJECT_1 = "project_1";
const METRIC_1 = "metric_1";

function seedMetricRows(target: MockDb) {
  // UserProject lookups: the owner is OWNER; COLLAB is a canEdit
  // collaborator (assertCanEditProject filters collaborators in the select).
  target.userProject.findUnique.mockImplementation(
    async (args: {
      where: { id?: string };
      select?: {
        collaborators?: { where?: { userId?: string; canEdit?: boolean } };
      };
    }) => {
      if (args.where.id !== PROJECT_1) return null;
      const collabWhere = args.select?.collaborators?.where;
      return {
        id: PROJECT_1,
        title: "Project One",
        description: "A project",
        technologies: [],
        updates: [],
        profile: { userId: OWNER },
        collaborators:
          collabWhere?.userId === COLLAB && collabWhere.canEdit === true
            ? [{ id: "collab_row_1" }]
            : [],
      };
    },
  );
  target.metric.findUnique.mockImplementation(
    async (args: { where: { id?: string; slug?: string } }) =>
      args.where.id === METRIC_1
        ? {
            id: METRIC_1,
            slug: "metric-one",
            name: "Metric One",
            isActive: true,
            unitOfMetric: "count",
          }
        : null,
  );
}

const speakerUser = {
  id: "speaker_1",
  firstName: "Sam",
  surname: "Speaker",
  name: "Sam Speaker",
  email: "speaker@example.test",
  image: null,
  profile: { company: "Talks Inc", bio: null, jobTitle: null, avatarUrl: null },
};

function scheduleSessionRow() {
  return {
    id: "session_1",
    eventId: EVENT_A,
    title: "Opening talk",
    description: null,
    startTime: new Date("2026-11-01T10:00:00Z"),
    endTime: new Date("2026-11-01T11:00:00Z"),
    isPublished: true,
    venue: null,
    room: null,
    sessionType: null,
    track: null,
    event: { id: EVENT_A, name: "Event A", slug: "event-a" },
    sessionSpeakers: [
      { id: "session_speaker_1", role: "Speaker", order: 0, user: speakerUser },
    ],
  };
}

const eventSelectRow = {
  id: EVENT_A,
  name: "Event A",
  slug: "event-a",
  startDate: new Date("2026-11-01T00:00:00Z"),
  endDate: new Date("2026-11-03T00:00:00Z"),
  type: "CONFERENCE",
  lumaEventId: null,
};

function eventWithSponsorContacts() {
  return {
    ...eventSelectRow,
    description: null,
    location: null,
    sponsors: [
      {
        id: EVENT_SPONSOR_A,
        eventId: EVENT_A,
        sponsorId: "sponsor_a",
        qualified: true,
        sponsor: {
          id: "sponsor_a",
          name: "Sponsor A",
          websiteUrl: null,
          logoUrl: null,
          contacts: [
            {
              id: "contact_1",
              firstName: "Casey",
              lastName: "Contact",
              email: "crm-contact@example.test",
              phone: "+1 555 0199",
              sponsorId: "sponsor_a",
            },
          ],
        },
      },
    ],
    _count: { applications: 0, sponsors: 1 },
  };
}

// ── Lifecycle ───────────────────────────────────────────────────────────

beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = "test";
  // Silence the per-call "[TRPC] path took Nms" timing log.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

beforeEach(() => {
  db = createMockDb();
  dbHolder.current = db;
  seedUsers(db);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── evaluation.ts ───────────────────────────────────────────────────────

describe("evaluation router (August fix: admin/staff only)", () => {
  it("getEvaluation: anonymous UNAUTHORIZED, impostor FORBIDDEN, staff allowed", async () => {
    const input = { applicationId: "app_1", stage: "SCREENING" as const };
    await expectCode(
      callerAs(anonymous).evaluation.getEvaluation(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).evaluation.getEvaluation(input),
      "FORBIDDEN",
    );
    expect(db.applicationEvaluation.findUnique).not.toHaveBeenCalled();

    await expect(
      callerAs(staff).evaluation.getEvaluation(input),
    ).resolves.toBeNull();
    expect(db.applicationEvaluation.findUnique).toHaveBeenCalledTimes(1);
  });

  it("getAvailableApplications: anonymous UNAUTHORIZED, impostor FORBIDDEN, admin allowed", async () => {
    await expectCode(
      callerAs(anonymous).evaluation.getAvailableApplications(),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).evaluation.getAvailableApplications(),
      "FORBIDDEN",
    );
    expect(db.application.findMany).not.toHaveBeenCalled();

    await expect(
      callerAs(admin).evaluation.getAvailableApplications(),
    ).resolves.toEqual([]);
  });

  it("selfAssignToApplication: anonymous UNAUTHORIZED, impostor FORBIDDEN, staff allowed", async () => {
    const input = { applicationId: "app_1" };
    await expectCode(
      callerAs(anonymous).evaluation.selfAssignToApplication(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).evaluation.selfAssignToApplication(input),
      "FORBIDDEN",
    );
    expect(db.reviewerAssignment.create).not.toHaveBeenCalled();

    db.application.findUnique.mockResolvedValue({
      id: "app_1",
      status: "SUBMITTED",
      user: { name: "Applicant", email: "applicant@example.test" },
      event: { name: "Event A" },
    });
    const result =
      await callerAs(staff).evaluation.selfAssignToApplication(input);
    expect(result.assignment).toBeDefined();
    expect(
      pick(firstArg(db.reviewerAssignment.create), "data.reviewerId"),
    ).toBe(STAFF);
  });
});

// ── invitation.ts + acceptPendingInvitations ────────────────────────────

describe("invitation.accept (August fix: caller identity only)", () => {
  it("anonymous is UNAUTHORIZED (was a publicProcedure)", async () => {
    await expectCode(
      callerAs(anonymous).invitation.accept({
        email: "victim@example.test",
        userId: "victim",
      }),
      "UNAUTHORIZED",
    );
    expect(db.invitation.findMany).not.toHaveBeenCalled();
  });

  it("ignores client-supplied email/userId and only accepts the caller's own invitations", async () => {
    db.invitation.findMany.mockResolvedValue([
      {
        id: "inv_1",
        type: "EVENT_ROLE",
        email: `${IMPOSTOR}@example.test`,
        eventId: EVENT_A,
        roleId: "role_mentor",
        globalRole: null,
        venueId: null,
        invitedBy: ADMIN,
        event: { name: "Event A" },
        role: { name: "mentor" },
      },
    ]);

    const result = await callerAs(impostor).invitation.accept({
      email: "victim@example.test",
      userId: "victim",
    });

    expect(result.accepted).toBe(1);
    // Identity came from the caller's DB row, not from the input.
    expect(firstArg(db.user.findUnique)).toEqual({
      where: { id: IMPOSTOR },
      select: { email: true },
    });
    expect(pick(firstArg(db.invitation.findMany), "where.email.equals")).toBe(
      `${IMPOSTOR}@example.test`,
    );
    expect(pick(firstArg(db.userRole.create), "data.userId")).toBe(IMPOSTOR);
    expect(JSON.stringify(db.invitation.findMany.mock.calls)).not.toContain(
      "victim",
    );
    expect(JSON.stringify(db.userRole.create.mock.calls)).not.toContain(
      "victim",
    );
  });
});

describe("acceptPendingInvitations (August fix: no global grant on an unverified email)", () => {
  it("emailVerified:false skips the GLOBAL_ADMIN grant and leaves the invitation PENDING", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    db.invitation.findMany.mockResolvedValue([globalAdminInvitation]);

    const result = await acceptPendingInvitations(
      `${IMPOSTOR}@example.test`,
      IMPOSTOR,
      { emailVerified: false },
    );

    expect(result).toEqual({ accepted: 0, roles: [] });
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.invitation.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipped admin grant"),
    );
  });

  it("the default (no opts) is unverified", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    db.invitation.findMany.mockResolvedValue([globalAdminInvitation]);

    const result = await acceptPendingInvitations(
      `${IMPOSTOR}@example.test`,
      IMPOSTOR,
    );

    expect(result.accepted).toBe(0);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("emailVerified:true applies the GLOBAL_ADMIN grant and marks the invitation ACCEPTED", async () => {
    db.invitation.findMany.mockResolvedValue([globalAdminInvitation]);

    const result = await acceptPendingInvitations(
      `${IMPOSTOR}@example.test`,
      IMPOSTOR,
      { emailVerified: true },
    );

    expect(result.accepted).toBe(1);
    expect(result.roles).toEqual([
      { eventName: "Global Platform", roleName: "admin" },
    ]);
    expect(firstArg(db.user.update)).toEqual({
      where: { id: IMPOSTOR },
      data: { role: "admin" },
    });
    expect(pick(firstArg(db.invitation.update), "data.status")).toBe(
      "ACCEPTED",
    );
  });

  it("GLOBAL_STAFF is refused on an unverified email too; EVENT_ROLE is still accepted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    db.invitation.findMany.mockResolvedValue([
      {
        ...globalAdminInvitation,
        id: "inv_staff",
        type: "GLOBAL_STAFF",
        globalRole: "staff",
      },
      {
        id: "inv_event",
        type: "EVENT_ROLE",
        email: `${IMPOSTOR}@example.test`,
        eventId: EVENT_A,
        roleId: "role_mentor",
        globalRole: null,
        venueId: null,
        invitedBy: ADMIN,
        event: { name: "Event A" },
        role: { name: "mentor" },
      },
    ]);

    const result = await acceptPendingInvitations(
      `${IMPOSTOR}@example.test`,
      IMPOSTOR,
      { emailVerified: false },
    );

    expect(result.accepted).toBe(1);
    expect(result.roles).toEqual([
      { eventName: "Event A", roleName: "mentor" },
    ]);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.userRole.create).toHaveBeenCalledTimes(1);
    // Only the EVENT_ROLE invitation was flipped to ACCEPTED.
    expect(db.invitation.update).toHaveBeenCalledTimes(1);
    expect(pick(firstArg(db.invitation.update), "where.id")).toBe("inv_event");
  });
});

// ── contact.ts ──────────────────────────────────────────────────────────

describe("contact router (August fix: CRM writes are admin/staff only)", () => {
  const contactInput = { firstName: "Ada", lastName: "Lovelace" };

  it("createContact: anonymous UNAUTHORIZED, impostor FORBIDDEN, staff allowed", async () => {
    await expectCode(
      callerAs(anonymous).contact.createContact(contactInput),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).contact.createContact(contactInput),
      "FORBIDDEN",
    );
    expect(db.contact.create).not.toHaveBeenCalled();

    await callerAs(staff).contact.createContact(contactInput);
    expect(db.contact.create).toHaveBeenCalledTimes(1);
  });

  it("updateContact: impostor FORBIDDEN, admin allowed", async () => {
    const input = { id: "contact_1", ...contactInput };
    await expectCode(
      callerAs(impostor).contact.updateContact(input),
      "FORBIDDEN",
    );
    expect(db.contact.update).not.toHaveBeenCalled();

    db.contact.findUnique.mockResolvedValue({ id: "contact_1", email: null });
    await callerAs(admin).contact.updateContact(input);
    expect(db.contact.update).toHaveBeenCalledTimes(1);
  });

  it("mergeContacts: impostor FORBIDDEN, staff allowed", async () => {
    const input = { contactIds: ["contact_1", "contact_2"] };
    await expectCode(
      callerAs(impostor).contact.mergeContacts(input),
      "FORBIDDEN",
    );
    expect(db.contact.findMany).not.toHaveBeenCalled();

    const blank = {
      email: null,
      phone: null,
      telegram: null,
      twitter: null,
      github: null,
      linkedIn: null,
      about: null,
      skills: [],
    };
    db.contact.findMany.mockResolvedValue([
      { id: "contact_1", firstName: "Ada", lastName: "Lovelace", ...blank },
      { id: "contact_2", firstName: "Ada", lastName: "L.", ...blank },
    ]);
    const result = await callerAs(staff).contact.mergeContacts(input);
    expect(result.success).toBe(true);
    expect(db.contact.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("matchEventApplicants: anonymous UNAUTHORIZED, impostor FORBIDDEN, staff allowed", async () => {
    await expectCode(
      callerAs(anonymous).contact.matchEventApplicants(),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).contact.matchEventApplicants(),
      "FORBIDDEN",
    );
    expect(db.application.findMany).not.toHaveBeenCalled();

    const result = await callerAs(staff).contact.matchEventApplicants();
    expect(result.applicationsProcessed).toBe(0);
  });

  it("the seven CRM importers: anonymous UNAUTHORIZED, impostor and demoted admin FORBIDDEN before any lookup", async () => {
    const forContact = { contactId: "contact_1" };
    await expectCode(
      callerAs(anonymous).contact.importGoogleContacts(),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(demotedAdmin).contact.importGoogleContacts(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importGoogleContacts(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importGoogleContactsFromEmails(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importGmailMessages({}),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importNotionContacts(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importTelegramContacts(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importTelegramMessagesForContact(forContact),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).contact.importGmailMessagesForContact(forContact),
      "FORBIDDEN",
    );
    expect(db.account.findFirst).not.toHaveBeenCalled();
    expect(db.telegramAuth.findUnique).not.toHaveBeenCalled();
    expect(db.contact.findUnique).not.toHaveBeenCalled();

    // Staff pass the gate: each body runs up to its own "not connected" check
    // (no Google account / no such contact) — nothing external is reached.
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      callerAs(staff).contact.importGoogleContacts(),
    ).rejects.toThrow();
    expect(db.account.findFirst).toHaveBeenCalledTimes(1);
    await expect(
      callerAs(staff).contact.importTelegramMessagesForContact(forContact),
    ).rejects.toThrow();
    expect(db.contact.findUnique).toHaveBeenCalledTimes(1);
  });
});

// ── profile.ts ──────────────────────────────────────────────────────────

describe("profile.getProfile", () => {
  beforeEach(() => {
    db.userProfile.findUnique.mockResolvedValue({
      ...profileRow(),
      projects: [],
      user: ownerUser,
    });
  });

  it("strips private fields for anonymous and impostor", async () => {
    expectPrivateFieldsNull(
      await callerAs(anonymous).profile.getProfile({ userId: OWNER }),
    );
    expectPrivateFieldsNull(
      await callerAs(impostor).profile.getProfile({ userId: OWNER }),
    );
  });

  it("keeps private fields for the owner and for staff/admin", async () => {
    expectPrivateFieldsKept(
      await callerAs(owner).profile.getProfile({ userId: OWNER }),
    );
    expectPrivateFieldsKept(
      await callerAs(staff).profile.getProfile({ userId: OWNER }),
    );
    expectPrivateFieldsKept(
      await callerAs(admin).profile.getProfile({ userId: OWNER }),
    );
  });

  it("a hidden profile (isPublic=false) is FORBIDDEN for anonymous and impostor; the owner, staff and admin may open it", async () => {
    db.userProfile.findUnique.mockResolvedValue({
      ...profileRow({ isPublic: false }),
      projects: [],
      user: ownerUser,
    });
    await expectCode(
      callerAs(anonymous).profile.getProfile({ userId: OWNER }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).profile.getProfile({ userId: OWNER }),
      "FORBIDDEN",
    );
    const own = await callerAs(owner).profile.getProfile({ userId: OWNER });
    expect(own.isPublic).toBe(false);
    expectPrivateFieldsKept(own);

    // Aligned with searchProfiles / getAllMembers, which already list hidden
    // profiles for admin/staff: the member admin view links here.
    for (const viewer of [staff, admin]) {
      const asPrivileged = await callerAs(viewer).profile.getProfile({
        userId: OWNER,
      });
      expect(asPrivileged.isPublic).toBe(false);
      expectPrivateFieldsKept(asPrivileged);
    }

    // On this path the role is re-read from the DB, so a demoted admin's
    // stale token (JWT "admin", DB "user") does not open a private profile.
    await expectCode(
      callerAs(demotedAdmin).profile.getProfile({ userId: OWNER }),
      "FORBIDDEN",
    );
  });
});

describe("profile.searchProfiles", () => {
  beforeEach(() => {
    db.userProfile.findMany.mockResolvedValue([
      { ...profileRow(), projects: [], user: ownerUser },
    ]);
  });

  it("strips private fields for anonymous and impostor, keeps them for owner and staff", async () => {
    expectPrivateFieldsNull(
      first((await callerAs(anonymous).profile.searchProfiles({})).profiles),
    );
    expectPrivateFieldsNull(
      first((await callerAs(impostor).profile.searchProfiles({})).profiles),
    );
    expectPrivateFieldsKept(
      first((await callerAs(owner).profile.searchProfiles({})).profiles),
    );
    expectPrivateFieldsKept(
      first((await callerAs(staff).profile.searchProfiles({})).profiles),
    );
  });

  it("hides isPublic=false profiles from non-privileged callers via the Prisma filter, not for staff", async () => {
    await callerAs(anonymous).profile.searchProfiles({});
    expect(pick(firstArg(db.userProfile.findMany, 0), "where.AND.1")).toEqual({
      OR: [{ isPublic: true }],
    });

    await callerAs(impostor).profile.searchProfiles({});
    expect(pick(firstArg(db.userProfile.findMany, 1), "where.AND.1")).toEqual({
      OR: [{ isPublic: true }, { userId: IMPOSTOR }],
    });

    await callerAs(staff).profile.searchProfiles({});
    expect(firstArg(db.userProfile.findMany, 2).where).toEqual({});
  });
});

describe("profile.getAllMembers", () => {
  beforeEach(() => {
    db.user.findMany.mockResolvedValue([
      {
        ...USERS[OWNER],
        emailVerified: null,
        password: "$2a$10$hash",
        adminNotes: "internal note",
        adminLabels: ["Developer"],
        adminWorkExperience: null,
        adminUpdatedBy: null,
        adminUpdatedAt: null,
        kudos: 130,
        profile: { ...profileRow(), projects: [] },
        userSkills: [],
      },
    ]);
  });

  it("impostor gets no email, no password and no private profile fields; staff gets everything but the password", async () => {
    const asImpostor = first(
      (await callerAs(impostor).profile.getAllMembers({})).members,
    );
    expect(asImpostor.email).toBeNull();
    expect(asImpostor.adminNotes).toBeNull();
    expect(hasKey(asImpostor, "password")).toBe(false);
    expectPrivateFieldsNull(asImpostor.profile);

    const asStaff = first(
      (await callerAs(staff).profile.getAllMembers({})).members,
    );
    expect(asStaff.email).toBe(`${OWNER}@example.test`);
    expect(hasKey(asStaff, "password")).toBe(false);
    expectPrivateFieldsKept(asStaff.profile);
  });

  it("hides isPublic=false profiles from non-privileged callers (users without a profile stay listed)", async () => {
    await callerAs(impostor).profile.getAllMembers({});
    expect(firstArg(db.user.findMany, 0).where).toEqual({
      AND: [
        {
          OR: [
            { profile: { is: null } },
            { profile: { isPublic: true } },
            { id: IMPOSTOR },
          ],
        },
      ],
    });

    await callerAs(staff).profile.getAllMembers({});
    expect(firstArg(db.user.findMany, 1).where).toEqual({});
  });

  it("only admin/staff can probe priorExperience through the search clause", async () => {
    await callerAs(impostor).profile.getAllMembers({ search: "stealth" });
    expect(JSON.stringify(firstArg(db.user.findMany, 0).where)).not.toContain(
      "priorExperience",
    );

    await callerAs(staff).profile.getAllMembers({ search: "stealth" });
    expect(JSON.stringify(firstArg(db.user.findMany, 1).where)).toContain(
      "priorExperience",
    );
  });
});

describe("profile.getAllFeaturedProjects", () => {
  beforeEach(() => {
    db.userProject.findMany.mockResolvedValue([
      {
        id: PROJECT_1,
        title: "Project One",
        featured: true,
        profile: { ...profileRow(), user: ownerUser },
        repositories: [],
      },
    ]);
  });

  it("strips the owner profile's private fields for anonymous/impostor, keeps them for owner/staff", async () => {
    expectPrivateFieldsNull(
      first(
        (await callerAs(anonymous).profile.getAllFeaturedProjects({})).projects,
      ).profile,
    );
    expectPrivateFieldsNull(
      first(
        (await callerAs(impostor).profile.getAllFeaturedProjects({})).projects,
      ).profile,
    );
    expectPrivateFieldsKept(
      first((await callerAs(owner).profile.getAllFeaturedProjects({})).projects)
        .profile,
    );
    expectPrivateFieldsKept(
      first((await callerAs(staff).profile.getAllFeaturedProjects({})).projects)
        .profile,
    );
  });

  it("filters out projects of hidden profiles for non-privileged callers only", async () => {
    await callerAs(anonymous).profile.getAllFeaturedProjects({});
    expect(pick(firstArg(db.userProject.findMany, 0), "where.profile")).toEqual(
      {
        OR: [{ isPublic: true }],
      },
    );

    await callerAs(admin).profile.getAllFeaturedProjects({});
    expect(
      pick(firstArg(db.userProject.findMany, 1), "where.profile"),
    ).toBeUndefined();
  });
});

// ── project.ts ──────────────────────────────────────────────────────────

describe("project.getProjectDetails", () => {
  it("never returns the owner profile's private fields to anyone", async () => {
    db.userProject.findUnique.mockResolvedValue(projectDetailsRow());
    for (const viewer of [anonymous, impostor, owner, staff]) {
      const result = await callerAs(viewer).project.getProjectDetails({
        projectId: PROJECT_1,
      });
      expectNoPrivateValues(result);
      expect(result.author.profile.jobTitle).toBe("Engineer");
      expect(result.author.profile.githubUrl).toBe("https://github.com/owner");
    }
  });

  it("honours isPublic=false on the owner: redacted author card for anonymous/impostor, populated for owner/staff/admin", async () => {
    db.userProject.findUnique.mockResolvedValue(
      projectDetailsRow({ ownerIsPublic: false }),
    );
    for (const viewer of [anonymous, impostor]) {
      const result = await callerAs(viewer).project.getProjectDetails({
        projectId: PROJECT_1,
      });
      // The project itself stays visible; only the person is private.
      expect(result.title).toBe("Project One");
      expect(result.author.name).toBe("User owner");
      expect(Object.keys(result.author.profile).sort()).toEqual([
        "bio",
        "company",
        "githubUrl",
        "jobTitle",
        "linkedinUrl",
        "location",
        "twitterUrl",
        "website",
      ]);
      for (const value of Object.values(result.author.profile)) {
        expect(value).toBeNull();
      }
    }
    for (const viewer of [owner, staff, admin]) {
      const result = await callerAs(viewer).project.getProjectDetails({
        projectId: PROJECT_1,
      });
      expect(result.author.profile.jobTitle).toBe("Engineer");
      expect(result.author.profile.bio).toBe("Public bio");
    }
  });

  it("honours isPublic=false on a collaborator's profile snippet", async () => {
    db.userProject.findUnique.mockResolvedValue(
      projectDetailsRow({ collabIsPublic: false }),
    );
    const asAnonymous = first(
      (
        await callerAs(anonymous).project.getProjectDetails({
          projectId: PROJECT_1,
        })
      ).collaborators,
    );
    expect(asAnonymous.name).toBe("User collaborator");
    expect(asAnonymous.profile).toEqual({
      jobTitle: null,
      company: null,
      location: null,
      bio: null,
    });

    const asCollaborator = first(
      (
        await callerAs(collaborator).project.getProjectDetails({
          projectId: PROJECT_1,
        })
      ).collaborators,
    );
    expect(asCollaborator.profile?.jobTitle).toBe("Designer");

    const asStaff = first(
      (
        await callerAs(staff).project.getProjectDetails({
          projectId: PROJECT_1,
        })
      ).collaborators,
    );
    expect(asStaff.profile?.jobTitle).toBe("Designer");
  });
});

// ── kudos.ts ────────────────────────────────────────────────────────────

describe("kudos.getLeaderboard", () => {
  it("does not select or return email for anonymous callers", async () => {
    db.user.findMany.mockResolvedValue([
      {
        id: OWNER,
        firstName: "User",
        surname: OWNER,
        name: "User owner",
        image: null,
        kudos: 130,
        profile: { avatarUrl: null },
      },
    ]);

    const result = await callerAs(anonymous).kudos.getLeaderboard();

    expect(pick(firstArg(db.user.findMany), "select.email")).toBeUndefined();
    expect(hasKey(first(result).user, "email")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });
});

// ── role.ts ─────────────────────────────────────────────────────────────

describe("role.getGlobalRoles", () => {
  it("is not reachable anonymously, by an impostor, or with a demoted admin token", async () => {
    await expectCode(callerAs(anonymous).role.getGlobalRoles(), "UNAUTHORIZED");
    await expectCode(callerAs(impostor).role.getGlobalRoles(), "FORBIDDEN");
    await expectCode(callerAs(demotedAdmin).role.getGlobalRoles(), "FORBIDDEN");
    expect(db.globalRole.findMany).not.toHaveBeenCalled();
  });

  it("staff and admin can list the privileged accounts", async () => {
    await expect(callerAs(staff).role.getGlobalRoles()).resolves.toEqual([]);
    await expect(callerAs(admin).role.getGlobalRoles()).resolves.toEqual([]);
    expect(db.globalRole.findMany).toHaveBeenCalledTimes(2);
  });

  it("getEventRoles stays public but only returns role definitions", async () => {
    db.role.findMany.mockResolvedValue([{ id: "role_mentor", name: "mentor" }]);
    const roles = await callerAs(anonymous).role.getEventRoles();
    expect(roles).toEqual([{ id: "role_mentor", name: "mentor" }]);
    expect(firstArg(db.role.findMany).include).toBeUndefined();
  });
});

// ── askOffer.ts / forum.ts ──────────────────────────────────────────────

describe("askOffer / forum public reads", () => {
  const poster = {
    id: OWNER,
    name: "User owner",
    image: null,
    profile: { jobTitle: "Engineer", company: "ACME", avatarUrl: null },
  };

  it("askOffer.getById selects no email for the poster", async () => {
    db.askOffer.findUnique.mockResolvedValue({
      id: "ask_1",
      userId: OWNER,
      type: "ASK",
      title: "Looking for a mentor",
      user: poster,
    });
    const result = await callerAs(anonymous).askOffer.getById({ id: "ask_1" });
    expect(
      JSON.stringify(firstArg(db.askOffer.findUnique).include),
    ).not.toContain('"email"');
    expect(hasKey(result.user, "email")).toBe(false);
  });

  it("askOffer.getEventAsksOffers selects no email", async () => {
    await callerAs(anonymous).askOffer.getEventAsksOffers({ eventId: EVENT_A });
    expect(
      JSON.stringify(firstArg(db.askOffer.findMany).include),
    ).not.toContain('"email"');
  });

  it("askOffer.getAllAsksOffers (protected feed) selects no email for an impostor", async () => {
    await expectCode(
      callerAs(anonymous).askOffer.getAllAsksOffers({}),
      "UNAUTHORIZED",
    );
    await callerAs(impostor).askOffer.getAllAsksOffers({});
    expect(
      JSON.stringify(firstArg(db.askOffer.findMany).include),
    ).not.toContain('"email"');
  });

  it("forum.getThreadById selects no email anywhere in its include tree", async () => {
    db.forumThread.findUnique.mockResolvedValue({
      id: "thread_1",
      userId: OWNER,
      title: "Hello",
      content: "World",
      user: poster,
      likes: [],
      comments: [],
    });
    const result = await callerAs(anonymous).forum.getThreadById({
      id: "thread_1",
    });
    expect(
      JSON.stringify(firstArg(db.forumThread.findUnique).include),
    ).not.toContain('"email"');
    expect(hasKey(result.user, "email")).toBe(false);
  });

  it("forum.getThreads selects no email", async () => {
    await callerAs(anonymous).forum.getThreads({});
    expect(
      JSON.stringify(firstArg(db.forumThread.findMany).include),
    ).not.toContain('"email"');
  });
});

// ── sponsor.ts ──────────────────────────────────────────────────────────

describe("sponsor router — staff-only writes", () => {
  it("createSponsor: anonymous UNAUTHORIZED, impostor/demoted FORBIDDEN, staff allowed", async () => {
    const input = { name: "Squatted Sponsor" };
    await expectCode(
      callerAs(anonymous).sponsor.createSponsor(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).sponsor.createSponsor(input),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).sponsor.createSponsor(input),
      "FORBIDDEN",
    );
    expect(db.sponsor.create).not.toHaveBeenCalled();

    await callerAs(staff).sponsor.createSponsor(input);
    expect(db.sponsor.create).toHaveBeenCalledTimes(1);
  });

  it("updateVisitRequestStatus: impostor FORBIDDEN, admin allowed", async () => {
    const input = { visitRequestId: "visit_1", status: "APPROVED" as const };
    await expectCode(
      callerAs(impostor).sponsor.updateVisitRequestStatus(input),
      "FORBIDDEN",
    );
    expect(db.sponsorVisitRequest.update).not.toHaveBeenCalled();

    await callerAs(admin).sponsor.updateVisitRequestStatus(input);
    expect(db.sponsorVisitRequest.update).toHaveBeenCalledTimes(1);
  });

  it("createDeliverable: impostor and sponsor-role user FORBIDDEN, staff allowed", async () => {
    grantSponsorRole(db, SPONSOR_REP, EVENT_A);
    const input = {
      eventSponsorId: EVENT_SPONSOR_A,
      category: "TECHNICAL" as const,
      title: "Workshop",
      description: "A workshop",
    };
    await expectCode(
      callerAs(impostor).sponsor.createDeliverable(input),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(sponsorRepA).sponsor.createDeliverable(input),
      "FORBIDDEN",
    );
    expect(db.sponsorDeliverable.create).not.toHaveBeenCalled();

    await callerAs(staff).sponsor.createDeliverable(input);
    expect(db.sponsorDeliverable.create).toHaveBeenCalledTimes(1);
  });
});

describe("sponsor router — sponsor-affiliation gates", () => {
  beforeEach(() => {
    seedSponsorRows(db);
    grantSponsorRole(db, SPONSOR_REP, EVENT_A);
  });

  it("getSponsorResidencyData: impostor FORBIDDEN; sponsor rep only on their own event; staff anywhere", async () => {
    await expectCode(
      callerAs(anonymous).sponsor.getSponsorResidencyData({
        eventSponsorId: EVENT_SPONSOR_A,
      }),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).sponsor.getSponsorResidencyData({
        eventSponsorId: EVENT_SPONSOR_A,
      }),
      "FORBIDDEN",
    );

    const own = await callerAs(sponsorRepA).sponsor.getSponsorResidencyData({
      eventSponsorId: EVENT_SPONSOR_A,
    });
    expect(own?.id).toBe(EVENT_SPONSOR_A);

    await expectCode(
      callerAs(sponsorRepA).sponsor.getSponsorResidencyData({
        eventSponsorId: EVENT_SPONSOR_B,
      }),
      "FORBIDDEN",
    );

    const asStaff = await callerAs(staff).sponsor.getSponsorResidencyData({
      eventSponsorId: EVENT_SPONSOR_B,
    });
    expect(asStaff?.id).toBe(EVENT_SPONSOR_B);
  });

  it("createVisitRequest: impostor FORBIDDEN, sponsor rep on their event allowed, other event FORBIDDEN, unknown id NOT_FOUND", async () => {
    const input = {
      visitType: "KICKOFF" as const,
      preferredDates: [new Date("2026-11-01T00:00:00Z")],
      numAttendees: 2,
      purpose: "Kickoff visit",
    };
    await expectCode(
      callerAs(impostor).sponsor.createVisitRequest({
        ...input,
        eventSponsorId: EVENT_SPONSOR_A,
      }),
      "FORBIDDEN",
    );
    expect(db.sponsorVisitRequest.create).not.toHaveBeenCalled();

    await callerAs(sponsorRepA).sponsor.createVisitRequest({
      ...input,
      eventSponsorId: EVENT_SPONSOR_A,
    });
    expect(db.sponsorVisitRequest.create).toHaveBeenCalledTimes(1);

    await expectCode(
      callerAs(sponsorRepA).sponsor.createVisitRequest({
        ...input,
        eventSponsorId: EVENT_SPONSOR_B,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(sponsorRepA).sponsor.createVisitRequest({
        ...input,
        eventSponsorId: "does-not-exist",
      }),
      "NOT_FOUND",
    );
    expect(db.sponsorVisitRequest.create).toHaveBeenCalledTimes(1);
  });

  it("updateDeliverableStatus: resolves the deliverable's event in the DB before gating", async () => {
    const input = {
      deliverableId: DELIVERABLE_A,
      status: "IN_PROGRESS" as const,
    };
    await expectCode(
      callerAs(impostor).sponsor.updateDeliverableStatus(input),
      "FORBIDDEN",
    );
    expect(db.sponsorDeliverable.update).not.toHaveBeenCalled();

    await callerAs(sponsorRepA).sponsor.updateDeliverableStatus(input);
    await callerAs(staff).sponsor.updateDeliverableStatus(input);
    expect(db.sponsorDeliverable.update).toHaveBeenCalledTimes(2);

    await expectCode(
      callerAs(sponsorRepA).sponsor.updateDeliverableStatus({
        ...input,
        deliverableId: "does-not-exist",
      }),
      "NOT_FOUND",
    );
  });

  it("createDefaultDeliverables: gated by affiliation and idempotent", async () => {
    await expectCode(
      callerAs(impostor).sponsor.createDefaultDeliverables({
        eventSponsorId: EVENT_SPONSOR_A,
      }),
      "FORBIDDEN",
    );
    expect(db.sponsorDeliverable.create).not.toHaveBeenCalled();

    const seeded = await callerAs(
      sponsorRepA,
    ).sponsor.createDefaultDeliverables({ eventSponsorId: EVENT_SPONSOR_A });
    expect(seeded).toHaveLength(5);
    expect(db.sponsorDeliverable.create).toHaveBeenCalledTimes(5);

    db.sponsorDeliverable.count.mockResolvedValue(5);
    const again = await callerAs(sponsorRepA).sponsor.createDefaultDeliverables(
      { eventSponsorId: EVENT_SPONSOR_A },
    );
    expect(again).toEqual([]);
    expect(db.sponsorDeliverable.create).toHaveBeenCalledTimes(5);
  });

  it("getSponsorStats is scoped to the caller's own sponsor roles", async () => {
    const result = await callerAs(impostor).sponsor.getSponsorStats();
    expect(result.totalEvents).toBe(0);
    expect(pick(firstArg(db.userRole.findMany), "where")).toEqual({
      userId: IMPOSTOR,
      role: { name: "sponsor" },
    });
  });

  it("getSponsorsForHyperboard stays public with a pinned select (no contacts / geckoCoin)", async () => {
    db.eventSponsor.findMany.mockResolvedValue([
      {
        qualified: true,
        sponsor: { id: "sponsor_a", name: "Sponsor A", logoUrl: null },
      },
    ]);
    const result = await callerAs(anonymous).sponsor.getSponsorsForHyperboard({
      eventId: EVENT_A,
    });
    const args = firstArg(db.eventSponsor.findMany);
    expect(args.include).toBeUndefined();
    expect(
      Object.keys(pick(args, "select.sponsor.select") as object).sort(),
    ).toEqual(["id", "logoUrl", "name"]);
    expect(JSON.stringify(result)).not.toContain("contacts");
  });
});

// ── metric.ts ───────────────────────────────────────────────────────────

describe("metric router — writes", () => {
  beforeEach(() => {
    seedMetricRows(db);
  });

  it("create: impostor with no editable project FORBIDDEN; project owner allowed; staff with no project allowed", async () => {
    const input = {
      name: "Custom metric",
      metricType: ["CUSTOM" as const],
      collectionMethod: "SELF_REPORTING" as const,
    };
    await expectCode(callerAs(anonymous).metric.create(input), "UNAUTHORIZED");
    await expectCode(callerAs(impostor).metric.create(input), "FORBIDDEN");
    expect(db.metric.create).not.toHaveBeenCalled();

    db.userProject.findFirst.mockImplementation(
      async (args: { where: { OR?: Array<Record<string, unknown>> } }) =>
        JSON.stringify(args.where.OR).includes(`"${OWNER}"`)
          ? { id: PROJECT_1 }
          : null,
    );
    await callerAs(owner).metric.create(input);
    expect(db.metric.create).toHaveBeenCalledTimes(1);
    expect(pick(firstArg(db.metric.create), "data.createdBy")).toBe(OWNER);

    await callerAs(staff).metric.create(input);
    expect(db.metric.create).toHaveBeenCalledTimes(2);
  });

  it("update/delete: anonymous UNAUTHORIZED, impostor and demoted admin FORBIDDEN, staff allowed", async () => {
    await expectCode(
      callerAs(anonymous).metric.update({ id: METRIC_1, name: "x" }),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).metric.update({ id: METRIC_1, name: "x" }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).metric.update({ id: METRIC_1, name: "x" }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).metric.delete({ id: METRIC_1 }),
      "FORBIDDEN",
    );
    expect(db.metric.update).not.toHaveBeenCalled();

    await callerAs(staff).metric.update({ id: METRIC_1, name: "Renamed" });
    await callerAs(staff).metric.delete({ id: METRIC_1 });
    expect(db.metric.update).toHaveBeenCalledTimes(2);
    expect(pick(firstArg(db.metric.update, 1), "data.isActive")).toBe(false);
  });

  it("recordMeasurement: project-scoped → owner / canEdit collaborator / staff only; unscoped → staff only", async () => {
    const base = {
      metricId: METRIC_1,
      value: 42,
      unitOfMetric: "count",
      measurementDate: new Date("2026-11-01T00:00:00Z"),
      timePeriod: "DURING" as const,
    };
    await expectCode(
      callerAs(impostor).metric.recordMeasurement({
        ...base,
        projectId: PROJECT_1,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).metric.recordMeasurement(base),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).metric.recordMeasurement(base),
      "FORBIDDEN",
    );
    expect(db.metricMeasurement.create).not.toHaveBeenCalled();

    await callerAs(owner).metric.recordMeasurement({
      ...base,
      projectId: PROJECT_1,
    });
    await callerAs(collaborator).metric.recordMeasurement({
      ...base,
      projectId: PROJECT_1,
    });
    await callerAs(staff).metric.recordMeasurement(base);
    expect(db.metricMeasurement.create).toHaveBeenCalledTimes(3);
  });

  it("recordMeasurement: an eventId tag is staff-only — owner and canEdit collaborator FORBIDDEN even on their own project", async () => {
    const base = {
      metricId: METRIC_1,
      value: 7,
      unitOfMetric: "count",
      measurementDate: new Date("2026-11-02T00:00:00Z"),
      timePeriod: "DURING" as const,
    };
    await expectCode(
      callerAs(owner).metric.recordMeasurement({
        ...base,
        projectId: PROJECT_1,
        eventId: EVENT_A,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(collaborator).metric.recordMeasurement({
        ...base,
        projectId: PROJECT_1,
        eventId: EVENT_A,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).metric.recordMeasurement({
        ...base,
        eventId: EVENT_A,
      }),
      "FORBIDDEN",
    );
    expect(db.metricMeasurement.create).not.toHaveBeenCalled();

    await callerAs(staff).metric.recordMeasurement({
      ...base,
      eventId: EVENT_A,
    });
    await callerAs(admin).metric.recordMeasurement({
      ...base,
      projectId: PROJECT_1,
      eventId: EVENT_A,
    });
    expect(db.metricMeasurement.create).toHaveBeenCalledTimes(2);
    expect(pick(firstArg(db.metricMeasurement.create), "data.eventId")).toBe(
      EVENT_A,
    );
  });

  it("addToProject / removeFromProject: non-owner FORBIDDEN, owner and canEdit collaborator allowed, unknown project NOT_FOUND", async () => {
    const input = { metricId: METRIC_1, projectId: PROJECT_1 };
    await expectCode(
      callerAs(impostor).metric.addToProject(input),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).metric.addToProject(input),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).metric.removeFromProject(input),
      "FORBIDDEN",
    );
    expect(db.projectMetric.create).not.toHaveBeenCalled();
    expect(db.projectMetric.delete).not.toHaveBeenCalled();

    await callerAs(owner).metric.addToProject(input);
    await callerAs(collaborator).metric.addToProject(input);
    await callerAs(staff).metric.addToProject(input);
    expect(db.projectMetric.create).toHaveBeenCalledTimes(3);

    db.projectMetric.findUnique.mockResolvedValue({ id: "project_metric_1" });
    await callerAs(owner).metric.removeFromProject(input);
    expect(db.projectMetric.delete).toHaveBeenCalledTimes(1);

    await expectCode(
      callerAs(owner).metric.addToProject({
        ...input,
        projectId: "does-not-exist",
      }),
      "NOT_FOUND",
    );
  });

  it("suggestMetrics (paid LLM): non-owner FORBIDDEN before the AI call, owner allowed", async () => {
    await expectCode(
      callerAs(impostor).metric.suggestMetrics({ projectId: PROJECT_1 }),
      "FORBIDDEN",
    );
    // Only the ownership lookup ran — never the project/metrics fetch for the prompt.
    expect(db.metric.findMany).not.toHaveBeenCalled();

    const result = await callerAs(owner).metric.suggestMetrics({
      projectId: PROJECT_1,
    });
    expect(result).toEqual({ suggestions: [] });
  });
});

describe("metric router — public reads", () => {
  beforeEach(() => {
    seedMetricRows(db);
  });

  it("list and getById never select the creator's email", async () => {
    await callerAs(anonymous).metric.list({});
    expect(
      pick(firstArg(db.metric.findMany), "include.creator.select.email"),
    ).toBeUndefined();
    expect(JSON.stringify(firstArg(db.metric.findMany).include)).not.toContain(
      '"email"',
    );

    await callerAs(anonymous).metric.getById({ id: METRIC_1 });
    expect(
      JSON.stringify(firstArg(db.metric.findUnique).include),
    ).not.toContain('"email"');
  });

  it("getMeasurements and getProjectMetrics select no email", async () => {
    await callerAs(anonymous).metric.getMeasurements({ metricId: METRIC_1 });
    expect(
      JSON.stringify(firstArg(db.metricMeasurement.findMany).include),
    ).not.toContain('"email"');

    await callerAs(anonymous).metric.getProjectMetrics({
      projectId: PROJECT_1,
    });
    expect(
      JSON.stringify(firstArg(db.projectMetric.findMany).include),
    ).not.toContain('"email"');
  });
});

// ── schedule.ts ─────────────────────────────────────────────────────────

describe("schedule public agenda — speaker emails", () => {
  beforeEach(() => {
    db.event.findUnique.mockResolvedValue(eventSelectRow);
    db.scheduleSession.findMany.mockResolvedValue([scheduleSessionRow()]);
    db.scheduleSession.findUnique.mockResolvedValue(scheduleSessionRow());
  });

  function speakerEmailFromSchedule(
    result: Awaited<
      ReturnType<ReturnType<typeof callerAs>["schedule"]["getEventSchedule"]>
    >,
  ) {
    return first(first(result.sessions).sessionSpeakers).user.email;
  }

  it("getEventSchedule nulls speaker emails for anonymous and impostor (key kept)", async () => {
    const asAnonymous = await callerAs(anonymous).schedule.getEventSchedule({
      eventId: EVENT_A,
    });
    const anonSpeaker = first(first(asAnonymous.sessions).sessionSpeakers).user;
    expect(hasKey(anonSpeaker, "email")).toBe(true);
    expect(anonSpeaker.email).toBeNull();
    expect(anonSpeaker.name).toBe("Sam Speaker");

    expect(
      speakerEmailFromSchedule(
        await callerAs(impostor).schedule.getEventSchedule({
          eventId: EVENT_A,
        }),
      ),
    ).toBeNull();
  });

  it("getEventSchedule keeps speaker emails for staff and for a DB-verified floor lead of that event", async () => {
    expect(
      speakerEmailFromSchedule(
        await callerAs(staff).schedule.getEventSchedule({ eventId: EVENT_A }),
      ),
    ).toBe("speaker@example.test");

    grantFloorLead(db, FLOOR_LEAD, EVENT_A);
    expect(
      speakerEmailFromSchedule(
        await callerAs(floorLeadA).schedule.getEventSchedule({
          eventId: EVENT_A,
        }),
      ),
    ).toBe("speaker@example.test");

    // A floor lead of a different event is just a member here.
    grantFloorLead(db, FLOOR_LEAD, EVENT_B);
    expect(
      speakerEmailFromSchedule(
        await callerAs(floorLeadA).schedule.getEventSchedule({
          eventId: EVENT_A,
        }),
      ),
    ).toBeNull();
  });

  it("getSession applies the same rule", async () => {
    const asAnonymous = await callerAs(anonymous).schedule.getSession({
      sessionId: "session_1",
    });
    expect(first(asAnonymous.sessionSpeakers).user.email).toBeNull();

    const asImpostor = await callerAs(impostor).schedule.getSession({
      sessionId: "session_1",
    });
    expect(first(asImpostor.sessionSpeakers).user.email).toBeNull();

    const asAdmin = await callerAs(admin).schedule.getSession({
      sessionId: "session_1",
    });
    expect(first(asAdmin.sessionSpeakers).user.email).toBe(
      "speaker@example.test",
    );
  });

  it("resolveTextSpeakers no longer loads email on its public path", async () => {
    await callerAs(anonymous).schedule.resolveTextSpeakers({
      eventId: EVENT_A,
      names: ["Sam Speaker"],
    });
    expect(JSON.stringify(firstArg(db.user.findMany).select)).not.toContain(
      '"email"',
    );
  });

  it("fuzzyMatchSpeakers: anonymous UNAUTHORIZED, impostor FORBIDDEN; a floor lead of that event and staff are allowed, a floor lead of another event is FORBIDDEN", async () => {
    const input = {
      eventId: EVENT_A,
      names: ["Sam Speaker"],
      emails: { "Sam Speaker": "speaker@example.test" },
    };
    db.user.findMany.mockResolvedValue([speakerUser]);

    await expectCode(
      callerAs(anonymous).schedule.fuzzyMatchSpeakers(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).schedule.fuzzyMatchSpeakers(input),
      "FORBIDDEN",
    );
    grantFloorLead(db, FLOOR_LEAD, EVENT_B);
    await expectCode(
      callerAs(floorLeadA).schedule.fuzzyMatchSpeakers(input),
      "FORBIDDEN",
    );
    // The applicant scan (and the exact-email oracle) never ran.
    expect(db.user.findMany).not.toHaveBeenCalled();

    grantFloorLead(db, FLOOR_LEAD, EVENT_A);
    const asFloorLead = await callerAs(floorLeadA).schedule.fuzzyMatchSpeakers(
      input,
    );
    expect(first(asFloorLead["Sam Speaker"] ?? [])).toMatchObject({
      userId: "speaker_1",
      email: "speaker@example.test",
      confidence: "exact",
    });
    const asStaff = await callerAs(staff).schedule.fuzzyMatchSpeakers(input);
    expect(first(asStaff["Sam Speaker"] ?? []).userId).toBe("speaker_1");
    expect(db.user.findMany).toHaveBeenCalledTimes(2);
  });
});

// ── event.ts ────────────────────────────────────────────────────────────

describe("event.getEvent / getEvents — sponsor CRM contacts", () => {
  beforeEach(() => {
    db.event.findUnique.mockResolvedValue(eventWithSponsorContacts());
    db.event.findMany.mockResolvedValue([eventWithSponsorContacts()]);
  });

  it("getEvent empties sponsor.contacts for anonymous and impostor, keeps them for staff", async () => {
    for (const viewer of [anonymous, impostor]) {
      const result = await callerAs(viewer).event.getEvent({ id: EVENT_A });
      expect(first(result?.sponsors ?? []).sponsor.contacts).toEqual([]);
      expect(JSON.stringify(result)).not.toContain("crm-contact@example.test");
    }
    const asStaff = await callerAs(staff).event.getEvent({ id: EVENT_A });
    expect(first(asStaff?.sponsors ?? []).sponsor.contacts).toHaveLength(1);
  });

  it("getEvents applies the same redaction per event", async () => {
    const asImpostor = await callerAs(impostor).event.getEvents();
    expect(first(first(asImpostor).sponsors).sponsor.contacts).toEqual([]);

    const asAdmin = await callerAs(admin).event.getEvents();
    expect(first(first(asAdmin).sponsors).sponsor.contacts).toHaveLength(1);
  });
});

// ── application.ts ──────────────────────────────────────────────────────

describe("application public reads", () => {
  beforeEach(() => {
    db.event.findUnique.mockResolvedValue({ id: EVENT_A });
  });

  it("getResidentProjects selects, not includes, the user — no email / password hash / admin fields", async () => {
    db.application.findMany.mockResolvedValue([
      {
        id: "app_1",
        user: {
          id: OWNER,
          firstName: "User",
          surname: OWNER,
          name: "User owner",
          image: null,
          profile: {
            id: "profile_owner",
            bio: null,
            jobTitle: null,
            company: null,
            location: null,
            skills: [],
            githubUrl: null,
            linkedinUrl: null,
            website: null,
            avatarUrl: null,
            projects: [
              {
                id: PROJECT_1,
                title: "Project One",
                updates: [],
                likes: [],
                metrics: [],
              },
            ],
          },
        },
      },
    ]);

    const result = await callerAs(anonymous).application.getResidentProjects({
      eventId: EVENT_A,
    });

    const userArg = pick(firstArg(db.application.findMany), "include.user");
    expect(hasKey(userArg, "select")).toBe(true);
    expect(hasKey(userArg, "include")).toBe(false);
    const userSelect = JSON.stringify(pick(userArg, "select"));
    for (const forbidden of [
      '"email"',
      '"password"',
      '"adminNotes"',
      '"emailVerified"',
    ]) {
      expect(userSelect).not.toContain(forbidden);
    }
    const projectUser = first(result).profile.user;
    expect(hasKey(projectUser, "email")).toBe(false);
    expect(hasKey(projectUser, "password")).toBe(false);
  });

  it("getEventParticipants and searchEventParticipants no longer select priorExperience", async () => {
    await callerAs(anonymous).application.getEventParticipants({
      eventId: EVENT_A,
    });
    expect(
      pick(
        firstArg(db.application.findMany, 0),
        "select.user.select.profile.select.priorExperience",
      ),
    ).toBeUndefined();

    await callerAs(anonymous).application.searchEventParticipants({
      eventId: EVENT_A,
      search: "stealth",
    });
    expect(
      pick(
        firstArg(db.application.findMany, 1),
        "select.user.select.profile.select.priorExperience",
      ),
    ).toBeUndefined();
  });

  it("getProjectsForHyperboard does not load whole User rows", async () => {
    await callerAs(anonymous).application.getProjectsForHyperboard({
      eventId: EVENT_A,
    });
    const userArg = pick(firstArg(db.application.findMany), "include.user");
    expect(hasKey(userArg, "select")).toBe(true);
    expect(hasKey(userArg, "include")).toBe(false);
  });
});

// ── user.ts ─────────────────────────────────────────────────────────────

describe("user.searchUsers", () => {
  const victim = {
    id: "victim",
    firstName: "Vic",
    surname: "Tim",
    name: "Vic Tim",
    email: "victim@example.test",
    image: null,
  };

  beforeEach(() => {
    db.user.findMany.mockResolvedValue([victim]);
  });

  it("anonymous is UNAUTHORIZED", async () => {
    await expectCode(
      callerAs(anonymous).user.searchUsers({ query: "vic" }),
      "UNAUTHORIZED",
    );
  });

  it("an impostor cannot search by email and never receives email addresses", async () => {
    const result = await callerAs(impostor).user.searchUsers({
      query: "victim@example.test",
    });
    const where = firstArg(db.user.findMany).where;
    expect(JSON.stringify(where)).not.toContain('"email"');
    expect(first(result).email).toBeNull();
    expect(hasKey(first(result), "email")).toBe(true);
    expect(first(result).name).toBe("Vic Tim");
  });

  it("staff and DB-verified floor leads keep email search and email results", async () => {
    const asStaff = await callerAs(staff).user.searchUsers({
      query: "victim@",
    });
    expect(JSON.stringify(firstArg(db.user.findMany, 0).where)).toContain(
      '"email"',
    );
    expect(first(asStaff).email).toBe("victim@example.test");

    grantFloorLead(db, FLOOR_LEAD, EVENT_A);
    const asFloorLead = await callerAs(floorLeadA).user.searchUsers({
      query: "victim@",
    });
    expect(JSON.stringify(firstArg(db.user.findMany, 1).where)).toContain(
      '"email"',
    );
    expect(first(asFloorLead).email).toBe("victim@example.test");
  });

  it("a floor lead keeps the email privilege only while their event has not ended", async () => {
    grantFloorLead(db, FLOOR_LEAD, EVENT_A, new Date("2020-01-01T00:00:00Z"));
    const result = await callerAs(floorLeadA).user.searchUsers({
      query: "victim@",
    });
    // The lookup is scoped to a live event, not to any VenueOwner row …
    expect(
      pick(firstArg(db.venueOwner.findFirst), "where.event.endDate.gte"),
    ).toBeInstanceOf(Date);
    // … so a floor lead of a past event is just a member here.
    expect(JSON.stringify(firstArg(db.user.findMany).where)).not.toContain(
      '"email"',
    );
    expect(first(result).email).toBeNull();
  });
});

// ── telegramAuth.ts ─────────────────────────────────────────────────────

describe("telegramAuth router — CRM bulk messaging is admin/staff only", () => {
  const bulkInput = {
    contactIds: ["contact_1"],
    message: "Hello from the CRM",
  };
  const listInput = { listId: "admins", message: "Hello admins" };
  const adminWithTelegram = {
    ...USERS[ADMIN],
    profile: { telegramHandle: "@admin-handle" },
  };

  it("getSmartLists: anonymous UNAUTHORIZED, impostor and demoted admin FORBIDDEN, staff allowed", async () => {
    await expectCode(
      callerAs(anonymous).telegramAuth.getSmartLists(),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).telegramAuth.getSmartLists(),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).telegramAuth.getSmartLists(),
      "FORBIDDEN",
    );
    expect(db.$queryRaw).not.toHaveBeenCalled();

    const lists = await callerAs(staff).telegramAuth.getSmartLists();
    expect(lists.map((list) => list.id)).toContain("admins");
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it("getSmartListContacts: impostor FORBIDDEN before any lookup; staff receive the admin roster with emails", async () => {
    db.user.findMany.mockResolvedValue([adminWithTelegram]);
    await expectCode(
      callerAs(impostor).telegramAuth.getSmartListContacts({
        listId: "admins",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).telegramAuth.getSmartListContacts({
        listId: "accepted-applicants",
      }),
      "FORBIDDEN",
    );
    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(db.application.findMany).not.toHaveBeenCalled();

    const roster = await callerAs(staff).telegramAuth.getSmartListContacts({
      listId: "admins",
    });
    expect(first(roster).email).toBe(`${ADMIN}@example.test`);
  });

  it("sendBulkMessage / sendBulkMessageToList: impostor FORBIDDEN before the CRM is read; staff reach the Telegram-session check", async () => {
    await expectCode(
      callerAs(anonymous).telegramAuth.sendBulkMessage(bulkInput),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).telegramAuth.sendBulkMessage(bulkInput),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(impostor).telegramAuth.sendBulkMessageToList(listInput),
      "FORBIDDEN",
    );
    expect(db.telegramAuth.findUnique).not.toHaveBeenCalled();
    expect(db.contact.findMany).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();

    // Staff pass the gate: the body runs up to "no Telegram session for this
    // account" (nothing is sent from a unit test).
    await expectCode(
      callerAs(staff).telegramAuth.sendBulkMessage(bulkInput),
      "UNAUTHORIZED",
      "No active Telegram authentication",
    );
    expect(db.telegramAuth.findUnique).toHaveBeenCalledTimes(1);

    db.user.findMany.mockResolvedValue([adminWithTelegram]);
    await expectCode(
      callerAs(staff).telegramAuth.sendBulkMessageToList(listInput),
      "UNAUTHORIZED",
      "No active Telegram authentication",
    );
    expect(db.telegramAuth.findUnique).toHaveBeenCalledTimes(2);
  });
});

// ── praise.ts ───────────────────────────────────────────────────────────

describe("praise router — member-reachable lists carry no email", () => {
  it("getLeaderboard: anonymous UNAUTHORIZED; an impostor gets display names only and the select carries no email", async () => {
    db.praise.groupBy.mockResolvedValue([
      { recipientId: OWNER, _count: { id: 3 } },
    ]);
    db.user.findMany.mockResolvedValue([
      {
        id: OWNER,
        firstName: "User",
        surname: OWNER,
        name: "User owner",
        image: null,
      },
    ]);
    await expectCode(
      callerAs(anonymous).praise.getLeaderboard({}),
      "UNAUTHORIZED",
    );

    const result = await callerAs(impostor).praise.getLeaderboard({});
    expect(pick(firstArg(db.user.findMany), "select.email")).toBeUndefined();
    expect(JSON.stringify(firstArg(db.user.findMany).select)).not.toContain(
      '"email"',
    );
    expect(first(result).praiseCount).toBe(3);
    expect(hasKey(first(result).user, "email")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });

  it("getAllTransactions: sender and recipient are selected without email", async () => {
    db.praise.findMany.mockResolvedValue([
      {
        id: "praise_1",
        senderId: OWNER,
        recipientId: COLLAB,
        recipientName: "@collaborator",
        message: "Thanks for the review",
        sender: { id: OWNER, name: "User owner", image: null },
        recipient: { id: COLLAB, name: "User collaborator", image: null },
        event: null,
      },
    ]);
    await expectCode(
      callerAs(anonymous).praise.getAllTransactions({}),
      "UNAUTHORIZED",
    );

    const result = await callerAs(impostor).praise.getAllTransactions({});
    const include = firstArg(db.praise.findMany).include;
    expect(pick(include, "sender.select.email")).toBeUndefined();
    expect(pick(include, "recipient.select.email")).toBeUndefined();
    expect(JSON.stringify(include)).not.toContain('"email"');
    expect(hasKey(first(result).sender, "email")).toBe(false);
    expect(hasKey(first(result).recipient, "email")).toBe(false);
  });

  it("getEventPraise (still selects email) stays behind its event-admin / global-admin gate", async () => {
    await expectCode(
      callerAs(impostor).praise.getEventPraise({ eventId: EVENT_A }),
      "FORBIDDEN",
    );
    expect(db.praise.findMany).not.toHaveBeenCalled();

    await callerAs(admin).praise.getEventPraise({ eventId: EVENT_A });
    expect(db.praise.findMany).toHaveBeenCalledTimes(1);
  });
});

// ── onboarding.ts ───────────────────────────────────────────────────────

describe("onboarding.getOnboardingStatus (admin/staff only)", () => {
  const input = { applicationIds: ["app_1", "app_2"] };

  it("anonymous UNAUTHORIZED, impostor and demoted admin FORBIDDEN before any lookup", async () => {
    await expectCode(
      callerAs(anonymous).onboarding.getOnboardingStatus(input),
      "UNAUTHORIZED",
    );
    await expectCode(
      callerAs(impostor).onboarding.getOnboardingStatus(input),
      "FORBIDDEN",
    );
    await expectCode(
      callerAs(demotedAdmin).onboarding.getOnboardingStatus(input),
      "FORBIDDEN",
    );
    expect(db.applicationOnboarding.findMany).not.toHaveBeenCalled();
  });

  it("staff get the completion map for the requested applications", async () => {
    db.applicationOnboarding.findMany.mockResolvedValue([
      {
        applicationId: "app_1",
        completed: true,
        submittedAt: new Date("2026-10-01T00:00:00Z"),
        eTicketUrl: "https://files.example.test/ticket.pdf",
        healthInsuranceUrl: null,
        participateExperiments: true,
        mintHypercert: true,
      },
    ]);
    const result = await callerAs(staff).onboarding.getOnboardingStatus(input);
    expect(pick(result, "app_1.hasETicket")).toBe(true);
    expect(pick(result, "app_1.hasInsurance")).toBe(false);
    expect(
      pick(firstArg(db.applicationOnboarding.findMany), "where.applicationId.in"),
    ).toEqual(input.applicationIds);
  });
});

// ── Telegram webhook secret check ───────────────────────────────────────

describe("POST /api/telegram/webhook secret check", () => {
  const SECRET = "unit-test-webhook-secret";

  function request(
    secret: string | undefined,
    body: unknown = { update_id: 1 },
  ) {
    const headers = new Headers();
    if (secret !== undefined) {
      headers.set("X-Telegram-Bot-Api-Secret-Token", secret);
    }
    return { headers, json: async () => body } as unknown as NextRequest;
  }

  async function post(secret: string | undefined) {
    return (await webhookPost(request(secret))) as unknown as {
      status: number;
      body: unknown;
    };
  }

  it("fails closed with 401 when TELEGRAM_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await post("anything")).status).toBe(401);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("TELEGRAM_WEBHOOK_SECRET"),
    );
  });

  it("rejects a missing header, a wrong-length secret and a same-length wrong secret with 401", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);

    expect((await post(undefined)).status).toBe(401);
    expect((await post("short")).status).toBe(401);
    expect((await post(SECRET.replace(/.$/, "X"))).status).toBe(401);
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("accepts the right secret (a message-less update is a 200 no-op)", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);

    const result = await post(SECRET);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });
});

// ── NextAuth signIn callback (magic-link request vs click) ─────────────

describe("signIn callback — only a CLICKED magic link verifies the email", () => {
  type SignInParams = Parameters<typeof authConfig.callbacks.signIn>[0];
  const inviteeEmail = `${IMPOSTOR}@example.test`;
  const magicLink: SignInParams["account"] = {
    provider: "postmark",
    type: "email",
    providerAccountId: inviteeEmail,
  };

  function signInAs(
    account: SignInParams["account"],
    email?: SignInParams["email"],
    profile?: Record<string, unknown>,
  ) {
    return authConfig.callbacks.signIn({
      user: { id: IMPOSTOR, email: inviteeEmail },
      account,
      email,
      profile: profile as SignInParams["profile"],
    });
  }

  /** Every first argument passed to a mocked db method, in call order. */
  function updateArgs() {
    return db.user.update.mock.calls.map(
      (c: unknown[]) => c[0] as { where: unknown; data: Record<string, unknown> },
    );
  }
  const roleGrant = () => updateArgs().find((a) => "role" in a.data);
  const ownershipStamp = () =>
    updateArgs().find((a) => "emailVerified" in a.data);

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    db.invitation.findMany.mockResolvedValue([globalAdminInvitation]);
    // The invitee's row as the attacker left it: pre-registered via
    // credentials (password set), never verified.
    db.user.findUnique.mockImplementation(
      async (args: { where: { id?: string; email?: string } }) =>
        args.where.id === IMPOSTOR || args.where.email === inviteeEmail
          ? {
              ...USERS[IMPOSTOR],
              emailVerified: null,
              password: "$2a$10$attacker-chosen-hash",
            }
          : null,
    );
  });

  it("a magic-link sign-in REQUEST (email.verificationRequest) does not grant a pending GLOBAL_ADMIN invitation", async () => {
    // Auth.js calls signIn at request time, before anyone has clicked
    // anything: typing the invitee's address into the form must not promote
    // the (possibly attacker-registered) account behind it.
    await expect(
      signInAs(magicLink, { verificationRequest: true }),
    ).resolves.toBe(true);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.invitation.update).not.toHaveBeenCalled();
  });

  it("the link CLICK (second call, no email param) grants it AND takes ownership of the pre-registered row", async () => {
    await expect(signInAs(magicLink)).resolves.toBe(true);
    // Ownership first: the attacker's password is cleared and the address
    // stamped verified, so the role below lands on a row only the mailbox
    // owner can get into.
    expect(ownershipStamp()).toEqual({
      where: { id: IMPOSTOR },
      data: { emailVerified: expect.any(Date), password: null },
    });
    expect(roleGrant()).toEqual({
      where: { id: IMPOSTOR },
      data: { role: "admin" },
    });
    expect(pick(firstArg(db.invitation.update), "data.status")).toBe(
      "ACCEPTED",
    );
  });

  it("a row that is unverified but has no password is stamped verified without clearing anything", async () => {
    db.user.findUnique.mockResolvedValue({
      ...USERS[IMPOSTOR],
      emailVerified: null,
      password: null,
    });
    await signInAs(magicLink);
    expect(ownershipStamp()).toEqual({
      where: { id: IMPOSTOR },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("an already-verified row is left alone (no ownership update)", async () => {
    db.user.findUnique.mockResolvedValue({
      ...USERS[IMPOSTOR],
      emailVerified: new Date("2026-10-01T00:00:00Z"),
      password: "$2a$10$legit-hash",
    });
    await signInAs(magicLink);
    expect(ownershipStamp()).toBeUndefined();
    expect(roleGrant()).toBeDefined();
  });

  it("credentials never verify", async () => {
    await signInAs({
      provider: "credentials",
      type: "credentials",
      providerAccountId: IMPOSTOR,
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("Google verifies only with email_verified=true; Discord only with verified=true", async () => {
    const google = {
      provider: "google",
      type: "oauth",
      providerAccountId: "google-subject",
    } as SignInParams["account"];
    const discord = {
      provider: "discord",
      type: "oauth",
      providerAccountId: "discord-subject",
    } as SignInParams["account"];

    // Provider says the address is NOT verified (or says nothing): no grant.
    await signInAs(google, undefined, { email_verified: false });
    await signInAs(google, undefined, {});
    await signInAs(discord, undefined, { verified: false });
    await signInAs(discord, undefined, undefined);
    expect(db.user.update).not.toHaveBeenCalled();

    await signInAs(google, undefined, { email_verified: true });
    expect(roleGrant()).toBeDefined();
    db.user.update.mockClear();

    await signInAs(discord, undefined, { verified: true });
    expect(roleGrant()).toBeDefined();
  });
});

// ── POST /api/auth/register ─────────────────────────────────────────────

describe("POST /api/auth/register — invitations go through acceptPendingInvitations", () => {
  const inviteeEmail = `${IMPOSTOR}@example.test`;
  const TOKEN = "tok_global_admin";
  const body = {
    name: "Mallory",
    email: inviteeEmail,
    password: "Str0ng!Passw0rd",
    invitationToken: TOKEN,
  };

  interface RegisterResponse {
    status: number;
    body: {
      error?: string;
      message?: string;
      userExists?: boolean;
      user?: { role?: string | null };
      invitation?: { type: string };
    };
  }

  async function register(payload: Record<string, unknown> = body) {
    return (await registerPost({
      json: async () => payload,
    } as unknown as NextRequest)) as unknown as RegisterResponse;
  }

  /** Seeds the invitation both by token (the route) and as pending for its email (acceptPendingInvitations). */
  function seedInvitation(overrides: Record<string, unknown> = {}) {
    const row = {
      ...globalAdminInvitation,
      token: TOKEN,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
    };
    db.invitation.findUnique.mockImplementation(
      async (args: { where: { token?: string } }) =>
        args.where.token === TOKEN ? row : null,
    );
    db.invitation.findMany.mockResolvedValue([row]);
    return row;
  }

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    seedInvitation();
  });

  it("existing-user branch: an unverified (credentials-only) account is NOT promoted and the invitation stays PENDING", async () => {
    const result = await register();
    expect(result.status).toBe(409);
    expect(result.body.userExists).toBe(true);
    expect(result.body.invitation?.type).toBe("GLOBAL_ADMIN");
    // Nothing was granted.
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.invitation.update).not.toHaveBeenCalled();
    expect(result.body.error).not.toContain("promoted");
  });

  it("existing-user branch: an OAuth Account row alone is NOT proof (Discord can carry an unverified address); same 409 message either way", async () => {
    const unverified = await register();
    db.account.findFirst.mockResolvedValue({ id: "account_discord" });
    const stillUnverified = await register();
    expect(stillUnverified.status).toBe(409);
    expect(stillUnverified.body.error).toBe(unverified.body.error);
    // The route never consults Account rows; only User.emailVerified counts.
    expect(db.account.findFirst).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.invitation.update).not.toHaveBeenCalled();
  });

  it("existing-user branch: User.emailVerified (stamped by a verified sign-in) IS promoted, with the same 409 message (no grant oracle)", async () => {
    const unverified = await register();
    db.user.findUnique.mockImplementation(
      async (args: { where: { id?: string; email?: string } }) =>
        args.where.id === IMPOSTOR || args.where.email === inviteeEmail
          ? {
              ...USERS[IMPOSTOR],
              emailVerified: new Date("2026-10-01T00:00:00Z"),
            }
          : null,
    );
    const verified = await register();
    expect(verified.status).toBe(409);
    expect(verified.body.error).toBe(unverified.body.error);
    expect(db.account.findFirst).not.toHaveBeenCalled();
    expect(firstArg(db.user.update)).toEqual({
      where: { id: IMPOSTOR },
      data: { role: "admin" },
    });
    expect(pick(firstArg(db.invitation.update), "data.status")).toBe(
      "ACCEPTED",
    );
  });

  it("existing-user branch: an EVENT_ROLE invitation is still accepted without verification (tracked follow-up)", async () => {
    seedInvitation({
      id: "inv_event",
      type: "EVENT_ROLE",
      eventId: EVENT_A,
      roleId: "role_mentor",
      globalRole: null,
      event: { name: "Event A" },
      role: { name: "mentor" },
    });
    const result = await register();
    expect(result.status).toBe(409);
    expect(result.body.error).toContain("has been accepted");
    expect(pick(firstArg(db.userRole.create), "data.userId")).toBe(IMPOSTOR);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("new-user branch: a credentials sign-up leaves a GLOBAL_ADMIN invitation PENDING and reports the real DB role", async () => {
    const newcomerEmail = "newcomer@example.test";
    seedInvitation({ email: newcomerEmail });
    db.user.create.mockResolvedValue({
      id: "newcomer",
      name: "Newcomer",
      email: newcomerEmail,
      role: "user",
    });

    const result = await register({
      ...body,
      name: "Newcomer",
      email: newcomerEmail,
    });
    expect(result.status).toBe(201);
    expect(result.body.user?.role).toBe("user");
    expect(result.body.invitation?.type).toBe("GLOBAL_ADMIN");
    expect(result.body.message).not.toContain("as global admin");
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.invitation.update).not.toHaveBeenCalled();
  });
});

// ── validateApiKey.ts ───────────────────────────────────────────────────

describe("validateApiKey — fails closed, constant-time compare", () => {
  const KEY = "unit-test-mastra-key-0123456789";

  function request(headers: Record<string, string>) {
    return new Request("http://localhost/api/mastra", { headers });
  }

  it("validateMastraApiKey refuses everything while no key is configured (empty or unset)", () => {
    vi.stubEnv("MASTRA_API_KEY", "");
    expect(validateMastraApiKey(request({ authorization: "Bearer " }))).toBe(
      false,
    );
    expect(validateMastraApiKey(request({ authorization: "Bearer" }))).toBe(
      false,
    );
    vi.stubEnv("MASTRA_API_KEY", undefined);
    expect(validateMastraApiKey(request({ authorization: "Bearer " }))).toBe(
      false,
    );
  });

  it("validateMastraApiKey rejects a missing header, a wrong-length key and a same-length wrong key, and accepts the right one", () => {
    vi.stubEnv("MASTRA_API_KEY", KEY);
    expect(validateMastraApiKey(request({}))).toBe(false);
    expect(
      validateMastraApiKey(
        request({ authorization: `Bearer ${KEY.slice(0, -1)}` }),
      ),
    ).toBe(false);
    expect(
      validateMastraApiKey(
        request({ authorization: `Bearer ${KEY.slice(0, -1)}X` }),
      ),
    ).toBe(false);
    expect(validateMastraApiKey(request({ authorization: `Bearer ${KEY}` }))).toBe(
      true,
    );
  });

  it("validateTranscriptionApiKey throws while unset and applies the same compare", () => {
    vi.stubEnv("TRANSCRIPTION_API_KEY", undefined);
    expect(() =>
      validateTranscriptionApiKey(request({ "x-api-key": KEY })),
    ).toThrow(/TRANSCRIPTION_API_KEY/);

    vi.stubEnv("TRANSCRIPTION_API_KEY", KEY);
    expect(validateTranscriptionApiKey(request({}))).toBe(false);
    expect(
      validateTranscriptionApiKey(request({ "x-api-key": KEY.slice(0, -1) })),
    ).toBe(false);
    expect(
      validateTranscriptionApiKey(
        request({ "x-api-key": `${KEY.slice(0, -1)}X` }),
      ),
    ).toBe(false);
    expect(validateTranscriptionApiKey(request({ "x-api-key": KEY }))).toBe(
      true,
    );
  });
});

// ── Regression guard: `email: true` in router selects ──────────────────

describe("guard: email selects in routers", () => {
  const ROUTERS_DIR = fileURLToPath(
    new URL("../../src/server/api/routers/", import.meta.url),
  );
  const APP_DIR = fileURLToPath(new URL("../../src/app/", import.meta.url));
  const PROCEDURE_RE =
    /^ {2}([A-Za-z0-9_]+):\s*(publicProcedure|protectedProcedure|adminProcedure|adminOrStaffProcedure)\b/;
  const EMAIL_SELECT_RE = /\bemail:\s*true\b/;
  // SECURITY: protectedProcedure is not a trust boundary (anyone can
  // self-register), so a protectedProcedure that selects email must gate
  // in-body. These are the gates the routers use today; a procedure that
  // selects email with none of them, and is not allow-listed below, fails
  // this suite. It is a tripwire, not a proof: the runtime tests above are
  // the proof for the procedures this PR touched.
  const GATE_MARKER_RE =
    /\b(checkAdminAccess|assertAdminOrEventFloorOwner|isAdminOrStaff|isAdminOrStaffInDb|assertSponsorAccessForEvent|assertCanEditProject|assertCanManageSession|assertCanManageVenue)\(|ctx\.session\.user\.role\b/;

  // Each entry is a public procedure that selects an email on purpose and
  // only ever returns the CALLER'S OWN address:
  //   passwordReset.* — the unguessable reset token is the credential; the
  //     account is looked up by it (or by the address the caller typed) and
  //     requestReset answers with a uniform message regardless.
  //   user.create — self-registration returns the registrant's own new row.
  // Adding an entry here needs the same justification in a code comment.
  const PUBLIC_ALLOW_LIST = new Set([
    "passwordReset.requestReset",
    "passwordReset.validateToken",
    "passwordReset.resetPassword",
    "user.create",
  ]);

  // Each entry is a protectedProcedure that selects an email on purpose and
  // carries no gate marker because it only ever returns the CALLER'S OWN rows
  // (or rows an admin created for the caller). Adding an entry here needs the
  // same justification in a code comment.
  const PROTECTED_ALLOW_LIST = new Set([
    // where.userId is the caller
    "askOffer.getUserAsksOffers",
    // the evaluation is looked up by (applicationId, reviewerId = caller)
    "evaluation.autoScoreApplication",
    // where.reviewerId is the caller; rows exist only once an admin assigned them
    "evaluation.getMyAssignments",
    // returns the caller's freshly created event: createdBy is the caller and
    // userRoles is empty
    "event.createEvent",
    // in-body creator / ORGANIZER / ADMIN UserRole check on that event before
    // anything is read back
    "event.updateEvent",
    // selects the caller's own email to accept the caller's own invitations
    "invitation.accept",
    // where.senderId is the caller
    "praise.getMySentPraise",
    // where.recipientId is the caller
    "praise.getMyReceivedPraise",
    // where.userId is the caller
    "profile.getMyProfile",
    // upserts the caller's own profile
    "profile.updateProfile",
  ]);

  interface ScannedProcedure {
    id: string;
    kind: string;
    file: string;
    line: number;
    body: string[];
  }

  function scanRouterSource(
    router: string,
    file: string,
    source: string,
  ): ScannedProcedure[] {
    const lines = source.split("\n");
    const starts: Array<{ line: number; name: string; kind: string }> = [];
    lines.forEach((text, index) => {
      const match = PROCEDURE_RE.exec(text);
      if (match) starts.push({ line: index, name: match[1]!, kind: match[2]! });
    });
    return starts.map((start, index) => ({
      id: `${router}.${start.name}`,
      kind: start.kind,
      file,
      line: start.line,
      body: lines.slice(start.line, starts[index + 1]?.line ?? lines.length),
    }));
  }

  function scanRouters(): ScannedProcedure[] {
    return readdirSync(ROUTERS_DIR)
      .filter((file) => file.endsWith(".ts"))
      .flatMap((file) =>
        scanRouterSource(
          path.basename(file, ".ts"),
          file,
          readFileSync(path.join(ROUTERS_DIR, file), "utf8"),
        ),
      );
  }

  /**
   * `router.name (file:line)` for every procedure of `kind` that selects
   * email without being allow-listed or, for protectedProcedure, carrying a
   * gate marker.
   */
  function offenders(
    procedures: ScannedProcedure[],
    kind: "publicProcedure" | "protectedProcedure",
    allowList: Set<string>,
  ): string[] {
    const result: string[] = [];
    for (const procedure of procedures) {
      if (procedure.kind !== kind || allowList.has(procedure.id)) continue;
      const emailLine = procedure.body.findIndex((text) =>
        EMAIL_SELECT_RE.test(text),
      );
      if (emailLine < 0) continue;
      if (
        kind === "protectedProcedure" &&
        procedure.body.some((text) => GATE_MARKER_RE.test(text))
      ) {
        continue;
      }
      result.push(
        `${procedure.id} (${procedure.file}:${procedure.line + emailLine + 1})`,
      );
    }
    return result;
  }

  /** Every allow-listed entry must still exist with that procedure kind (regex / rename rot guard). */
  function expectAllowListCurrent(
    procedures: ScannedProcedure[],
    kind: string,
    allowList: Set<string>,
  ) {
    const seen = new Set(
      procedures.filter((p) => p.kind === kind).map((p) => p.id),
    );
    for (const id of allowList) {
      expect(seen.has(id), `${id} is no longer a ${kind}`).toBe(true);
    }
  }

  it("no public procedure outside the allow-list selects email", () => {
    const procedures = scanRouters();
    expect(offenders(procedures, "publicProcedure", PUBLIC_ALLOW_LIST)).toEqual(
      [],
    );
    // The scan itself must still be seeing the routers (regex rot guard) …
    expect(
      procedures.filter((p) => p.kind === "publicProcedure").length,
    ).toBeGreaterThan(50);
    // … and every allow-listed entry must still exist as a public procedure.
    expectAllowListCurrent(procedures, "publicProcedure", PUBLIC_ALLOW_LIST);
  });

  it("every protectedProcedure that selects email is gated in-body or allow-listed as self-scoped", () => {
    const procedures = scanRouters();
    expect(
      offenders(procedures, "protectedProcedure", PROTECTED_ALLOW_LIST),
    ).toEqual([]);
    expect(
      procedures.filter((p) => p.kind === "protectedProcedure").length,
    ).toBeGreaterThan(200);
    expectAllowListCurrent(
      procedures,
      "protectedProcedure",
      PROTECTED_ALLOW_LIST,
    );
  });

  it("the scanner itself reports an ungated member-reachable email select (tripwire self-test)", () => {
    const source = [
      "export const leakyRouter = createTRPCRouter({",
      "  listEveryone: protectedProcedure.query(async ({ ctx }) =>",
      "    ctx.db.user.findMany({ select: { id: true, email: true } }),",
      "  ),",
      "  listMine: protectedProcedure.query(async ({ ctx }) =>",
      "    ctx.db.user.findMany({",
      "      where: { id: ctx.session.user.id },",
      "      select: { id: true, email: true },",
      "    }),",
      "  ),",
      "  listForStaff: protectedProcedure.query(async ({ ctx }) => {",
      "    checkAdminAccess(ctx.session.user.role);",
      "    return ctx.db.user.findMany({ select: { id: true, email: true } });",
      "  }),",
      "});",
    ].join("\n");
    const procedures = scanRouterSource("leaky", "leaky.ts", source);
    // Self-scoping alone is not a marker: it needs an allow-list entry.
    expect(offenders(procedures, "protectedProcedure", new Set())).toEqual([
      "leaky.listEveryone (leaky.ts:3)",
      "leaky.listMine (leaky.ts:8)",
    ]);
    expect(
      offenders(procedures, "protectedProcedure", new Set(["leaky.listMine"])),
    ).toEqual(["leaky.listEveryone (leaky.ts:3)"]);
  });

  it("the public schedule-card pages select no speaker email", () => {
    for (const page of [
      "events/[eventId]/schedule-card/[sessionId]/page.tsx",
      "events/[eventId]/schedule-cards/[venueId]/page.tsx",
    ]) {
      expect(readFileSync(path.join(APP_DIR, page), "utf8"), page).not.toMatch(
        EMAIL_SELECT_RE,
      );
    }
    // The card component's Speaker shape carries no email field either.
    expect(
      readFileSync(
        path.join(
          APP_DIR,
          "events/[eventId]/schedule-card/[sessionId]/ScheduleCard.tsx",
        ),
        "utf8",
      ),
    ).not.toMatch(/^\s*email\??:/m);
  });

  it("the committed webhook test script stays deleted", () => {
    // test-webhook-manually.sh carried the live TELEGRAM_WEBHOOK_SECRET in
    // the public repo (dc29782, 2025-10-31 → 2026-10-21). It was deleted in
    // this PR and the secret rotated per docs/security/telegram-webhook-rotation.md;
    // nothing may bring the file back.
    const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
    expect(existsSync(path.join(repoRoot, "test-webhook-manually.sh"))).toBe(
      false,
    );
  });
});

/**
 * Playwright E2E Global Setup
 *
 * Prepares the development database with test accounts before E2E tests run.
 * - Ensures the seeded admin (admin@realfi.com) has a known password
 * - Creates a regular test user for non-admin scenarios
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Must satisfy: ≥8 chars, uppercase, lowercase, digit */
export const TEST_ADMIN_EMAIL = "admin@realfi.com";
export const TEST_ADMIN_PASSWORD = "E2eAdmin123!";

export const TEST_USER_EMAIL = "e2e-tester@test.example";
export const TEST_USER_PASSWORD = "E2eUser123!";

export const TEST_SPEAKER_EMAIL = "e2e-speaker@test.example";
export const TEST_SPEAKER_PASSWORD = "E2eSpeaker123!";

export default async function globalSetup() {
  const db = new PrismaClient();

  try {
    const adminHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, SALT_ROUNDS);
    const userHash = await bcrypt.hash(TEST_USER_PASSWORD, SALT_ROUNDS);
    const speakerHash = await bcrypt.hash(TEST_SPEAKER_PASSWORD, SALT_ROUNDS);

    // Set a known password on the seeded admin account
    await db.user.update({
      where: { email: TEST_ADMIN_EMAIL },
      data: { password: adminHash },
    });

    // Upsert a regular test user
    await db.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: { password: userHash },
      create: {
        email: TEST_USER_EMAIL,
        firstName: "E2E",
        surname: "Tester",
        name: "E2E Tester",
        password: userHash,
      },
    });

    // Upsert a speaker test user (used by golden-path test)
    // Delete any prior speaker application so the golden-path starts fresh
    const speakerUser = await db.user.upsert({
      where: { email: TEST_SPEAKER_EMAIL },
      update: { password: speakerHash },
      create: {
        email: TEST_SPEAKER_EMAIL,
        firstName: "E2E",
        surname: "Speaker",
        name: "E2E Speaker",
        password: speakerHash,
      },
    });

    // Clean up any stale applications from previous test runs
    await db.applicationResponse.deleteMany({
      where: { application: { userId: speakerUser.id } },
    });
    await db.applicationVenue.deleteMany({
      where: { application: { userId: speakerUser.id } },
    });
    await db.application.deleteMany({
      where: { userId: speakerUser.id },
    });

    // Create a fresh SUBMITTED speaker application for the golden-path test
    const event = await db.event.findFirst({
      where: { slug: "example-conf" },
    });
    if (event) {
      await db.application.create({
        data: {
          userId: speakerUser.id,
          eventId: event.id,
          email: TEST_SPEAKER_EMAIL,
          applicationType: "SPEAKER",
          status: "SUBMITTED",
          isComplete: true,
          submittedAt: new Date(),
        },
      });
    }
  } finally {
    await db.$disconnect();
  }
}

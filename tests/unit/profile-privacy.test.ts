/**
 * Unit tests for the shared profile-privacy helpers
 * (src/server/api/utils/profilePrivacy.ts) used by the public profile and
 * project procedures. Pure functions, no database.
 *
 * Viewer personas:
 *   anonymous — no session
 *   impostor  — a self-registered ordinary member who is NOT the owner
 *               (a session is not a trust boundary; must get the same answer
 *               as anonymous everywhere)
 *   owner     — the profile's own user
 *   staff / admin — privileged
 */

import { describe, it, expect } from "vitest";
import {
  PRIVATE_PROFILE_FIELDS,
  canViewProfile,
  isProfileOwnerOrPrivileged,
  memberVisibilityFilter,
  profileVisibilityFilter,
  redactProfileFields,
  stripPrivateProfileFields,
} from "~/server/api/utils/profilePrivacy";

const OWNER_ID = "user_owner";

const anonymous = null;
const impostor = { id: "user_impostor", role: "user" };
const owner = { id: OWNER_ID, role: "user" };
const staff = { id: "user_staff", role: "staff" };
const admin = { id: "user_admin", role: "admin" };

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile_1",
    userId: OWNER_ID,
    bio: "Public bio",
    jobTitle: "Engineer",
    avatarUrl: "https://example.com/a.png",
    phoneNumber: "+1 555 0100",
    telegramHandle: "@owner",
    telegramChatId: "123456",
    discordHandle: "owner#0001",
    speakerCoHostInfo: "Co-host: someone, someone@example.com",
    priorExperience: "Copied from the application form",
    mentorPreferredContact: "telegram @owner",
    isPublic: true,
    ...overrides,
  };
}

describe("PRIVATE_PROFILE_FIELDS", () => {
  it("covers every contact field plus the application-derived text", () => {
    expect([...PRIVATE_PROFILE_FIELDS].sort()).toEqual(
      [
        "phoneNumber",
        "telegramHandle",
        "telegramChatId",
        "discordHandle",
        "speakerCoHostInfo",
        "priorExperience",
        "mentorPreferredContact",
      ].sort(),
    );
  });
});

describe("stripPrivateProfileFields", () => {
  it("nulls every private field for a non-privileged caller", () => {
    const out = stripPrivateProfileFields(profileRow(), false);
    for (const field of PRIVATE_PROFILE_FIELDS) {
      expect(out[field]).toBeNull();
    }
  });

  it("keeps the public fields intact", () => {
    const out = stripPrivateProfileFields(profileRow(), false);
    expect(out.bio).toBe("Public bio");
    expect(out.jobTitle).toBe("Engineer");
    expect(out.avatarUrl).toBe("https://example.com/a.png");
    expect(out.userId).toBe(OWNER_ID);
    expect(out.isPublic).toBe(true);
  });

  it("does not mutate the input row", () => {
    const row = profileRow();
    stripPrivateProfileFields(row, false);
    expect(row.phoneNumber).toBe("+1 555 0100");
  });

  it("returns the row untouched for a privileged caller", () => {
    const row = profileRow();
    expect(stripPrivateProfileFields(row, true)).toBe(row);
  });

  it("passes null / undefined through", () => {
    expect(stripPrivateProfileFields(null, false)).toBeNull();
    expect(stripPrivateProfileFields(undefined, false)).toBeUndefined();
  });

  it("does not add keys that were not selected", () => {
    const out = stripPrivateProfileFields({ bio: "x", jobTitle: "y" }, false);
    expect(Object.keys(out).sort()).toEqual(["bio", "jobTitle"]);
  });
});

describe("isProfileOwnerOrPrivileged", () => {
  it("anonymous is never privileged", () => {
    expect(isProfileOwnerOrPrivileged(OWNER_ID, anonymous)).toBe(false);
  });

  it("impostor (logged-in non-owner) is not privileged", () => {
    expect(isProfileOwnerOrPrivileged(OWNER_ID, impostor)).toBe(false);
  });

  it("owner is privileged for their own profile only", () => {
    expect(isProfileOwnerOrPrivileged(OWNER_ID, owner)).toBe(true);
    expect(isProfileOwnerOrPrivileged("someone_else", owner)).toBe(false);
  });

  it("staff and admin are privileged for any profile", () => {
    expect(isProfileOwnerOrPrivileged(OWNER_ID, staff)).toBe(true);
    expect(isProfileOwnerOrPrivileged(OWNER_ID, admin)).toBe(true);
    expect(isProfileOwnerOrPrivileged(undefined, admin)).toBe(true);
  });

  it("a missing profile owner never matches a member", () => {
    expect(isProfileOwnerOrPrivileged(undefined, owner)).toBe(false);
    expect(isProfileOwnerOrPrivileged(null, impostor)).toBe(false);
  });
});

describe("canViewProfile", () => {
  const publicProfile = { userId: OWNER_ID, isPublic: true };
  const hiddenProfile = { userId: OWNER_ID, isPublic: false };

  it("a public profile is visible to everyone", () => {
    for (const viewer of [anonymous, impostor, owner, staff, admin]) {
      expect(canViewProfile(publicProfile, viewer)).toBe(true);
    }
  });

  it("a hidden profile is invisible to anonymous and impostor", () => {
    expect(canViewProfile(hiddenProfile, anonymous)).toBe(false);
    expect(canViewProfile(hiddenProfile, impostor)).toBe(false);
  });

  it("a hidden profile is visible to its owner and to staff/admin", () => {
    expect(canViewProfile(hiddenProfile, owner)).toBe(true);
    expect(canViewProfile(hiddenProfile, staff)).toBe(true);
    expect(canViewProfile(hiddenProfile, admin)).toBe(true);
  });

  it("treats a missing isPublic as public (column default)", () => {
    expect(canViewProfile({ userId: OWNER_ID }, anonymous)).toBe(true);
    expect(canViewProfile({ userId: OWNER_ID, isPublic: null }, impostor)).toBe(
      true,
    );
  });
});

describe("profileVisibilityFilter (UserProfile listings)", () => {
  it("is undefined for staff/admin so privileged behaviour is unchanged", () => {
    expect(profileVisibilityFilter(staff)).toBeUndefined();
    expect(profileVisibilityFilter(admin)).toBeUndefined();
  });

  it("anonymous only sees public profiles", () => {
    expect(profileVisibilityFilter(anonymous)).toEqual({
      OR: [{ isPublic: true }],
    });
  });

  it("a member sees public profiles plus their own", () => {
    expect(profileVisibilityFilter(impostor)).toEqual({
      OR: [{ isPublic: true }, { userId: impostor.id }],
    });
  });
});

describe("memberVisibilityFilter (User directory)", () => {
  it("is undefined for staff/admin", () => {
    expect(memberVisibilityFilter(staff)).toBeUndefined();
    expect(memberVisibilityFilter(admin)).toBeUndefined();
  });

  it("anonymous sees users without a profile row and public profiles", () => {
    expect(memberVisibilityFilter(anonymous)).toEqual({
      OR: [{ profile: { is: null } }, { profile: { isPublic: true } }],
    });
  });

  it("a member additionally sees themselves", () => {
    expect(memberVisibilityFilter(owner)).toEqual({
      OR: [
        { profile: { is: null } },
        { profile: { isPublic: true } },
        { id: OWNER_ID },
      ],
    });
  });
});

describe("redactProfileFields (hidden-profile shape)", () => {
  it("keeps every key and nulls every value", () => {
    const snippet = {
      jobTitle: "Engineer",
      company: "ACME",
      location: "Lisbon",
      bio: "hello",
      githubUrl: "https://github.com/x",
    };
    const out = redactProfileFields(snippet);
    expect(Object.keys(out).sort()).toEqual(Object.keys(snippet).sort());
    for (const value of Object.values(out)) expect(value).toBeNull();
  });

  it("does not mutate the input", () => {
    const snippet = { jobTitle: "Engineer" };
    redactProfileFields(snippet);
    expect(snippet.jobTitle).toBe("Engineer");
  });
});

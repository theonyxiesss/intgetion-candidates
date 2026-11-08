import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@intgetion/kit";
import { setCandidatesPorts, type SharedFacts } from "../../ports";
import {
  getCandidateForViewer,
  getOwnCandidate,
  getSellerStorefronts,
  hasCandidateProfile,
  saveCandidateProfile,
  setProfileHidden,
  updateCandidateInput,
} from "./service";

const candidate = randomUUID();
const employer = randomUUID();
const stranger = randomUUID();
const reactId = randomUUID();
const noted: { userId: string; facts: SharedFacts; tx: unknown }[] = [];
let factsFail = false;

setCandidatesPorts({
  normalizeSkill: async (raw) =>
    raw.trim().toLowerCase() === "react"
      ? { result: "matched", skillId: reactId, slug: "react" }
      : { result: "suggested", suggestionId: randomUUID(), normalized: raw, occurrences: 1 },
  findContactEmail: async (id) => (id === candidate ? "anna@example.com" : null),
  writeSharedFacts: async (userId, facts, _mode, tx) => {
    if (factsFail) throw new Error("users service down");
    noted.push({ userId, facts, tx });
    if (tx) {
      await (tx as ReturnType<typeof getDb>).execute(sql`
        insert into public.user_profiles (user_id, display_name, timezone)
        values (${userId}, ${facts.displayName ?? null}, ${facts.timezone ?? null})
        on conflict (user_id) do update
          set display_name = excluded.display_name, timezone = excluded.timezone
      `);
    }
  },
  employerCanSeeCandidate: async (viewerId) => viewerId === employer,
});

const form = (overrides: Record<string, unknown> = {}) =>
  updateCandidateInput.parse({
    fullName: "Anna Kowalska",
    headline: "Senior React engineer",
    desiredTitles: ["Frontend engineer"],
    country: "pl",
    timezone: "Europe/Warsaw",
    workHoursStart: "09:00",
    workHoursEnd: "17:00",
    workDays: [1, 2, 3, 4, 5],
    workFormats: ["remote"],
    employmentTypes: ["full_time"],
    skills: [
      { raw: "React", level: "expert" },
      { raw: "Underwater basket weaving", level: "novice" },
    ],
    experience: [],
    languages: [{ lang: "en", level: "C1" }],
    ...overrides,
  });

beforeAll(async () => {
  await getDb().execute(sql`
    insert into public.users (id, auth_uid) values
      (${candidate}, ${randomUUID()}), (${employer}, ${randomUUID()}), (${stranger}, ${randomUUID()})
  `);
  await getDb().execute(sql`
    insert into public.skills (id, slug, name_en, name_ru) values (${reactId}, ${"react-" + reactId.slice(0, 8)}, 'React', 'React')
  `);
  await getDb().execute(sql`insert into public.candidate_profiles (user_id) values (${candidate})`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from public.users where id in (${candidate}, ${employer}, ${stranger})`);
  await getDb().execute(sql`delete from public.skills where id = ${reactId}`);
});

beforeEach(() => {
  factsFail = false;
  noted.length = 0;
});

describe("candidate profiles in Postgres", () => {
  it("saves the form, resolves known skills and reports unknown ones", async () => {
    const saved = await saveCandidateProfile(candidate, form());
    expect(saved.skills.map((skill) => skill.skillId)).toEqual([reactId]);
    expect(saved.unrecognizedSkills).toEqual(["Underwater basket weaving"]);
    expect(saved.completeness).toBeGreaterThan(0);
    expect(noted).toHaveLength(1);
    expect(noted[0]!.facts).toMatchObject({ displayName: "Anna Kowalska", country: "PL" });
    expect(noted[0]!.tx).toBeTruthy();

    const own = await getOwnCandidate(candidate);
    expect(own?.headline).toBe("Senior React engineer");
    expect(own?.fullName).toBe("Anna Kowalska");
  });

  it("fails the whole save when the shared profile cannot be written (D509)", async () => {
    factsFail = true;
    await expect(
      saveCandidateProfile(candidate, form({ headline: "Should not be stored" })),
    ).rejects.toThrow("users service down");
    expect((await getOwnCandidate(candidate))?.headline).toBe("Senior React engineer");
  });

  it("shows the profile to itself and an allowed employer only", async () => {
    await expect(getCandidateForViewer(candidate, candidate)).resolves.toBeTruthy();
    await expect(getCandidateForViewer(employer, candidate)).resolves.toBeTruthy();
    await expect(getCandidateForViewer(stranger, candidate)).rejects.toMatchObject({ status: 404 });
    await expect(getCandidateForViewer(candidate, "not-a-uuid")).rejects.toMatchObject({ status: 404 });
  });

  it("hides the profile and gives storefronts only public fields", async () => {
    expect(await setProfileHidden(candidate, true)).toBe(true);
    expect((await getOwnCandidate(candidate))?.isHidden).toBe(true);
    const fronts = await getSellerStorefronts([candidate, stranger]);
    const front = fronts.get(candidate);
    expect(front).toBeTruthy();
    expect(JSON.stringify(front)).not.toContain("anna@example.com");
    expect(fronts.has(stranger)).toBe(false);
  });

  it("knows who has a profile", async () => {
    expect(await hasCandidateProfile(candidate)).toBe(true);
    expect(await hasCandidateProfile(stranger)).toBe(false);
    await expect(setProfileHidden(stranger, true)).rejects.toMatchObject({ status: 404 });
  });
});

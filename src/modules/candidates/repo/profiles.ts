import { asc, eq } from "drizzle-orm";
import { getDb } from "@intgetion/kit";
import {
  candidateExperience,
  candidatePreferences,
  candidateProfiles,
  candidateSkills,
} from "../../../db/candidates-schema";
import { skills, userProfiles } from "../../../db/foreign";
import type { UpdateCandidateInput } from "../schemas";

type Database = ReturnType<typeof getDb>;
export type AppTx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Conn = Database | AppTx;

function clock(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function monthDate(value: string): string {
  return value.length === 7 ? `${value}-01` : value;
}

function trimChar(value: string | null): string | null {
  const trimmed = value?.trim() ?? null;
  return trimmed ? trimmed : null;
}

function hourMinute(value: string): string {
  return value.slice(0, 5);
}

function yearMonth(value: string): string {
  return value.slice(0, 7);
}

export type ResolvedSkill = {
  skillId: string;
  level: UpdateCandidateInput["skills"][number]["level"];
  years: number | null;
};

export async function hasProfile(userId: string, conn: Conn = getDb()) {
  const [row] = await conn
    .select({ userId: candidateProfiles.userId })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);
  return Boolean(row);
}

export async function loadProfile(userId: string, conn: Conn = getDb()) {
  const [profile] = await conn
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;

  const [skillRows, experienceRows, preferenceRows, sharedRows] =
    await Promise.all([
      conn
        .select({
          skillId: candidateSkills.skillId,
          level: candidateSkills.level,
          years: candidateSkills.years,
          slug: skills.slug,
          nameEn: skills.nameEn,
          nameRu: skills.nameRu,
        })
        .from(candidateSkills)
        .innerJoin(skills, eq(skills.id, candidateSkills.skillId))
        .where(eq(candidateSkills.candidateId, userId))
        .orderBy(asc(skills.slug)),
      conn
        .select()
        .from(candidateExperience)
        .where(eq(candidateExperience.candidateId, userId))
        .orderBy(asc(candidateExperience.sort)),
      conn
        .select()
        .from(candidatePreferences)
        .where(eq(candidatePreferences.userId, userId))
        .limit(1),
      conn
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1),
    ]);

  return {
    profile,
    skills: skillRows,
    experience: experienceRows,
    preferences: preferenceRows[0] ?? null,
    shared: sharedRows.at(0) ?? null,
  };
}

const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2", "native"]);
type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native";

/**
 * Languages shown and edited come from the shared profile (D509); a
 * language without a level reads as B1, as in matching (D507).
 */
function sharedLanguages(
  loaded: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
): { lang: string; level: CefrLevel }[] {
  return (loaded.shared?.languages ?? []).map((item) => ({
    lang: item.code,
    level: (item.level && LEVELS.has(item.level)
      ? item.level
      : "B1") as CefrLevel,
  }));
}

export async function saveProfile(
  userId: string,
  input: UpdateCandidateInput,
  resolvedSkills: ResolvedSkill[],
  completeness: number,
  conn: Conn = getDb(),
) {
  const salaryReady = input.salaryMin !== null || input.salaryMax !== null;
  await conn
    .insert(candidateProfiles)
    .values({
      userId,
      headline: input.headline,
      desiredTitles: [...input.desiredTitles],
      workHoursStart: clock(input.workHoursStart),
      workHoursEnd: clock(input.workHoursEnd),
      workDays: input.workDays,
      workFormats: input.workFormats,
      employmentTypes: input.employmentTypes,
      experienceYears: input.experienceYears,
      availabilityDate: input.availabilityDate,
      salaryMin: input.salaryMin === null ? null : BigInt(input.salaryMin),
      salaryMax: input.salaryMax === null ? null : BigInt(input.salaryMax),
      salaryCurrency: salaryReady ? input.salaryCurrency : null,
      salaryPeriod: salaryReady ? input.salaryPeriod : null,
      salaryBasis: salaryReady ? input.salaryBasis : null,
      minOverlapHours: input.minOverlapHours,
      summary: input.summary,
      isHidden: input.isHidden,
      jobSearchStatus: input.jobSearchStatus ?? "active",
      completeness,
    })
    .onConflictDoUpdate({
      target: candidateProfiles.userId,
      set: {
        headline: input.headline,
        desiredTitles: [...input.desiredTitles],
        workHoursStart: clock(input.workHoursStart),
        workHoursEnd: clock(input.workHoursEnd),
        workDays: input.workDays,
        workFormats: input.workFormats,
        employmentTypes: input.employmentTypes,
        experienceYears: input.experienceYears,
        availabilityDate: input.availabilityDate,
        salaryMin: input.salaryMin === null ? null : BigInt(input.salaryMin),
        salaryMax: input.salaryMax === null ? null : BigInt(input.salaryMax),
        salaryCurrency: salaryReady ? input.salaryCurrency : null,
        salaryPeriod: salaryReady ? input.salaryPeriod : null,
        salaryBasis: salaryReady ? input.salaryBasis : null,
        minOverlapHours: input.minOverlapHours,
        summary: input.summary,
        isHidden: input.isHidden,
        ...(input.jobSearchStatus
          ? { jobSearchStatus: input.jobSearchStatus }
          : {}),
        completeness,
      },
    });

  await conn
    .delete(candidateSkills)
    .where(eq(candidateSkills.candidateId, userId));
  if (resolvedSkills.length > 0) {
    await conn.insert(candidateSkills).values(
      resolvedSkills.map((skill) => ({
        candidateId: userId,
        skillId: skill.skillId,
        level: skill.level,
        years: skill.years,
      })),
    );
  }

  await conn
    .delete(candidateExperience)
    .where(eq(candidateExperience.candidateId, userId));
  if (input.experience.length > 0) {
    await conn.insert(candidateExperience).values(
      input.experience.map((item, index) => ({
        candidateId: userId,
        companyName: item.companyName,
        title: item.title,
        startMonth: monthDate(item.startMonth),
        endMonth: item.endMonth ? monthDate(item.endMonth) : null,
        description: item.description,
        sort: item.sort ?? index,
      })),
    );
  }

  // Name, place and languages go to the shared profile (D509), in the
  // service, inside the same transaction.

  await conn
    .insert(candidatePreferences)
    .values({
      userId,
      categories: [...input.preferences.categories],
      sectors: [...(input.preferences.sectors ?? [])],
      seniority: input.preferences.seniority ?? null,
      companySizes: [...input.preferences.companySizes],
      notes: input.preferences.notes,
    })
    .onConflictDoUpdate({
      target: candidatePreferences.userId,
      set: {
        categories: [...input.preferences.categories],
        sectors: [...(input.preferences.sectors ?? [])],
        seniority: input.preferences.seniority ?? null,
        companySizes: [...input.preferences.companySizes],
        notes: input.preferences.notes,
      },
    });
}

export async function setCompleteness(
  userId: string,
  completeness: number,
  conn: Conn = getDb(),
) {
  await conn
    .update(candidateProfiles)
    .set({ completeness })
    .where(eq(candidateProfiles.userId, userId));
}

export function presentProfile(
  loaded: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
) {
  const { profile } = loaded;
  const currency = trimChar(profile.salaryCurrency);
  const period = profile.salaryPeriod;
  const basis = profile.salaryBasis;
  const money = (amount: bigint | null) => {
    if (amount === null || !currency || !period || !basis) return null;
    return {
      amountMinor: amount.toString(),
      currency,
      period,
      basis,
    };
  };

  return {
    id: profile.userId,
    // Name and place live in the shared profile (D509).
    fullName: loaded.shared?.displayName ?? null,
    headline: profile.headline,
    desiredTitles: profile.desiredTitles,
    country: loaded.shared?.country ?? null,
    city: loaded.shared?.city ?? null,
    timezone: loaded.shared?.timezone ?? null,
    workHoursStart: hourMinute(profile.workHoursStart),
    workHoursEnd: hourMinute(profile.workHoursEnd),
    workDays: profile.workDays,
    workFormats: profile.workFormats,
    employmentTypes: profile.employmentTypes,
    experienceYears: profile.experienceYears,
    availabilityDate: profile.availabilityDate,
    salaryMin: money(profile.salaryMin),
    salaryMax: money(profile.salaryMax),
    minOverlapHours: profile.minOverlapHours,
    summary: profile.summary,
    isHidden: profile.isHidden,
    jobSearchStatus: profile.jobSearchStatus,
    completeness: profile.completeness,
    skills: loaded.skills,
    experience: loaded.experience.map((item) => ({
      id: item.id,
      companyName: item.companyName,
      title: item.title,
      startMonth: yearMonth(item.startMonth),
      endMonth: item.endMonth ? yearMonth(item.endMonth) : null,
      description: item.description,
      sort: item.sort,
    })),
    languages: sharedLanguages(loaded),
    preferences: {
      categories: loaded.preferences?.categories ?? [],
      sectors: loaded.preferences?.sectors ?? [],
      seniority: loaded.preferences?.seniority ?? null,
      companySizes: loaded.preferences?.companySizes ?? [],
      notes: loaded.preferences?.notes ?? null,
    },
  };
}

/** The agent's morning-brief flag; null when the user has no profile. */
export async function readAgentBriefsEnabled(
  userId: string,
): Promise<boolean | null> {
  const [row] = await getDb()
    .select({ enabled: candidateProfiles.agentBriefsEnabled })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);
  return row?.enabled ?? null;
}

/** Sets the flag for this user only; false when they have no profile. */
export async function setAgentBriefsEnabled(userId: string, enabled: boolean) {
  const rows = await getDb()
    .update(candidateProfiles)
    .set({ agentBriefsEnabled: enabled, updatedAt: new Date() })
    .where(eq(candidateProfiles.userId, userId))
    .returning({ userId: candidateProfiles.userId });
  return rows.length > 0;
}

/** Flips `is_hidden` only; false when the user has no profile. */
export async function setHidden(userId: string, hidden: boolean) {
  const rows = await getDb()
    .update(candidateProfiles)
    .set({ isHidden: hidden, updatedAt: new Date() })
    .where(eq(candidateProfiles.userId, userId))
    .returning({ userId: candidateProfiles.userId });
  return rows.length > 0;
}

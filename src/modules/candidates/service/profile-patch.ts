import { z } from "zod";
import {
  MAX_CANDIDATE_SECTORS,
  SECTORS,
  SENIORITY_LEVELS,
} from "@intgetion/taxonomy/catalog";
import { HttpError } from "@intgetion/kit";
import {
  SKILL_CATEGORIES,
  skillCategorySchema,
} from "@intgetion/taxonomy/catalog";
import type { CandidateDto } from "../api/dto";
import {
  cefrLevelSchema,
  employmentTypeSchema,
  salaryBasisSchema,
  salaryPeriodSchema,
  skillLevelSchema,
  updateCandidateInput,
  workFormatSchema,
  type UpdateCandidateInput,
} from "../schemas";
import { getOwnCandidate, saveCandidateProfile } from "./candidate-service";

/**
 * 12.3: the only profile fields the bot may change. Contacts, full name,
 * summary and experience are not here and never will be (D16, D173).
 */
export const candidatePatchInput = z
  .object({
    headline: z.string().trim().min(1).max(160).nullable(),
    desiredTitles: z.array(z.string().trim().min(1).max(80)).max(5),
    skills: z
      .array(
        z.object({
          slug: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9][a-z0-9.+#-]{0,59}$/),
          level: skillLevelSchema,
          years: z.number().int().min(0).max(60).nullable().optional(),
        }),
      )
      .max(30),
    experienceYears: z.number().int().min(0).max(60).nullable(),
    languages: z
      .array(
        z.object({
          lang: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z]{2}$/),
          level: cefrLevelSchema,
        }),
      )
      .max(20),
    timezone: z.string().trim().min(1).max(80),
    workHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    workHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    workDays: z.array(z.number().int().min(1).max(7)).max(7),
    workFormats: z.array(workFormatSchema).max(3),
    employmentTypes: z.array(employmentTypeSchema).max(3),
    salaryMin: z
      .string()
      .regex(/^(0|[1-9]\d{0,14})$/)
      .nullable(),
    salaryMax: z
      .string()
      .regex(/^(0|[1-9]\d{0,14})$/)
      .nullable(),
    salaryCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
    salaryPeriod: salaryPeriodSchema.nullable(),
    salaryBasis: salaryBasisSchema.nullable(),
    availabilityDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    city: z.string().trim().min(1).max(80).nullable(),
    categories: z.array(skillCategorySchema).max(SKILL_CATEGORIES.length),
    sectors: z.array(z.enum(SECTORS)).max(MAX_CANDIDATE_SECTORS),
    seniority: z.enum(SENIORITY_LEVELS).nullable(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "empty_patch" });

export type CandidatePatch = z.infer<typeof candidatePatchInput>;

/** The stored profile as a full update input, so a patch can be laid over it. */
function toInput(dto: CandidateDto): Record<string, unknown> {
  const money = dto.salaryMin ?? dto.salaryMax;
  return {
    fullName: dto.fullName,
    headline: dto.headline,
    desiredTitles: dto.desiredTitles,
    country: dto.country,
    city: dto.city,
    timezone: dto.timezone,
    workHoursStart: dto.workHoursStart,
    workHoursEnd: dto.workHoursEnd,
    workDays: dto.workDays,
    workFormats: dto.workFormats,
    employmentTypes: dto.employmentTypes,
    experienceYears: dto.experienceYears,
    availabilityDate: dto.availabilityDate,
    salaryMin: dto.salaryMin?.amountMinor ?? null,
    salaryMax: dto.salaryMax?.amountMinor ?? null,
    salaryCurrency: money?.currency ?? null,
    salaryPeriod: money?.period ?? null,
    salaryBasis: money?.basis ?? null,
    minOverlapHours: dto.minOverlapHours,
    summary: dto.summary,
    isHidden: dto.isHidden,
    jobSearchStatus: dto.jobSearchStatus,
    skills: dto.skills.map((skill) => ({
      raw: skill.slug,
      level: skill.level,
      years: skill.years,
    })),
    experience: dto.experience.map((item) => ({
      companyName: item.companyName,
      title: item.title,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      description: item.description,
      sort: item.sort,
    })),
    languages: dto.languages,
    preferences: dto.preferences,
  };
}

/** Defaults for a first profile created from the bot (D173). */
const EMPTY_PROFILE = {
  desiredTitles: [],
  workHoursStart: "09:00",
  workHoursEnd: "18:00",
  workDays: [1, 2, 3, 4, 5],
  workFormats: [],
  employmentTypes: [],
  skills: [],
  experience: [],
  languages: [],
};

/**
 * Lays an allowlisted patch over the stored profile and saves it through
 * the normal profile path (same validation as the form). Without a profile
 * the patch must at least carry a timezone.
 */
export async function patchCandidateProfile(
  userId: string,
  patch: CandidatePatch,
) {
  const current = await getOwnCandidate(userId);
  const base: Record<string, unknown> = current
    ? toInput(current)
    : { ...EMPTY_PROFILE };
  const { skills, categories, sectors, seniority, ...plain } = patch;
  const merged: Record<string, unknown> = { ...base, ...plain };
  if (skills) {
    merged.skills = skills.map((skill) => ({
      raw: skill.slug,
      level: skill.level,
      years: skill.years ?? null,
    }));
  }
  if (categories || sectors || seniority !== undefined) {
    const preferences = (base.preferences as
      | {
          categories?: string[];
          sectors?: string[];
          seniority?: string | null;
          companySizes?: string[];
          notes?: string | null;
        }
      | undefined) ?? {
      categories: [],
      sectors: [],
      seniority: null,
      companySizes: [],
      notes: null,
    };
    merged.preferences = {
      categories: [],
      sectors: [],
      seniority: null,
      companySizes: [],
      notes: null,
      ...preferences,
      ...(categories ? { categories } : {}),
      ...(sectors ? { sectors } : {}),
      ...(seniority !== undefined ? { seniority } : {}),
    };
  }
  const parsed = updateCandidateInput.safeParse(merged);
  if (!parsed.success) {
    throw new HttpError(422, "PROFILE_INCOMPLETE", "Profile patch is invalid", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }
  return saveCandidateProfile(userId, parsed.data as UpdateCandidateInput);
}

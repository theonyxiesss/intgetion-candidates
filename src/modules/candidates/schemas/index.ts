import { z } from "zod";
import {
  EMPLOYMENT_TYPES,
  MAX_CANDIDATE_SECTORS,
  SECTORS,
  SENIORITY_LEVELS,
} from "@intgetion/taxonomy/catalog";
import {
  SKILL_CATEGORIES,
  skillCategorySchema,
} from "@intgetion/taxonomy/catalog";
import { isIanaTimeZone } from "../service/timezone";

export const SKILL_LIMIT = 30;
export const TITLE_LIMIT = 5;

export const workFormatSchema = z.enum(["remote", "hybrid", "onsite"]);
export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export const salaryPeriodSchema = z.enum(["hour", "month", "year"]);
export const salaryBasisSchema = z.enum(["gross", "net"]);
export const skillLevelSchema = z.enum([
  "novice",
  "intermediate",
  "advanced",
  "expert",
]);
export const cefrLevelSchema = z.enum([
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "native",
]);
export const companySizeSchema = z.enum([
  "s1_10",
  "s11_50",
  "s51_200",
  "s201_1000",
  "s1000_plus",
]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, {
  error: "invalid_time",
});

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  error: "invalid_month",
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    error: "invalid_date",
  });

const minorSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,14})$/, { error: "invalid_amount" });

export const candidateSkillInput = z.object({
  raw: z.string().trim().min(1).max(500),
  level: skillLevelSchema,
  years: z.number().int().min(0).max(60).nullable().optional(),
});

export const candidateExperienceInput = z
  .object({
    companyName: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(160),
    startMonth: monthSchema,
    endMonth: monthSchema.nullable().optional(),
    description: optionalText(2000),
    sort: z.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => !value.endMonth || value.endMonth >= value.startMonth, {
    error: "invalid_month",
  });

export const candidateLanguageInput = z.object({
  lang: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}$/, { error: "invalid_lang" }),
  level: cefrLevelSchema,
});

export const candidatePreferencesInput = z.object({
  categories: z.array(skillCategorySchema).max(SKILL_CATEGORIES.length),
  sectors: z.array(z.enum(SECTORS)).max(MAX_CANDIDATE_SECTORS).default([]),
  seniority: z.enum(SENIORITY_LEVELS).nullable().optional(),
  companySizes: z.array(companySizeSchema),
  notes: optionalText(500),
});

/** Whether the candidate is looking for work (0041); briefs skip not_looking. */
export const JOB_SEARCH_STATUSES = [
  "active",
  "passive",
  "not_looking",
] as const;

export const updateCandidateInput = z
  .object({
    fullName: optionalText(120),
    headline: optionalText(160),
    desiredTitles: z.array(z.string().trim().min(1).max(80)).max(TITLE_LIMIT),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, { error: "invalid_country" })
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    city: optionalText(80),
    timezone: z.string().trim().min(1).max(80),
    workHoursStart: timeSchema,
    workHoursEnd: timeSchema,
    workDays: z.array(z.number().int().min(1).max(7)).max(7),
    workFormats: z.array(workFormatSchema).max(3),
    employmentTypes: z.array(employmentTypeSchema).max(3),
    experienceYears: z.number().int().min(0).max(60).nullable().optional(),
    availabilityDate: dateSchema.nullable().optional(),
    salaryMin: minorSchema.nullable().optional(),
    salaryMax: minorSchema.nullable().optional(),
    salaryCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .nullable()
      .optional(),
    salaryPeriod: salaryPeriodSchema.nullable().optional(),
    salaryBasis: salaryBasisSchema.nullable().optional(),
    minOverlapHours: z.number().int().min(0).max(12).optional(),
    summary: optionalText(2000),
    isHidden: z.boolean().optional(),
    jobSearchStatus: z.enum(JOB_SEARCH_STATUSES).optional(),
    skills: z.array(candidateSkillInput).max(SKILL_LIMIT),
    experience: z.array(candidateExperienceInput).max(30),
    languages: z.array(candidateLanguageInput).max(20),
    preferences: candidatePreferencesInput.optional(),
  })
  .refine((value) => isIanaTimeZone(value.timezone), {
    error: "invalid_timezone",
  })
  .refine(
    (value) => {
      const hasAmount = value.salaryMin != null || value.salaryMax != null;
      if (!hasAmount) return true;
      return (
        value.salaryCurrency != null &&
        value.salaryPeriod != null &&
        value.salaryBasis != null
      );
    },
    { error: "invalid_salary" },
  )
  .refine(
    (value) => {
      if (value.salaryMin == null || value.salaryMax == null) return true;
      return BigInt(value.salaryMin) <= BigInt(value.salaryMax);
    },
    { error: "invalid_salary" },
  )
  .transform((value) => ({
    ...value,
    desiredTitles: [...new Set(value.desiredTitles)],
    workDays: [...new Set(value.workDays)].sort((a, b) => a - b),
    workFormats: [...new Set(value.workFormats)],
    employmentTypes: [...new Set(value.employmentTypes)],
    experienceYears: value.experienceYears ?? null,
    availabilityDate: value.availabilityDate ?? null,
    salaryMin: value.salaryMin ?? null,
    salaryMax: value.salaryMax ?? null,
    salaryCurrency: value.salaryCurrency ?? null,
    salaryPeriod: value.salaryPeriod ?? null,
    salaryBasis: value.salaryBasis ?? null,
    minOverlapHours: value.minOverlapHours ?? 3,
    isHidden: value.isHidden ?? false,
    preferences: value.preferences ?? {
      categories: [],
      sectors: [],
      seniority: null,
      companySizes: [],
      notes: null,
    },
  }));

export type UpdateCandidateInput = z.infer<typeof updateCandidateInput>;

import { isIanaTimeZone } from "./timezone";

/** Weights from section 11.3. The sum is 100. */
export const COMPLETENESS_WEIGHTS = {
  full_name: 5,
  headline: 10,
  desired_titles: 10,
  timezone: 10,
  work_schedule: 5,
  skills: 15,
  experience_years: 10,
  languages: 10,
  salary: 10,
  work_preferences: 5,
  contact_email: 10,
} as const;

export const COMPLETENESS_PARTS = [
  "full_name",
  "headline",
  "desired_titles",
  "timezone",
  "work_schedule",
  "skills",
  "experience_years",
  "languages",
  "salary",
  "work_preferences",
  "contact_email",
] as const;

export type CompletenessPart = (typeof COMPLETENESS_PARTS)[number];

export type CompletenessInput = {
  fullName: string | null;
  headline: string | null;
  desiredTitles: readonly string[];
  timezone: string | null;
  workHoursStart: string | null;
  workHoursEnd: string | null;
  workDays: readonly number[];
  skillCount: number;
  experienceYears: number | null;
  languageCount: number;
  salaryMin: bigint | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryBasis: string | null;
  workFormats: readonly string[];
  employmentTypes: readonly string[];
  contactEmail: string | null;
};

export type CompletenessScore = {
  score: number;
  missing: CompletenessPart[];
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function partPresent(
  part: CompletenessPart,
  input: CompletenessInput,
): boolean {
  switch (part) {
    case "full_name":
      return filled(input.fullName);
    case "headline":
      return filled(input.headline);
    case "desired_titles":
      return input.desiredTitles.some((title) => title.trim().length > 0);
    case "timezone":
      return input.timezone !== null && isIanaTimeZone(input.timezone);
    case "work_schedule":
      return (
        filled(input.workHoursStart) &&
        filled(input.workHoursEnd) &&
        input.workDays.length > 0
      );
    case "skills":
      return input.skillCount >= 3;
    case "experience_years":
      return input.experienceYears !== null;
    case "languages":
      return input.languageCount >= 1;
    case "salary":
      return (
        input.salaryMin !== null &&
        filled(input.salaryCurrency) &&
        filled(input.salaryPeriod) &&
        filled(input.salaryBasis)
      );
    case "work_preferences":
      return input.workFormats.length > 0 && input.employmentTypes.length > 0;
    case "contact_email":
      return filled(input.contactEmail);
  }
}

/** Section 11.3. A missing part is listed even when the row has a database default. */
export function profileCompleteness(
  input: CompletenessInput,
): CompletenessScore {
  const missing: CompletenessPart[] = [];
  let score = 0;
  for (const part of COMPLETENESS_PARTS) {
    if (partPresent(part, input)) {
      score += COMPLETENESS_WEIGHTS[part];
    } else {
      missing.push(part);
    }
  }
  return { score, missing };
}

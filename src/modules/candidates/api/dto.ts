import type { CompletenessPart } from "../service/completeness";

/** Money object from section 6. Amounts are minor units, serialized as strings. */
export type MoneyDto = {
  amountMinor: string;
  currency: string;
  period: "hour" | "month" | "year";
  basis: "gross" | "net";
};

export type CandidateSkillDto = {
  skillId: string;
  slug: string;
  nameEn: string;
  nameRu: string;
  level: "novice" | "intermediate" | "advanced" | "expert";
  years: number | null;
};

export type CandidateExperienceDto = {
  id: string;
  companyName: string;
  title: string;
  startMonth: string;
  endMonth: string | null;
  description: string | null;
  sort: number;
};

export type CandidateLanguageDto = {
  lang: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native";
};

export type CandidatePreferencesDto = {
  categories: string[];
  sectors: string[];
  seniority: string | null;
  companySizes: string[];
  notes: string | null;
};

/**
 * Public candidate profile. `contacts` is never a key (D16), including for
 * the owner. Contacts have their own endpoint.
 */
export type CandidateDto = {
  id: string;
  fullName: string | null;
  headline: string | null;
  desiredTitles: string[];
  country: string | null;
  city: string | null;
  timezone: string | null;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: number[];
  workFormats: ("remote" | "hybrid" | "onsite")[];
  employmentTypes: (
    "full_time" | "part_time" | "contract" | "freelance" | "internship"
  )[];
  experienceYears: number | null;
  availabilityDate: string | null;
  salaryMin: MoneyDto | null;
  salaryMax: MoneyDto | null;
  minOverlapHours: number;
  summary: string | null;
  isHidden: boolean;
  jobSearchStatus: "active" | "passive" | "not_looking";
  completeness: number;
  missing: CompletenessPart[];
  skills: CandidateSkillDto[];
  experience: CandidateExperienceDto[];
  languages: CandidateLanguageDto[];
  preferences: CandidatePreferencesDto;
  unrecognizedSkills: string[];
};

export const CANDIDATE_DTO_KEYS = [
  "id",
  "fullName",
  "headline",
  "desiredTitles",
  "country",
  "city",
  "timezone",
  "workHoursStart",
  "workHoursEnd",
  "workDays",
  "workFormats",
  "employmentTypes",
  "experienceYears",
  "availabilityDate",
  "salaryMin",
  "salaryMax",
  "minOverlapHours",
  "summary",
  "isHidden",
  "jobSearchStatus",
  "completeness",
  "missing",
  "skills",
  "experience",
  "languages",
  "preferences",
  "unrecognizedSkills",
] as const satisfies readonly (keyof CandidateDto)[];

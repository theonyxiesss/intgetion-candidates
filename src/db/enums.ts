import { pgEnum } from "drizzle-orm/pg-core";

/** Platform-wide types (also used by jobs and companies). */
export const companySize = pgEnum("company_size", [
  "s1_10",
  "s11_50",
  "s51_200",
  "s201_1000",
  "s1000_plus",
]);
export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
]);
export const jobSeniority = pgEnum("job_seniority", [
  "internship",
  "entry",
  "mid",
  "senior",
  "lead",
]);
export const salaryBasis = pgEnum("salary_basis", ["gross", "net"]);
export const salaryPeriod = pgEnum("salary_period", ["hour", "month", "year"]);
export const skillLevel = pgEnum("skill_level", [
  "novice",
  "intermediate",
  "advanced",
  "expert",
]);
export const workFormat = pgEnum("work_format", ["remote", "hybrid", "onsite"]);

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  companySize,
  employmentType,
  jobSeniority,
  salaryBasis,
  salaryPeriod,
  skillLevel,
  workFormat,
} from "./enums";

export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    userId: uuid("user_id")
      .primaryKey(),
    headline: text("headline"),
    desiredTitles: text("desired_titles").array().notNull().default([]),
    workHoursStart: time("work_hours_start").notNull().default("09:00:00"),
    workHoursEnd: time("work_hours_end").notNull().default("18:00:00"),
    workDays: smallint("work_days").array().notNull().default([1, 2, 3, 4, 5]),
    workFormats: workFormat("work_formats")
      .array()
      .notNull()
      .default(["remote"]),
    employmentTypes: employmentType("employment_types")
      .array()
      .notNull()
      .default(["full_time"]),
    experienceYears: smallint("experience_years"),
    availabilityDate: date("availability_date"),
    salaryMin: bigint("salary_min", { mode: "bigint" }),
    salaryMax: bigint("salary_max", { mode: "bigint" }),
    salaryCurrency: char("salary_currency", { length: 3 }),
    salaryPeriod: salaryPeriod("salary_period"),
    salaryBasis: salaryBasis("salary_basis"),
    minOverlapHours: smallint("min_overlap_hours").notNull().default(3),
    summary: text("summary"),
    isHidden: boolean("is_hidden").notNull().default(false),
    /** active | passive | not_looking (0041); employer briefs skip not_looking. */
    jobSearchStatus: text("job_search_status", {
      enum: ["active", "passive", "not_looking"],
    })
      .notNull()
      .default("active"),
    completeness: smallint("completeness").notNull().default(0),
    lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
    /** Morning briefs from the agent (D340); the switch is on /notifications (D349). */
    agentBriefsEnabled: boolean("agent_briefs_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "candidate_profiles_headline_check",
      sql`${table.headline} is null or char_length(${table.headline}) between 1 and 160`,
    ),
    check(
      "candidate_profiles_desired_titles_check",
      sql`public.candidate_titles_valid(${table.desiredTitles})`,
    ),
    check(
      "candidate_profiles_work_days_check",
      sql`cardinality(${table.workDays}) <= 7 and ${table.workDays} <@ array[1,2,3,4,5,6,7]::smallint[]`,
    ),
    check(
      "candidate_profiles_experience_years_check",
      sql`${table.experienceYears} is null or ${table.experienceYears} between 0 and 60`,
    ),
    check(
      "candidate_profiles_min_overlap_check",
      sql`${table.minOverlapHours} between 0 and 12`,
    ),
    check(
      "candidate_profiles_summary_check",
      sql`${table.summary} is null or char_length(${table.summary}) <= 2000`,
    ),
    check(
      "candidate_profiles_completeness_check",
      sql`${table.completeness} between 0 and 100`,
    ),
    check(
      "candidate_profiles_salary_order_check",
      sql`${table.salaryMin} is null or ${table.salaryMax} is null or ${table.salaryMin} <= ${table.salaryMax}`,
    ),
    check(
      "candidate_profiles_salary_parts_check",
      sql`(${table.salaryMin} is null and ${table.salaryMax} is null) or (
        ${table.salaryCurrency} is not null
        and ${table.salaryPeriod} is not null
        and ${table.salaryBasis} is not null
      )`,
    ),
  ],
);

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull(),
    level: skillLevel("level").notNull(),
    years: smallint("years"),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.skillId] }),
    index("candidate_skills_skill_id_idx").on(table.skillId),
    check(
      "candidate_skills_years_check",
      sql`${table.years} is null or ${table.years} between 0 and 60`,
    ),
  ],
);

export const candidateExperience = pgTable(
  "candidate_experience",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    startMonth: date("start_month").notNull(),
    endMonth: date("end_month"),
    description: text("description"),
    sort: smallint("sort").notNull().default(0),
  },
  (table) => [
    index("candidate_experience_candidate_id_idx").on(table.candidateId),
    check(
      "candidate_experience_company_name_check",
      sql`char_length(${table.companyName}) between 1 and 160`,
    ),
    check(
      "candidate_experience_title_check",
      sql`char_length(${table.title}) between 1 and 160`,
    ),
    check(
      "candidate_experience_description_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "candidate_experience_months_check",
      sql`${table.endMonth} is null or ${table.endMonth} >= ${table.startMonth}`,
    ),
  ],
);

// candidate_languages: dropped by 0066; languages live in user_profiles (D509).

export const candidatePreferences = pgTable(
  "candidate_preferences",
  {
    userId: uuid("user_id")
      .primaryKey(),
    categories: text("categories").array().notNull().default([]),
    sectors: text("sectors").array().notNull().default([]),
    seniority: jobSeniority("seniority"),
    companySizes: companySize("company_sizes").array().notNull().default([]),
    notes: text("notes"),
  },
  (table) => [
    check(
      "candidate_preferences_categories_check",
      sql`${table.categories} <@ array['engineering','data','design','product','marketing','sales','support','operations','finance','hr','legal','content','community','research']::text[]`,
    ),
    check(
      "candidate_preferences_notes_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 500`,
    ),
  ],
);

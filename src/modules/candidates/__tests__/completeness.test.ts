import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_PARTS,
  COMPLETENESS_WEIGHTS,
  profileCompleteness,
  type CompletenessInput,
} from "../service/completeness";

function empty(): CompletenessInput {
  return {
    fullName: null,
    headline: null,
    desiredTitles: [],
    timezone: null,
    workHoursStart: null,
    workHoursEnd: null,
    workDays: [],
    skillCount: 0,
    experienceYears: null,
    languageCount: 0,
    salaryMin: null,
    salaryCurrency: null,
    salaryPeriod: null,
    salaryBasis: null,
    workFormats: [],
    employmentTypes: [],
    contactEmail: null,
  };
}

const only: Record<
  keyof typeof COMPLETENESS_WEIGHTS,
  Partial<CompletenessInput>
> = {
  full_name: { fullName: "Ada Lovelace" },
  headline: { headline: "Engineer" },
  desired_titles: { desiredTitles: ["Backend engineer"] },
  timezone: { timezone: "Europe/Berlin" },
  work_schedule: {
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
  },
  skills: { skillCount: 3 },
  experience_years: { experienceYears: 0 },
  languages: { languageCount: 1 },
  salary: {
    salaryMin: BigInt(100),
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryBasis: "gross",
  },
  work_preferences: {
    workFormats: ["remote"],
    employmentTypes: ["full_time"],
  },
  contact_email: { contactEmail: "ada@example.com" },
};

describe("profile completeness", () => {
  it("sums the section 11.3 weights to 100", () => {
    const total = COMPLETENESS_PARTS.reduce(
      (sum, part) => sum + COMPLETENESS_WEIGHTS[part],
      0,
    );
    expect(total).toBe(100);
    expect(profileCompleteness(empty())).toEqual({
      score: 0,
      missing: [...COMPLETENESS_PARTS],
    });
  });

  it.each(COMPLETENESS_PARTS)("scores only %s", (part) => {
    const result = profileCompleteness({ ...empty(), ...only[part] });
    expect(result.score).toBe(COMPLETENESS_WEIGHTS[part]);
    expect(result.missing).not.toContain(part);
    expect(result.missing).toHaveLength(COMPLETENESS_PARTS.length - 1);
  });

  it("rejects an offset timezone, two skills, and a salary without a minimum", () => {
    const result = profileCompleteness({
      ...empty(),
      timezone: "UTC+3",
      skillCount: 2,
      salaryCurrency: "EUR",
      salaryPeriod: "year",
      salaryBasis: "gross",
      fullName: "   ",
      contactEmail: "  ",
    });
    expect(result.score).toBe(0);
    expect(result.missing).toContain("timezone");
    expect(result.missing).toContain("skills");
    expect(result.missing).toContain("salary");
  });
});

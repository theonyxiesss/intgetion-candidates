import { describe, expect, it } from "vitest";
import { CANDIDATE_DTO_KEYS, type CandidateDto } from "../api/dto";

describe("candidate DTO", () => {
  it("never has a contacts key", () => {
    const dto = {
      id: "00000000-0000-4000-8000-000000000001",
      fullName: null,
      headline: null,
      desiredTitles: [],
      country: null,
      city: null,
      timezone: "Europe/Berlin",
      workHoursStart: "09:00",
      workHoursEnd: "18:00",
      workDays: [1],
      workFormats: ["remote"],
      employmentTypes: ["full_time"],
      experienceYears: null,
      availabilityDate: null,
      salaryMin: null,
      salaryMax: null,
      minOverlapHours: 3,
      summary: null,
      isHidden: false,
      jobSearchStatus: "active",
      completeness: 0,
      missing: ["contact_email"],
      skills: [],
      experience: [],
      languages: [],
      preferences: {
        categories: [],
        sectors: [],
        seniority: null,
        companySizes: [],
        notes: null,
      },
      unrecognizedSkills: [],
    } satisfies CandidateDto;

    expect(Object.keys(dto).sort()).toEqual([...CANDIDATE_DTO_KEYS].sort());
    expect(dto).not.toHaveProperty("contacts");
    expect(JSON.stringify(dto)).not.toContain("contacts");
  });
});

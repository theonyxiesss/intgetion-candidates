import { describe, expect, it } from "vitest";
import { presentProfile } from "../repo/profiles";

type Loaded = Parameters<typeof presentProfile>[0];

function loaded(shared: Loaded["shared"]): Loaded {
  return {
    profile: {
      userId: "u1",
      headline: null,
      desiredTitles: [],
      workHoursStart: "09:00:00",
      workHoursEnd: "18:00:00",
      workDays: [1, 2, 3, 4, 5],
      workFormats: ["remote"],
      employmentTypes: ["full_time"],
      experienceYears: null,
      availabilityDate: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryBasis: null,
      minOverlapHours: 3,
      summary: null,
      isHidden: false,
      jobSearchStatus: "active",
      completeness: 40,
    },
    skills: [],
    experience: [],
    preferences: null,
    shared,
  } as unknown as Loaded;
}

describe("the candidate profile reads only the shared profile (D508, D509)", () => {
  it("has no name, place or languages without a shared profile", () => {
    expect(presentProfile(loaded(null))).toMatchObject({
      fullName: null,
      country: null,
      city: null,
      timezone: null,
      languages: [],
    });
  });

  it("shows name, place and languages from the shared profile", () => {
    const view = presentProfile(
      loaded({
        userId: "u1",
        displayName: "Anna",
        country: "DE",
        city: "Berlin",
        timezone: "Europe/Berlin",
        languages: [
          { code: "de", level: "B2" },
          { code: "en", level: null },
        ],
        about: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Loaded["shared"]),
    );
    expect(view).toMatchObject({
      fullName: "Anna",
      country: "DE",
      city: "Berlin",
      timezone: "Europe/Berlin",
      languages: [
        { lang: "de", level: "B2" },
        { lang: "en", level: "B1" },
      ],
    });
  });
});

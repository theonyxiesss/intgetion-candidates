import type { NormalizeSkillResult, SkillSource } from "@intgetion/taxonomy";

export type SharedFacts = {
  displayName?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  languages?: readonly { code: string; level?: string | null }[];
};

export type CandidatesPorts = {
  /** taxonomy: free text to a catalog skill, or a suggestion. */
  normalizeSkill: (raw: string, source: SkillSource) => Promise<NormalizeSkillResult>;
  /** contacts: the candidate's contact email (D16). */
  findContactEmail: (candidateId: string) => Promise<string | null>;
  /**
   * users: note name, place and languages in the shared profile (D509).
   * Called inside the profile transaction; an in-process adapter passes `tx`
   * on so both commit together, an HTTP adapter fails the save on error.
   */
  writeSharedFacts: (
    userId: string,
    facts: SharedFacts,
    mode: "replace" | "fill",
    tx?: unknown,
  ) => Promise<void>;
  /** applications: may this employer see this candidate's profile. */
  employerCanSeeCandidate: (viewerId: string, candidateId: string) => Promise<boolean>;
};

let ports: CandidatesPorts | null = null;

export function setCandidatesPorts(next: CandidatesPorts): void {
  ports = next;
}

export function candidatesPorts(): CandidatesPorts {
  if (!ports) throw new Error("candidates ports are not configured");
  return ports;
}

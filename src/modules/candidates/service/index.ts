/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 * `GET /api/me` (auth module, Claude Code) should set
 * `hasCandidateProfile` from `hasCandidateProfile(user.id)`.
 */
export type { CandidateDto, MoneyDto } from "../api/dto";
export { CANDIDATE_DTO_KEYS } from "../api/dto";
export {
  COMPLETENESS_PARTS,
  COMPLETENESS_WEIGHTS,
  profileCompleteness,
} from "./completeness";
export type {
  CompletenessInput,
  CompletenessPart,
  CompletenessScore,
} from "./completeness";
export { updateCandidateInput } from "../schemas";
export type { UpdateCandidateInput } from "../schemas";
export { isIanaTimeZone } from "./timezone";
export {
  getCandidateForViewer,
  getOwnCandidate,
  hasCandidateProfile,
  setProfileHidden,
  ownAgentBriefsEnabled,
  setOwnAgentBriefsEnabled,
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
} from "./candidate-service";
export type { AppTx } from "../repo/profiles";
export { getSellerStorefronts, shortName } from "./storefront";
export type { SellerStorefront } from "./storefront";
export {
  candidatePatchInput,
  patchCandidateProfile,
  type CandidatePatch,
} from "./profile-patch";
export { setCandidatesPorts } from "../../../ports";
export type { CandidatesPorts, SharedFacts } from "../../../ports";

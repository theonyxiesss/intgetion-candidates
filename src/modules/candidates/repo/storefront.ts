import { eq, inArray } from "drizzle-orm";
import { getDb } from "@intgetion/kit";
import { candidateProfiles } from "../../../db/candidates-schema";
import { userProfiles } from "../../../db/foreign";

export type StorefrontRow = {
  userId: string;
  fullName: string | null;
  headline: string | null;
  timezone: string | null;
};

/** Only the fields a freelance storefront may show (D448). No contacts. */
export async function loadStorefrontRows(
  userIds: readonly string[],
): Promise<StorefrontRow[]> {
  if (userIds.length === 0) return [];
  return getDb()
    .select({
      userId: candidateProfiles.userId,
      // Name and zone live in the shared profile (D509).
      fullName: userProfiles.displayName,
      headline: candidateProfiles.headline,
      timezone: userProfiles.timezone,
    })
    .from(candidateProfiles)
    .leftJoin(userProfiles, eq(userProfiles.userId, candidateProfiles.userId))
    .where(inArray(candidateProfiles.userId, [...userIds]));
}

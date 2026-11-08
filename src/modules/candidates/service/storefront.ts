import { loadStorefrontRows } from "../repo/storefront";

/** What a freelance service shows about its seller (D448). */
export type SellerStorefront = {
  userId: string;
  /** "Ada L.": first name and the initial of the last word, or null. */
  displayName: string | null;
  headline: string | null;
  timezone: string | null;
};

/** "Ada Lovelace" → "Ada L.", "Ada" → "Ada", blank → null. */
export function shortName(fullName: string | null): string | null {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const first = words[0] ?? "";
  if (words.length === 1) return first;
  const last = words[words.length - 1] ?? "";
  const initial = Array.from(last)[0]?.toLocaleUpperCase() ?? "";
  return initial ? `${first} ${initial}.` : first;
}

/**
 * Storefronts of people who take freelance orders. Taking orders is the
 * consent to show these fields; the full name, contacts and the rest of the
 * profile stay private.
 */
export async function getSellerStorefronts(
  userIds: readonly string[],
): Promise<Map<string, SellerStorefront>> {
  const rows = await loadStorefrontRows([...new Set(userIds)]);
  return new Map(
    rows.map((row) => [
      row.userId,
      {
        userId: row.userId,
        displayName: shortName(row.fullName),
        headline: row.headline,
        timezone: row.timezone,
      },
    ]),
  );
}

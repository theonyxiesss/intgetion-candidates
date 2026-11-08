const OFFSET_ZONE = /^(?:UTC|GMT)[+-]\d/i;
const NUMERIC_OFFSET = /^[+-]\d{1,2}(?::?\d{2})?$/;
const ETC_GMT = /^Etc\/GMT/i;

/** IANA zone only. Offsets such as `UTC+3` are rejected (D6). */
export function isIanaTimeZone(value: string): boolean {
  const zone = value.trim();
  if (
    !zone ||
    OFFSET_ZONE.test(zone) ||
    NUMERIC_OFFSET.test(zone) ||
    ETC_GMT.test(zone)
  ) {
    return false;
  }
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}

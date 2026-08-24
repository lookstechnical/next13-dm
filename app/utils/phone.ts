/**
 * Phone numbers as typed by parents, turned into something WhatsApp and a
 * phone's contacts app will both accept.
 *
 * Numbers are stored as free text, so the same squad will contain
 * "07700 900123", "+44 7700 900123", "07700-900123" and "447700900123".
 * WhatsApp matches contacts on the international form, so anything else simply
 * fails to find the person — silently, which is the worst way for it to fail.
 */

/**
 * Assumed when a number has no country code of its own.
 *
 * The club is UK-based, so a leading 0 means +44. A player on a foreign mobile
 * has to be stored with their own +code, which toE164 preserves.
 */
export const DEFAULT_DIAL_CODE = "44";

/**
 * Convert to E.164 ("+447700900123"), or null when the input can't be trusted.
 *
 * Returning null rather than a best guess is deliberate: a wrong number in a
 * contact import is harder to spot than a missing one, and the UI lists what it
 * couldn't convert so the gaps can be chased.
 */
export const toE164 = (
  input?: string | null,
  dialCode: string = DEFAULT_DIAL_CODE,
): string | null => {
  if (!input) return null;

  // Keep digits and a leading +; spaces, dashes, brackets and dots are noise.
  const trimmed = String(input).trim();
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    // Already international.
  } else if (digits.startsWith("00")) {
    // 00 is the other way of writing +.
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    // National format — swap the trunk 0 for the country code.
    digits = dialCode + digits.slice(1);
  } else if (!digits.startsWith(dialCode)) {
    // A bare national number with no trunk prefix.
    digits = dialCode + digits;
  }

  // Shortest real E.164 numbers are 8 digits including country code; the spec
  // caps them at 15. Anything outside that is a typo, not a phone number.
  if (digits.length < 8 || digits.length > 15) return null;

  return `+${digits}`;
};

/** Numbers ready to use, and the players whose numbers couldn't be read. */
export const partitionByPhone = <T,>(
  players: T[],
  mobileOf: (player: T) => string | null | undefined,
) => {
  const withPhone: { player: T; phone: string }[] = [];
  const withoutPhone: T[] = [];

  for (const player of players) {
    const phone = toE164(mobileOf(player));
    if (phone) withPhone.push({ player, phone });
    else withoutPhone.push(player);
  }

  return { withPhone, withoutPhone };
};

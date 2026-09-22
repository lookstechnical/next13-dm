/**
 * A player's email addresses.
 *
 * A player is usually a child, so the addresses on file belong to parents or
 * guardians — and there is often more than one of them. `players.email` is the
 * primary (what the profile shows, what registration captured first) and
 * `players.additional_emails` holds the rest.
 *
 * Every outbound email to a player goes to all of them, so the send sites pass
 * the whole list as Resend's `to`: one message, addressed to the family,
 * rather than a copy each.
 */

/**
 * Accepts a player in any of the shapes the services hand back — camelCase
 * from convertKeysToCamelCase, raw snake_case from the inline group and
 * programme joins, or a registration's nested `players` row.
 */
export type WithEmails = {
  email?: string | null;
  additionalEmails?: string[] | null;
  additional_emails?: string[] | null;
};

const clean = (email?: string | null) => email?.trim() || "";

/**
 * Every address for a player, primary first, de-duplicated case-insensitively
 * and with blanks dropped. Empty when the player has no address at all.
 */
export const playerEmails = (player?: WithEmails | null): string[] => {
  const extra = player?.additionalEmails ?? player?.additional_emails ?? [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of [player?.email, ...extra]) {
    const email = clean(candidate);
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }

  return result;
};

/**
 * Normalise the extra addresses coming off a player form: trimmed, lower-cased,
 * blanks dropped, de-duplicated, and never repeating the primary — the primary
 * lives in `email` and `playerEmails` would drop a copy here anyway, so storing
 * one would only show up as a phantom row next time the form is opened.
 *
 * Lower-casing is what makes PlayerService.getPlayerByEmail work: it finds a
 * second parent with a single `contains` on the column, so a parent typing
 * "Dad@..." is still recognised. The same thing programme_allowed_emails does.
 */
export const normaliseAdditionalEmails = (
  values: (string | null | undefined)[],
  primary?: string | null,
): string[] => {
  const seen = new Set<string>();
  const primaryKey = clean(primary).toLowerCase();
  if (primaryKey) seen.add(primaryKey);

  const result: string[] = [];
  for (const value of values) {
    const email = clean(value).toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }

  return result;
};

/**
 * Every address a programme registration should be emailed at.
 *
 * The player's own addresses win over the one captured at registration time —
 * a parent who has since updated the profile expects mail at the new address,
 * not the old one. A registration with no linked player (or a player with no
 * address on file) falls back to whatever registration recorded.
 */
export const registrationEmails = (reg?: {
  email?: string | null;
  players?: WithEmails | null;
}): string[] => {
  const fromPlayer = playerEmails(reg?.players);
  return fromPlayer.length > 0 ? fromPlayer : playerEmails({ email: reg?.email });
};

/**
 * Copy for the public invitation pages.
 *
 * Staff write this on a group's Send Email screen and it is snapshotted onto
 * each invitation row. Anything left blank — and every invitation sent before
 * the copy became editable — falls back to the defaults here, which are the
 * wording the pages carried when it was hardcoded.
 */

export const DEFAULT_ACCEPT_PAGE_CONTENT = `<p>Congratulations on your Invitation to the Saints LDP Excel Program</p>
<p>Please complete the form below to accept your invitation</p>`;

export const DEFAULT_ACCEPT_COMPLETE_MESSAGE =
  "Thank you we will be in touch soon with more details!";

export const DEFAULT_REJECT_PAGE_CONTENT = `<p>We understand you’ve decided not to join at this time.</p>
<p>Your feedback is valuable to us. Could you share the main reason you have chosen not to join</p>`;

export const DEFAULT_REJECT_COMPLETE_MESSAGE = "Thank you for your feedback";

export const DEFAULT_REJECT_REASONS = [
  "Times clash with other activities",
  "I have had an offer of a scholarship or similar at another club",
];

/** The "Other" option is always appended, so it is not part of the list above. */
export const OTHER_REASON = "other";

export type InvitePageContent = {
  acceptPageContent?: string | null;
  acceptCompleteMessage?: string | null;
  rejectPageContent?: string | null;
  rejectCompleteMessage?: string | null;
  rejectReasons?: string[] | null;
};

const firstNonEmpty = (...values: (string | null | undefined)[]) =>
  values.find((v) => v && v.trim() !== "") as string;

/**
 * Resolve the copy for an invitation, filling every blank with its default so
 * the pages never have to think about missing content.
 */
export function resolveInviteContent(invite?: InvitePageContent | null) {
  const reasons = invite?.rejectReasons?.filter((r) => r && r.trim() !== "");

  return {
    acceptPageContent: firstNonEmpty(
      invite?.acceptPageContent,
      DEFAULT_ACCEPT_PAGE_CONTENT
    ),
    acceptCompleteMessage: firstNonEmpty(
      invite?.acceptCompleteMessage,
      DEFAULT_ACCEPT_COMPLETE_MESSAGE
    ),
    rejectPageContent: firstNonEmpty(
      invite?.rejectPageContent,
      DEFAULT_REJECT_PAGE_CONTENT
    ),
    rejectCompleteMessage: firstNonEmpty(
      invite?.rejectCompleteMessage,
      DEFAULT_REJECT_COMPLETE_MESSAGE
    ),
    rejectReasons:
      reasons && reasons.length > 0 ? reasons : DEFAULT_REJECT_REASONS,
  };
}

/**
 * Substitute the {{variables}} the rich-text editor offers. Kept separate from
 * the email templates' styler because these pages are styled by Tailwind's
 * prose classes rather than inline styles.
 */
export function applyInviteVariables(
  html: string,
  variables: Record<string, string | undefined>
) {
  let out = html || "";
  for (const [key, value] of Object.entries(variables)) {
    out = out.replaceAll(`{{${key}}}`, value ?? "");
  }
  return out;
}

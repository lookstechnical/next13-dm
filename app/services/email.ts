import { Invitation, Player } from "~/types";
import { formatDate } from "~/utils/helpers";

// Inline styles for the rich-text body/footer produced by the editor. Email
// clients strip <style> blocks and default text to dark colours, so every
// paragraph and heading needs its colour applied inline or it renders black on
// our dark background. Also substitutes the {{variables}} the editor offers.
export const styleRichTextBase = (
  html: string,
  variables: Record<string, string | undefined> = {},
) => {
  let out = html || "";
  for (const [key, value] of Object.entries(variables)) {
    out = out.replaceAll(`{{${key}}}`, value ?? "");
  }
  return out
    // Pasted content often carries the invalid closing form; Outlook renders it
    // as a second line break, so normalise before anything else.
    .replaceAll("</br>", "<br />")
    .replaceAll(
      "<p>",
      '<p style="color: #c2c7d0; font-size: 16px; text-align: left;">',
    )
    .replaceAll(
      "<h1>",
      '<h1 style="color: #ffffff; font-weight: bold; font-size: 24px; text-align: left; margin: 24px 0 12px;">',
    )
    .replaceAll(
      "<h2>",
      '<h2 style="color: #ffffff; font-weight: bold; font-size: 20px; text-align: left; margin: 20px 0 10px;">',
    )
    .replaceAll(
      "<h3>",
      '<h3 style="color: #ffffff; font-weight: bold; font-size: 17px; text-align: left; margin: 16px 0 8px;">',
    )
    .replaceAll(
      "<h4>",
      '<h4 style="color: #ffffff; font-weight: bold; font-size: 15px; text-align: left; margin: 16px 0 8px;">',
    )
    .replaceAll(
      "<strong>",
      '<strong style="color: #ffffff; font-weight: bold;">',
    )
    .replaceAll("<b>", '<b style="color: #ffffff; font-weight: bold;">')
    .replaceAll("<li>", '<li style="color: #c2c7d0; font-size: 16px;">');
};

// Sections. A divider in the editor (the toolbar's Section break, which TipTap
// emits as <hr>) splits the body into panels that are rendered as full-width
// bands of alternating background, so a long email reads as distinct blocks
// rather than one wall of text. A body with no dividers yields a single panel
// and looks exactly as it did before.
// The base card tone, and a lift above it. The alternate band used to be the
// page background (#0f111a), which read as a hole punched in the card rather
// than a step up — lighter separates the blocks without darkening the email.
const SECTION_TONES = ["#1b1d2a", "#262b3e"];
// Light enough to stay visible against both tones. The card border is a step
// darker on purpose, so the outer edge stays quieter than the inner rules.
const SECTION_RULE = "#3a3f57";

export const splitSections = (html: string) =>
  (html || "")
    .split(/<hr[^>]*>/i)
    .map((section) => section.trim())
    .filter((section) => section !== "" && section !== "<p></p>");

/**
 * Render panels as table rows. Tables rather than divs because Outlook ignores
 * background-color on a div, which would leave the bands invisible in exactly
 * the client most parents read this on.
 *
 * `offset` shifts where the alternation starts, so the panel directly under the
 * logo header can continue the header's tone instead of banding against it.
 */
export const renderSectionRows = (panels: string[], offset = 0) =>
  panels
    .map((panel, i) => {
      const tone = SECTION_TONES[(i + offset) % SECTION_TONES.length];
      const rule =
        i === 0
          ? ""
          : `<tr><td height="1" style="height: 1px; line-height: 1px; font-size: 1px; background-color: ${SECTION_RULE};">&nbsp;</td></tr>`;

      return `${rule}
      <tr>
        <td style="background-color: ${tone}; padding: 24px 30px;">
          ${panel}
        </td>
      </tr>`;
    })
    .join("\n");

export const emailTemplate = (
  message: string,
  footer: string,
  invite?: Invitation,
  player?: Player,
) => {
  const variables = { name: player?.name, email: player?.email };

  const cta = invite
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 24px auto 8px;">
            <tr>
              <td style="padding: 0 6px;">
                <a href="${process.env.VITE_URL}/player-invite-reject?token=${invite.token}" style="background-color: #b30202; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
                  Reject Invite
                </a>
              </td>
              <td style="padding: 0 6px;">
                <a href="${process.env.VITE_URL}/player-invite?token=${invite.token}" style="background-color: #1a8cff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
                  Accept Invite
                </a>
              </td>
            </tr>
          </table>`
    : "";

  const panels = splitSections(message).map((section) =>
    styleRichTextBase(section, variables),
  );
  if (panels.length === 0) panels.push("");

  // The buttons belong to the closing section, so its heading and its call to
  // action share a background rather than being split across a band edge.
  panels[panels.length - 1] += cta;

  if (footer?.trim()) panels.push(styleRichTextBase(footer, variables));

  return `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; background-color: #0f111a;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>St Helens RLFC - beCoachable</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0f111a; color: #ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f111a;">
      <tr>
        <td align="center" style="padding: 40px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; border-radius: 12px; border: 1px solid #2a2d3b; border-collapse: separate; overflow: hidden;">
            <tr>
              <td style="background-color: ${SECTION_TONES[0]}; padding: 30px 30px 10px; text-align: center;">
                <img src="https://be-coachable.com/logo.png" alt="beCoachable" style="width: 60px;" />
              </td>
            </tr>
            ${renderSectionRows(panels)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

// Template for mass emails sent to programme members. Optionally embeds a
// call-to-action button (used to link members to the registration page where
// they can update their availability or withdraw).
export const programmeEmailTemplate = (
  message: string,
  footer: string,
  options?: {
    name?: string;
    team?: string;
    ctaUrl?: string;
    ctaLabel?: string;
    withdrawUrl?: string;
    withdrawLabel?: string;
    availability?: { name: string; date?: string; available?: boolean }[];
  },
) => {
  const name = options?.name || "";
  const team = options?.team || "";
  const ctaLabel = options?.ctaLabel || "Update your Availability";
  const withdrawLabel = options?.withdrawLabel || "Withdraw from programme";

  const styleRichText = (html: string) =>
    styleRichTextBase(html, { name, team });

  const availabilitySection =
    options?.availability && options.availability.length > 0
      ? `<div style="margin: 24px 0; background-color: #0f111a; border: 1px solid #2a2d3b; border-radius: 8px; padding: 16px;">
        <p style="color: #ffffff; font-size: 15px; font-weight: bold; margin: 0 0 12px;">Your current availability</p>
        <table width="100%" style="border-collapse: collapse;">
          ${options.availability
            .map((a) => {
              const status =
                a.available === true
                  ? '<span style="color: #22c55e;">&#10004; Available</span>'
                  : a.available === false
                  ? '<span style="color: #ef4444;">&#10008; Not available</span>'
                  : '<span style="color: #7c8190;">&#8212; Not specified</span>';
              const date = a.date
                ? ` <span style="color: #7c8190;">(${formatDate(
                    a.date,
                  )})</span>`
                : "";
              return `<tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #2a2d3b; color: #c2c7d0; font-size: 14px;">${a.name}${date}</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #2a2d3b; text-align: right; font-size: 14px; white-space: nowrap;">${status}</td>
              </tr>`;
            })
            .join("")}
        </table>
      </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; background-color: #0f111a;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A message from St Helens RLFC</title>
  </head>
  <body style="margin: 0; font-family: Arial, sans-serif; background-color: #0f111a; color: #ffffff;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #1b1d2a; padding: 30px; border-radius: 12px; border: 1px solid #2a2d3b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://be-coachable.com/logo.png" alt="beCoachable" style="width:60px;" />
      </div>

        ${styleRichText(message)}

      ${availabilitySection}

      ${
        options?.ctaUrl || options?.withdrawUrl
          ? `<div style="text-align: center; margin: 30px 0;">
        ${
          options?.ctaUrl
            ? `<a href="${options.ctaUrl}" style="background-color: #1a8cff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block; margin: 6px;">
          ${ctaLabel}
        </a>`
            : ""
        }
        ${
          options?.withdrawUrl
            ? `<a href="${options.withdrawUrl}" style="background-color: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 13px 27px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block; margin: 6px;">
          ${withdrawLabel}
        </a>`
            : ""
        }
      </div>`
          : ""
      }

      ${footer ? styleRichText(footer) : ""}

      <hr style="border: none; border-top: 1px solid #2a2d3b; margin: 40px 0;" />
    </div>
  </body>
</html>`;
};

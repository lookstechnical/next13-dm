import { Invitation, Player } from "~/types";
import { formatDate } from "~/utils/helpers";

export const emailTemplate = (
  message: string,
  footer: string,
  invite?: Invitation,
  player?: Player
) => {
  return `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; background-color: #0f111a;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You have been invited to Next13 (saints RLFC)</title>
  </head>
  <body style="margin: 0; font-family: Arial, sans-serif; background-color: #0f111a; color: #ffffff;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #1b1d2a; padding: 30px; border-radius: 12px; border: 1px solid #2a2d3b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://be-coachable.com/logo.png" alt="beCoachble" style="width:60px;" />
      </div>

        ${message
          .replaceAll("{{name}}", player?.name)
          .replaceAll(
            "<p>",
            '<p style="color: #c2c7d0; font-size: 16px; text-align: left;">'
          )}

      <div style="text-align: center; margin: 30px 0; display:flex; flex-direction: row; gap: 10px; justify-content: center">
        ${
          invite
            ? `<a href="${process.env.VITE_URL}/player-invite-reject?token=${invite.token}" style="background-color: #b30202ff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
          Reject Invite
        </a>`
            : ""
        }
         ${
           invite
             ? `<a href="${process.env.VITE_URL}/player-invite?token=${invite.token}" style="background-color: #1a8cff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
          Accept Invite
        </a>`
             : ""
         }
      </div>

      ${
        footer
          ? footer
              .replaceAll("{{name}}", player?.name)
              .replaceAll(
                "<p>",
                '<p style="color: #c2c7d0; font-size: 16px; text-align: left;">'
              )
          : ""
      }

      <hr style="border: none; border-top: 1px solid #2a2d3b; margin: 40px 0;" />
    </div>
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
    ctaUrl?: string;
    ctaLabel?: string;
    availability?: { name: string; date?: string; available?: boolean }[];
  }
) => {
  const name = options?.name || "";
  const ctaLabel = options?.ctaLabel || "Update your registration";

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
                ? ` <span style="color: #7c8190;">(${formatDate(a.date)})</span>`
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

        ${message
          .replaceAll("{{name}}", name)
          .replaceAll(
            "<p>",
            '<p style="color: #c2c7d0; font-size: 16px; text-align: left;">'
          )}

      ${availabilitySection}

      ${
        options?.ctaUrl
          ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${options.ctaUrl}" style="background-color: #1a8cff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
          ${ctaLabel}
        </a>
      </div>`
          : ""
      }

      ${
        footer
          ? footer
              .replaceAll("{{name}}", name)
              .replaceAll(
                "<p>",
                '<p style="color: #c2c7d0; font-size: 16px; text-align: left;">'
              )
          : ""
      }

      <hr style="border: none; border-top: 1px solid #2a2d3b; margin: 40px 0;" />
    </div>
  </body>
</html>`;
};

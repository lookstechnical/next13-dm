import { Invitation, Player } from "~/types";

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
  options?: { name?: string; ctaUrl?: string; ctaLabel?: string }
) => {
  const name = options?.name || "";
  const ctaLabel = options?.ctaLabel || "Update your registration";

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

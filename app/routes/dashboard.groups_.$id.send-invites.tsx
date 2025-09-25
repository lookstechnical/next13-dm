import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { GroupEmailForm } from "~/components/forms/form/group-email-form";
import { GroupService } from "~/services/groupService";
import { InvitationService } from "~/services/invitationService";
import { Resend } from "resend";
import { emailTemplate } from "~/services/email";
import { delay } from "~/utils/helpers";
import SheetPage from "~/components/sheet-page";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient }) => {
    const groupsService = new GroupService(supabaseClient);

    const group = params.id
      ? await groupsService.getGroupById(params.id)
      : undefined;

    return { group };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    const groupsService = new GroupService(supabaseClient);

    const resend = new Resend(process.env.VITE_RESEND_API);

    const invitationService = new InvitationService(supabaseClient);

    const group = params.id
      ? await groupsService.getGroupById(params.id)
      : undefined;

    if (!group) return {};

    let formData = await request.formData();
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const footer = formData.get("footer") as string;
    const type = formData.get("type") as string;

    for (const player of group.playerGroupMembers) {
      if (player.players.email) {
        if (type === "invite") {
          const invite = await invitationService.createInvitation(
            player.playerId
          );

          try {
            if (invite?.status === "pending") {
              if (process.env.VITE_ENABLE_INVITE_EMAILS === "1") {
                const data = await resend.emails.send({
                  from: "St Helens RLFC - beCoachable <noreply@be-coachable.com>",
                  to: [player.players.email],
                  subject,
                  html: emailTemplate(
                    description,
                    footer,
                    invite,
                    player.players
                  ),
                });
                console.log("Email sent:", data);
              } else {
                const data = await resend.emails.send({
                  from: "St Helens RLFC - beCoachable <noreply@be-coachable.com>",
                  to: ["info@lookstechnical.co.uk"],
                  subject,
                  html: emailTemplate(
                    description,
                    footer,
                    invite,
                    player.players
                  ),
                });
                console.log("Email sent:", data);

                await delay(500);
              }
            }
          } catch (error) {
            console.error("Error sending email:", error);
          }
        } else {
          try {
            // if (process.env.VITE_ENABLE_INVITE_EMAILS === "1") {
            const data = await resend.emails.send({
              from: "St Helens RLFC - beCoachable <noreply@be-coachable.com>",
              to: [player.players.email],
              subject,
              html: emailTemplate(
                description,
                footer,
                undefined,
                player.players
              ),
            });

            await delay(500);
            // }
          } catch (error) {
            console.error("Error sending email:", error);
          }
        }
      }
    }

    return {};
  }
);

export default function SendInviteToGroup() {
  const { group } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/groups/${group.id}`}
      title="Send Email"
      description="Send Email"
      updateButton="Send Email"
      hasForm
    >
      <GroupEmailForm />
    </SheetPage>
  );
}

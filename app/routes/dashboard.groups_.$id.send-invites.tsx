import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { useState } from "react";
import { GroupEmailForm } from "~/components/forms/form/group-email-form";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { GroupService } from "~/services/groupService";
import { InvitationService } from "~/services/invitationService";
import { PlayerService } from "~/services/playerService";
import { getAppUser, requireUser } from "~/utils/require-user";
import { Resend } from "resend";
import { emailTemplate } from "~/services/email";
import { delay } from "~/utils/helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const groupsService = new GroupService(supabaseClient);
  const playerService = new PlayerService(supabaseClient);

  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }

  const group = params.id
    ? await groupsService.getGroupById(params.id)
    : undefined;

  return { group };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const groupsService = new GroupService(supabaseClient);

  const resend = new Resend("re_UshzPAdj_NmvC1j4Cipqh89znQYz3BcXU");

  const invitationService = new InvitationService(supabaseClient);

  const group = params.id
    ? await groupsService.getGroupById(params.id)
    : undefined;

  if (!group) return {};

  let formData = await request.formData();
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
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
                html: emailTemplate(description, invite, player.players),
              });
              console.log("Email sent:", data);
            } else {
              const data = await resend.emails.send({
                from: "St Helens RLFC - beCoachable <noreply@be-coachable.com>",
                to: ["info@lookstechnical.co.uk"],
                subject,
                html: emailTemplate(description, invite, player.players),
              });
              console.log("Email sent:", data);

              await delay(500);
            }
          }
        } catch (error) {
          console.error("Error sending email:", error);
        }
      }
    }
  }

  return {};
};

export default function SendInviteToGroup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { group } = useLoaderData<typeof loader>();

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setOpen(open);
          setTimeout(() => {
            navigate(`/dashboard/groups/${group.id}`);
          }, 500);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <Form method="post">
          <SheetHeader className="">
            <SheetTitle>Send Email</SheetTitle>
            <SheetDescription>Send Email to Group</SheetDescription>
          </SheetHeader>

          <GroupEmailForm />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2 bg-card">
            <Button asChild variant="link">
              <Link to={`/dashboard/groups/${group.id}`}>Cancel</Link>
            </Button>
            <ActionButton title="Send Emails" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

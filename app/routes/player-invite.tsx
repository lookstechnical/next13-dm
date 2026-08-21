import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import InviteMessage from "~/components/invite-message";
import { Resend } from "resend";
import z from "zod";
import { PlayerForm } from "~/components/forms/player";
import ActionButton from "~/components/ui/action-button";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { InvitationService } from "~/services/invitationService";
import {
  applyInviteVariables,
  resolveInviteContent,
} from "~/services/inviteContent";
import { PlayerService } from "~/services/playerService";
import { inviteRegistration } from "~/validations/player-registration";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  // An unknown or missing token used to redirect to "/", which drops the
  // parent on the dashboard/login and reads as a broken link. Explain instead.
  if (!token) return { invalid: true };
  const inviteService = new InvitationService(supabaseClient);

  const invite = await inviteService.getInvitationByToken(token);
  if (!invite) return { invalid: true };

  const playerService = new PlayerService(supabaseClient);

  const player = await playerService.getPlayerById(invite.playerId);

  const clubs = await clubService.getAllClubs();

  // Copy is snapshotted onto the invitation when it is sent; anything blank
  // (including every invitation sent before it became editable) falls back to
  // the defaults in inviteContent.
  const content = resolveInviteContent(invite);

  return {
    clubs,
    player,
    invite,
    content: {
      ...content,
      acceptPageContent: applyInviteVariables(content.acceptPageContent, {
        name: player?.name,
      }),
    },
  };
};

export const action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  try {
    const { supabaseClient } = await getSupabaseServerClient(request);
    const avatar = formData.get("avatar");

    if (!token) return redirect("/");
    const inviteService = new InvitationService(supabaseClient);

    const invite = await inviteService.getInvitationByToken(token);

    if (!invite) return redirect("/");

    const playerService = new PlayerService(supabaseClient);

    const { data, playerId } = await playerService.getFormFields(formData);

    const validations = inviteRegistration.safeParse({ ...data, avatar });
    if (validations.error) return { errors: z.treeifyError(validations.error) };

    await playerService.updatePlayer(playerId, data);

    if (playerId && avatar) {
      const res = await playerService.uploadPlayerProfilePhoto(
        playerId,
        avatar
      );
    }

    await inviteService.completeInvitation(invite);

    return { status: "complete" };
  } catch (e: any) {
    const resend = new Resend(process.env.VITE_RESEND_API);
    await resend.emails.send({
      from: "Error - beCoachable <noreply@be-coachable.com>",
      to: ["info@lookstechnical.co.uk"],
      subject: "And error on Player invite",
      html: `<div>${e.message} for ${token}</div>`,
    });

    throw e;
  }
};

export function ErrorBoundary() {
  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
      <div className="w-full py-6 flex flex-col w-[50rem] items-center">
        <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

        <h1 className="text-4xl">There Was an error please try again </h1>
        <p className="text-muted">
          if the problem persists and your on mobile please try on a laptop or
          desktop pc
        </p>
      </div>
    </div>
  );
}

const PlayerInvite = () => {
  const { clubs, player, invite, invalid, content } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (invalid) {
    return (
      <InviteMessage>
        This invitation link is no longer valid. If it came from a test email
        the buttons are inactive; otherwise please ask your coach to resend it.
      </InviteMessage>
    );
  }

  if (actionData?.status === "complete") {
    return <InviteMessage>{content.acceptCompleteMessage}</InviteMessage>;
  }

  if (invite?.status === "accepted") {
    return (
      <InviteMessage>
        The Invite has expired or has already been completed
      </InviteMessage>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-col gap-3 items-center p-4 text-center">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <h1 className="text-4xl">Player Invitation</h1>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-center"
            dangerouslySetInnerHTML={{ __html: content.acceptPageContent }}
          />
        </div>
      </div>

      {actionData?.status !== "complete" && invite?.status === "pending" && (
        <div className="container mx-auto max-w-[50rem] py-6">
          <Form method="POST" encType="multipart/form-data" className="px-4">
            <PlayerForm
              player={{ ...player, dateOfBirth: undefined }}
              clubs={clubs}
              errors={actionData?.errors}
            />
            <div className="py-4 flex justify-end">
              <ActionButton title="Accept Invite" />
            </div>
          </Form>
        </div>
      )}
    </div>
  );
};

export default PlayerInvite;

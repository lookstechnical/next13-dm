import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import z from "zod";
import { PlayerForm } from "~/components/forms/player";
import ActionButton from "~/components/ui/action-button";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { InvitationService } from "~/services/invitationService";
import { PlayerService } from "~/services/playerService";
import { inviteRegistration } from "~/validations/player-registration";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return redirect("/");
  const inviteService = new InvitationService(supabaseClient);

  const invite = await inviteService.getInvitationByToken(token);
  if (!invite) return redirect("/");

  const playerService = new PlayerService(supabaseClient);

  const player = await playerService.getPlayerById(invite.playerId);

  const clubs = await clubService.getAllClubs();

  return { clubs, player, invite };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);
  let formData = await request.formData();
  const avatar = formData.get("avatar");

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
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
    await playerService.uploadPlayerProfilePhoto(playerId, avatar);
  }

  await inviteService.completeInvitation(invite);

  return { status: "complete" };
};

const PlayerInvite = () => {
  const { clubs, player, invite } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (actionData?.status === "complete") {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-4xl">Player Invitation</h1>
          <p className="text-muted">
            Thank you we will be in touch soon with more details!
          </p>
        </div>
      </div>
    );
  }

  if (invite?.status === "accepted") {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-4xl">Player Invitation</h1>
          <p className="text-muted">
            The Invite has expired or has already been completed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-row gap-3 flex flex-col items-center p-4 text-center">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <h1 className="text-4xl">Player Invitation</h1>
          <p>
            Congratulations on your Invitation to the Saints LDP Excel Program
          </p>
          <p className="text-muted">
            Please complete the form below to accept your invitation
          </p>
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

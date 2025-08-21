import { LoaderFunction, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { PlayerForm } from "~/components/forms/player";
import ActionButton from "~/components/ui/action-button";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { InvitationService } from "~/services/invitationService";
import { PlayerService } from "~/services/playerService";

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

  return { clubs, player };
};

const PlayerInvite = () => {
  const { clubs, player } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-row gap-3 items-end">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <div>
            <h1 className="text-4xl">Player Registration</h1>
            <p className="text-muted">
              Please complete the form below to accept your invitation
            </p>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-[50rem] py-6">
        <Form>
          <PlayerForm player={player} clubs={clubs} />
          <div className="py-4 flex justify-end">
            <ActionButton title="Accept Invite" />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default PlayerInvite;

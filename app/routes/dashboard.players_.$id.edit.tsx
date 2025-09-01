import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { PlayerForm } from "~/components/forms/player";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import { requireUser, getAppUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);
  const playerService = new PlayerService(supabaseClient);
  const player = params.id
    ? await playerService.getPlayerById(params.id)
    : undefined;

  const clubsService = new ClubService(supabaseClient);
  const clubs = await clubsService.getAllClubs();

  return { player, clubs };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);
  const formdata = await request.formData();
  const avatar = formdata.get("avatar");

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const playerService = new PlayerService(supabaseClient);

  const { data, playerId } = await playerService.getFormFields(formdata);

  await playerService.updatePlayer(playerId, data);

  if (playerId && avatar) {
    await playerService.uploadPlayerProfilePhoto(playerId, avatar);
  }

  return redirect(`/dashboard/players/${playerId}`);
};

export default function PlayersCreate() {
  const { player, clubs } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/players"
      updateButton="Update player"
      title="Edit Player"
      description="Update a player in the team"
      hasForm
    >
      <PlayerForm player={player} clubs={clubs} />
    </SheetPage>
  );
}

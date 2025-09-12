import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { PlayerForm } from "~/components/forms/player";
import SheetPage from "~/components/sheet-page";
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import { Player } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader = withAuth(async ({ supabaseClient }) => {
  const clubsService = new ClubService(supabaseClient);
  const clubs = await clubsService.getAllClubs();

  return { clubs };
});

export const action = withAuthAction(
  async ({ request, user, supabaseClient }) => {
    let formData = await request.formData();

    const playerService = new PlayerService(supabaseClient);

    const avatar = formData.get("avatar");

    const data: Omit<Player, "id"> = {
      name: formData.get("name") as string,
      position: formData.get("position") as string,
      secondaryPosition: formData.get("secondaryPosition") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      nationality: formData.get("nationality") as string,
      club: formData.get("club") as string,
      school: formData.get("school") as string,
      photoUrl: formData.get("photoUrl") as string,
      email: formData.get("email") as string,
      scoutId: user.id as string,
      teamId: user.current_team as string,
    };

    const player = await playerService.createPlayer(data);

    if (player && avatar) {
      await playerService.uploadPlayerProfilePhoto(player.id, avatar);
    }

    return redirect(`/dashboard/players`);
  }
);

export default function PlayersCreate() {
  const { clubs } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/players"
      updateButton="Add player"
      title="Add Player"
      description="Add a new player to the team"
      hasForm
    >
      <PlayerForm clubs={clubs} />
    </SheetPage>
  );
}

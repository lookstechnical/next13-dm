import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { PlayerForm } from "~/components/forms/player";
import { AllowedRoles, RouteProtection } from "~/components/route-protections";
import SheetPage from "~/components/sheet-page";
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import { ScoutService } from "~/services/scoutService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { requireUser, getAppUser } from "~/utils/require-user";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const playerService = new PlayerService(supabaseClient);
    const player = params.id
      ? await playerService.getPlayerById(params.id)
      : undefined;

    const clubsService = new ClubService(supabaseClient);
    const clubs = await clubsService.getAllClubs();

    const usersService = new ScoutService(supabaseClient);
    const users = await usersService.getAllScouts();

    return { player, clubs, user, users };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const formdata = await request.formData();
    const avatar = formdata.get("avatar");

    const playerService = new PlayerService(supabaseClient);

    const { data, playerId } = await playerService.getFormFields(formdata);

    await playerService.updatePlayer(playerId, data);

    if (playerId && avatar) {
      await playerService.uploadPlayerProfilePhoto(playerId, avatar);
    }

    return redirect(`/dashboard/players/${playerId}`);
  }
);

export default function PlayersCreate() {
  const { player, clubs, user, users } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/players"
      updateButton="Update player"
      title="Edit Player"
      description="Update a player in the team"
      hasForm
    >
      <RouteProtection allowedRoles={AllowedRoles.headOfDept} user={user}>
        <PlayerForm player={player} clubs={clubs} users={users} />
      </RouteProtection>
    </SheetPage>
  );
}

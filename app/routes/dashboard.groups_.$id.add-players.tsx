import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, redirect, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { PlayerCard } from "~/components/players/player-card";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { Player } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

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

  if (!group) return {};

  const availablePlayers = await playerService.getPlayersNotInlist(
    user.current_team as string,
    group.playerIds
  );

  return { availablePlayers, group };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const groupsService = new GroupService(supabaseClient);

  let formData = await request.formData();
  const groupId = formData.get("groupId");
  const playerId = formData.get("playerId");

  if (playerId && groupId) {
    await groupsService.addPlayersToGroup(groupId as string, [
      playerId as string,
    ]);
  }

  return {};
};

export default function AddPlayersToGroup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { availablePlayers, group } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/groups/${group.id}`}
      title="Add Players to Group"
      description="Add Players to Group"
      updateButton="Add Players to Group"
    >
      <CardGrid
        name="All players are already in the group"
        items={availablePlayers}
      >
        {availablePlayers?.map((player: Player) => (
          <PlayerCard
            key={`available-player-card-${player.id}`}
            player={player}
          >
            <Form method="post" className="w-full">
              <input type="hidden" name="playerId" value={player.id} />
              <input type="hidden" name="groupId" value={group.id} />
              <Button
                type="submit"
                variant="outline"
                className="border-muted w-full"
              >
                Add Player
              </Button>
            </Form>
          </PlayerCard>
        ))}
      </CardGrid>
    </SheetPage>
  );
}

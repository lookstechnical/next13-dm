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
import { PlayerCard } from "~/components/players/player-card";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Tabs } from "~/components/ui/tabs";
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
        <SheetHeader className="">
          <SheetTitle>Add Players to Group</SheetTitle>
          <SheetDescription>Add a player</SheetDescription>
        </SheetHeader>

        <div className="h-[80vh] overflow-scroll">
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
        </div>
        <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
          <Button asChild variant="link">
            <Link to={`/dashboard/groups/${group.id}`}>Cancel</Link>
          </Button>
          <Button className="text-white" variant="outline" type="submit">
            Add Players to Group
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

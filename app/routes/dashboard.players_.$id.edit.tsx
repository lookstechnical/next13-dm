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
import { PlayerForm } from "~/components/forms/player";
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
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import { Player } from "~/types";
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

  let formData = await request.formData();
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const playerService = new PlayerService(supabaseClient);

  const playerId = formData.get("playerId") as string;
  const avatar = formData.get("avatar");

  const data: Omit<Player, "id"> = {
    name: formData.get("name") as string,
    position: formData.get("position") as string,
    secondaryPosition: formData.get("secondaryPosition") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    nationality: formData.get("nationality") as string,
    club: formData.get("club") as string,
    school: formData.get("school") as string,
    height: formData.get("height") as string,
    foot: formData.get("foot") as string,
    photoUrl: formData.get("photoUrl") as string,
    email: formData.get("email") as string,
    scoutId: user.id as string,
    teamId: formData.get("teamId") as string,
  };

  await playerService.updatePlayer(playerId, data);

  if (playerId && avatar) {
    await playerService.uploadPlayerProfilePhoto(playerId, avatar);
  }

  return redirect(`/dashboard/players/${playerId}`);
};

export default function PlayersCreate() {
  const navigate = useNavigate();
  const { player, clubs } = useLoaderData<typeof loader>();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/players");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw] gap-10 flex flex-col">
        <Form method="post" encType="multipart/form-data">
          <SheetHeader className="">
            <SheetTitle>Edit {player.name}</SheetTitle>
            <SheetDescription>Edit </SheetDescription>
          </SheetHeader>
          <PlayerForm player={player} clubs={clubs} />
          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/players/${player.id}`}>Cancel</Link>
            </Button>
            <Button className="text-white" variant="default" type="submit">
              Update Player
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

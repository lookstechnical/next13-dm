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
import { ItemView } from "~/components/session/item-view";
import ActionButton from "~/components/ui/action-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import VideoPlayer from "~/components/video/video";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { DrillsService } from "~/services/drillsService";
import { PlayerService } from "~/services/playerService";
import { Player } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);

  const drillService = new DrillsService(supabaseClient);
  const drill = params.id
    ? await drillService.getDrillById(params.id)
    : undefined;

  return { drill };
};

export default function PlayersCreate() {
  const navigate = useNavigate();
  const { drill } = useLoaderData<typeof loader>();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/drills-library");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw] gap-10 flex flex-col">
        <SheetHeader className="">
          <SheetTitle>{drill.name}</SheetTitle>
        </SheetHeader>
        <ItemView item={drill} />
        <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2"></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

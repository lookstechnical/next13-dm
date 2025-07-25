import {
  redirect,
  type LoaderFunction,
  type MetaFunction,
} from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { GroupCard } from "~/components/groups/group-card";
import { ListingHeader } from "~/components/layout/listing-header";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
import { PlayerGroup } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Events" }, { name: "description", content: "Events" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }
  const playerService = new GroupService(supabaseClient);
  const groups =
    (await playerService.getGroupsByTeam(user?.current_team as string)) || [];
  return { groups, user };
};

export default function Events() {
  const { groups, user } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title="Player Groups"
          searchPlaceholder="Search Groups by Name"
        />
        <CardGrid name={`${user.team.name} has 0 groups`} items={groups}>
          {groups?.map((group: PlayerGroup) => (
            <GroupCard group={group} to={(id) => `/dashboard/groups/${id}`} />
          ))}
        </CardGrid>
      </div>
      <Outlet />
    </div>
  );
}

import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { SessionItemCard } from "~/components/session/item-card";
import { ItemView } from "~/components/session/item-view";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { SessionItem } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const sessionService = new SessionService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const event = await eventService.getEventById(params.id as string);
  const sessionItem = await sessionService.getSessionItemsById(
    params.item_id as string
  );

  return { event, sessionItem };
};

export default function SessionPlan() {
  const { event, sessionItem } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate(`/dashboard/events/${event.id}/session-plan`);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>{sessionItem.drills?.name}</SheetTitle>
        </SheetHeader>

        <ItemView item={sessionItem.drills} />
        {/* <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
          <Button asChild variant="link">
            <Link to={`/dashboard/events/${event.id}/session-plan`}>
              Cancel
            </Link>
          </Button>

          <ActionButton title="Add Library Item" />
        </SheetFooter> */}
      </SheetContent>
    </Sheet>
  );
}

import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, redirect, useLoaderData } from "@remix-run/react";
import { User2 } from "lucide-react";
import { useState } from "react";
import { SelectField } from "~/components/forms/select";
import { PlayerCard } from "~/components/players/player-card";
import { Button } from "~/components/ui/button copy";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { cn } from "~/lib/utils";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
import { EventRegistration } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const event = await eventService.getEventById(params.id as string);
  const players = event
    ? await eventService.getEventRegistrations(event.id as string)
    : [];

  const groupService = new GroupService(supabaseClient);
  const groups = (await groupService.getGroupsByTeam(user.team.id)) || [];
  return { event, players, groups };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const formData = await request.formData();

  if (request.method === "DELETE") {
    if (params.id) eventService.deleteEvent(params.id);
    return redirect("/dashboard/events");
  } else {
    const playerId = formData.get("playerId");
    const eventId = formData.get("eventId");

    const event =
      playerId && eventId
        ? await eventService.getPlayerEventRegistrationById(
            playerId as string,
            eventId as string
          )
        : undefined;

    if (event) {
      const status = event.status === "confirmed" ? "attended" : "confirmed";
      await eventService.updateAttendanceById(
        status,
        playerId as string,
        eventId as string
      );
    }
  }

  return {};
};

export default function PlayerPage() {
  const {} = useLoaderData<typeof loader>();

  return (
    <>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4 flex flex-row items-end  gap-2"></div>
        <div className="container mx-auto px-4">
          <CardGrid items={[]} name="No session Plan items for this event">
            <div>item</div>
          </CardGrid>
        </div>
      </div>
    </>
  );
}

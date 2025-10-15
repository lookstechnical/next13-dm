import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, redirect, useLoaderData } from "@remix-run/react";
import { User2 } from "lucide-react";
import { useState } from "react";
import { ActionProtection } from "~/components/action-protection";
import { Field } from "~/components/forms/field";
import { SelectField } from "~/components/forms/select";
import { PlayerCard } from "~/components/players/player-card";
import { AllowedRoles } from "~/components/route-protections";
import { Button } from "~/components/ui/button copy";
import { CardGrid } from "~/components/ui/card-grid";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
import { ScoutService } from "~/services/scoutService";
import { EventRegistration } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);

    const event = await eventService.getEventById(params.id as string);
    const players = event
      ? await eventService.getEventRegistrations(event.id as string)
      : [];

    const groupService = new GroupService(supabaseClient);
    const groups = (await groupService.getGroupsByTeam(user.team.id)) || [];

    return { event, players, groups, user };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
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
  }
);

export default function PlayerPage() {
  const { event, players, groups, user, mentors } =
    useLoaderData<typeof loader>();
  const [status, setStatus] = useState<string>();
  const [mentor, setMentor] = useState<boolean>();
  const [group, setGroup] = useState<string>();

  const getVariant = (player: EventRegistration) => {
    switch (player.status) {
      case "attended":
        return "secondary";
      case "confirmed":
        return "outline";
      case "no_show":
        return "default";
    }
  };

  let filteredPlayers = status
    ? players.filter((p) => p.status === status)
    : players;

  filteredPlayers = group
    ? filteredPlayers.filter((p) =>
        p.players.playerGroupMembers?.map((gm) => gm.groupId).includes(group)
      )
    : filteredPlayers;

  filteredPlayers = mentor
    ? filteredPlayers.filter((p) => p.players.mentor === user.id)
    : filteredPlayers;

  return (
    <>
      <div className="bg-card min-h-screen py-10 ">
        <div className="container mx-auto px-4 flex flex-row items-end  gap-2">
          <SelectField
            name="status"
            label="Attendance"
            onValueChange={(status) => {
              setStatus(status === "all" ? undefined : status);
            }}
            options={[
              { id: "all", name: "all" },
              { id: "attended", name: "Attended" },
              { id: "confirmed", name: "Confirmed" },
            ]}
          />

          <Field label="Mentor" name="mentor">
            <Checkbox
              name="mentor"
              onCheckedChange={(b) => {
                setMentor(b);
              }}
            />
          </Field>
          <div className="w-1/5 text-foreground flex flex-row gap-2 items-center justify-start">
            <User2 /> {filteredPlayers.length}{" "}
            <span className="hidden md:inline-block">players</span>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <CardGrid
            items={filteredPlayers}
            name="No Players currently for this event"
          >
            {filteredPlayers.map((player: EventRegistration, index: number) => (
              <PlayerCard player={player.players} key={`player-card-${index}`}>
                <div className="flex flex-row w-full ">
                  <ActionProtection
                    allowedRoles={AllowedRoles.headOfDept}
                    user={user}
                  >
                    <Form method="POST" className="w-full">
                      <input
                        type="hidden"
                        name="playerId"
                        value={player.players.id}
                      />
                      <input
                        type="hidden"
                        name="eventId"
                        value={player.eventId}
                      />

                      <Button
                        type="submit"
                        variant={getVariant(player)}
                        className={cn(
                          "w-full flex-1 text-white uppercase border-muted"
                        )}
                      >
                        {player.status}
                      </Button>
                    </Form>
                  </ActionProtection>
                  <Button
                    asChild
                    className="w-full border-muted"
                    variant="outline"
                  >
                    <Link
                      to={`/dashboard/events/${event.id}/report/${player.playerId}`}
                    >
                      Add Report
                    </Link>
                  </Button>
                </div>
              </PlayerCard>
            ))}
          </CardGrid>
        </div>
      </div>
    </>
  );
}

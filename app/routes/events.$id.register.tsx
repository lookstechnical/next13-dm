import { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { Field } from "~/components/forms/field";
import { PlayerForm } from "~/components/forms/player";
import ActionButton from "~/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { EventService } from "~/services/eventService";
import { PlayerService } from "~/services/playerService";
import { step1 } from "~/validations/player-registration";
import z from "zod";

export { ErrorBoundary } from "~/components/error-boundry";

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const clubsService = new ClubService(supabaseClient);

  const event = params.id
    ? await eventService.getEventById(params.id)
    : undefined;

  const clubs = await clubsService.getAllClubs();

  return { event, clubs };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const playerService = new PlayerService(supabaseClient);

  let formData = await request.formData();
  const step = formData.get("step") as string;
  const email = formData.get("email") as string;
  const eventId = formData.get("eventId") as string;

  if (step === "1") {
    const validations = step1.safeParse({ email });
    if (validations.error) return { errors: z.treeifyError(validations.error) };

    const player = await playerService.getPlayerByEmail(email);

    if (player) {
      const registrations = await eventService.getPlayerEventRegistrations(
        player.id
      );

      const alreadyRegistered = registrations.find(
        (r) => r.eventId === eventId
      );

      if (alreadyRegistered) {
        return { step: 4 };
      }
    }

    return { step: 2, player: { ...player, email } };
  }

  if (step === "2") {
    const eventId = formData.get("eventId") as string;
    const event = await eventService.getEventById(eventId);

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
      scoutId: null,
      teamId: event?.teamId,
      mentor: formData.get("mentor") as string,
    };

    const playerId = formData.get("playerId") as string;

    let player;
    if (playerId) {
      player = await playerService.updatePlayer(playerId, data);
    } else {
      player = await playerService.createPlayer(data);
    }

    if (player && avatar) {
      await playerService.uploadPlayerProfilePhoto(player.id, avatar);
    }

    if (player && eventId) {
      await eventService.addEventRegistration({
        eventId,
        playerId: player.id,
        status: "confirmed",
        email: player.email,
      });

      return { step: 3 };
    }
  }
};

export const PublicEventsRegister = () => {
  const { event, clubs } = useLoaderData<typeof loader>();
  const action = useActionData<typeof action>();
  const navigate = useNavigate();

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate("/events");
        }
      }}
    >
      <DialogContent className="text-foreground">
        <DialogHeader>
          <DialogTitle>Register for {event.name}</DialogTitle>
          <DialogDescription>{event.description}</DialogDescription>
        </DialogHeader>

        {!action?.step && (
          <Form method="post">
            <input type="hidden" name="step" value="1" />
            <input type="hidden" name="eventId" value={event.id} />
            <Field name="email" label="Email" errors={action?.errors}>
              <Input
                name="email"
                placeholder="Enter your Email"
                type="email"
                required
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>
            <div className="py-4 flex flex-row justify-end">
              <ActionButton title="Register" />
            </div>
          </Form>
        )}

        {action?.step === 2 && (
          <Form method="post">
            <input type="hidden" name="step" value="2" />
            <input type="hidden" name="eventId" value={event.id} />
            <PlayerForm clubs={clubs} player={action.player} />
            <div className="py-4 flex flex-row justify-end">
              <ActionButton title="Register" />
            </div>
          </Form>
        )}

        {action?.step === 3 && (
          <div>
            <h3>Registration Complete</h3>
          </div>
        )}

        {action?.step === 4 && (
          <div>
            <h3>Already registered</h3>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublicEventsRegister;

import { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
} from "@remix-run/react";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Field } from "~/components/forms/field";
import { PlayerForm } from "~/components/forms/player";
import { EventAvailabilitySelector } from "~/components/programmes/event-availability-selector";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import { ProgrammeService } from "~/services/programmeService";
import { step1 } from "~/validations/player-registration";
import z from "zod";

export { ErrorBoundary } from "~/components/error-boundry";

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);
  const clubsService = new ClubService(supabaseClient);

  const programme = params.url
    ? await programmeService.getProgrammeByUrl(params.url)
    : undefined;

  const programmeEvents = programme
    ? await programmeService.getProgrammeEvents(programme.id)
    : [];

  const clubs = await clubsService.getAllClubs();

  return { programme, programmeEvents, clubs };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);
  const playerService = new PlayerService(supabaseClient);

  let formData = await request.formData();
  const step = formData.get("step") as string;
  const email = formData.get("email") as string;
  const programmeId = formData.get("programmeId") as string;

  if (step === "1") {
    const validations = step1.safeParse({ email });
    if (validations.error)
      return { errors: z.treeifyError(validations.error) };

    const player = await playerService.getPlayerByEmail(email);

    if (player) {
      const existingReg =
        await programmeService.getPlayerProgrammeRegistration(
          player.id,
          programmeId
        );

      if (existingReg) {
        return { step: 5 };
      }
    }

    return { step: 2, player: { ...player, email } };
  }

  if (step === "2") {
    const programme = await programmeService.getProgrammeById(programmeId);
    const avatar = formData.get("avatar");

    const dateOfBirth = formData.get("dateOfBirth") as string;

    // Validate DOB against programme eligibility range
    if (dateOfBirth && programme) {
      if (
        programme.eligibleDobFrom &&
        dateOfBirth < programme.eligibleDobFrom
      ) {
        return {
          step: 2,
          player: {
            id: formData.get("playerId") as string,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            dateOfBirth,
          },
          dobError: `Date of birth must be on or after ${new Date(programme.eligibleDobFrom).toLocaleDateString()}.`,
        };
      }
      if (
        programme.eligibleDobTo &&
        dateOfBirth > programme.eligibleDobTo
      ) {
        return {
          step: 2,
          player: {
            id: formData.get("playerId") as string,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            dateOfBirth,
          },
          dobError: `Date of birth must be on or before ${new Date(programme.eligibleDobTo).toLocaleDateString()}.`,
        };
      }
    }

    const data = {
      name: formData.get("name") as string,
      position: formData.get("position") as string,
      secondaryPosition: formData.get("secondaryPosition") as string,
      dateOfBirth,
      nationality: formData.get("nationality") as string,
      club: formData.get("club") as string,
      school: formData.get("school") as string,
      photoUrl: formData.get("photoUrl") as string,
      email: formData.get("email") as string,
      scoutId: null,
      teamId: programme?.teamId,
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

    const programmeEvents = await programmeService.getProgrammeEvents(
      programmeId
    );

    return {
      step: 3,
      player,
      programmeEvents,
    };
  }

  if (step === "3") {
    const playerId = formData.get("playerId") as string;
    const playerEmail = formData.get("playerEmail") as string;

    const programmeEvents = await programmeService.getProgrammeEvents(
      programmeId
    );

    const eventAvailability = programmeEvents.map((pe) => ({
      eventId: pe.eventId,
      available: formData.get(`event_${pe.eventId}`) === "true",
    }));

    await programmeService.registerForProgramme({
      programmeId,
      playerId,
      email: playerEmail,
      eventAvailability,
    });

    return { step: 4 };
  }
};

const stepLabels = ["Email", "Profile", "Availability", "Done"];

function StepIndicator({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-6 sm:w-10 ${
                  isComplete ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? "bg-primary text-white"
                    : isComplete
                    ? "bg-primary/20 text-primary"
                    : "bg-border text-muted"
                }`}
              >
                {isComplete ? "\u2713" : stepNum}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  isActive ? "text-white" : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgrammeRegister() {
  const { programme, clubs } = useLoaderData<typeof loader>();
  const action = useActionData<typeof action>();

  const currentStep = action?.step === 5 ? 1 : action?.step || 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="w-full bg-wkbackground border-b border-border">
        <div className="container mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Link
            to={`/programmes/${programme.url}`}
            className="text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-grow min-w-0">
            <h1 className="text-lg font-semibold truncate">
              Register for {programme.name}
            </h1>
          </div>
          <img src="/logo.png" className="w-8 h-8" width={32} height={32} />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Step indicator - hide on confirmation/already registered */}
        {action?.step !== 4 && action?.step !== 5 && (
          <StepIndicator currentStep={currentStep} />
        )}

        {/* Step 1: Email */}
        {!action?.step && (
          <Card className="border-border p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Enter your email
            </h2>
            <p className="text-sm text-muted mb-6">
              We'll use this to check if you already have a profile.
            </p>
            <Form method="post">
              <input type="hidden" name="step" value="1" />
              <input
                type="hidden"
                name="programmeId"
                value={programme.id}
              />
              <Field name="email" label="Email" errors={action?.errors}>
                <Input
                  name="email"
                  placeholder="Enter your Email"
                  type="email"
                  required
                  autoFocus
                  className="bg-card border-gray-600 text-white placeholder:text-gray-400 h-12 text-base"
                />
              </Field>
              <div className="pt-6">
                <ActionButton title="Continue" className="w-full h-12" />
              </div>
            </Form>
          </Card>
        )}

        {/* Step 2: Player profile */}
        {action?.step === 2 && (
          <Card className="border-border p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Your details
            </h2>
            <p className="text-sm text-muted mb-6">
              {action.player?.id
                ? "Please check your details are up to date."
                : "Fill in your profile to complete registration."}
            </p>
            {action.dobError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {action.dobError}
                </p>
              </div>
            )}
            {(programme.eligibleDobFrom || programme.eligibleDobTo) && (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-4">
                <p className="text-xs text-muted">
                  This programme is open to players born{" "}
                  {programme.eligibleDobFrom && programme.eligibleDobTo
                    ? `between ${new Date(programme.eligibleDobFrom).toLocaleDateString()} and ${new Date(programme.eligibleDobTo).toLocaleDateString()}`
                    : programme.eligibleDobFrom
                    ? `on or after ${new Date(programme.eligibleDobFrom).toLocaleDateString()}`
                    : `on or before ${new Date(programme.eligibleDobTo).toLocaleDateString()}`}
                  .
                </p>
              </div>
            )}
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" name="step" value="2" />
              <input
                type="hidden"
                name="programmeId"
                value={programme.id}
              />
              <PlayerForm
                clubs={clubs}
                player={action.player}
                hideKit
              />
              <div className="pt-6">
                <ActionButton title="Continue" className="w-full h-12" />
              </div>
            </Form>
          </Card>
        )}

        {/* Step 3: Event availability */}
        {action?.step === 3 && (
          <Card className="border-border p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Event availability
            </h2>
            <p className="text-sm text-muted mb-6">
              {programme.availabilityDescription ||
                "Let us know which sessions you can attend."}
            </p>
            <Form method="post">
              <input type="hidden" name="step" value="3" />
              <input
                type="hidden"
                name="programmeId"
                value={programme.id}
              />
              <input
                type="hidden"
                name="playerId"
                value={action.player?.id}
              />
              <input
                type="hidden"
                name="playerEmail"
                value={action.player?.email}
              />
              <EventAvailabilitySelector
                events={action.programmeEvents}
              />
              <div className="pt-6">
                <ActionButton
                  title="Complete Registration"
                  className="w-full h-12"
                />
              </div>
            </Form>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {action?.step === 4 && (
          <Card className="border-border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Registration Complete
            </h2>
            <p className="text-muted mb-6">
              You have been successfully registered for {programme.name}.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/programmes/${programme.url}`}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}

        {/* Step 5: Already registered */}
        {action?.step === 5 && (
          <Card className="border-border p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Already Registered
            </h2>
            <p className="text-muted mb-6">
              You are already registered for this programme.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/programmes/${programme.url}`}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

import { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
} from "@remix-run/react";
import { ArrowLeft, CheckCircle, AlertCircle, Users } from "lucide-react";
import { Resend } from "resend";
import { Field } from "~/components/forms/field";
import { PlayerForm } from "~/components/forms/player";
import { EventAvailabilitySelector } from "~/components/programmes/event-availability-selector";
import ActionButton from "~/components/ui/action-button";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { PlayerService } from "~/services/playerService";
import {
  ProgrammeFullError,
  ProgrammeService,
} from "~/services/programmeService";
import { ExtraProfileFields } from "~/components/programmes/extra-profile-fields";
import { registrationDeadlinePassed } from "~/utils/helpers";
import { HEIGHT_RANGE_LABEL, parseHeightInput } from "~/utils/height";
import { normaliseAdditionalEmails } from "~/utils/player-emails";
import {
  ProgrammeFieldKey,
  resolveProgrammeFields,
} from "~/utils/programme-fields";
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

/**
 * Text inputs whose value maps straight onto a player column, keyed by
 * catalogue field. Anything needing more than a trim — heights, kit, the photo
 * — is handled separately below.
 */
const SIMPLE_FIELDS: Partial<Record<ProgrammeFieldKey, string>> = {
  name: "name",
  email: "email",
  mobile: "mobile",
  dateOfBirth: "dateOfBirth",
  position: "position",
  secondaryPosition: "secondaryPosition",
  club: "club",
  school: "school",
  medicalConditions: "medicalConditions",
};

/**
 * The profile values this programme asked for, and only those.
 *
 * Reading a field the form never rendered posts null over whatever the player
 * already had. That is not hypothetical: before fields were configurable this
 * action read `school`, `nationality` and `mentor` on every registration while
 * none of them rendered, so registering silently blanked all three.
 */
const profileFields = (formData: FormData, programme: any) => {
  const { requested } = resolveProgrammeFields(programme);
  const submitted: Record<string, unknown> = {};

  for (const [key, input] of Object.entries(SIMPLE_FIELDS)) {
    if (requested.includes(key as ProgrammeFieldKey)) {
      submitted[input] = formData.get(input) as string;
    }
  }

  if (requested.includes("kit")) {
    submitted.shirt = formData.get("shirt") as string;
    submitted.shorts = formData.get("shorts") as string;
  }

  for (const key of ["motherHeight", "fatherHeight"] as const) {
    if (!requested.includes(key)) continue;
    const parsed = parseHeightInput(
      formData.get(`${key}Feet`) as string,
      formData.get(`${key}Inches`) as string,
    );
    submitted[`${key}Inches`] = parsed.status === "ok" ? parsed.inches : null;
  }

  // Always carried: this is the existing photo's URL, echoed back by a hidden
  // input so a save doesn't drop a photo the registrant already has.
  submitted.photoUrl = formData.get("photoUrl") as string;

  // The extra addresses ride along with the email field, which is always
  // requested. One input per address, all named the same, so read them as a
  // list. Whatever is submitted replaces what was there — removing a row in
  // the form has to actually remove the address.
  if (requested.includes("email")) {
    submitted.additionalEmails = normaliseAdditionalEmails(
      formData.getAll("additionalEmails") as string[],
      formData.get("email") as string,
    );
  }

  return submitted;
};

/**
 * What the registrant actually typed, echoed back on a rejected submit. A
 * height that failed validation stores as null, so without this the boxes come
 * back empty and hide the very value being complained about.
 */
const profileRawValues = (formData: FormData, programme: any) => {
  const { requested } = resolveProgrammeFields(programme);
  const raw: Record<string, string> = {};

  const carry = (name: string) => {
    const value = formData.get(name);
    if (typeof value === "string") raw[name] = value;
  };

  for (const key of ["motherHeight", "fatherHeight"] as const) {
    if (!requested.includes(key)) continue;
    carry(`${key}Feet`);
    carry(`${key}Inches`);
  }
  if (requested.includes("school")) carry("school");
  if (requested.includes("medicalConditions")) carry("medicalConditions");

  return raw;
};

/** Error copy per required field, keyed by the input the message hangs off. */
const REQUIRED_MESSAGES: Partial<
  Record<ProgrammeFieldKey, { input: string; message: string }[]>
> = {
  name: [{ input: "name", message: "Please enter your full name" }],
  mobile: [
    { input: "mobile", message: "Please enter a contact phone number" },
  ],
  dateOfBirth: [
    { input: "dateOfBirth", message: "Please select your date of birth" },
  ],
  position: [
    {
      input: "position",
      message: "Please select your preferred playing position",
    },
  ],
  secondaryPosition: [
    {
      input: "secondaryPosition",
      message: "Please select a secondary playing position",
    },
  ],
  club: [
    { input: "club", message: "Please select the club you currently play for" },
  ],
  school: [{ input: "school", message: "Please enter the school you attend" }],
  kit: [
    { input: "shirt", message: "Please select a shirt size" },
    { input: "shorts", message: "Please select a shorts size" },
  ],
  medicalConditions: [
    {
      input: "medicalConditions",
      message: "Please list any medical conditions, or write 'none'",
    },
  ],
};

const HEIGHT_LABELS = {
  motherHeight: "mother's height",
  fatherHeight: "father's height",
} as const;

/**
 * Validate the submitted profile against this programme's configuration.
 *
 * Returns errors in the shape z.treeifyError produces, so they merge straight
 * into the zod errors from step 1 and the shared Field component renders them
 * without knowing where they came from.
 */
const validateProfileFields = (formData: FormData, programme: any) => {
  const { requested, required } = resolveProgrammeFields(programme);
  const properties: Record<string, { errors: string[] }> = {};
  const fail = (input: string, message: string) => {
    if (!properties[input]) properties[input] = { errors: [message] };
  };
  const value = (input: string) =>
    ((formData.get(input) as string) || "").trim();

  // Email is always asked for and always required — it's the identity the
  // whole flow is built on — so it gets a format check, not just a presence one.
  const email = value("email");
  if (!email) {
    fail("email", "Please enter your email address");
  } else if (!z.email().safeParse(email).success) {
    fail("email", "Please enter a valid email address");
  }

  for (const key of required) {
    for (const { input, message } of REQUIRED_MESSAGES[key] || []) {
      if (!value(input)) fail(input, message);
    }
  }

  // The photo lives behind a file input, so presence means "a file this time,
  // or one already on the record".
  if (required.includes("photo")) {
    const avatar = formData.get("avatar");
    const hasNewPhoto = avatar instanceof File && avatar.size > 0;
    if (!hasNewPhoto && !value("photoUrl")) {
      fail(
        "avatar",
        "Please upload a photo — it helps our coaches identify you when you attend",
      );
    }
  }

  // A malformed height is rejected whether or not the field is required:
  // silently storing null would tell the registrant their answer was accepted
  // when it was thrown away.
  for (const key of ["motherHeight", "fatherHeight"] as const) {
    if (!requested.includes(key)) continue;
    const parsed = parseHeightInput(
      formData.get(`${key}Feet`) as string,
      formData.get(`${key}Inches`) as string,
    );
    if (parsed.status === "empty") {
      if (required.includes(key)) {
        fail(key, `Please enter the ${HEIGHT_LABELS[key]}`);
      }
      continue;
    }
    if (parsed.status === "invalid") {
      fail(key, `Please enter a height between ${HEIGHT_RANGE_LABEL}`);
    }
  }

  return Object.keys(properties).length > 0 ? { errors: [], properties } : null;
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

    const programme = await programmeService.getProgrammeById(programmeId);
    const player = await playerService.getPlayerByEmail(email);

    // Players who are already registered may always continue (to update their
    // availability or withdraw), even after the deadline / without being
    // allow-listed.
    const existingReg =
      player && programme
        ? await programmeService.getPlayerProgrammeRegistration(
            player.id,
            programmeId
          )
        : null;

    // Once the deadline has passed, only allow-listed emails may start a new
    // registration. Already-registered players are exempt.
    if (
      programme &&
      !existingReg &&
      registrationDeadlinePassed(programme.registrationDeadline) &&
      !(await programmeService.isEmailAllowed(programmeId, email))
    ) {
      return { step: "closed", email };
    }

    // Turn people away at the front door rather than after they've filled in a
    // whole profile. Already-registered players are exempt for the same reason
    // as above: they need to reach the manage screen to update or withdraw,
    // and they aren't taking a new place.
    if (programme && !existingReg) {
      const capacity = await programmeService.getRegistrationCapacity(
        programmeId
      );
      if (capacity.isFull) return { step: "full", email };
    }

    if (player) {
      const code = await programmeService.createValidationCode(
        email,
        player.id
      );

      try {
        const resend = new Resend(process.env.VITE_RESEND_API);
        await resend.emails.send({
          from: "St Helens RLFC - beCoachable <noreply@be-coachable.com>",
          to: [email],
          subject: "Your verification code",
          html: verificationEmailHtml(code),
        });
      } catch (error) {
        console.error("Error sending verification email:", error);
      }

      return { step: "verify", email };
    }

    return { step: 2, player: { email } };
  }

  if (step === "verify") {
    const code = formData.get("code") as string;
    const result = await programmeService.validateCode(email, code);

    if (!result.valid || !result.playerId) {
      return {
        step: "verify",
        email,
        codeError: "Invalid or expired code. Please try again.",
      };
    }

    const player = await playerService.getPlayerById(result.playerId);

    const existingReg = await programmeService.getPlayerProgrammeRegistration(
      result.playerId,
      programmeId
    );

    if (existingReg) {
      const programmeEvents = await programmeService.getProgrammeEvents(
        programmeId
      );
      const availabilityRows =
        await programmeService.getRegistrationAvailability(existingReg.id);
      const availability: Record<string, boolean> = {};
      availabilityRows.forEach((a) => {
        availability[a.eventId] = a.available;
      });

      return {
        step: "manage",
        player: { ...player, email },
        registration: existingReg,
        programmeEvents,
        availability,
      };
    }

    return { step: 2, player: { ...player, email } };
  }

  if (step === "2") {
    const programme = await programmeService.getProgrammeById(programmeId);
    const avatar = formData.get("avatar");
    const playerId = formData.get("playerId") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;

    const submitted = profileFields(formData, programme);

    const errors = validateProfileFields(formData, programme);
    if (errors) {
      return {
        step: 2,
        player: { id: playerId, ...submitted },
        rawValues: profileRawValues(formData, programme),
        errors,
      };
    }

    // Validate DOB against programme eligibility range
    if (dateOfBirth && programme) {
      if (
        programme.eligibleDobFrom &&
        dateOfBirth < programme.eligibleDobFrom
      ) {
        return {
          step: 2,
          player: { id: playerId, ...submitted },
          dobError: `Date of birth must be on or after ${new Date(programme.eligibleDobFrom).toLocaleDateString()}.`,
        };
      }
      if (
        programme.eligibleDobTo &&
        dateOfBirth > programme.eligibleDobTo
      ) {
        return {
          step: 2,
          player: { id: playerId, ...submitted },
          dobError: `Date of birth must be on or before ${new Date(programme.eligibleDobTo).toLocaleDateString()}.`,
        };
      }
    }

    const data = {
      ...submitted,
      scoutId: null,
      teamId: programme?.teamId,
    };

    let player;
    if (playerId) {
      player = await playerService.updatePlayer(playerId, data);
    } else {
      // players.position is NOT NULL, so a programme that doesn't ask for a
      // position still has to put something in the column. The spread order
      // matters: a submitted position overrides this default.
      player = await playerService.createPlayer({ position: "", ...data });
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

    // Final allow-list guard, in case the closed gate was skipped by posting
    // directly to this step.
    const programme = await programmeService.getProgrammeById(programmeId);
    if (
      programme &&
      registrationDeadlinePassed(programme.registrationDeadline) &&
      !(await programmeService.isEmailAllowed(programmeId, playerEmail))
    ) {
      return { step: "closed", email: playerEmail };
    }

    const programmeEvents = await programmeService.getProgrammeEvents(
      programmeId
    );

    const eventAvailability = programmeEvents.map((pe) => ({
      eventId: pe.eventId,
      available: formData.get(`event_${pe.eventId}`) === "true",
    }));

    // Second capacity check: the first was several screens ago, and the last
    // place may have gone while this registrant was filling in their profile.
    const capacity = await programmeService.getRegistrationCapacity(
      programmeId
    );
    if (capacity.isFull) return { step: "full", email: playerEmail };

    try {
      await programmeService.registerForProgramme({
        programmeId,
        playerId,
        email: playerEmail,
        eventAvailability,
      });
    } catch (error) {
      // The check above and the insert are two round trips, so a simultaneous
      // registration can still take the last place in between. The database
      // trigger is what actually stops the overbooking; this turns its error
      // into the same page the pre-check would have shown.
      if (error instanceof ProgrammeFullError) {
        return { step: "full", email: playerEmail };
      }
      throw error;
    }

    return { step: 4 };
  }

  if (step === "manage-profile") {
    const programme = await programmeService.getProgrammeById(programmeId);
    const avatar = formData.get("avatar");
    const playerId = formData.get("playerId") as string;
    const registrationId = formData.get("registrationId") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;

    // Only the fields this programme's form actually renders — reading any
    // other column would wipe it. We deliberately don't change the team here.
    const submitted = profileFields(formData, programme);

    // Re-load the availability context so the availability card still renders
    // on this same "manage" screen after a profile save (or a validation error).
    const buildManage = async (player: any, extra: Record<string, unknown>) => {
      const programmeEvents = await programmeService.getProgrammeEvents(
        programmeId
      );
      const availabilityRows = registrationId
        ? await programmeService.getRegistrationAvailability(registrationId)
        : [];
      const availability: Record<string, boolean> = {};
      availabilityRows.forEach((a) => {
        availability[a.eventId] = a.available;
      });
      return {
        step: "manage",
        player,
        registration: { id: registrationId },
        programmeEvents,
        availability,
        ...extra,
      };
    };

    const errors = validateProfileFields(formData, programme);
    if (errors) {
      return buildManage(
        { id: playerId, ...submitted },
        { rawValues: profileRawValues(formData, programme), errors }
      );
    }

    // Validate DOB against programme eligibility range
    if (dateOfBirth && programme) {
      if (
        programme.eligibleDobFrom &&
        dateOfBirth < programme.eligibleDobFrom
      ) {
        return buildManage(
          { id: playerId, ...submitted },
          {
            dobError: `Date of birth must be on or after ${new Date(programme.eligibleDobFrom).toLocaleDateString()}.`,
          }
        );
      }
      if (programme.eligibleDobTo && dateOfBirth > programme.eligibleDobTo) {
        return buildManage(
          { id: playerId, ...submitted },
          {
            dobError: `Date of birth must be on or before ${new Date(programme.eligibleDobTo).toLocaleDateString()}.`,
          }
        );
      }
    }

    const player = await playerService.updatePlayer(playerId, submitted);

    if (player && avatar) {
      await playerService.uploadPlayerProfilePhoto(player.id, avatar);
    }

    return buildManage(
      { ...player, email: submitted.email },
      { profileUpdated: true }
    );
  }

  if (step === "manage-update") {
    const registrationId = formData.get("registrationId") as string;
    const playerId = formData.get("playerId") as string;

    const programmeEvents = await programmeService.getProgrammeEvents(
      programmeId
    );

    const eventAvailability = programmeEvents.map((pe) => ({
      eventId: pe.eventId,
      available: formData.get(`event_${pe.eventId}`) === "true",
    }));

    await programmeService.updateProgrammeAvailability({
      registrationId,
      playerId,
      eventAvailability,
    });

    return { step: "updated" };
  }

  if (step === "withdraw") {
    const registrationId = formData.get("registrationId") as string;
    await programmeService.removeRegistration(registrationId);
    return { step: "withdrawn" };
  }
};

function verificationEmailHtml(code: string) {
  return `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; background-color: #0f111a;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <title>Your verification code</title>
  </head>
  <body style="margin: 0; font-family: Arial, sans-serif; background-color: #0f111a; color: #ffffff;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #1b1d2a; padding: 30px; border-radius: 12px; border: 1px solid #2a2d3b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://be-coachable.com/logo.png" alt="beCoachable" style="width:60px;" />
      </div>
      <p style="color: #c2c7d0; font-size: 16px;">Use this code to confirm your email and continue your registration:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display:inline-block; font-size: 32px; letter-spacing: 8px; font-weight: bold; background-color: #0f111a; color: #ffffff; padding: 16px 28px; border-radius: 8px; border: 1px solid #2a2d3b;">${code}</span>
      </div>
      <p style="color: #c2c7d0; font-size: 14px;">The code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;
}

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

  // Resolved from the same helper the action validates with, so the form can't
  // render a field set the server disagrees about.
  const formFields = resolveProgrammeFields(programme);

  const currentStep =
    action?.step === "verify" ? 1 : (action?.step as number) || 1;

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
        {/* Step indicator - hide on confirmation/already registered/closed */}
        {action?.step !== 4 &&
          action?.step !== "closed" &&
          action?.step !== "full" &&
          action?.step !== "verify" &&
          action?.step !== "manage" &&
          action?.step !== "updated" &&
          action?.step !== "withdrawn" && (
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

        {/* Verify step: existing player must confirm email ownership */}
        {action?.step === "verify" && (
          <Card className="border-border p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Check your email
            </h2>
            <p className="text-sm text-muted mb-6">
              We've sent a 6-digit code to{" "}
              <span className="text-white">{action.email}</span>. Enter it
              below to continue.
            </p>
            {action.codeError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {action.codeError}
                </p>
              </div>
            )}
            <Form method="post">
              <input type="hidden" name="step" value="verify" />
              <input
                type="hidden"
                name="programmeId"
                value={programme.id}
              />
              <input type="hidden" name="email" value={action.email} />
              <Field name="code" label="Verification code">
                <Input
                  name="code"
                  placeholder="123456"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  className="bg-card border-gray-600 text-white placeholder:text-gray-400 h-12 text-base tracking-widest text-center"
                />
              </Field>
              <div className="pt-6">
                <ActionButton title="Verify" className="w-full h-12" />
              </div>
            </Form>
            <p className="text-xs text-muted mt-4 text-center">
              Didn't get the email?{" "}
              <Link
                to={`/programmes/${programme.url}/register`}
                className="text-primary hover:underline"
              >
                Start over
              </Link>
            </p>
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
            <p className="text-xs text-muted mb-4">
              Please upload a profile photo — it helps our coaches identify
              you when you attend sessions.
            </p>
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
                errors={action.errors}
                fields={formFields.requested}
                requiredFields={formFields.required}
              />
              <ExtraProfileFields
                requestedFields={programme.requestedFields}
                requiredFields={programme.requiredFields}
                player={action.player}
                rawValues={action.rawValues}
                errors={action.errors}
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

        {/* Closed: deadline passed and email not on the allow-list */}
        {action?.step === "closed" && (
          <Card className="border-border p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Registration Closed
            </h2>
            <p className="text-muted mb-6">
              Registration for {programme.name} has closed. If you've been
              invited to register, please make sure you're using the same email
              address the club has on file, or get in touch with us.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/programmes/${programme.url}`}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}

        {/* Full: every place has gone */}
        {action?.step === "full" && (
          <Card className="border-border p-8 text-center">
            <Users className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Programme Full
            </h2>
            <p className="text-muted mb-6">
              All places on {programme.name} have been taken. If you think
              you've already registered, check you're using the same email
              address the club has on file — otherwise please get in touch and
              we'll let you know if a place comes up.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/programmes/${programme.url}`}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}

        {/* Manage: existing registration — update availability or withdraw */}
        {action?.step === "manage" && (
          <div className="flex flex-col gap-6">
            <Card className="border-border p-6">
              <h2 className="text-lg font-semibold text-white mb-1">
                Your details
              </h2>
              <p className="text-sm text-muted mb-6">
                Keep your profile up to date so our coaches have the right
                information.
              </p>
              {action.profileUpdated && (
                <div className="bg-success/10 border border-success/30 rounded-md p-3 mb-4">
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    Your details have been updated.
                  </p>
                </div>
              )}
              {action.dobError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {action.dobError}
                  </p>
                </div>
              )}
              <Form method="post" encType="multipart/form-data">
                <input type="hidden" name="step" value="manage-profile" />
                <input
                  type="hidden"
                  name="programmeId"
                  value={programme.id}
                />
                <input
                  type="hidden"
                  name="registrationId"
                  value={action.registration?.id}
                />
                <PlayerForm
                  clubs={clubs}
                  player={action.player}
                  errors={action.errors}
                  fields={formFields.requested}
                  requiredFields={formFields.required}
                />
                <ExtraProfileFields
                  requestedFields={programme.requestedFields}
                  requiredFields={programme.requiredFields}
                  player={action.player}
                  rawValues={action.rawValues}
                  errors={action.errors}
                />
                <div className="pt-6">
                  <ActionButton title="Update details" className="w-full h-12" />
                </div>
              </Form>
            </Card>

            <Card className="border-border p-6">
              <h2 className="text-lg font-semibold text-white mb-1">
                Manage your registration
              </h2>
              <p className="text-sm text-muted mb-6">
                You're registered for {programme.name}. Update which sessions
                you can attend below.
              </p>
              <Form method="post">
                <input type="hidden" name="step" value="manage-update" />
                <input
                  type="hidden"
                  name="programmeId"
                  value={programme.id}
                />
                <input
                  type="hidden"
                  name="registrationId"
                  value={action.registration?.id}
                />
                <input
                  type="hidden"
                  name="playerId"
                  value={action.player?.id}
                />
                <EventAvailabilitySelector
                  events={action.programmeEvents}
                  availability={action.availability}
                />
                <div className="pt-6">
                  <ActionButton
                    title="Update availability"
                    className="w-full h-12"
                  />
                </div>
              </Form>
            </Card>

            <Card className="border-destructive/30 p-6">
              <h3 className="text-base font-semibold text-white mb-1">
                Withdraw from programme
              </h3>
              <p className="text-sm text-muted mb-4">
                This removes you from {programme.name} and all of its sessions.
                You can register again later if you change your mind.
              </p>
              <Form method="post" id="withdraw-form">
                <input type="hidden" name="step" value="withdraw" />
                <input
                  type="hidden"
                  name="programmeId"
                  value={programme.id}
                />
                <input
                  type="hidden"
                  name="registrationId"
                  value={action.registration?.id}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto"
                    >
                      Withdraw from programme
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        Withdraw from {programme.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted">
                        This will remove you from the programme and all of its
                        sessions. You can register again later if you change
                        your mind.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        type="button"
                        className="text-white"
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        type="submit"
                        form="withdraw-form"
                        className={buttonVariants({ variant: "destructive" })}
                      >
                        Withdraw
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Form>
            </Card>
          </div>
        )}

        {/* Updated: availability saved */}
        {action?.step === "updated" && (
          <Card className="border-border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Availability Updated
            </h2>
            <p className="text-muted mb-6">
              Your availability for {programme.name} has been updated.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/programmes/${programme.url}`}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}

        {/* Withdrawn: registration removed */}
        {action?.step === "withdrawn" && (
          <Card className="border-border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Withdrawn
            </h2>
            <p className="text-muted mb-6">
              You have been withdrawn from {programme.name}. You can register
              again any time before the deadline.
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

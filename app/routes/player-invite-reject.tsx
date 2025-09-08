import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Resend } from "resend";
import z from "zod";
import { Field } from "~/components/forms/field";
import { PlayerForm } from "~/components/forms/player";
import { SelectField } from "~/components/forms/select";
import ActionButton from "~/components/ui/action-button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
import { InvitationService } from "~/services/invitationService";
import { PlayerService } from "~/services/playerService";
import { inviteRegistration } from "~/validations/player-registration";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return redirect("/");
  const inviteService = new InvitationService(supabaseClient);

  const invite = await inviteService.getInvitationByToken(token);
  if (!invite) return redirect("/");

  await inviteService.rejectInvitation(invite);

  return { invite };
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const { supabaseClient } = await getSupabaseServerClient(request);
    let formData = await request.formData();
    const reason = (await formData.get("reason")) as string;
    const otherReason = (await formData.get("other_reason")) as string;

    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return redirect("/");
    const inviteService = new InvitationService(supabaseClient);

    const invite = await inviteService.getInvitationByToken(token);

    if (!invite) return redirect("/");

    await inviteService.rejectInvitation(
      invite,
      otherReason ? otherReason : reason
    );

    return { status: "complete" };
  } catch (e: any) {
    const resend = new Resend(process.env.VITE_RESEND_API);
    await resend.emails.send({
      from: "Error - beCoachable <noreply@be-coachable.com>",
      to: ["info@lookstechnical.co.uk"],
      subject: "And error on Player invite",
      html: `<div>${e.message}</div>`,
    });

    throw e;
  }
};

export function ErrorBoundary() {
  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
      <div className="w-full py-6 flex flex-col w-[50rem] items-center">
        <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

        <h1 className="text-4xl">There Was an error please try again </h1>
        <p className="text-muted">
          if the problem persists and your on mobile please try on a laptop or
          desktop pc
        </p>
      </div>
    </div>
  );
}

const PlayerInvite = () => {
  const { clubs, player, invite } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showOtherField, setShowOtherField] = useState<boolean>(false);

  if (actionData?.status === "complete") {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-4xl">Player Invitation</h1>
          <p className="text-muted">Thank you for your feedback</p>
        </div>
      </div>
    );
  }

  if (invite?.status === "rejected") {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-4xl">Player Invitation</h1>
          <p className="text-muted">
            The Invite has expired or has already been completed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-row gap-3 flex flex-col items-center p-4 text-center">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <h1 className="text-4xl">Player Invitation</h1>
          <p>We understand you’ve decided not to join at this time.</p>
          <p className="text-muted">
            Your feedback is valuable to us. Could you share the main reason you
            have chosen not to join
          </p>
        </div>
      </div>

      {actionData?.status !== "complete" && invite?.status === "pending" && (
        <div className="container mx-auto max-w-[50rem] py-6">
          <Form
            method="POST"
            encType="multipart/form-data"
            className="px-4 flex flex-col gap-4"
          >
            <SelectField
              name="reason"
              label="Reason"
              onValueChange={(value) =>
                value === "other"
                  ? setShowOtherField(true)
                  : setShowOtherField(false)
              }
              options={[
                {
                  id: "Times clash with other activities",
                  name: "Times clash with other activities",
                },
                {
                  id: "I have had an offer of a scholarship or similar at another club",
                  name: "I have had an offer of a scholarship or similar at another club",
                },
                {
                  id: "other",
                  name: "Other",
                },
              ]}
            />
            {showOtherField && (
              <Field name="other_reason" label="Please give us details.">
                <Textarea name="other_reason" />
              </Field>
            )}
            <div className="w-full justify-end flex flex-row">
              <ActionButton title="Submit Feedback" />
            </div>
          </Form>
        </div>
      )}
    </div>
  );
};

export default PlayerInvite;

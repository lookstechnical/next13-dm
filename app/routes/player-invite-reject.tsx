import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import InviteMessage from "~/components/invite-message";
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
import {
  applyInviteVariables,
  OTHER_REASON,
  resolveInviteContent,
} from "~/services/inviteContent";
import { PlayerService } from "~/services/playerService";
import { inviteRegistration } from "~/validations/player-registration";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return { invalid: true };
  const inviteService = new InvitationService(supabaseClient);

  const invite = await inviteService.getInvitationByToken(token);
  if (!invite) return { invalid: true };

  const playerService = new PlayerService(supabaseClient);
  const player = await playerService.getPlayerById(invite.playerId);

  const content = resolveInviteContent(invite);

  return {
    invite,
    content: {
      ...content,
      rejectPageContent: applyInviteVariables(content.rejectPageContent, {
        name: player?.name,
      }),
    },
  };
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

    // "other" is the sentinel for the free-text box, not a reason worth
    // storing — keep what they typed, or nothing at all.
    await inviteService.rejectInvitation(
      invite,
      reason === OTHER_REASON ? otherReason?.trim() : reason
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
  const { invite, invalid, content } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showOtherField, setShowOtherField] = useState<boolean>(false);

  if (invalid) {
    return (
      <InviteMessage>
        This invitation link is no longer valid. If it came from a test email
        the buttons are inactive; otherwise please ask your coach to resend it.
      </InviteMessage>
    );
  }

  if (actionData?.status === "complete") {
    return <InviteMessage>{content.rejectCompleteMessage}</InviteMessage>;
  }

  if (invite?.status === "rejected") {
    return (
      <InviteMessage>
        The Invite has expired or has already been completed
      </InviteMessage>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-col gap-3 items-center p-4 text-center">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <h1 className="text-4xl">Player Invitation</h1>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-center"
            dangerouslySetInnerHTML={{ __html: content.rejectPageContent }}
          />
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
                value === OTHER_REASON
                  ? setShowOtherField(true)
                  : setShowOtherField(false)
              }
              options={[
                ...content.rejectReasons.map((reason: string) => ({
                  id: reason,
                  name: reason,
                })),
                { id: OTHER_REASON, name: "Other" },
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

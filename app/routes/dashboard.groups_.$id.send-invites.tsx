import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Resend } from "resend";
import { GroupEmailForm } from "~/components/forms/form/group-email-form";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { emailTemplate } from "~/services/email";
import { GroupService } from "~/services/groupService";
import { InvitationService } from "~/services/invitationService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

const FROM = "St Helens RLFC - beCoachable <noreply@be-coachable.com>";

// Resend's batch endpoint accepts up to 100 messages per call. Sending one
// message per request instead trips the 2 requests/second rate limit after the
// first player and blows Netlify's 10s function budget on any real group.
const BATCH_SIZE = 100;

export const meta: MetaFunction = () => {
  return [
    { title: "Send Email" },
    { name: "description", content: "Email group members" },
  ];
};

// Members we can actually email: one entry per unique address, preferring the
// first player found for a shared parent/guardian inbox.
function recipients(group: any) {
  const seen = new Map<string, any>();
  for (const member of group?.playerGroupMembers ?? []) {
    const email = member.players?.email?.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.set(email.toLowerCase(), member);
  }
  return [...seen.values()];
}

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const groupsService = new GroupService(supabaseClient);

    const group = params.id
      ? await groupsService.getGroupById(params.id)
      : undefined;

    const members = group?.playerGroupMembers ?? [];

    return {
      group,
      recipientCount: recipients(group).length,
      memberCount: members.length,
      defaultTestEmail: user?.email || "",
    };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient, user }) => {
    const groupsService = new GroupService(supabaseClient);
    const invitationService = new InvitationService(supabaseClient);

    const group = params.id
      ? await groupsService.getGroupById(params.id)
      : undefined;

    if (!group) return { error: "Group not found." };

    const formData = await request.formData();
    const subject = (formData.get("subject") as string)?.trim();
    const description = formData.get("description") as string;
    const footer = formData.get("footer") as string;
    const type = (formData.get("type") as string) || "reminder";
    const mode = formData.get("mode") as string; // "test" | "all"
    const testEmail = (formData.get("testEmail") as string)?.trim();

    if (!subject) return { error: "Please enter a subject." };
    if (!description?.trim()) return { error: "Please enter an email body." };

    const resend = new Resend(process.env.VITE_RESEND_API);

    if (mode === "test") {
      const to = testEmail || user?.email;
      if (!to) return { error: "No test email address provided." };

      // Preview the invite layout with a throwaway token so the accept/reject
      // buttons render, without touching the invitations table.
      const sampleInvite =
        type === "invite"
          ? ({ token: "sample-token", status: "pending" } as any)
          : undefined;

      const { error } = await resend.emails.send({
        from: FROM,
        to: [to],
        subject: `[TEST] ${subject}`,
        html: emailTemplate(description, footer, sampleInvite, {
          name: "Sample Player",
        } as any),
      });

      if (error) {
        console.error("Error sending test email:", error);
        return {
          error: `Failed to send the test email: ${
            error.message || error.name
          }`,
        };
      }

      return { sent: 1, mode: "test", to, type };
    }

    if (mode !== "all") return { error: "Unknown send mode." };

    const members = recipients(group);
    const total = members.length;
    if (total === 0) {
      return { error: "No group members have an email address on file." };
    }

    // For invites, prepare every invitation up front in a couple of queries.
    // Doing it per player inside the send loop is what made this time out, and
    // the old "only email pending invites" guard is what silently skipped
    // everyone carrying an accepted invitation from a previous season.
    let invitesByPlayer = new Map<string, any>();
    let reopened = 0;
    if (type === "invite") {
      try {
        const result = await invitationService.ensureInvitations(
          members.map((m) => m.playerId)
        );
        invitesByPlayer = result.invitations;
        reopened = result.reopened.length;
      } catch (error: any) {
        console.error("Error creating invitations:", error);
        return {
          error: `Could not create invitations: ${
            error?.message || "unknown error"
          }`,
        };
      }
    }

    const payloads: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    }[] = [];
    const skipped: string[] = [];

    for (const member of members) {
      let invite: any;

      if (type === "invite") {
        // ensureInvitations guarantees a pending invitation for every player it
        // was given, so a miss here means something genuinely went wrong for
        // that player — report it rather than dropping them silently.
        invite = invitesByPlayer.get(member.playerId);

        if (!invite) {
          skipped.push(`${member.players?.name || "Unknown"} (no invitation)`);
          continue;
        }
      }

      payloads.push({
        from: FROM,
        to: [member.players.email],
        subject,
        html: emailTemplate(description, footer, invite, member.players),
      });
    }

    if (payloads.length === 0) {
      return {
        error: "There was nobody left to email.",
        skipped,
        total,
      };
    }

    let sent = 0;
    let failure: string | undefined;

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      // resend.batch.send resolves with { data, error } — it does NOT throw on
      // an API failure, so the error has to be read off the result.
      const { error } = await resend.batch.send(batch);
      if (error) {
        console.error("Error sending email batch:", error);
        failure = error.message || error.name;
      } else {
        sent += batch.length;
      }
    }

    if (sent === 0) {
      return {
        error: `Failed to send: ${failure || "unknown error"}`,
        total,
        skipped,
      };
    }

    return { sent, mode: "all", total, skipped, type, failure, reopened };
  }
);

export default function SendInviteToGroup() {
  const { group, recipientCount, memberCount, defaultTestEmail } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <SheetPage
      backLink={`/dashboard/groups/${group.id}`}
      title={`Email group — ${group.name}`}
      description="Send an email to everyone in this group"
      hasForm
      renderFooterButtons={() => (
        <div className="flex flex-row gap-2 mr-auto">
          <Button
            type="submit"
            name="mode"
            value="test"
            variant="secondary"
            disabled={submitting}
          >
            Send test email
          </Button>
          <Button
            type="submit"
            name="mode"
            value="all"
            disabled={submitting || recipientCount === 0}
            onClick={(e) => {
              if (
                !confirm(
                  `Send this email to all ${recipientCount} group member${
                    recipientCount === 1 ? "" : "s"
                  }?`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {submitting ? "Sending…" : `Send to all (${recipientCount})`}
          </Button>
        </div>
      )}
    >
      {result?.error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4 mx-4">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {result.error}
          </p>
        </div>
      )}
      {result?.sent != null && !result.error && (
        <div className="bg-success/10 border border-success/30 rounded-md p-3 mb-4 mx-4">
          <p className="text-sm text-success flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {result.mode === "test"
              ? `Test email sent to ${result.to}.`
              : `Email sent to ${result.sent} of ${result.total} member${
                  result.total === 1 ? "" : "s"
                }.`}
          </p>
          {result.reopened > 0 && (
            <p className="text-xs text-muted mt-1">
              {result.reopened} previously accepted or rejected invitation
              {result.reopened === 1 ? " was" : "s were"} re-opened with a fresh
              link.
            </p>
          )}
          {result.failure && (
            <p className="text-xs text-destructive mt-1">
              Some emails failed: {result.failure}
            </p>
          )}
        </div>
      )}
      {result?.skipped?.length > 0 && (
        <div className="bg-card border border-gray-600 rounded-md p-3 mb-4 mx-4">
          <p className="text-xs text-muted">
            Skipped {result.skipped.length}: {result.skipped.join(", ")}
          </p>
        </div>
      )}
      <GroupEmailForm
        defaultTestEmail={defaultTestEmail}
        recipientCount={recipientCount}
        memberCount={memberCount}
      />
    </SheetPage>
  );
}

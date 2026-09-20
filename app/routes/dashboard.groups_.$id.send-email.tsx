import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigation,
} from "@remix-run/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Resend } from "resend";
import { GroupMessageForm } from "~/components/forms/form/group-message-form";
import type { EmailRecipient } from "~/components/recipient-selector";
import { AllowedRoles } from "~/components/route-protections";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { emailTemplate } from "~/services/email";
import { GroupService } from "~/services/groupService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

const FROM = "St Helens RLFC - beCoachable <noreply@be-coachable.com>";

// Resend's batch endpoint accepts up to 100 messages per call. Sending one
// message per request instead trips the 2 requests/second rate limit and blows
// Netlify's 10s function budget on any real group.
const BATCH_SIZE = 100;

export const meta: MetaFunction = () => {
  return [
    { title: "Email Group" },
    { name: "description", content: "Send a message to group members" },
  ];
};

type GroupRecipient = EmailRecipient & { playerId?: string };

// Members we can actually email: one entry per unique address, preferring the
// first player found for a shared parent/guardian inbox. Sorted by name so the
// list reads the same way the group does.
function buildRecipients(group: any): GroupRecipient[] {
  const byEmail = new Map<string, GroupRecipient>();

  for (const member of group?.playerGroupMembers ?? []) {
    const email = member.players?.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (byEmail.has(key)) continue;
    byEmail.set(key, {
      email,
      name: member.players?.name || "",
      playerId: member.playerId,
    });
  }

  return [...byEmail.values()].sort((a, b) =>
    (a.name || a.email)
      .toLowerCase()
      .localeCompare((b.name || b.email).toLowerCase()),
  );
}

export const loader: LoaderFunction = withAuth(
  AllowedRoles.adminOnly,
  async ({ params, supabaseClient, user }) => {
    const groupService = new GroupService(supabaseClient);

    const group = params.id
      ? await groupService.getGroupById(params.id)
      : undefined;

    if (!group) throw new Response("Group not found", { status: 404 });

    const recipients = buildRecipients(group);

    return {
      group,
      recipients,
      // Members with no address at all — worth saying so, since they silently
      // never appear in the list.
      withoutEmail:
        (group.playerGroupMembers?.length ?? 0) - recipients.length,
      defaultTestEmail: user?.email || "",
    };
  },
);

export const action: ActionFunction = withAuthAction(
  AllowedRoles.adminOnly,
  async ({ request, params, supabaseClient, user }) => {
    const groupService = new GroupService(supabaseClient);

    const group = params.id
      ? await groupService.getGroupById(params.id)
      : undefined;

    if (!group) return { error: "Group not found." };

    const formData = await request.formData();
    const subject = (formData.get("subject") as string)?.trim();
    const description = formData.get("description") as string;
    const footer = formData.get("footer") as string;
    const mode = formData.get("mode") as string; // "test" | "all"
    const testEmail = (formData.get("testEmail") as string)?.trim();

    if (!subject) return { error: "Please enter a subject." };
    if (!description?.trim()) return { error: "Please enter an email body." };

    const resend = new Resend(process.env.VITE_RESEND_API);

    if (mode === "test") {
      const to = testEmail || user?.email;
      if (!to) return { error: "No test email address provided." };

      const { error } = await resend.emails.send({
        from: FROM,
        to: [to],
        subject: `[TEST] ${subject}`,
        // No invite, so the email renders exactly as members will see it.
        html: emailTemplate(description, footer, undefined, {
          name: "Sample Player",
          email: to,
        } as any),
      });

      if (error) {
        console.error("Error sending test group email:", error);
        return {
          error: `Failed to send the test email: ${
            error.message || error.name
          }`,
        };
      }

      return { sent: 1, mode: "test", to };
    }

    if (mode !== "all") return { error: "Unknown send mode." };

    // Only send to the recipients the sender ticked in the UI.
    const selectedEmails = new Set(
      (formData.getAll("recipients") as string[])
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );

    if (selectedEmails.size === 0) {
      return { error: "Please select at least one recipient." };
    }

    // Resolve the ticked addresses against the group as it stands now, so a
    // stale page can't email somebody who has since left it.
    const recipients = buildRecipients(group).filter((r) =>
      selectedEmails.has(r.email.toLowerCase()),
    );

    if (recipients.length === 0) {
      return { error: "None of the selected recipients could be found." };
    }

    const payloads = recipients.map((r) => ({
      from: FROM,
      to: [r.email],
      subject,
      html: emailTemplate(description, footer, undefined, {
        name: r.name,
        email: r.email,
      } as any),
    }));

    const total = payloads.length;
    let sent = 0;
    let failure: string | undefined;

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      // resend.batch.send resolves with { data, error } — it does NOT throw on
      // an API failure, so the error has to be read off the result.
      const { error } = await resend.batch.send(batch);
      if (error) {
        console.error("Error sending group email batch:", error);
        failure = error.message || error.name;
      } else {
        sent += batch.length;
      }
    }

    if (sent === 0) {
      return { error: `Failed to send: ${failure || "unknown error"}`, total };
    }

    return { sent, mode: "all", total, failure };
  },
);

export default function SendGroupEmail() {
  const { group, recipients, withoutEmail, defaultTestEmail } =
    useLoaderData<typeof loader>();
  // Back to the group as it was left, filters and all.
  const { search } = useLocation();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  // Everyone is selected by default; the sender can narrow it down.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(recipients.map((r: EmailRecipient) => r.email)),
  );

  return (
    <SheetPage
      backLink={`/dashboard/groups/${group.id}${search}`}
      title={`Email group — ${group.name}`}
      description="Send a message to the members of this group"
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
            disabled={submitting || selected.size === 0}
            onClick={(e) => {
              if (
                !confirm(
                  `Send this email to ${selected.size} selected recipient${
                    selected.size === 1 ? "" : "s"
                  }?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {submitting ? "Sending…" : `Send email (${selected.size})`}
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
              : `Email sent to ${result.sent} of ${result.total} recipient${
                  result.total === 1 ? "" : "s"
                }.`}
          </p>
          {result.failure && (
            <p className="text-xs text-destructive mt-1">
              Some emails failed: {result.failure}
            </p>
          )}
        </div>
      )}
      <GroupMessageForm
        defaultTestEmail={defaultTestEmail}
        recipients={recipients}
        withoutEmail={withoutEmail}
        selected={selected}
        onSelectedChange={setSelected}
      />
    </SheetPage>
  );
}

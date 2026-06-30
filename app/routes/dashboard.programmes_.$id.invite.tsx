import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Resend } from "resend";
import { ProgrammeInviteForm } from "~/components/forms/form/programme-invite-form";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { programmeEmailTemplate } from "~/services/email";
import { ProgrammeService } from "~/services/programmeService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

const FROM = "St Helens RLFC - beCoachable <noreply@be-coachable.com>";

export const meta: MetaFunction = () => {
  return [
    { title: "Invite Members" },
    { name: "description", content: "Invite members to a programme" },
  ];
};

// Parse a free-text list of email addresses separated by commas, spaces or new
// lines into a de-duplicated, lowercased list.
function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }
  return result;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string
    );

    return {
      programme,
      defaultTestEmail: user.email || "",
    };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string
    );
    if (!programme) return { error: "Programme not found." };

    const formData = await request.formData();
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const footer = formData.get("footer") as string;
    const mode = formData.get("mode") as string; // "test" | "invite"
    const testEmail = (formData.get("testEmail") as string)?.trim();

    if (!subject?.trim()) return { error: "Please enter a subject." };

    const resend = new Resend(process.env.VITE_RESEND_API);
    const registerUrl = `${process.env.VITE_URL}/programmes/${programme.url}/register`;

    if (mode === "test") {
      const to = testEmail || user.email;
      if (!to) return { error: "No test email address provided." };

      try {
        await resend.emails.send({
          from: FROM,
          to: [to],
          subject: `[TEST] ${subject}`,
          html: programmeEmailTemplate(description, footer, {
            name: "there",
            ctaUrl: registerUrl,
            ctaLabel: "Register now",
          }),
        });
      } catch (error) {
        console.error("Error sending test invite email:", error);
        return { error: "Failed to send the test email. Please try again." };
      }

      return { sent: 1, mode: "test", to };
    }

    if (mode === "invite") {
      const emails = parseEmails((formData.get("emails") as string) || "");

      if (emails.length === 0) {
        return { error: "Please enter at least one email address." };
      }

      const invalid = emails.filter((e) => !EMAIL_RE.test(e));
      if (invalid.length > 0) {
        return {
          error: `These don't look like valid email addresses: ${invalid.join(
            ", "
          )}`,
        };
      }

      // Add every recipient to the allow-list first so they can register even
      // after the deadline, even if the email send happens to fail.
      for (const email of emails) {
        try {
          await programmeService.addAllowedEmail(programme.id, email);
        } catch (error) {
          console.error("Error adding allowed email", email, error);
        }
      }

      // Resend's batch API accepts up to 100 messages per call.
      const payloads = emails.map((email) => ({
        from: FROM,
        to: [email],
        subject,
        html: programmeEmailTemplate(description, footer, {
          name: "there",
          ctaUrl: registerUrl,
          ctaLabel: "Register now",
        }),
      }));

      let sent = 0;
      for (let i = 0; i < payloads.length; i += 100) {
        const batch = payloads.slice(i, i + 100);
        try {
          const { error } = await resend.batch.send(batch);
          if (error) {
            console.error("Error sending invite batch", error);
          } else {
            sent += batch.length;
          }
        } catch (error) {
          console.error("Error sending invite batch", error);
        }
      }

      return { sent, mode: "invite", total: emails.length };
    }

    return { error: "Unknown send mode." };
  }
);

export default function InviteProgrammeMembers() {
  const { programme, defaultTestEmail } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <SheetPage
      backLink={`/dashboard/programmes/${programme.id}`}
      title={`Invite members — ${programme.name}`}
      description="Invite people to register and add them to the allow-list"
      hasForm
      renderFooterButtons={() => (
        <div className="flex flex-row gap-2 mr-auto">
          <Button
            type="submit"
            name="mode"
            value="test"
            variant="outline"
            disabled={submitting}
          >
            Send test email
          </Button>
          <Button
            type="submit"
            name="mode"
            value="invite"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send invitations"}
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
              : `Invitation sent to ${result.sent} of ${result.total} address${
                  result.total === 1 ? "" : "es"
                }, all added to the allow-list.`}
          </p>
        </div>
      )}
      <ProgrammeInviteForm defaultTestEmail={defaultTestEmail} />
    </SheetPage>
  );
}

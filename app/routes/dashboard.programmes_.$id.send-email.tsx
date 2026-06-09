import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Resend } from "resend";
import { ProgrammeEmailForm } from "~/components/forms/form/programme-email-form";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { programmeEmailTemplate } from "~/services/email";
import { ProgrammeService } from "~/services/programmeService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { delay } from "~/utils/helpers";

export { ErrorBoundary } from "~/components/error-boundry";

const FROM = "St Helens RLFC - beCoachable <noreply@be-coachable.com>";

export const meta: MetaFunction = () => {
  return [
    { title: "Email Members" },
    { name: "description", content: "Email programme members" },
  ];
};

// Collect a de-duplicated list of recipient emails for a programme's
// registrations, preferring the player's current email over the one captured
// at registration time.
function recipientEmails(
  registrations: { email?: string; players?: { email?: string } }[]
) {
  const seen = new Map<string, string>();
  for (const reg of registrations) {
    const email = reg.players?.email || reg.email;
    if (email && !seen.has(email.toLowerCase())) {
      seen.set(email.toLowerCase(), email);
    }
  }
  return [...seen.values()];
}

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string
    );
    const registrations = await programmeService.getProgrammeRegistrations(
      params.id as string
    );

    return {
      programme,
      recipientCount: recipientEmails(registrations).length,
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
    const mode = formData.get("mode") as string; // "test" | "all"
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
            name: "Sample Player",
            ctaUrl: registerUrl,
          }),
        });
      } catch (error) {
        console.error("Error sending test email:", error);
        return { error: "Failed to send the test email. Please try again." };
      }

      return { sent: 1, mode: "test", to };
    }

    if (mode === "all") {
      const registrations = await programmeService.getProgrammeRegistrations(
        params.id as string
      );

      const emails = recipientEmails(registrations);
      // Map each recipient email to a player name for {{name}} interpolation.
      const nameByEmail = new Map<string, string>();
      for (const reg of registrations) {
        const email = reg.players?.email || reg.email;
        if (email && !nameByEmail.has(email.toLowerCase())) {
          nameByEmail.set(email.toLowerCase(), reg.players?.name || "");
        }
      }

      let sent = 0;
      for (const email of emails) {
        try {
          await resend.emails.send({
            from: FROM,
            to: [email],
            subject,
            html: programmeEmailTemplate(description, footer, {
              name: nameByEmail.get(email.toLowerCase()) || "",
              ctaUrl: registerUrl,
            }),
          });
          sent++;
          await delay(500);
        } catch (error) {
          console.error("Error sending email to", email, error);
        }
      }

      return { sent, mode: "all", total: emails.length };
    }

    return { error: "Unknown send mode." };
  }
);

export default function SendProgrammeEmail() {
  const { programme, recipientCount, defaultTestEmail } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <SheetPage
      backLink={`/dashboard/programmes/${programme.id}`}
      title={`Email members — ${programme.name}`}
      description="Send an email to everyone registered for this programme"
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
            value="all"
            disabled={submitting || recipientCount === 0}
            onClick={(e) => {
              if (
                !confirm(
                  `Send this email to all ${recipientCount} registered member${
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
        </div>
      )}
      <ProgrammeEmailForm
        defaultTestEmail={defaultTestEmail}
        recipientCount={recipientCount}
      />
    </SheetPage>
  );
}

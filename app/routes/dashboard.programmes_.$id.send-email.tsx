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
    const withdrawBaseUrl = `${process.env.VITE_URL}/programmes/${programme.url}/withdraw`;

    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string
    );

    if (mode === "test") {
      const to = testEmail || user.email;
      if (!to) return { error: "No test email address provided." };

      // Preview the layout with sample availability (alternating states).
      const sampleAvailability = programmeEvents.map((pe, i) => ({
        name: pe.events?.name || "Event",
        date: pe.events?.date,
        available: i % 2 === 0,
      }));

      // Point the withdraw button at the test recipient's own registration (if
      // they're registered for this programme) so the flow can be tested for
      // real. Falls back to the base URL otherwise.
      const testRegistrations =
        await programmeService.getProgrammeRegistrations(params.id as string);
      const ownRegistration = testRegistrations.find(
        (r) =>
          (r.players?.email || r.email)?.toLowerCase() === to.toLowerCase()
      );
      const testWithdrawUrl = ownRegistration
        ? `${withdrawBaseUrl}?registration=${ownRegistration.id}`
        : withdrawBaseUrl;

      try {
        await resend.emails.send({
          from: FROM,
          to: [to],
          subject: `[TEST] ${subject}`,
          html: programmeEmailTemplate(description, footer, {
            name: "Sample Player",
            ctaUrl: registerUrl,
            withdrawUrl: testWithdrawUrl,
            availability: sampleAvailability,
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

      // Group recorded availability by registration: registrationId -> (eventId -> available)
      const availabilityRows =
        await programmeService.getProgrammeEventAvailability(
          params.id as string
        );
      const availByReg = new Map<string, Map<string, boolean>>();
      for (const row of availabilityRows) {
        if (!availByReg.has(row.programmeRegistrationId)) {
          availByReg.set(row.programmeRegistrationId, new Map());
        }
        availByReg
          .get(row.programmeRegistrationId)!
          .set(row.eventId, row.available);
      }

      // Build one email payload per unique recipient. Resend's batch API
      // accepts up to 100 messages per call, so we send in chunks of 100 —
      // this keeps us well inside Netlify's 10s function limit even at the
      // ~200-recipient upper end (a single sequential loop would time out).
      const seen = new Set<string>();
      const payloads: {
        from: string;
        to: string[];
        subject: string;
        html: string;
      }[] = [];

      for (const reg of registrations) {
        const email = reg.players?.email || reg.email;
        if (!email || seen.has(email.toLowerCase())) continue;
        seen.add(email.toLowerCase());

        const availMap = availByReg.get(reg.id);
        const availability = programmeEvents.map((pe) => ({
          name: pe.events?.name || "Event",
          date: pe.events?.date,
          available: availMap?.has(pe.eventId)
            ? availMap.get(pe.eventId)
            : undefined,
        }));

        payloads.push({
          from: FROM,
          to: [email],
          subject,
          html: programmeEmailTemplate(description, footer, {
            name: reg.players?.name || "",
            ctaUrl: registerUrl,
            withdrawUrl: `${withdrawBaseUrl}?registration=${reg.id}`,
            availability,
          }),
        });
      }

      const total = payloads.length;
      let sent = 0;

      for (let i = 0; i < payloads.length; i += 100) {
        const batch = payloads.slice(i, i + 100);
        try {
          const { error } = await resend.batch.send(batch);
          if (error) {
            console.error("Error sending email batch", error);
          } else {
            sent += batch.length;
          }
        } catch (error) {
          console.error("Error sending email batch", error);
        }
      }

      return { sent, mode: "all", total };
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

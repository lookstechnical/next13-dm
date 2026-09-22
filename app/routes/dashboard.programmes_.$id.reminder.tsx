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
import { CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Resend } from "resend";
import { ProgrammeReminderForm } from "~/components/forms/form/programme-reminder-form";
import type { EmailRecipient } from "~/components/recipient-selector";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";
import { programmeEmailTemplate } from "~/services/email";
import { GroupService } from "~/services/groupService";
import { ProgrammeService } from "~/services/programmeService";
import { AllowedRoles } from "~/components/route-protections";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { BIB_NOT_ASSIGNED, bibEmailHtml } from "~/utils/bibs";
import { eventTimeRange } from "~/utils/helpers";
import { registrationEmails } from "~/utils/player-emails";

export { ErrorBoundary } from "~/components/error-boundry";

const FROM = "St Helens RLFC - beCoachable <noreply@be-coachable.com>";

export const meta: MetaFunction = () => {
  return [
    { title: "Send Reminder" },
    {
      name: "description",
      content: "Remind members to update their details and availability",
    },
  ];
};

// The reminder audience is everyone who should keep their details current:
// registered members plus any allow-listed (invited) email that hasn't
// registered yet. Registered members get the richer email (name, team,
// current availability, withdraw link); invited-only addresses get a nudge to
// register. Emails are de-duplicated across both groups, preferring the
// registered version.
type Recipient = {
  /** The address this recipient is keyed and selected by. */
  email: string;
  /** Every address the message goes to — the primary plus any second parent. */
  emails: string[];
  name: string;
  team: string;
  registered: boolean;
  registrationId?: string;
  playerId?: string;
  /** Rendered {{bib}} — the bib colour and number, or "TBC". */
  bib: string;
};

function buildRecipients(
  registrations: {
    id: string;
    email?: string;
    playerId?: string;
    bibColor?: string | null;
    bibNumber?: number | null;
    players?: { name?: string; email?: string; additionalEmails?: string[] };
  }[],
  allowedEmails: { email: string }[],
  teamByPlayer: Map<string, string>,
): Recipient[] {
  const byEmail = new Map<string, Recipient>();

  for (const reg of registrations) {
    const emails = registrationEmails(reg);
    if (emails.length === 0) continue;
    const key = emails[0].toLowerCase();
    if (byEmail.has(key)) continue;
    byEmail.set(key, {
      email: emails[0],
      emails,
      name: reg.players?.name || "",
      team: (reg.playerId && teamByPlayer.get(reg.playerId)) || "",
      registered: true,
      registrationId: reg.id,
      playerId: reg.playerId,
      bib: bibEmailHtml(reg.bibColor, reg.bibNumber),
    });
  }

  for (const allowed of allowedEmails) {
    if (!allowed.email) continue;
    const key = allowed.email.toLowerCase();
    if (byEmail.has(key)) continue; // already registered — richer email wins
    byEmail.set(key, {
      email: allowed.email,
      emails: [allowed.email],
      name: "",
      team: "",
      registered: false,
      bib: BIB_NOT_ASSIGNED,
    });
  }

  return [...byEmail.values()];
}

// The list of selectable recipients shown in the UI: registered members
// (with their names) plus any invited email that hasn't registered yet.
// De-duplicated by email, registered members first, then sorted by name/email.
function buildDisplayRecipients(
  registrations: {
    email?: string;
    players?: { name?: string; email?: string; additionalEmails?: string[] };
  }[],
  allowedEmails: { email: string }[],
): EmailRecipient[] {
  const byEmail = new Map<string, EmailRecipient>();

  for (const reg of registrations) {
    const emails = registrationEmails(reg);
    if (emails.length === 0) continue;
    const key = emails[0].toLowerCase();
    if (byEmail.has(key)) continue;
    byEmail.set(key, {
      email: emails[0],
      emails,
      name: reg.players?.name || "",
      registered: true,
    });
  }

  for (const allowed of allowedEmails) {
    if (!allowed.email) continue;
    const key = allowed.email.toLowerCase();
    if (byEmail.has(key)) continue;
    byEmail.set(key, { email: allowed.email, name: "", registered: false });
  }

  return [...byEmail.values()].sort((a, b) => {
    if (a.registered !== b.registered) return a.registered ? -1 : 1;
    return (a.name || a.email)
      .toLowerCase()
      .localeCompare((b.name || b.email).toLowerCase());
  });
}

// The programme's events, each carrying the (lower-cased) emails of the
// members who have marked themselves available for it. Lets the sender narrow
// the reminder to "everyone available for this session".
export type ReminderEvent = {
  id: string;
  name: string;
  date?: string;
  availableEmails: string[];
};

function buildEventOptions(
  programmeEvents: {
    eventId: string;
    events?: { name?: string; date?: string };
  }[],
  registrations: {
    id: string;
    email?: string;
    players?: { email?: string };
  }[],
  availability: {
    programmeRegistrationId: string;
    eventId: string;
    available: boolean;
  }[],
): ReminderEvent[] {
  // Keyed on the primary address, matching how buildDisplayRecipients keys the
  // list — the event filter compares the two, so they have to agree.
  const emailByRegistration = new Map<string, string>();
  for (const reg of registrations) {
    const [primary] = registrationEmails(reg);
    if (primary) emailByRegistration.set(reg.id, primary.toLowerCase());
  }

  const emailsByEvent = new Map<string, Set<string>>();
  for (const row of availability) {
    if (!row.available) continue;
    const email = emailByRegistration.get(row.programmeRegistrationId);
    if (!email) continue;
    if (!emailsByEvent.has(row.eventId)) {
      emailsByEvent.set(row.eventId, new Set());
    }
    emailsByEvent.get(row.eventId)!.add(email);
  }

  return programmeEvents.map((pe) => ({
    id: pe.eventId,
    name: pe.events?.name || "Event",
    date: pe.events?.date,
    time: eventTimeRange(pe.events),
    availableEmails: [...(emailsByEvent.get(pe.eventId) ?? [])],
  }));
}

// Build a playerId -> team name lookup from the team's player groups, used to
// resolve the {{team}} email variable. A player can belong to several groups,
// so we prefer a "squad" type group (the closest thing to an assigned team),
// falling back to any other group they're in.
function playerTeamMap(
  groups: { name: string; type?: string; playerIds?: string[] }[],
) {
  const map = new Map<string, string>();
  for (const group of groups) {
    if (group.type === "squad") continue;
    for (const playerId of group.playerIds ?? []) {
      if (!map.has(playerId)) map.set(playerId, group.name);
    }
  }
  for (const group of groups) {
    if (group.type !== "squad") continue;
    for (const playerId of group.playerIds ?? []) {
      map.set(playerId, group.name);
    }
  }
  return map;
}

export const loader: LoaderFunction = withAuth(
  AllowedRoles.adminOnly,
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string,
    );

    const registrations = await programmeService.getProgrammeRegistrations(
      params.id as string,
    );
    const allowedEmails = await programmeService.getAllowedEmails(
      params.id as string,
    );
    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string,
    );
    const availability = await programmeService.getProgrammeEventAvailability(
      params.id as string,
    );

    return {
      programme,
      recipients: buildDisplayRecipients(registrations, allowedEmails),
      events: buildEventOptions(programmeEvents, registrations, availability),
      defaultTestEmail: user.email || "",
    };
  },
);

export const action: ActionFunction = withAuthAction(
  AllowedRoles.adminOnly,
  async ({ request, params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);
    const groupService = new GroupService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string,
    );
    if (!programme) return { error: "Programme not found." };

    const groups = programme.teamId
      ? await groupService.getGroupsByTeam(programme.teamId)
      : [];
    const teamByPlayer = playerTeamMap(groups);

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
    const CTA_LABEL = "Update your details & availability";

    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string,
    );

    if (mode === "test") {
      const to = testEmail || user.email;
      if (!to) return { error: "No test email address provided." };

      // Preview the layout with sample availability (alternating states).
      const sampleAvailability = programmeEvents.map((pe, i) => ({
        name: pe.events?.name || "Event",
        date: pe.events?.date,
        time: eventTimeRange(pe.events),
        available: i % 2 === 0,
      }));

      // Point the withdraw button at the test recipient's own registration (if
      // they're registered), so the flow can be tested for real.
      const testRegistrations =
        await programmeService.getProgrammeRegistrations(params.id as string);
      // Match on any of the player's addresses so a tester using their second
      // address still gets their own withdraw link rather than the generic one.
      const ownRegistration = testRegistrations.find((r) =>
        registrationEmails(r).some(
          (email) => email.toLowerCase() === to.toLowerCase(),
        ),
      );
      const testWithdrawUrl = ownRegistration
        ? `${withdrawBaseUrl}?registration=${ownRegistration.id}`
        : withdrawBaseUrl;
      const testTeam =
        (ownRegistration?.playerId &&
          teamByPlayer.get(ownRegistration.playerId)) ||
        "Sample Team";
      // The tester's own bib when they're registered with one, so a real
      // assignment can be checked; otherwise a sample to show the layout.
      const testBib =
        ownRegistration?.bibColor || ownRegistration?.bibNumber
          ? bibEmailHtml(ownRegistration.bibColor, ownRegistration.bibNumber)
          : bibEmailHtml("red", 7);

      try {
        await resend.emails.send({
          from: FROM,
          to: [to],
          subject: `[TEST] ${subject}`,
          html: programmeEmailTemplate(description, footer, {
            name: "Sample Player",
            team: testTeam,
            bib: testBib,
            ctaUrl: registerUrl,
            ctaLabel: CTA_LABEL,
            withdrawUrl: testWithdrawUrl,
            availability: sampleAvailability,
          }),
        });
      } catch (error) {
        console.error("Error sending test reminder email:", error);
        return { error: "Failed to send the test email. Please try again." };
      }

      return { sent: 1, mode: "test", to };
    }

    if (mode === "all") {
      const registrations = await programmeService.getProgrammeRegistrations(
        params.id as string,
      );
      const allowedEmails = await programmeService.getAllowedEmails(
        params.id as string,
      );

      // Only send to the recipients the sender ticked in the UI.
      const selectedEmails = new Set(
        (formData.getAll("recipients") as string[])
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      );

      if (selectedEmails.size === 0) {
        return { error: "Please select at least one recipient." };
      }

      const recipients = buildRecipients(
        registrations,
        allowedEmails,
        teamByPlayer,
      ).filter((r) => selectedEmails.has(r.email.toLowerCase()));

      if (recipients.length === 0) {
        return { error: "None of the selected recipients could be found." };
      }

      // Group recorded availability by registration: registrationId ->
      // (eventId -> available).
      const availabilityRows =
        await programmeService.getProgrammeEventAvailability(
          params.id as string,
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

      // Build one email payload per recipient. Registered members get the full
      // treatment (name, team, current availability, withdraw link); invited
      // addresses that haven't registered get a simple nudge to register.
      const payloads = recipients.map((r) => {
        if (r.registered) {
          const availMap = r.registrationId
            ? availByReg.get(r.registrationId)
            : undefined;
          const availability = programmeEvents.map((pe) => ({
            name: pe.events?.name || "Event",
            date: pe.events?.date,
            time: eventTimeRange(pe.events),
            available: availMap?.has(pe.eventId)
              ? availMap.get(pe.eventId)
              : undefined,
          }));

          return {
            from: FROM,
            to: r.emails,
            subject,
            html: programmeEmailTemplate(description, footer, {
              name: r.name,
              team: r.team,
              bib: r.bib,
              ctaUrl: registerUrl,
              ctaLabel: CTA_LABEL,
              withdrawUrl: `${withdrawBaseUrl}?registration=${r.registrationId}`,
              availability,
            }),
          };
        }

        return {
          from: FROM,
          to: r.emails,
          subject,
          html: programmeEmailTemplate(description, footer, {
            name: "there",
            bib: r.bib,
            ctaUrl: registerUrl,
            ctaLabel: "Register now",
          }),
        };
      });

      // Resend's batch API accepts up to 100 messages per call.
      const total = payloads.length;
      let sent = 0;
      for (let i = 0; i < payloads.length; i += 100) {
        const batch = payloads.slice(i, i + 100);
        try {
          const { error } = await resend.batch.send(batch);
          if (error) {
            console.error("Error sending reminder batch", error);
          } else {
            sent += batch.length;
          }
        } catch (error) {
          console.error("Error sending reminder batch", error);
        }
      }

      return { sent, mode: "all", total };
    }

    return { error: "Unknown send mode." };
  },
);

export default function SendProgrammeReminder() {
  const { programme, recipients, events, defaultTestEmail } =
    useLoaderData<typeof loader>();
  // Back to the list as it was left, filters and all.
  const { search } = useLocation();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  // Optional event filter: narrows the recipient list to the members who
  // marked themselves available for that event.
  const [eventFilter, setEventFilter] = useState<string>("");
  const selectedEvent = events?.find((e: ReminderEvent) => e.id === eventFilter);

  const recipientsForEvent = (event?: ReminderEvent) => {
    if (!event) return recipients as EmailRecipient[];
    const available = new Set(event.availableEmails);
    return (recipients as EmailRecipient[]).filter((r) =>
      available.has(r.email.toLowerCase()),
    );
  };

  const visibleRecipients = recipientsForEvent(selectedEvent);

  // Everyone is selected by default; the sender can narrow it down.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(recipients.map((r: EmailRecipient) => r.email)),
  );

  // Switching event re-selects exactly who is available for it.
  const handleEventChange = (value: string) => {
    const next = value ?? "";
    setEventFilter(next);
    const event = events?.find((e: ReminderEvent) => e.id === next);
    setSelected(new Set(recipientsForEvent(event).map((r) => r.email)));
  };

  return (
    <SheetPage
      backLink={`/dashboard/programmes/${programme.id}${search}`}
      title={`Send reminder — ${programme.name}`}
      description="Remind members to update their details, profile and availability"
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
                  `Send this reminder to ${selected.size} selected recipient${
                    selected.size === 1 ? "" : "s"
                  }?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {submitting ? "Sending…" : `Send reminder (${selected.size})`}
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
              : `Reminder sent to ${result.sent} of ${result.total} recipient${
                  result.total === 1 ? "" : "s"
                }.`}
          </p>
        </div>
      )}
      <ProgrammeReminderForm
        defaultTestEmail={defaultTestEmail}
        recipients={visibleRecipients}
        totalRecipientCount={recipients.length}
        events={events ?? []}
        eventFilter={eventFilter}
        onEventFilterChange={handleEventChange}
        selected={selected}
        onSelectedChange={setSelected}
      />
    </SheetPage>
  );
}

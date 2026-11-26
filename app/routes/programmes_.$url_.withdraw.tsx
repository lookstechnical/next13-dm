import { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ProgrammeService } from "~/services/programmeService";
import { Resend } from "resend";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const WITHDRAW_REASONS = [
  {
    value: "scholarship_other_club",
    label: "Accepted a scholarship offer at another club",
  },
  { value: "injury", label: "Injury, Illness or health reasons" },
  { value: "schedule_clash", label: "Can't make the session dates or times" },
  { value: "school_commitments", label: "School, college or exam commitments" },
  { value: "other_sport", label: "Focusing on another sport" },
  { value: "travel", label: "Travel or distance" },
  { value: "personal", label: "Personal or family reasons" },
  { value: "other", label: "Other" },
] as const;

const OTHER_DETAILS_MAX = 1000;

export { ErrorBoundary } from "~/components/error-boundry";

// Public one-click withdraw landing page, reached from the "Withdraw" CTA in
// programme emails. The link carries the registration's UUID; this page loads
// it, shows a confirmation screen, and only removes the registration once the
// member explicitly confirms (a POST) — so link prefetching can't withdraw
// anyone by accident.
export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);

  const programme = params.url
    ? await programmeService.getProgrammeByUrl(params.url)
    : null;

  const url = new URL(request.url);
  const registrationId = url.searchParams.get("registration");

  const registration = registrationId
    ? await programmeService.getRegistrationById(registrationId)
    : null;

  // The registration must exist and belong to the programme in the URL.
  const valid =
    !!programme && !!registration && registration.programmeId === programme.id;

  return {
    programme,
    registration: valid ? registration : null,
    playerName: valid ? registration?.players?.name ?? "" : "",
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);

  const formData = await request.formData();
  const registrationId = formData.get("registrationId") as string;
  const reasonValue = (formData.get("reason") as string | null) ?? "";
  const reasonDetails = ((formData.get("reasonDetails") as string | null) ?? "")
    .trim()
    .slice(0, OTHER_DETAILS_MAX);
  const reason = WITHDRAW_REASONS.find((r) => r.value === reasonValue);

  const programme = params.url
    ? await programmeService.getProgrammeByUrl(params.url)
    : null;

  const registration = registrationId
    ? await programmeService.getRegistrationById(registrationId)
    : null;

  // Re-validate on submit so a stale/forged registrationId can't remove a
  // registration from another programme.
  if (
    !programme ||
    !registration ||
    registration.programmeId !== programme.id
  ) {
    return { withdrawn: false, error: "invalid" };
  }

  await programmeService.removeRegistration(registrationId);

  // Let the admin know someone has withdrawn. A failed notification must not
  // undo or block the withdrawal itself, so errors are logged and swallowed.
  try {
    const playerName = escapeHtml(
      registration.players?.name ?? "Unknown player",
    );
    const playerEmail = escapeHtml(registration.players?.email ?? "");
    const programmeName = escapeHtml(programme.name ?? "");
    const reasonLabel = escapeHtml(reason?.label ?? "Not given");
    const detailsHtml = reasonDetails
      ? escapeHtml(reasonDetails).replaceAll("\n", "<br />")
      : "";
    const resend = new Resend(process.env.VITE_RESEND_API);
    const { error } = await resend.emails.send({
      from: "beCoachable <noreply@be-coachable.com>",
      to: ["info@lookstechnical.co.uk"],
      subject: `Programme withdrawal: ${
        registration.players?.name ?? "Unknown player"
      } - ${programme.name}`,
      html: `<div>
        <p><strong>${playerName}</strong>${
        playerEmail ? ` (${playerEmail})` : ""
      } has withdrawn from <strong>${programmeName}</strong>.</p>
        <p><strong>Reason:</strong> ${reasonLabel}</p>
        ${
          detailsHtml
            ? `<p><strong>Details:</strong><br />${detailsHtml}</p>`
            : ""
        }
        <p>Withdrawn at ${new Date().toLocaleString("en-GB", {
          timeZone: "Europe/London",
        })}.</p>
      </div>`,
    });
    if (error) console.error("Withdrawal notification failed", error);
  } catch (e) {
    console.error("Withdrawal notification failed", e);
  }

  return { withdrawn: true, error: null };
};

export default function ProgrammeWithdraw() {
  const { programme, registration, playerName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const programmeName = programme?.name ?? "this programme";
  const [reason, setReason] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="w-full bg-wkbackground border-b border-border">
        <div className="container mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Link
            to={programme ? `/programmes/${programme.url}` : "/programmes"}
            className="text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-grow min-w-0">
            <h1 className="text-lg font-semibold truncate">
              Withdraw from {programmeName}
            </h1>
          </div>
          <img src="/logo.png" className="w-8 h-8" width={32} height={32} />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Success: registration removed */}
        {actionData?.withdrawn ? (
          <Card className="border-border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Withdrawn</h2>
            <p className="text-muted mb-6">
              You have been withdrawn from {programmeName}. You can register
              again any time before the deadline.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link
                to={programme ? `/programmes/${programme.url}` : "/programmes"}
              >
                Back to Programme
              </Link>
            </Button>
          </Card>
        ) : registration && !actionData?.error ? (
          /* Confirmation screen */
          <Card className="border-destructive/30 p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Confirm withdrawal
            </h2>
            <p className="text-sm text-muted mb-6">
              {playerName ? (
                <>
                  Are you sure you want to withdraw{" "}
                  <span className="text-white">{playerName}</span> from{" "}
                  {programmeName}?
                </>
              ) : (
                <>Are you sure you want to withdraw from {programmeName}?</>
              )}{" "}
              This removes you from the programme and all of its sessions. You
              can register again later if you change your mind.
            </p>
            <Form method="post">
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />

              <fieldset className="mb-6">
                <legend className="text-sm font-medium text-white mb-3">
                  Why are you withdrawing? (optional)
                </legend>
                <div className="space-y-2">
                  {WITHDRAW_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        reason === r.value
                          ? "border-destructive/60 bg-destructive/10 text-white"
                          : "border-border text-muted hover:text-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={(e) => setReason(e.target.value)}
                        className="accent-destructive"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {reason && (
                <div className="mb-6">
                  <label
                    htmlFor="reasonDetails"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Anything else you'd like to tell us? (optional)
                  </label>
                  <Textarea
                    id="reasonDetails"
                    name="reasonDetails"
                    rows={3}
                    maxLength={OTHER_DETAILS_MAX}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  Yes, withdraw me
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link
                    to={
                      programme ? `/programmes/${programme.url}` : "/programmes"
                    }
                  >
                    No, keep my place
                  </Link>
                </Button>
              </div>
            </Form>
          </Card>
        ) : (
          /* Invalid or already-withdrawn link */
          <Card className="border-border p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Link no longer valid
            </h2>
            <p className="text-muted mb-6">
              We couldn't find an active registration for this link. You may
              have already withdrawn, or the link is incorrect. To manage your
              registration, please use the programme page.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link
                to={programme ? `/programmes/${programme.url}` : "/programmes"}
              >
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

import { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ProgrammeService } from "~/services/programmeService";

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
    !!programme &&
    !!registration &&
    registration.programmeId === programme.id;

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
  return { withdrawn: true, error: null };
};

export default function ProgrammeWithdraw() {
  const { programme, registration, playerName } =
    useLoaderData<typeof loader>();
  const action = useActionData<typeof action>();

  const programmeName = programme?.name ?? "this programme";

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
        {action?.withdrawn ? (
          <Card className="border-border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Withdrawn</h2>
            <p className="text-muted mb-6">
              You have been withdrawn from {programmeName}. You can register
              again any time before the deadline.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={programme ? `/programmes/${programme.url}` : "/programmes"}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        ) : registration && !action?.error ? (
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
            <div className="flex flex-col sm:flex-row gap-3">
              <Form method="post">
                <input
                  type="hidden"
                  name="registrationId"
                  value={registration.id}
                />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  Yes, withdraw me
                </Button>
              </Form>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={programme ? `/programmes/${programme.url}` : "/programmes"}>
                  No, keep my place
                </Link>
              </Button>
            </div>
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
              <Link to={programme ? `/programmes/${programme.url}` : "/programmes"}>
                Back to Programme
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

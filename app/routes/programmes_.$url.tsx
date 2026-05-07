import { LoaderFunction } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react";
import { ProgrammeSection } from "~/types";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ProgrammeService } from "~/services/programmeService";
import { formatDate } from "~/utils/helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);

  const programme = params.url
    ? await programmeService.getProgrammeByUrl(params.url)
    : null;

  const programmeEvents = programme
    ? await programmeService.getProgrammeEvents(programme.id)
    : [];

  return { programme, programmeEvents };
};

export default function ProgrammeDetail() {
  const { programme, programmeEvents } = useLoaderData<typeof loader>();

  if (!programme) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Programme not found.</p>
      </div>
    );
  }

  const deadlinePassed =
    programme.registrationDeadline &&
    new Date(programme.registrationDeadline) < new Date();

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground [&_h2]:uppercase [&_h3]:uppercase ">
      {/* Hero section */}
      <div className="w-full bg-wkbackground relative overflow-hidden">
        {programme.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={programme.imageUrl}
              alt=""
              className="w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-wkbackground to-transparent" />
          </div>
        )}
        <div className="container mx-auto max-w-[50rem] px-5 py-8 md:py-12 relative z-10">
          <Link
            to="/programmes"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4" />
            All programmes
          </Link>
          <div className="flex flex-row gap-4 items-start mb-4">
            <img
              src="/logo.png"
              className="w-12 md:w-16 flex-shrink-0"
              width={64}
              height={64}
            />
            <div className="min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold mb-2 uppercase">
                {programme.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <Badge variant="outline" className="uppercase text-xs">
                  {programme.status}
                </Badge>
                {programmeEvents.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4" />
                    {programmeEvents.length} event
                    {programmeEvents.length !== 1 ? "s" : ""}
                  </span>
                )}
                {programme.registrationDeadline && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4" />
                    {formatDate(programme.registrationDeadline)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Age eligibility info */}
          {(programme.eligibleDobFrom || programme.eligibleDobTo) && (
            <p className="text-sm text-muted mt-3">
              Open to players born{" "}
              {programme.eligibleDobFrom && programme.eligibleDobTo
                ? `between ${formatDate(
                    programme.eligibleDobFrom,
                  )} and ${formatDate(programme.eligibleDobTo)}`
                : programme.eligibleDobFrom
                ? `on or after ${formatDate(programme.eligibleDobFrom)}`
                : `on or before ${formatDate(programme.eligibleDobTo)}`}
            </p>
          )}

          {/* CTA */}
          {programme.canRegister && !deadlinePassed && (
            <Button
              asChild
              size="lg"
              className="mt-4 w-full sm:w-auto uppercase"
            >
              <Link to={`/programmes/${programme.url}/register`}>
                Register Now
              </Link>
            </Button>
          )}
          {deadlinePassed && (
            <p className="text-sm text-destructive mt-4">
              Registration has closed.
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-[50rem] px-5 py-8 md:py-10 space-y-8 md:space-y-10">
        {/* Featured image */}
        {programme.imageUrl && (
          <img
            src={programme.imageUrl}
            alt={programme.name}
            className="w-full object-cover rounded-lg"
          />
        )}

        {/* Description */}
        {programme.description && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">About</h2>
            <Card className="border-border p-6">
              <div
                className="tiptap"
                dangerouslySetInnerHTML={{ __html: programme.description }}
              />
            </Card>
          </section>
        )}

        {/* Events schedule */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Schedule ({programmeEvents.length} event
            {programmeEvents.length !== 1 ? "s" : ""})
          </h2>
          <div className="flex flex-col gap-3">
            {programmeEvents?.map((pe: any, index: number) => (
              <Card
                key={pe.id}
                className="border-border p-5 flex flex-row items-center gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <h3 className="text-md font-medium text-white">
                    {pe.events?.name}
                  </h3>
                  <div className="flex flex-wrap gap-4 mt-1">
                    {pe.events?.date && (
                      <p className="text-sm text-muted flex items-center gap-1">
                        <Calendar className="w-4" />
                        {formatDate(pe.events.date)}
                      </p>
                    )}
                    {pe.events?.location && (
                      <p className="text-sm text-muted flex items-center gap-1">
                        <MapPin className="w-3" />
                        {pe.events.location}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {(!programmeEvents || programmeEvents.length === 0) && (
              <Card className="border-border p-8 text-center">
                <p className="text-muted">
                  No events added to this programme yet.
                </p>
              </Card>
            )}
          </div>
        </section>

        {/* Content sections */}
        {programme.sections && programme.sections.length > 0 && (
          <div className="space-y-8">
            {programme.sections.map(
              (section: ProgrammeSection, index: number) => {
                if (section.type === "text") {
                  return (
                    <section key={index}>
                      <Card className="border-border p-6">
                        <div
                          className="tiptap"
                          dangerouslySetInnerHTML={{
                            __html: section.content,
                          }}
                        />
                      </Card>
                    </section>
                  );
                }
                if (section.type === "image") {
                  return (
                    <figure key={index} className="space-y-2">
                      <img
                        src={section.url}
                        alt={section.caption || ""}
                        className="w-full rounded-lg object-cover"
                      />
                      {section.caption && (
                        <figcaption className="text-sm text-muted text-center">
                          {section.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                return null;
              },
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {programme.canRegister && !deadlinePassed && (
          <section className="text-center py-6">
            <p className="text-muted mb-4">
              Ready to join? Secure your spot now.
            </p>
            <Button asChild size="lg" className="uppercase">
              <Link to={`/programmes/${programme.url}/register`}>
                Register Now
              </Link>
            </Button>
          </section>
        )}
      </div>
      <Outlet />
    </div>
  );
}

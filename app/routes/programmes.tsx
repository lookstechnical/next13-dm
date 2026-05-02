import { LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { ProgrammeCard } from "~/components/programmes/programme-card";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ProgrammeService } from "~/services/programmeService";
import { Programme } from "~/types";

export { ErrorBoundary } from "~/components/error-boundry";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const programmeService = new ProgrammeService(supabaseClient);

  const programmes = await programmeService.getAllPublicProgrammes();

  return { programmes };
};

export default function PublicProgrammes() {
  const { programmes } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-row gap-3 items-end">
          <img src="/logo.png" className="w-20" width={50} height={50} />
          <div>
            <h1 className="text-4xl">Our Programmes</h1>
            <p className="text-muted">
              Browse and register for our upcoming programmes
            </p>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-[50rem] py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programmes
            ?.filter((p: Programme) => p.url)
            .map((programme: Programme) => (
              <ProgrammeCard
                key={programme.id}
                programme={programme}
                to={() => `/programmes/${programme.url}`}
              />
            ))}
        </div>
        {(!programmes || programmes.length === 0) && (
          <div className="text-center py-10 text-muted">
            <p>No programmes available at this time.</p>
          </div>
        )}
      </div>
      <Outlet />
    </div>
  );
}

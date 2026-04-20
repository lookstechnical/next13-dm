import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { ActionProtection } from "~/components/action-protection";
import { ProgrammeCard } from "~/components/programmes/programme-card";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { AllowedRoles } from "~/components/route-protections";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { ProgrammeService } from "~/services/programmeService";
import { Programme } from "~/types";
import { withAuth } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Programmes" },
    { name: "description", content: "Programmes" },
  ];
};

export const loader = withAuth(async ({ user, supabaseClient }) => {
  const programmeService = new ProgrammeService(supabaseClient);
  const programmes =
    (await programmeService.getProgrammesByTeam(user.team.id)) || [];

  return { programmes, user };
});

export default function DashboardProgrammes() {
  const { programmes, user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title="Programmes"
          renderActions={() => {
            return (
              <ActionProtection
                allowedRoles={AllowedRoles.headOfDept}
                user={user}
              >
                <MoreActions>
                  <DropdownMenuItem asChild>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-muted focus:ring-0"
                    >
                      <Link to={`/dashboard/programmes/create`}>
                        Add Programme
                      </Link>
                    </Button>
                  </DropdownMenuItem>
                </MoreActions>
              </ActionProtection>
            );
          }}
        />
        <CardGrid
          name={`${user.team.name} has 0 programmes`}
          items={programmes}
        >
          {programmes?.map((programme: Programme) => (
            <ProgrammeCard
              key={programme.id}
              programme={programme}
              to={(id) => `/dashboard/programmes/${id}`}
            />
          ))}
        </CardGrid>
      </div>
      <Outlet />
    </div>
  );
}

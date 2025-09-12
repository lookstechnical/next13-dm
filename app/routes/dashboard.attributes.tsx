import type { MetaFunction } from "@remix-run/node";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { UserPlus } from "lucide-react";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { AllowedRoles } from "~/components/route-protections";
import { DataTable } from "~/components/table/data-table";
import { Button } from "~/components/ui/button";

import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { AttributesService } from "~/services/attributesService";

import { withAuth } from "~/utils/auth-helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader = withAuth(
  AllowedRoles.headOfDept,
  async ({ user, supabaseClient }) => {
    const attributeService = new AttributesService(supabaseClient);
    const attributes = await attributeService.getAllAttributes();

    return { attributes, user };
  }
);

export function ErrorBoundary() {
  const error = useRouteError();
  if (error?.status) {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-xl">
            You do not have permissions to access this page please contact your
            admin
          </h1>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
      <div className="w-full py-6 flex flex-col w-[50rem] items-center">
        <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

        <h1 className="text-4xl">There Was an error please try again </h1>
        <p className="text-muted">
          if the problem persists and your on mobile please try on a laptop or
          desktop pc
        </p>
      </div>
    </div>
  );
}

export default function Attributes() {
  const { attributes } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`Report Attributes`}
          renderActions={() => (
            <MoreActions>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/attributes/create">
                    <UserPlus />
                    Add Attribute
                  </Link>
                </Button>
              </DropdownMenuItem>
            </MoreActions>
          )}
        />
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "description", header: "Description" },
            { key: "category", header: "Category" },
            {
              key: "actions",
              header: "",
              className: "w-4",
              render: (_val, row) => (
                <MoreActions>
                  <DropdownMenuItem asChild>
                    <NavLink to={`/dashboard/attributes/${row.id}`}>
                      Edit
                    </NavLink>
                  </DropdownMenuItem>
                </MoreActions>
              ),
            },
          ]}
          data={attributes}
        />
        <Outlet />
      </div>
    </div>
  );
}

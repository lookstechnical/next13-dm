import type { MetaFunction } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { UserPlus } from "lucide-react";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { DataTable } from "~/components/table/data-table";
import { Button } from "~/components/ui/button";

import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { TemplateService } from "~/services/templateService";

import { withAuth } from "~/utils/auth-helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader = withAuth(async ({ user, supabaseClient }) => {
  const attributeService = new TemplateService(supabaseClient);
  const templates = await attributeService.getAllTemplates();

  return { templates, user };
});

export default function Templates() {
  const { templates, user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`Templates`}
          renderActions={() => (
            <MoreActions>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/templates/create">
                    <UserPlus />
                    Add Template
                  </Link>
                </Button>
              </DropdownMenuItem>
            </MoreActions>
          )}
        />
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            {
              key: "actions",
              header: "",
              className: "w-4",
              render: (_val, row) => (
                <MoreActions>
                  <DropdownMenuItem asChild>
                    <NavLink to={`/dashboard/templates/${row.id}`}>
                      Edit
                    </NavLink>
                  </DropdownMenuItem>
                </MoreActions>
              ),
            },
          ]}
          data={templates}
        />
        <Outlet />
      </div>
    </div>
  );
}

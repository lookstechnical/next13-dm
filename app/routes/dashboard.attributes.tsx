import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
} from "@remix-run/react";
import { UserPlus } from "lucide-react";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { DataTable } from "~/components/table/data-table";
import { Button } from "~/components/ui/button";

import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { getSupabaseServerClient } from "~/lib/supabase";
import { AttributesService } from "~/services/attributesService";

import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  // const;
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }
  const attributeService = new AttributesService(supabaseClient);
  const attributes = await attributeService.getAllAttributes();

  return { attributes, user };
};

export default function Attributes() {
  const { attributes, user } = useLoaderData<typeof loader>();

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

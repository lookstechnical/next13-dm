import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { Form, Link, redirect, useNavigate } from "@remix-run/react";
import { GroupForm } from "~/components/forms/form/group";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { GroupService } from "~/services/groupService";
import { PlayerGroup } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const groupService = new GroupService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const type = formData.get("type") as PlayerGroup["type"];
  const description = formData.get("description") as string;

  const data: Omit<PlayerGroup, "id" | "createdAt"> = {
    name,
    type,
    description,
    teamId: user.current_team as string,
    status: "active",
    createdBy: user.id,
  };

  await groupService.createGroup(data, user.id);

  return redirect("/dashboard/groups");
};

export default function PlayersCreate() {
  const navigate = useNavigate();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/groups");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Group</SheetTitle>
          <SheetDescription>Add a player</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <GroupForm />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/groups`}>Cancel</Link>
            </Button>

            <ActionButton title="Add Group" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

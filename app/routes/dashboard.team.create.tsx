import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { Form, Link, redirect, useNavigate } from "@remix-run/react";
import { TeamForm } from "~/components/forms/form/team";
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
import { TeamService } from "~/services/teamService";
import { Team } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const teamService = new TeamService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const type = formData.get("type") as Team["type"];
  const description = formData.get("description") as string;

  const data: Omit<Team, "id" | "createdAt"> = {
    name,
    type,
    description,
    createdBy: user.id,
  };

  await teamService.createTeam(data, user.id);

  return redirect("/dashboard/team");
};

export default function TeamCreate() {
  const navigate = useNavigate();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/team");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Team</SheetTitle>
          <SheetDescription>Add a Team</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <TeamForm />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/team`}>Cancel</Link>
            </Button>
            <Button className="text-white" variant="outline" type="submit">
              Add Team
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

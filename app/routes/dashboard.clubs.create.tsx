import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { Form, Link, redirect, useNavigate } from "@remix-run/react";
import { ClubForm } from "~/components/forms/form/club";
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
import { ClubService } from "~/services/clubService";
import { Club } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const location = formData.get("location") as string;

  const data: Omit<Club, "id" | "createdAt"> = {
    name,
    location,
    type: "amateur",
    status: "active",
    createdBy: user.id,
  };

  await clubService.createClub(data, user.id);

  return redirect("/dashboard/clubs");
};

export default function TeamCreate() {
  const navigate = useNavigate();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/clubs");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Club</SheetTitle>
          <SheetDescription>Add a Club</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <ClubForm />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/clubs`}>Cancel</Link>
            </Button>
            <ActionButton title="Add Club" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

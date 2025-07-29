import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { ClubForm } from "~/components/forms/form/club";
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

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const clubService = new ClubService(supabaseClient);

  const club = params.id ? await clubService.getClubById(params.id) : undefined;

  return { club };
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
  const clubId = formData.get("clubId") as string;

  const data = {
    name,
    location,
  };

  await clubService.updateClub(clubId, data);

  return redirect("/dashboard/clubs");
};

export default function TeamCreate() {
  const navigate = useNavigate();
  const { club } = useLoaderData<typeof loader>();

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
          <SheetTitle>Update Club</SheetTitle>
          <SheetDescription>Update a Club</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <ClubForm club={club} />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/clubs`}>Cancel</Link>
            </Button>
            <Button className="text-white" variant="outline" type="submit">
              Update Club
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

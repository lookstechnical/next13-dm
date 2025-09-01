import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { ClubForm } from "~/components/forms/form/club";
import SheetPage from "~/components/sheet-page";

import { getSupabaseServerClient } from "~/lib/supabase";
import { ClubService } from "~/services/clubService";
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
  const { club } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      hasForm
      updateButton="Update Club"
      title="Update Club"
      description="Update a club"
      backLink="/dashboard/clubs"
    >
      <ClubForm club={club} />
    </SheetPage>
  );
}

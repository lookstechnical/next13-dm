import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect, useNavigate } from "@remix-run/react";
import { ClubForm } from "~/components/forms/form/club";
import SheetPage from "~/components/sheet-page";
import { ClubService } from "~/services/clubService";
import { Club } from "~/types";
import { withAuthAction } from "~/utils/auth-helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
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
  }
);

export default function TeamCreate() {
  return (
    <SheetPage
      hasForm
      title="Add New Club"
      description="Add a new Club"
      backLink="/dashboard/clubs"
      updateButton="Add Club"
    >
      <ClubForm />
    </SheetPage>
  );
}

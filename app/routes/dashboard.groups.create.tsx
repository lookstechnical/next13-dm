import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { GroupForm } from "~/components/forms/form/group";
import SheetPage from "~/components/sheet-page";
import { GroupService } from "~/services/groupService";
import { PlayerGroup } from "~/types";
import { withAuthAction } from "~/utils/auth-helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
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
  }
);

export default function PlayersCreate() {
  return (
    <SheetPage
      backLink="/dashboard/groups"
      title="Add Group"
      description="Add Group"
      updateButton="Add Group"
      hasForm
    >
      <GroupForm />
    </SheetPage>
  );
}

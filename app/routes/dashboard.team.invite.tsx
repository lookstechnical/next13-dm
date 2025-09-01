import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { InviteUserForm } from "~/components/forms/form/invite-user";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ScoutService } from "~/services/scoutService";
import { TeamService } from "~/services/teamService";
import { User } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const teamService = new TeamService(supabaseClient);

  const teams = (await teamService.getAllTeams()) || [];

  return { teams };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  if (!["ADMIN", "HEAD_OF_DEPARTMENT"].includes(user.role)) {
    return { error: "Permissions" };
  }

  let formData = await request.formData();
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as User["role"];
  const team = formData.get("team") as string;

  const userService = new ScoutService(supabaseClient);
  const teamService = new TeamService(supabaseClient);

  let appUser;

  try {
    appUser = await userService.getUserByEmail(email.toLowerCase());
    await teamService.addUserToTeam(appUser.id, team, role);

    return redirect("/dashboard/team");
  } catch (e) {
    console.log(e);
  }

  const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();

  const existingUser = existingUsers.users.find(
    (user) => user.email === email.toLowerCase()
  );

  if (!existingUser) {
    const tempPassword = crypto.randomUUID() + "!A1";
    const { data: regAuthUser, error: authError2 } =
      await supabaseClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          invited_team_id: team,
          invited_by: user.id,
          setup_required: true,
        },
      });

    if (!appUser && regAuthUser) {
      // create an app user
      appUser = await userService.addScout({
        id: regAuthUser?.user?.id as string,
        email: email.toLowerCase(),
        name,
        role,
        status: "pending",
        invitedBy: user.id,
        current_team: team,
      });

      await teamService.addUserToTeam(appUser.id, team, role);
    }

    await supabaseClient.auth.admin.inviteUserByEmail(email.toLowerCase());
  }

  if (existingUser) {
    await teamService.addUserToTeam(existingUser.id, team, role);
  }

  return redirect("/dashboard/team");
};

export default function InviteUser() {
  const { teams } = useLoaderData<typeof loader>();
  return (
    <SheetPage
      backLink="/dashboard/team"
      title="Invite User"
      description="Invite User"
      updateButton="Invite User"
      hasForm
    >
      <InviteUserForm teams={teams} />
    </SheetPage>
  );
}

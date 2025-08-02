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
import { InviteUserForm } from "~/components/forms/form/invite-user";
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

    console.log({ regAuthUser });

    if (!appUser && regAuthUser) {
      // create an app user
      appUser = await userService.addScout({
        id: regAuthUser.user.id,
        email: email.toLowerCase(),
        role,
        name: "",
        status: "pending",
        invitedBy: user.id,
      });

      await teamService.addUserToTeam(appUser.id, team, role);
    }
  }

  await supabaseClient.auth.admin.inviteUserByEmail(email.toLowerCase());

  return redirect("/dashboard/team");
};

export default function InviteUser() {
  const navigate = useNavigate();
  const { teams } = useLoaderData<typeof loader>();
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
          <SheetTitle>Invite User</SheetTitle>
          <SheetDescription>Invite a User</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <InviteUserForm teams={teams} />
          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/team`}>Cancel</Link>
            </Button>

            <ActionButton title="Invite User" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

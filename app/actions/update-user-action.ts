import { ActionFunction, redirect } from "react-router";
import { Event } from "../types";
import { eventService } from "../services/eventService";
import { getUser } from "../loaders/user";
import supabase from "../lib/supabase";
import { scoutService } from "../services/scoutService";

export const updateUserAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();
  const password = formData.get("password");
  const name = formData.get("name");

  console.log(password);
  // if (password) {
  //   await supabase.auth.updateUser({
  //     password: password as string,
  //   });
  // }

  const data = {
    name,
  };

  await scoutService.updateScout(currentUser.id, data);

  return redirect("/dashboard");
};

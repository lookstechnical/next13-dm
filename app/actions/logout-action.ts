import { ActionFunction, redirect } from "react-router";
import supabase from "../lib/supabase";

export const logoutAction: ActionFunction = async ({ request }) => {
  await supabase.auth.signOut();

  return redirect("/login");
};

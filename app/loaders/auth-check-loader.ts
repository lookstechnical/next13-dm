import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import supabase from "../lib/supabase";

export const authCheckLoader: LoaderFunction = async ({ params }) => {
  const { currentUser } = await getUser();

  if (!currentUser) {
    return redirect("/login");
  }

  return redirect("/dashboard");
};

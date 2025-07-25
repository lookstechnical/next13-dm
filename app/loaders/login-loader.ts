import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";

export const loginLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  // if (!currentUser) {
  //   return redirect("/login");
  // }

  return { currentUser, currentTeam };
};

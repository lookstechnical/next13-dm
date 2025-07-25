import { LoaderFunction } from "react-router";
import { clubService } from "../services/clubService";

export const clubLoader: LoaderFunction = async ({ params }) => {
  const club = params.id ? await clubService.getClubById(params.id) : undefined;

  return { club };
};

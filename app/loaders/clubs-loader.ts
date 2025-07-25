import { LoaderFunction } from "react-router";
import { clubService } from "../services/clubService";

export const clubsLoader: LoaderFunction = async () => {
  const clubs = (await clubService.getAllClubs()) || [];

  return { clubs };
};

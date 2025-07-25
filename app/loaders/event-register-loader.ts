import { LoaderFunction } from "react-router";

import { eventService } from "../services/eventService";

import { clubService } from "../services/clubService";

export const eventRegisterLoader: LoaderFunction = async ({ params }) => {
  const event = params.id
    ? await eventService.getEventById(params.id)
    : undefined;

  const clubs = await clubService.getAllClubs();

  return { event, clubs };
};

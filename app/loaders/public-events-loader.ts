import { LoaderFunction } from "react-router";
import { eventService } from "../services/eventService";

export const publicEventsLoader: LoaderFunction = async () => {
  let events = await eventService.getAllPublicEvents();

  return { events };
};
